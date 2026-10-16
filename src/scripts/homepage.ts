// Homepage scroll behaviour: poses the figure from scroll position, plays each
// scene's motion loop, and fades the text panel.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// One pose per scene id (see `scenes` in src/pages/index.astro). Angles are in
// degrees. Side-on the figure faces right, so negative limb angles swing
// forward; knee angles bend the shin back from the thigh (positive = bent). The intro pose faces the viewer: limbs shift sideways (the *X
// offsets, in px) and the torso widens (torsoW) instead.
type Pose = {
	torso: number;
	armL: number;
	armR: number;
	legL: number;
	legR: number;
	kneeL: number;
	kneeR: number;
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
	headTilt: number;
	front: number;
};

const rest: Pose = {
	torso: 0, armL: 8, armR: -8, legL: 4, legR: -4, kneeL: 0, kneeR: 0,
	headX: 0, headY: 0, bodyY: 0, bike: 0, desk: 0, book: 0, gear: 0,
	armLX: 0, armRX: 0, legLX: 0, legRX: 0, torsoW: 1, headTilt: 0, front: 0,
};

const poses: Record<string, Pose> = {
	// Facing forward, waving with the figure's right hand (on the viewer's left).
	stand: {
		...rest,
		front: 1,
		torsoW: 1.5,
		headTilt: -8,
		armRX: -20, armR: 145,
		armLX: 20, armL: -10,
		legRX: -9, legR: 4,
		legLX: 9, legL: -4,
	},
	run: { ...rest, torso: 4, armL: 40, armR: -45, legL: 30, legR: -35, kneeL: 35, kneeR: 10, gear: 1 },
	// Hands on the handlebar grips; legs are set from the pedals below.
	bike: { ...rest, torso: 40, armL: -43, armR: -45, bike: 1 },
	// Seated on the stool: thighs forward, shins hanging down to the floor.
	desk: { ...rest, armL: -65, armR: -75, legL: -85, legR: -80, kneeL: 85, kneeR: 80, bodyY: 34, desk: 1 },
	read: { ...rest, armL: -70, armR: -78, headX: 4, headY: 6, book: 1 },
};

// Pedalling: two-bone inverse kinematics. Given where a foot must be (on a
// pedal), find the thigh angle and knee bend that put it there, with the
// knee pointing forward. Positions are in the figure's own px (the hip pivot
// and crank match the CSS and the bike SVG in index.astro).
const HIP = { x: 100, y: 143 };
const CRANK = { x: 106, y: 212, length: 11 };
const THIGH = 40;
const SHIN = 40;
const deg = (rad: number) => (rad * 180) / Math.PI;

function legToward(foot: { x: number; y: number }) {
	const dx = foot.x - HIP.x;
	const dy = foot.y - HIP.y;
	const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 0.01);
	// Angle of the hip→foot line, in CSS rotation terms (0 = straight down).
	const line = Math.atan2(-dx, dy);
	// Law of cosines: the angles at the hip and at the foot of the triangle.
	const atHip = Math.acos((THIGH ** 2 + d ** 2 - SHIN ** 2) / (2 * THIGH * d));
	const atFoot = Math.acos((SHIN ** 2 + d ** 2 - THIGH ** 2) / (2 * SHIN * d));
	return { thigh: deg(line - atHip), knee: deg(atHip + atFoot) };
}

// Feet for a crank angle (degrees, clockwise): near foot on one pedal, far
// foot on the opposite one.
function pedalLegs(crankDeg: number) {
	const a = (crankDeg * Math.PI) / 180;
	const pedal = (angle: number) => ({
		x: CRANK.x + CRANK.length * Math.cos(angle),
		y: CRANK.y + CRANK.length * Math.sin(angle),
	});
	return { near: legToward(pedal(a)), far: legToward(pedal(a + Math.PI)) };
}

{
	const start = pedalLegs(0);
	Object.assign(poses.bike, {
		legR: start.near.thigh,
		kneeR: start.near.knee,
		legL: start.far.thigh,
		kneeL: start.far.knee,
	});
}

const figure = document.querySelector<HTMLElement>('.figure');
const scenes = gsap.utils.toArray<HTMLElement>('.scene');

