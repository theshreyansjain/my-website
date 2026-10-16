// /lab/figure: renders the 3D figure and lets you scrub through the homepage
// scenes with a slider, to check poses, transitions and motion before the
// figure goes on the homepage.
import * as THREE from 'three';
import { add, armTo, blend, DESK, Figure, pedalLegs, POSES, type Pose } from './figure3d';

const ORDER = ['stand', 'run', 'bike', 'desk', 'read'];

const stage = document.querySelector<HTMLElement>('.lab-stage')!;
const slider = document.querySelector<HTMLInputElement>('#scene')!;
const motionToggle = document.querySelector<HTMLInputElement>('#motion')!;
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-goto]');

// --- Three.js setup -------------------------------------------------------
const css = getComputedStyle(document.documentElement);
const colour = (name: string) => css.getPropertyValue(name).trim();
const ACCENT = colour('--accent');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
camera.position.set(0.8, 1.3, 4.6);
camera.lookAt(0.1, 0.85, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x20242a, 1.3));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2, 4, 3);
scene.add(key);
// A green rim light from behind, for the dark-and-techy look.
const rim = new THREE.DirectionalLight(ACCENT, 1.2);
rim.position.set(-3, 2, -3);
scene.add(rim);

const figure = new Figure({ body: colour('--text-heading'), accent: ACCENT, bg: colour('--bg') });
scene.add(figure.root);

function resize() {
	const { width, height } = stage.getBoundingClientRect();
	renderer.setSize(width, height, false);
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

// --- Motion loops -----------------------------------------------------------
// Each scene's motion is a function of time that returns offsets to add to
// the scroll pose. It's blended in by how close the slider is to that scene,
// so motion fades in as you arrive and out as you leave: no starting,
// stopping or snapping.
const cycle = (t: number, period: number) => Math.sin((2 * Math.PI * t) / period);

function mirrored(p: Pose): Pose {
	return {
		...p,
		rShX: p.lShX, lShX: p.rShX, rEl: p.lEl, lEl: p.rEl,
		rHipX: p.lHipX, lHipX: p.rHipX, rKnee: p.lKnee, lKnee: p.rKnee,
	};
}
const runA = POSES.run;
const runB = mirrored(runA);

const loops: Record<string, (t: number, base: Pose) => Partial<Pose>> = {
	// Wave the right forearm; the cape sways at half the speed.
	stand: (t) => ({ rElZ: 0.28 * cycle(t, 0.9), capeSwing: 0.1 * cycle(t, 1.8) }),
	// Stride: swing smoothly between the pose and its mirror image.
	run: (t) => {
		const s = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 0.7);
		const out: Partial<Pose> = {};
		for (const k of ['rShX', 'lShX', 'rEl', 'lEl', 'rHipX', 'lHipX', 'rKnee', 'lKnee'] as const) {
			out[k] = (runB[k] - runA[k]) * s;
		}
		return out;
	},
	// Pedal: turn the crank and solve each leg onto its pedal.
	bike: (t, base) => {
		const crank = (2 * Math.PI * t) / 0.9;
		const { right, left } = pedalLegs(crank);
		return {
			crank,
			rHipX: right.root - base.rHipX, rKnee: right.bend - base.rKnee,
			lHipX: left.root - base.lHipX, lKnee: left.bend - base.lKnee,
		};
	},
	// Type: hands take turns lifting off the desk.
	desk: (t, base) => {
		const lift = (phase: number) => 0.03 * Math.max(0, cycle(t + phase, 0.24));
		const sit = base.hipsY;
		const r = armTo({ z: DESK.hands.z, y: DESK.hands.y + lift(0) }, base.lean, sit);
		const l = armTo({ z: DESK.hands.z, y: DESK.hands.y + lift(0.12) }, base.lean, sit);
		return { rShX: r.root - base.rShX, rEl: r.bend - base.rEl, lShX: l.root - base.lShX, lEl: l.bend - base.lEl };
	},
	// Read: the brain bursts out of the head, hangs, and collapses back in.
	read: (t) => {
		const phase = (t % 3) / 3;
		const backOut = (x: number) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
		let brain = 0;
		if (phase > 0.15 && phase < 0.4) brain = backOut((phase - 0.15) / 0.25);
		else if (phase >= 0.4 && phase < 0.75) brain = 1;
		else if (phase >= 0.75 && phase < 0.93) brain = 1 - ((phase - 0.75) / 0.18) ** 2;
		return { brain };
	},
};

function scale(offsets: Partial<Pose>, w: number): Partial<Pose> {
	const out: Partial<Pose> = {};
	for (const [k, v] of Object.entries(offsets)) out[k as keyof Pose] = (v as number) * w;
	return out;
}

// --- Frame loop --------------------------------------------------------------
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clock = new THREE.Clock();

function frame() {
	const position = Number(slider.value);
	const i = Math.min(Math.floor(position), ORDER.length - 2);
	const base = blend(POSES[ORDER[i]], POSES[ORDER[i + 1]], position - i);

	// Motion weight: full within 0.15 of a scene, fading out by 0.35.
	const nearest = Math.round(position);
	const distance = Math.abs(position - nearest);
	const weight = Math.max(0, Math.min(1, (0.35 - distance) / 0.2));
	const moving = motionToggle.checked && !reducedMotion.matches && weight > 0;
	const offsets = moving ? scale(loops[ORDER[nearest]](clock.getElapsedTime(), base), weight) : {};

	figure.apply(add(base, offsets));
	renderer.render(scene, camera);
	requestAnimationFrame(frame);
}
frame();

// Scene buttons glide the slider to their scene.
for (const button of buttons) {
	button.addEventListener('click', () => {
		const target = Number(button.dataset.goto);
		const start = Number(slider.value);
		const t0 = performance.now();
		const glide = (now: number) => {
			const k = Math.min(1, (now - t0) / 900);
			const eased = 0.5 - 0.5 * Math.cos(Math.PI * k);
			slider.value = String(start + (target - start) * eased);
			if (k < 1) requestAnimationFrame(glide);
		};
		requestAnimationFrame(glide);
	});
}
