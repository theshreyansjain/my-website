// Homepage scroll behaviour: poses the placeholder figure from scroll position.
// Step 5 swaps the placeholder for the Three.js figure but keeps this setup.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// One pose per scene id (see `scenes` in src/pages/index.astro). Angles are in
// degrees. Side-on the figure faces right, so negative limb angles swing
// forward. The intro pose faces the viewer: limbs shift sideways (the *X
// offsets, in px) and the torso widens (torsoW) instead.
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
	gear: number;
	armLX: number;
	armRX: number;
	legLX: number;
	legRX: number;
	torsoW: number;
};

const rest: Pose = {
	torso: 0, armL: 8, armR: -8, legL: 4, legR: -4,
	headX: 0, headY: 0, bodyY: 0, bike: 0, desk: 0, book: 0, gear: 0,
	armLX: 0, armRX: 0, legLX: 0, legRX: 0, torsoW: 1,
};

const poses: Record<string, Pose> = {
	// Facing forward, waving with the figure's right hand (on the viewer's left).
	stand: {
		...rest,
		torsoW: 1.5,
		armRX: -22, armR: 160,
		armLX: 22, armL: -6,
		legRX: -8, legR: 3,
		legLX: 8, legL: -3,
	},
	run: { ...rest, torso: 12, armL: 40, armR: -45, legL: 30, legR: -35, headX: 12, gear: 1 },
	bike: { ...rest, torso: 40, armL: -60, armR: -65, legL: -70, legR: -25, headX: 34, headY: 16, bodyY: 26, bike: 1 },
	desk: { ...rest, armL: -65, armR: -75, legL: -85, legR: -80, bodyY: 34, desk: 1 },
	read: { ...rest, armL: -70, armR: -78, headX: 4, headY: 6, book: 1 },
};

const figure = document.querySelector<HTMLElement>('.figure');
const scenes = gsap.utils.toArray<HTMLElement>('.scene');

// The GSAP properties to set on each part of the figure for a pose.
function poseVars(p: Pose) {
	return [
		['.torso', { rotation: p.torso, scaleX: p.torsoW }],
		['.arm-l', { rotation: p.armL, x: p.armLX }],
		['.arm-r', { rotation: p.armR, x: p.armRX }],
		['.leg-l', { rotation: p.legL, x: p.legLX }],
		['.leg-r', { rotation: p.legR, x: p.legRX }],
		['.head', { x: p.headX, y: p.headY }],
		['.prop-bike', { opacity: p.bike }],
		['.prop-desk', { opacity: p.desk }],
		['.prop-book', { opacity: p.book }],
		['.gear', { opacity: p.gear }],
	] as const;
}

function setPose(p: Pose) {
	for (const [sel, vars] of poseVars(p)) gsap.set(figure!.querySelectorAll(sel), vars);
	gsap.set(figure, { y: p.bodyY });
}