// Leaning the torso pivots it at the hip, which carries the shoulders and
// head forward and down. These are their distances from the hip pivot (px,
// matching the CSS in index.astro), so the arms and head stay attached
// whatever the lean.
const HIP_TO_SHOULDER = 68;
const HIP_TO_HEAD = 104;

// Side-on, the far arm and leg are drawn in a darker shade; facing the
// viewer (`front`), both sides are the same colour and the cape shows.
const css = getComputedStyle(document.documentElement);
const NEAR = css.getPropertyValue('--text-heading').trim();
const FAR = css.getPropertyValue('--text-muted').trim();

// The GSAP properties to set on each part of the figure for a pose.
function poseVars(p: Pose) {
	const lean = (p.torso * Math.PI) / 180;
	const forward = (dist: number) => dist * Math.sin(lean);
	const down = (dist: number) => dist * (1 - Math.cos(lean));
	const shoulder = { x: forward(HIP_TO_SHOULDER), y: down(HIP_TO_SHOULDER) };
	return [
		['.torso', { rotation: p.torso, scaleX: p.torsoW }],
		['.arm-l', { rotation: p.armL, x: p.armLX + shoulder.x, y: shoulder.y }],
		['.arm-r', { rotation: p.armR, x: p.armRX + shoulder.x, y: shoulder.y }],
		['.leg-l', { rotation: p.legL, x: p.legLX }],
		['.leg-r', { rotation: p.legR, x: p.legRX }],
		['.leg-l .shin', { rotation: p.kneeL }],
		['.leg-r .shin', { rotation: p.kneeR }],
		['.head', { x: p.headX + forward(HIP_TO_HEAD), y: p.headY + down(HIP_TO_HEAD), rotation: p.headTilt }],
		['.cape', { opacity: p.front }],
		['.arm-l, .leg-l', { '--limb-colour': p.front ? NEAR : FAR }],
		['.prop-bike', { opacity: p.bike }],
		['.bike-gear', { opacity: p.bike }],
		['.prop-desk', { opacity: p.desk }],
		['.prop-book', { opacity: p.book }],
		['.gear', { opacity: p.gear }],
	] as const;
}

// Text panel: the intro on the first scene, then "I write about" with the
// active scene's buttons. On the intro the first topic's buttons are already
// selected, so they fade in with the heading.
const intro = document.querySelector('.intro-block');
const topics = document.querySelector('.topics-block');
const groups = gsap.utils.toArray<HTMLElement>('.topic-group');
const group = (id: string) => groups.find((g) => g.dataset.scene === id);

function setText(id: string) {
	const shown = id === 'stand' ? groups[0] : group(id);
	gsap.set(intro, { autoAlpha: id === 'stand' ? 1 : 0 });
	gsap.set(topics, { autoAlpha: id === 'stand' ? 0 : 1 });
	gsap.set(groups, { autoAlpha: 0 });
	gsap.set(shown ?? [], { autoAlpha: 1 });
}

function setPose(p: Pose) {
	for (const [sel, vars] of poseVars(p)) gsap.set(figure!.querySelectorAll(sel), vars);
	gsap.set(figure, { y: p.bodyY });
}

