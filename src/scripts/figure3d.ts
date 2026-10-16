// The 3D figure: a humanoid built from simple shapes with a joint hierarchy,
// its props (cape, running gear, bike, desk, book, brain), the scene poses,
// and the inverse kinematics (IK) that places hands and feet.
//
// Units are metres-ish; the figure stands on y = 0 and faces +z. "Turning"
// to side-on rotates it to face +x (screen right). Limb angles are rotations
// about the joint's x axis (pitch): negative swings a limb forward, positive
// back; knees bend positive, elbows bend negative.
import * as THREE from 'three';

// --- Body measurements --------------------------------------------------
const HIP_HEIGHT = 0.95;
const HIP_TO_SHOULDER = 0.5;
const SHOULDER_WIDTH = 0.2; // half, from the spine
const HIP_WIDTH = 0.1; // half
const UPPER_ARM = 0.3;
const FOREARM = 0.28;
const THIGH = 0.45;
const SHIN = 0.45;
const LIMB_RADIUS = 0.045;

// --- Poses ---------------------------------------------------------------
// Every field is a plain number, so GSAP can tween between poses and loops
// can add offsets on top. Prop fields (cape, run, ...) are 0-1 visibility.
export type Pose = {
	turn: number; // 0 = facing the viewer, 1 = side-on facing right (in quarter turns)
	hipsY: number; // lower the hips (sitting)
	lean: number; // torso pitch
	neck: number; // head pitch (positive = look down)
	headTilt: number; // head roll
	rShX: number; rShZ: number; rEl: number; rElZ: number;
	lShX: number; lShZ: number; lEl: number; lElZ: number;
	rHipX: number; rHipZ: number; rKnee: number;
	lHipX: number; lHipZ: number; lKnee: number;
	cape: number; capeSwing: number;
	run: number; bike: number; desk: number; book: number;
	brain: number; // 0 = inside the skull, 1 = exploded
	crank: number; // crank angle, radians
};

export const ZERO: Pose = {
	turn: 0, hipsY: 0, lean: 0, neck: 0, headTilt: 0,
	rShX: 0, rShZ: 0, rEl: 0, rElZ: 0,
	lShX: 0, lShZ: 0, lEl: 0, lElZ: 0,
	rHipX: 0, rHipZ: 0, rKnee: 0,
	lHipX: 0, lHipZ: 0, lKnee: 0,
	cape: 0, capeSwing: 0, run: 0, bike: 0, desk: 0, book: 0, brain: 0, crank: 0,
};

const KEYS = Object.keys(ZERO) as (keyof Pose)[];

export function blend(a: Pose, b: Pose, t: number): Pose {
	const out = { ...ZERO };
	for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
	return out;
}

export function add(a: Pose, b: Partial<Pose>): Pose {
	const out = { ...a };
	for (const k of KEYS) out[k] += b[k] ?? 0;
	return out;
}

// --- Inverse kinematics ---------------------------------------------------
// Two-bone IK in the figure's side plane (z forward, y up). Given a joint's
// position and a target for the end of the limb, returns the root angle and
// the middle joint's bend, using the law of cosines. `bendForward` picks
// which way the middle joint points: knees forward, elbows back.
type Point = { z: number; y: number };

function twoBone(from: Point, to: Point, a: number, b: number, bendForward: boolean) {
	const dz = to.z - from.z;
	const dy = to.y - from.y;
	const d = Math.min(Math.hypot(dz, dy), a + b - 1e-4);
	// A limb at rest points straight down; pitch θ moves it to (-sin θ, -cos θ).
	const base = Math.atan2(-dz, -dy);
	const atRoot = Math.acos((a * a + d * d - b * b) / (2 * a * d));
	const atEnd = Math.acos((b * b + d * d - a * a) / (2 * b * d));
	return bendForward
		? { root: base - atRoot, bend: atRoot + atEnd }
		: { root: base + atRoot, bend: -(atRoot + atEnd) };
}

// Legs: from the hip to a foot target, knees forward.
export function legTo(foot: Point, hipsY = 0) {
	return twoBone({ z: 0, y: HIP_HEIGHT + hipsY }, foot, THIGH, SHIN, true);
}