if (figure && scenes.length) {
	setPose(poses.stand);
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

	// Motion loops: while a scene is on screen its loop plays (wave, running
	// stride, pedalling, typing, exploding brain). Limb loops rotate the inner .seg of
	// each limb, on top of the scroll pose. Leaving a scene eases its parts
	// back. These are the exception to "no idle animation", at the owner's
	// request.
	mm.add('(prefers-reduced-motion: no-preference)', () => {
		const seg = (limb: string) => figure.querySelector(`.${limb} .seg`);
		const loop = (defaults: gsap.TweenVars = { ease: 'sine.inOut' }) =>
			gsap.timeline({ repeat: -1, paused: true, defaults });

		// Swing a limb to `angle` and back over `duration` seconds.
		const swing = (tl: gsap.core.Timeline, limb: string, angle: number, duration: number) =>
			tl
				.to(seg(limb), { rotation: angle, duration: duration / 2 }, 0)
				.to(seg(limb), { rotation: 0, duration: duration / 2 }, duration / 2);

		const wave = loop()
			.to(seg('arm-r'), { rotation: 14, duration: 0.225 })
			.to(seg('arm-r'), { rotation: -14, duration: 0.45 })
			.to(seg('arm-r'), { rotation: 0, duration: 0.225 });

		// The run pose is mid-stride; each limb swings to the opposite extreme.
		const stride = loop();
		swing(stride, 'leg-l', -65, 0.7);
		swing(stride, 'leg-r', 65, 0.7);
		swing(stride, 'arm-l', -85, 0.7);
		swing(stride, 'arm-r', 85, 0.7);

		const pedal = loop();
		swing(pedal, 'leg-l', 45, 0.8);
		swing(pedal, 'leg-r', -45, 0.8);
		pedal.to('.prop-bike span', { rotation: 360, duration: 0.8, ease: 'none' }, 0);

		// Typing: the hands take turns tapping up and down on the desk.
		const typing = loop({ ease: 'power1.inOut' })
			.to(seg('arm-r'), { rotation: -9, duration: 0.11 })
			.to(seg('arm-r'), { rotation: 0, duration: 0.11 })
			.to(seg('arm-l'), { rotation: -9, duration: 0.11 }, 0.12)
			.to(seg('arm-l'), { rotation: 0, duration: 0.11 }, 0.23)
			.to({}, { duration: 0.06 });

		// Exploded view of the brain: parts burst out of the skull to these
		// offsets (px from the head's centre; the figure faces right), hold,
		// then collapse back in.
		const brainParts: [string, number, number, number][] = [
			['.frontal', 34, -26, -15],
			['.parietal', 0, -44, 0],
			['.occipital', -36, -22, 20],
			['.temporal', 30, 14, 10],
			['.cerebellum', -34, 16, -10],
			['.stem', -6, 36, 0],
		];
		const brain = loop();
		brain.to({}, { duration: 0.5 });
		for (const [sel, x, y, rotation] of brainParts) {
			brain.fromTo(
				figure.querySelector(sel),
				{ x: 0, y: 0, rotation: 0, scale: 0.3, opacity: 0 },
				{ x, y, rotation, scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' },
				0.5,
			);
			brain.to(figure.querySelector(sel), { x: 0, y: 0, rotation: 0, scale: 0.3, opacity: 0, duration: 0.6, ease: 'power2.in' }, 2.2);
		}

		const limbSegs = (...limbs: string[]) => limbs.map(seg);
		const sceneLoops: { id: string; tl: gsap.core.Timeline; start: string; end: string; reset: () => void }[] = [
			{ id: 'stand', tl: wave, start: 'top bottom', end: 'bottom 60%', reset: () => gsap.to(seg('arm-r'), { rotation: 0, duration: 0.3 }) },
			{ id: 'run', tl: stride, start: 'top 50%', end: 'bottom 50%', reset: () => gsap.to(limbSegs('leg-l', 'leg-r', 'arm-l', 'arm-r'), { rotation: 0, duration: 0.3 }) },
			{ id: 'bike', tl: pedal, start: 'top 50%', end: 'bottom 50%', reset: () => gsap.to(limbSegs('leg-l', 'leg-r'), { rotation: 0, duration: 0.3 }) },
			{ id: 'desk', tl: typing, start: 'top 50%', end: 'bottom 50%', reset: () => gsap.to(limbSegs('arm-l', 'arm-r'), { rotation: 0, duration: 0.3 }) },
			{ id: 'read', tl: brain, start: 'top 50%', end: 'bottom 50%', reset: () => gsap.to('.brain', { x: 0, y: 0, rotation: 0, scale: 0.3, opacity: 0, duration: 0.3 }) },
		];
		for (const { id, tl, start, end, reset } of sceneLoops) {
			const scene = scenes.find((el) => el.dataset.scene === id);
			if (!scene) continue;
			ScrollTrigger.create({
				trigger: scene,
				start,
				end,
				onToggle: (self) => {
					if (self.isActive) {
						tl.restart();
					} else {
						tl.pause();
						reset();
					}
				},
			});
		}
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