if (figure && scenes.length) {
	setPose(poses.stand);
	setText('stand');
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
		scenes.slice(1).forEach((scene, i) => {
			const id = scene.dataset.scene ?? '';
			const p = poses[id] ?? rest;
			const at = tl.duration();
			// Text: fade the intro out, then "I write about" in; after that, fade
			// the previous scene's buttons out, then this scene's in. autoAlpha
			// also hides faded-out text from clicks and the keyboard.
			if (i === 0) {
				tl.to(intro, { autoAlpha: 0, duration: 0.5 }, at);
				tl.to(topics, { autoAlpha: 1, duration: 0.5 }, at + 0.5);
			} else {
				tl.to(group(scenes[i].dataset.scene ?? '') ?? [], { autoAlpha: 0, duration: 0.5 }, at);
				tl.to(group(id) ?? [], { autoAlpha: 1, duration: 0.5 }, at + 0.5);
			}
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

		// Two waves of the hand per sway of the cape. Every part ends where it
		// started (0 → + → − → 0), so the loop repeats without a jump.
		const wave = loop();
		for (const at of [0, 0.9]) {
			wave
				.to(seg('arm-r'), { rotation: 14, duration: 0.225 }, at)
				.to(seg('arm-r'), { rotation: -14, duration: 0.45 }, at + 0.225)
				.to(seg('arm-r'), { rotation: 0, duration: 0.225 }, at + 0.675);
		}
		wave
			.to('.cape', { skewX: 4, duration: 0.45 }, 0)
			.to('.cape', { skewX: -4, duration: 0.9 }, 0.45)
			.to('.cape', { skewX: 0, duration: 0.45 }, 1.35);

		// The run pose is mid-stride; each limb swings to the opposite extreme,
		// and the knees swap too (the back leg's knee is the bent one).
		const shin = (limb: string) => figure.querySelector(`.${limb} .shin`);
		const calf = (limb: string) => figure.querySelector(`.${limb} .calf`);
		const stride = loop();
		swing(stride, 'leg-l', -65, 0.7);
		swing(stride, 'leg-r', 65, 0.7);
		swing(stride, 'arm-l', -85, 0.7);
		swing(stride, 'arm-r', 85, 0.7);
		const kneeSwap = poses.run.kneeL - poses.run.kneeR;
		stride
			.to(calf('leg-l'), { rotation: -kneeSwap, duration: 0.35 }, 0)
			.to(calf('leg-l'), { rotation: 0, duration: 0.35 }, 0.35)
			.to(calf('leg-r'), { rotation: kneeSwap, duration: 0.35 }, 0)
			.to(calf('leg-r'), { rotation: 0, duration: 0.35 }, 0.35);

		// Pedalling: turn the crank and, every frame, put each foot on its
		// pedal with legToward(). The thigh and knee angles go on the .seg and
		// .calf as offsets from whatever the scroll pose currently has.
		const legs = ['leg-r', 'leg-l'].map((limb) => ({
			leg: figure.querySelector(`.${limb}`)!,
			seg: seg(limb)!,
			shin: shin(limb)!,
			calf: calf(limb)!,
		}));
		const crankArm = figure.querySelector('.crank');
		const crank = { angle: 0 };
		const pedal = loop({ ease: 'none' });
		pedal.fromTo(
			crank,
			{ angle: 0 },
			{
				angle: 360,
				duration: 0.9,
				// Don't apply anything until the bike scene actually starts.
				immediateRender: false,
				onUpdate: () => {
					const { near, far } = pedalLegs(crank.angle);
					[near, far].forEach((target, i) => {
						const { leg, seg, shin, calf } = legs[i];
						gsap.set(seg, { rotation: target.thigh - (gsap.getProperty(leg, 'rotation') as number) });
						gsap.set(calf, { rotation: target.knee - (gsap.getProperty(shin, 'rotation') as number) });
					});
					gsap.set(crankArm, { rotation: crank.angle, svgOrigin: `${CRANK.x} ${CRANK.y}` });
				},
			},
			0,
		);
		pedal.fromTo('.prop-bike .wheel', { rotation: 0 }, { rotation: 360, duration: 0.9, immediateRender: false }, 0);

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
			{ id: 'stand', tl: wave, start: 'top bottom', end: 'bottom 60%', reset: () => gsap.to([seg('arm-r'), '.cape'], { rotation: 0, skewX: 0, duration: 0.3 }) },
			{
				id: 'run',
				tl: stride,
				start: 'top 50%',
				end: 'bottom 50%',
				reset: () =>
					gsap.to([...limbSegs('leg-l', 'leg-r', 'arm-l', 'arm-r'), calf('leg-l'), calf('leg-r')], {
						rotation: 0,
						duration: 0.3,
					}),
			},
			{
				id: 'bike',
				tl: pedal,
				start: 'top 50%',
				end: 'bottom 50%',
				reset: () => gsap.to([...limbSegs('leg-l', 'leg-r'), calf('leg-l'), calf('leg-r')], { rotation: 0, duration: 0.3 }),
			},
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
				onToggle: (self) => {
					if (!self.isActive) return;
					setPose(poses[scene.dataset.scene ?? ''] ?? rest);
					setText(scene.dataset.scene ?? '');
				},
			});
		});
	});
}