// Arms: from the shoulder to a hand target, elbows back. The shoulder moves
// with the torso lean, and the answer is relative to the torso.
export function armTo(hand: Point, lean: number, hipsY = 0) {
	const shoulder = {
		z: Math.sin(lean) * HIP_TO_SHOULDER,
		y: HIP_HEIGHT + hipsY + Math.cos(lean) * HIP_TO_SHOULDER,
	};
	// Express the target in the leaning torso's frame.
	const dz = hand.z - shoulder.z;
	const dy = hand.y - shoulder.y;
	const local = {
		z: dy * Math.sin(-lean) + dz * Math.cos(-lean),
		y: dy * Math.cos(-lean) - dz * Math.sin(-lean),
	};
	return twoBone({ z: 0, y: 0 }, local, UPPER_ARM, FOREARM, false);
}

// --- Bike and desk layout (figure coordinates) -----------------------------
export const BIKE = {
	rearHub: { z: -0.47, y: 0.33 },
	frontHub: { z: 0.62, y: 0.33 },
	crank: { z: 0.1, y: 0.3 },
	crankLength: 0.17,
	seat: { z: -0.04, y: 0.9 },
	headTop: { z: 0.5, y: 0.96 },
	headBottom: { z: 0.47, y: 0.8 },
	grip: { z: 0.6, y: 1.02 },
	wheelRadius: 0.33,
};

export const DESK = {
	seatY: 0.6,
	topY: 0.76,
	hands: { z: 0.5, y: 0.82 },
	feet: { z: 0.3, y: 0.06 },
};

const BOOK_HANDS = { z: 0.36, y: 1.22 };

// Feet on the pedals for a crank angle: right foot on one pedal, left on
// the opposite one.
export function pedalLegs(crank: number) {
	const pedal = (a: number) => ({
		z: BIKE.crank.z + BIKE.crankLength * Math.cos(a),
		y: BIKE.crank.y + BIKE.crankLength * Math.sin(a),
	});
	return { right: legTo(pedal(crank)), left: legTo(pedal(crank + Math.PI)) };
}

// --- Scene poses ------------------------------------------------------------
function poseWith(p: Partial<Pose>): Pose {
	return { ...ZERO, ...p };
}

const bikeLean = 0.7;
const bikeArms = armTo(BIKE.grip, bikeLean);
const bikeLegs = pedalLegs(0);
const deskSit = DESK.seatY - HIP_HEIGHT;
const deskArms = armTo(DESK.hands, 0.05, deskSit);
const deskLegs = legTo(DESK.feet, deskSit);
const bookArms = armTo(BOOK_HANDS, 0);

export const POSES: Record<string, Pose> = {
	// Facing the viewer, caped, waving with the right hand (viewer's left).
	stand: poseWith({
		headTilt: 0.12,
		rShZ: -2.5, rElZ: 0.35,
		lShZ: 0.12,
		rHipZ: -0.05, lHipZ: 0.05,
		cape: 1,
	}),
	// Side scenes turn three-quarters rather than fully side-on, so the
	// figure and props show their depth.
	run: poseWith({
		turn: 0.8, lean: 0.2,
		rShX: -0.8, rEl: -1.5, lShX: 0.7, lEl: -1.4,
		rHipX: -0.75, rKnee: 0.35, lHipX: 0.45, lKnee: 1.3,
		run: 1,
	}),
	bike: poseWith({
		turn: 0.8, lean: bikeLean, neck: -0.35,
		rShX: bikeArms.root, rEl: bikeArms.bend, lShX: bikeArms.root, lEl: bikeArms.bend,
		rHipX: bikeLegs.right.root, rKnee: bikeLegs.right.bend,
		lHipX: bikeLegs.left.root, lKnee: bikeLegs.left.bend,
		bike: 1,
	}),
	// Desk: turned slightly away, an over-the-shoulder view of the screen.
	desk: poseWith({
		turn: 1.35, hipsY: deskSit, lean: 0.05, neck: 0.1,
		rShX: deskArms.root, rEl: deskArms.bend, lShX: deskArms.root, lEl: deskArms.bend,
		rHipX: deskLegs.root, rKnee: deskLegs.bend, lHipX: deskLegs.root, lKnee: deskLegs.bend,
		desk: 1,
	}),
	read: poseWith({
		turn: 0.8, neck: 0.35,
		rShX: bookArms.root, rEl: bookArms.bend, lShX: bookArms.root, lEl: bookArms.bend,
		book: 1,
	}),
};

