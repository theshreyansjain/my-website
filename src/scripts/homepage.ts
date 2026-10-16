// Homepage scroll behaviour: poses the placeholder figure from scroll position.
// Step 5 swaps the placeholder for the Three.js figure but keeps this setup.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// One pose per scene id (see `scenes` in src/pages/index.astro). Angles are in
// degrees; the figure faces right, so negative limb angles swing forward.
type Pose = {
	torso: number;
	armL: number;
	armR: number;
	legL: number;
	legR: number;
	headX: number;
	headY: number;
	bodyY: number;
	bike: number;
	desk: number;
	book: number;
};

const rest: Pose = {
	torso: 0, armL: 8, armR: -8, legL: 4, legR: -4,
	headX: 0, headY: 0, bodyY: 0, bike: 0, desk: 0, book: 0,
};

const poses: Record<string, Pose> = {
	stand: rest,
	run: { ...rest, torso: 12, armL: 40, armR: -45, legL: 30, legR: -35, headX: 12 },
	bike: { ...rest, torso: 40, armL: -60, armR: -65, legL: -70, legR: -25, headX: 34, headY: 16, bodyY: 26, bike: 1 },
	desk: { ...rest, armL: -65, armR: -75, legL: -85, legR: -80, bodyY: 34, desk: 1 },
	read: { ...rest, armL: -110, armR: -100, headY: 4, book: 1 },
};

const figure = document.querySelector<HTMLElement>('.figure');
const scenes = gsap.utils.toArray<HTMLElement>('.scene');

// The GSAP properties to set on each part of the figure for a pose.
function poseVars(p: Pose) {
	return [
		['.torso', { rotation: p.torso }],
		['.arm-l', { rotation: p.armL }],
		['.arm-r', { rotation: p.armR }],
		['.leg-l', { rotation: p.legL }],
		['.leg-r', { rotation: p.legR }],
		['.head', { x: p.headX, y: p.headY }],
		['.prop-bike', { opacity: p.bike }],
		['.prop-desk', { opacity: p.desk }],
		['.prop-book', { opacity: p.book }],
	] as const;
}

function setPose(p: Pose) {
	for (const [sel, vars] of poseVars(p)) gsap.set(figure!.querySelectorAll(sel), vars);
	gsap.set(figure, { y: p.bodyY });
}

if (figure && scenes.length) {
	setPose(rest);
	const mm = gsap.matchMedia();

	// Normal motion: one timeline across the whole homepage, scrubbed by
	// scroll. Each scene gets a pose transition followed by a short hold.
	mm.add('(prefers-reduced-motion: no-preference)', () => {
		const tl = gsap.timeline({
			defaults: { ease: 'none', duration: 1 },
			scrollTrigger: {
				trigger: '.home',
				start: 'top top',
				end: 'bottom bottom',
				scrub: 0.5,
			},
		});
		tl.to({}, { duration: 0.5 }); // hold on the intro
		scenes.slice(1).forEach((scene) => {
			const p = poses[scene.dataset.scene ?? ''] ?? rest;
			const at = tl.duration();
			for (const [sel, vars] of poseVars(p)) {
				tl.to(figure.querySelectorAll(sel), vars, at);
			}
			tl.to(figure, { y: p.bodyY }, at);
			tl.to({}, { duration: 0.5 }); // hold the pose
		});
	});

	// Reduced motion: no animation, just switch poses when a scene is active.
	mm.add('(prefers-reduced-motion: reduce)', () => {
		scenes.forEach((scene) => {
			ScrollTrigger.create({
				trigger: scene,
				start: 'top center',
				end: 'bottom center',
				onToggle: (self) => self.isActive && setPose(poses[scene.dataset.scene ?? ''] ?? rest),
			});
		});
	});
}