// --- Building the model -----------------------------------------------------
export type Colours = { body: string; accent: string; bg: string };

function capsule(length: number, radius: number, material: THREE.Material) {
	// A limb hanging down from its joint at the origin.
	const geometry = new THREE.CapsuleGeometry(radius, length, 6, 12);
	geometry.translate(0, -length / 2, 0);
	return new THREE.Mesh(geometry, material);
}

// A tube between two points in the figure's side plane.
function tube(a: Point, b: Point, radius: number, material: THREE.Material, x = 0) {
	const start = new THREE.Vector3(x, a.y, a.z);
	const end = new THREE.Vector3(x, b.y, b.z);
	const length = start.distanceTo(end);
	const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
	mesh.position.copy(start).lerp(end, 0.5);
	mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
	return mesh;
}

// Fades a group in and out by toggling transparency on its own materials.
function fader(group: THREE.Object3D) {
	const materials = new Set<THREE.Material>();
	group.traverse((o) => {
		const mesh = o as THREE.Mesh;
		if (mesh.isMesh) {
			mesh.material = (mesh.material as THREE.Material).clone();
			materials.add(mesh.material as THREE.Material);
		}
	});
	return (opacity: number) => {
		group.visible = opacity > 0.01;
		for (const m of materials) {
			m.transparent = opacity < 0.99;
			m.opacity = opacity;
		}
	};
}

export class Figure {
	root = new THREE.Group();
	private hips = new THREE.Group();
	private torso = new THREE.Group();
	private neck = new THREE.Group();
	private head = new THREE.Group();
	private shoulder = { r: new THREE.Group(), l: new THREE.Group() };
	private elbow = { r: new THREE.Group(), l: new THREE.Group() };
	private hip = { r: new THREE.Group(), l: new THREE.Group() };
	private knee = { r: new THREE.Group(), l: new THREE.Group() };
	private capePivot = new THREE.Group();
	private crankArm = new THREE.Group();
	private wheels: THREE.Group[] = [];
	private brainParts: { mesh: THREE.Mesh; out: THREE.Vector3 }[] = [];
	private handMarker = new THREE.Object3D();
	private bookGroup = new THREE.Group();
	private fade: Record<'cape' | 'run' | 'bike' | 'desk' | 'book', (o: number) => void>;
	private brainFade: (o: number) => void;

	constructor(colours: Colours) {
		const body = new THREE.MeshStandardMaterial({ color: colours.body, roughness: 0.55 });
		const accent = new THREE.MeshStandardMaterial({
			color: colours.accent,
			emissive: colours.accent,
			emissiveIntensity: 0.35,
			roughness: 0.4,
		});
		const dark = new THREE.MeshStandardMaterial({ color: colours.bg, roughness: 0.8 });

		// Skeleton: root (on the ground) > hips > torso > neck > head, with
		// shoulders on the torso and hips holding the legs.
		this.root.add(this.hips);
		this.hips.position.y = HIP_HEIGHT;
		this.hips.add(this.torso);

		const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 6, 16), body);
		chest.scale.set(1.35, 1, 0.75);
		chest.position.y = 0.27;
		this.torso.add(chest);

		this.neck.position.y = HIP_TO_SHOULDER + 0.06;
		this.torso.add(this.neck);
		this.head.position.y = 0.14;
		this.neck.add(this.head);
		this.head.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), body));

		for (const side of ['r', 'l'] as const) {
			const x = side === 'r' ? -1 : 1; // the figure's right is -x
			const s = this.shoulder[side];
			s.position.set(x * SHOULDER_WIDTH, HIP_TO_SHOULDER, 0);
			this.torso.add(s);
			s.add(capsule(UPPER_ARM, LIMB_RADIUS, body));
			const e = this.elbow[side];
			e.position.y = -UPPER_ARM;
			s.add(e);
			e.add(capsule(FOREARM, LIMB_RADIUS * 0.9, body));

			const h = this.hip[side];
			h.position.set(x * HIP_WIDTH, 0, 0);
			this.hips.add(h);
			h.add(capsule(THIGH, LIMB_RADIUS * 1.15, body));
			const k = this.knee[side];
			k.position.y = -THIGH;
			h.add(k);
			k.add(capsule(SHIN, LIMB_RADIUS, body));
		}
		this.handMarker.position.y = -FOREARM;
		this.elbow.r.add(this.handMarker);

		// Cape: the back half of a flared cone hanging from the shoulders.
		const capeGeometry = new THREE.CylinderGeometry(0.17, 0.34, 0.85, 24, 1, true, Math.PI / 2, Math.PI);
		capeGeometry.translate(0, -0.425, 0);
		const capeMaterial = accent.clone();
		capeMaterial.side = THREE.DoubleSide;
		const cape = new THREE.Mesh(capeGeometry, capeMaterial);
		this.capePivot.position.set(0, HIP_TO_SHOULDER + 0.02, -0.02);
		this.capePivot.add(cape);
		this.torso.add(this.capePivot);

		// Running gear: a headband, and shoes on the shins.
		const headband = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.018, 8, 32), accent);
		headband.rotation.x = Math.PI / 2;
		headband.position.y = 0.04;
		this.head.add(headband);
		const shoes = (['r', 'l'] as const).map((side) => {
			const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.2), accent);
			shoe.position.set(0, -SHIN - 0.02, 0.05);
			this.knee[side].add(shoe);
			return shoe;
		});

		// Bike, built in figure coordinates so it turns with the figure.
		const bike = new THREE.Group();
		const helmet = new THREE.Mesh(
			new THREE.SphereGeometry(0.135, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
			accent,
		);
		helmet.scale.set(1, 0.85, 1.3);
		helmet.position.set(0, 0.02, -0.02);
		this.head.add(helmet);
		const B = BIKE;
		const frame = [
			[B.rearHub, B.crank], [B.crank, B.seat], [B.rearHub, B.seat],
			[B.seat, B.headTop], [B.crank, B.headBottom], [B.headTop, B.frontHub],
			[B.headTop, { z: B.grip.z, y: B.grip.y }],
		] as const;
		for (const [a, b] of frame) bike.add(tube(a, b, 0.018, accent));
		const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8), accent);
		bar.rotation.z = Math.PI / 2;
		bar.position.set(0, B.grip.y, B.grip.z);
		bike.add(bar);
		const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.24), accent);
		saddle.position.set(0, B.seat.y + 0.02, B.seat.z);
		bike.add(saddle);
		for (const hub of [B.rearHub, B.frontHub]) {
			const wheel = new THREE.Group();
			wheel.position.set(0, hub.y, hub.z);
			const rim = new THREE.Mesh(new THREE.TorusGeometry(B.wheelRadius, 0.016, 8, 48), accent);
			rim.rotation.y = Math.PI / 2;
			wheel.add(rim);
			for (let i = 0; i < 4; i++) {
				const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, B.wheelRadius * 2, 4), accent);
				spoke.rotation.x = (i * Math.PI) / 4;
				wheel.add(spoke);
			}
			bike.add(wheel);
			this.wheels.push(wheel);
		}
		this.crankArm.position.set(0, B.crank.y, B.crank.z);
		const crankBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, B.crankLength * 2), accent);
		this.crankArm.add(crankBar);
		const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 24), accent);
		ring.rotation.y = Math.PI / 2;
		this.crankArm.add(ring);
		bike.add(this.crankArm);
		this.root.add(bike);

		// Desk, monitor and stool.
		const desk = new THREE.Group();
		const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.035, 0.5), accent);
		top.position.set(0, DESK.topY, 0.72);
		desk.add(top);
		for (const x of [-0.36, 0.36]) {
			desk.add(tube({ z: 0.92, y: DESK.topY }, { z: 0.92, y: 0 }, 0.015, accent, x));
		}
		const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.03), accent);
		monitor.position.set(0, DESK.topY + 0.28, 0.88);
		desk.add(monitor);
		const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.26), dark);
		screen.position.set(0, DESK.topY + 0.28, 0.864);
		screen.rotation.y = Math.PI;
		desk.add(screen);
		for (const [w, y] of [[0.22, 0.07], [0.3, 0.02], [0.16, -0.03]] as const) {
			const line = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.018), accent);
			line.position.set(0.08 - w / 2 + 0.05, DESK.topY + 0.28 + y, 0.862);
			line.rotation.y = Math.PI;
			desk.add(line);
		}
		desk.add(tube({ z: 0.88, y: DESK.topY }, { z: 0.88, y: DESK.topY + 0.12 }, 0.015, accent));
		const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), accent);
		seat.position.set(0, DESK.seatY - 0.06, -0.02);
		desk.add(seat);
		desk.add(tube({ z: -0.02, y: DESK.seatY - 0.06 }, { z: -0.02, y: 0 }, 0.02, accent));
		const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), accent);
		base.position.set(0, 0.01, -0.02);
		desk.add(base);
		this.root.add(desk);

		// Open book, positioned at the right hand every frame.
		for (const side of [-1, 1]) {
			const page = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.27, 0.012), accent);
			page.position.x = side * 0.1;
			const pivot = new THREE.Group();
			pivot.rotation.y = side * 0.35;
			pivot.add(page);
			this.bookGroup.add(pivot);
		}
		this.root.add(this.bookGroup);

		// Brain: parts that burst out of the head and fly back in.
		const brain = new THREE.Group();
		const parts: [number, number, number, number, number, number][] = [
			// size x, y, z, then exploded offset (x, y, z), figure facing +z
			[0.07, 0.05, 0.08, 0, 0.18, 0.2], // frontal
			[0.08, 0.04, 0.07, 0, 0.3, 0], // parietal
			[0.06, 0.05, 0.05, 0, 0.18, -0.22], // occipital
			[0.08, 0.035, 0.06, 0.25, 0.02, 0.08], // temporal
			[0.055, 0.04, 0.045, -0.2, -0.05, -0.18], // cerebellum
			[0.025, 0.07, 0.025, 0, -0.25, -0.05], // brainstem
		];
		for (const [sx, sy, sz, ox, oy, oz] of parts) {
			const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), accent);
			mesh.scale.set(sx, sy, sz);
			brain.add(mesh);
			this.brainParts.push({ mesh, out: new THREE.Vector3(ox, oy, oz) });
		}
		this.head.add(brain);

		// Several pieces can share one visibility value.
		const together = (...objects: THREE.Object3D[]) => {
			const faders = objects.map(fader);
			return (o: number) => faders.forEach((f) => f(o));
		};
		this.fade = {
			cape: fader(this.capePivot),
			run: together(headband, ...shoes),
			bike: together(bike, helmet),
			desk: fader(desk),
			book: fader(this.bookGroup),
		};
		this.brainFade = fader(brain);
	}

	apply(p: Pose) {
		this.root.rotation.y = p.turn * (Math.PI / 2);
		this.hips.position.y = HIP_HEIGHT + p.hipsY;
		this.torso.rotation.x = p.lean;
		this.neck.rotation.x = p.neck;
		this.head.rotation.z = p.headTilt;
		this.shoulder.r.rotation.set(p.rShX, 0, p.rShZ);
		this.shoulder.l.rotation.set(p.lShX, 0, p.lShZ);
		this.elbow.r.rotation.set(p.rEl, 0, p.rElZ);
		this.elbow.l.rotation.set(p.lEl, 0, p.lElZ);
		this.hip.r.rotation.set(p.rHipX, 0, p.rHipZ);
		this.hip.l.rotation.set(p.lHipX, 0, p.lHipZ);
		this.knee.r.rotation.x = p.rKnee;
		this.knee.l.rotation.x = p.lKnee;
		this.capePivot.rotation.x = -0.15 - p.capeSwing;
		this.crankArm.rotation.x = p.crank;
		for (const w of this.wheels) w.rotation.x = p.crank * 1.6;

		this.fade.cape(p.cape);
		this.fade.run(p.run);
		this.fade.bike(p.bike);
		this.fade.desk(p.desk);
		this.fade.book(p.book);

		// Book: held up in the hands, pages tilted back toward the face.
		this.root.updateMatrixWorld(true);
		const hand = this.root.worldToLocal(this.handMarker.getWorldPosition(new THREE.Vector3()));
		this.bookGroup.position.set(0, hand.y + 0.1, hand.z + 0.02);
		this.bookGroup.rotation.x = -0.35;

		const b = p.brain;
		this.brainFade(Math.min(1, b * 3));
		for (const { mesh, out } of this.brainParts) {
			mesh.position.copy(out).multiplyScalar(b);
			mesh.position.y += 0.02;
		}
	}
}
