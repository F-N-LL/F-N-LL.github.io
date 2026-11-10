// Desktop: the cabinet as a small solar system. Three planets of six pigments,
// drawn through the same Bayer dither as the plates. The juice box stands at
// the top of the scene while the planet turns under it; every specimen is a
// plate set on the ground. Day follows the sun, night brings the moon out.
import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HalfFloatType,
  IcosahedronGeometry,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  OrthographicCamera,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { PIGMENTS } from '../data/pigments';

export type WorldItem = { slug: string; title: string; kind: string; year: string; section: string; room?: string };
export type WorldOptions = {
  root: HTMLElement;
  items: WorldItem[];
  sections: string[];
  open: (i: number) => void;
  select: (section: string) => void;
  reduced: () => boolean;
  active: () => boolean;
  night: boolean;
};
export type World = { travel: (name: string) => void; zoomBy: (f: number) => void; setNight: (on: boolean) => void };

type Pigment = keyof typeof PIGMENTS;
const hex = (k: Pigment) => new Color().setRGB(PIGMENTS[k][0] / 255, PIGMENTS[k][1] / 255, PIGMENTS[k][2] / 255, SRGBColorSpace);
const rgb = (k: Pigment) => new Vector3(PIGMENTS[k][0] / 255, PIGMENTS[k][1] / 255, PIGMENTS[k][2] / 255);

const SEA = -0.45;
const GROUND = 0.25; // height of plazas and roads
const NORTH = new Vector3(0, 1, 0);
const TILT = 0.72; // radians from the pole to each district
const PX = 2; // one dither cell, in CSS pixels

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 4;
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
// Deterministic, so the worlds are the same ones on every visit.
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ═══ The ground ═══
const WAVES: [number, number, number, number, number][] = [
  [3.1, 0.7, 1.9, 0.4, 0.55],
  [-2.3, 4.1, 1.2, 1.7, 0.42],
  [5.7, -3.3, 4.4, 2.9, 0.26],
  [-7.9, 6.3, 8.1, 0.8, 0.12],
];
const relief = (d: Vector3) => WAVES.reduce((h, [x, y, z, p, a]) => h + Math.sin(d.x * x + d.y * y + d.z * z + p) * a, 0);
// Land comes in flat terraces with short cliffs between them.
const terrace = (x: number) => {
  const f = Math.max(0, x) / 1.05;
  const n = Math.floor(f);
  return (n + smooth(0.78, 1, f - n)) * 1.05;
};

type District = { section: string; dir: Vector3; u: Vector3; v: Vector3; ring: number };
const frameAt = (dir: Vector3) => {
  const pole = Math.abs(dir.y) > 0.99;
  const u = pole ? new Vector3(1, 0, 0) : new Vector3().crossVectors(NORTH, dir).normalize();
  const v = new Vector3().crossVectors(u, dir).normalize(); // +v points away from the pole
  return { u, v };
};
// Plates stand on an open arc, leaving the near side free for the hero.
const ARC = 2.2;
const ringFor = (n: number) => Math.max(3.6, (n * 3.1) / (ARC * 2));

function makeGround(R: number, ds: District[], coast: number, ridge?: Vector3) {
  const multi = ds.length > 1;
  const sides = ds.map((z) => new Vector3().crossVectors(NORTH, z.dir).normalize());
  const arc = (d: Vector3, c: Vector3) => d.angleTo(c) * R;
  const along = (d: Vector3, i: number) => multi && d.angleTo(NORTH) < TILT && d.dot(ds[i].dir) > 0.55;
  const road = (d: Vector3, i: number) => Math.abs(Math.asin(d.dot(sides[i]))) * R;
  // 1 on tiled floor
  const paved = (d: Vector3) => {
    let f = multi ? smooth(4.6, 3.3, arc(d, NORTH)) : 0;
    ds.forEach((z, i) => {
      f = Math.max(f, smooth(z.ring + 2.3, z.ring + 1.4, arc(d, z.dir)));
      if (along(d, i)) f = Math.max(f, smooth(1.0, 0.55, road(d, i)));
    });
    return f;
  };
  // 1 wherever the ground is held level: floors, and room around them for buildings
  const level = (d: Vector3) => {
    let f = multi ? smooth(9, 6.4, arc(d, NORTH)) : 0;
    ds.forEach((z, i) => {
      f = Math.max(f, smooth(z.ring + 7.2, z.ring + 5.2, arc(d, z.dir)));
      if (along(d, i)) f = Math.max(f, smooth(2.4, 1.4, road(d, i)));
    });
    return f;
  };
  const height = (d: Vector3) => {
    const lat = d.angleTo(NORTH);
    const edge = coast + relief(d) * 0.13;
    const land = smooth(edge, edge - 0.13, lat);
    let x = 0.8 + relief(d) * 0.75;
    if (ridge) x += Math.exp(-((d.angleTo(ridge) / 0.3) ** 2)) * 3.6;
    const h = lerp(-1.7, terrace(x) + 0.2, land);
    return lerp(h, GROUND, level(d));
  };
  return { height, paved };
}

function terrain(R: number, detail: number, height: (d: Vector3) => number, paved: (d: Vector3) => number) {
  const geo = new IcosahedronGeometry(1, detail);
  const pos = geo.getAttribute('position') as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tones = { cream: hex('cream'), ochre: hex('ochre'), olive: hex('olive'), red: hex('red'), ink: hex('ink') };
  const corners = [new Vector3(), new Vector3(), new Vector3()];
  const heights = [0, 0, 0];
  const c = new Vector3();
  const d = new Vector3();
  for (let f = 0; f < pos.count; f += 3) {
    c.set(0, 0, 0);
    for (let j = 0; j < 3; j++) {
      corners[j].fromBufferAttribute(pos, f + j).normalize();
      heights[j] = height(corners[j]);
      c.add(corners[j]);
    }
    c.normalize();
    const h = (heights[0] + heights[1] + heights[2]) / 3;
    const slope = Math.max(...heights) - Math.min(...heights);
    const n = hash(c.x, c.y, c.z);
    let tone: Color;
    if (paved(c) > 0.55) tone = n > 0.985 ? tones.red : n > 0.86 ? tones.ochre : tones.cream; // laid like a floor
    else if (h < SEA + 0.34) tone = tones.cream; // sand
    else if (slope > 0.42) tone = n > 0.7 ? tones.ink : tones.ochre; // cliffs
    else if (h > 3.4) tone = tones.cream; // snow
    else tone = relief(c.clone().multiplyScalar(1.6)) > 0.34 ? tones.ochre : tones.olive; // meadow and stubble
    for (let j = 0; j < 3; j++) {
      d.copy(corners[j]).multiplyScalar(R + heights[j]);
      pos.setXYZ(f + j, d.x, d.y, d.z);
      colors.set([tone.r, tone.g, tone.b], (f + j) * 3);
    }
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  smoothNormals(geo);
  const mesh = new Mesh(geo, new MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  return mesh;
}
// Faces keep their own colour but share normals, so hills read round.
function smoothNormals(geo: BufferGeometry) {
  const pos = geo.getAttribute('position') as BufferAttribute;
  const sums = new Map<string, Vector3>();
  const key = (i: number) => `${Math.round(pos.getX(i) * 300)},${Math.round(pos.getY(i) * 300)},${Math.round(pos.getZ(i) * 300)}`;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const n = new Vector3();
  for (let f = 0; f < pos.count; f += 3) {
    a.fromBufferAttribute(pos, f);
    b.fromBufferAttribute(pos, f + 1).sub(a);
    c.fromBufferAttribute(pos, f + 2).sub(a);
    n.crossVectors(b, c);
    for (let j = 0; j < 3; j++) {
      const k = key(f + j);
      if (!sums.has(k)) sums.set(k, new Vector3());
      sums.get(k)!.add(n);
    }
  }
  const normals = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    n.copy(sums.get(key(i))!).normalize();
    normals.set([n.x, n.y, n.z], i * 3);
  }
  geo.setAttribute('normal', new BufferAttribute(normals, 3));
}

// ═══ Things that stand on it ═══
const flats = new Map<string, MeshLambertMaterial>();
const softs = new Map<string, MeshLambertMaterial>();
const mat = (k: Pigment) => {
  if (!flats.has(k)) flats.set(k, new MeshLambertMaterial({ color: hex(k), flatShading: true }));
  return flats.get(k)!;
};
const soft = (k: Pigment) => {
  if (!softs.has(k)) softs.set(k, new MeshLambertMaterial({ color: hex(k) }));
  return softs.get(k)!;
};
// Windows and lanterns: dark by day, lit by night.
const lit = new MeshBasicMaterial({ color: hex('ink') });
function shade<T extends Mesh>(m: T, x = 0, y = 0, z = 0) {
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
const box = (w: number, h: number, d: number, k: Pigment, x = 0, y = 0, z = 0) => shade(new Mesh(new BoxGeometry(w, h, d), mat(k)), x, y + h / 2, z);
const cyl = (r: number, h: number, k: Pigment, x = 0, y = 0, z = 0, seg = 10) => shade(new Mesh(new CylinderGeometry(r, r, h, seg), soft(k)), x, y + h / 2, z);
const cone = (r: number, h: number, k: Pigment, x = 0, y = 0, z = 0, seg = 12) => shade(new Mesh(new ConeGeometry(r, h, seg), soft(k)), x, y + h / 2, z);
const blob = (r: number, k: Pigment, x = 0, y = 0, z = 0) => shade(new Mesh(new IcosahedronGeometry(r, 2), soft(k)), x, y, z);
const pane = (w: number, h: number, x: number, y: number, z: number) => {
  const m = new Mesh(new BoxGeometry(w, h, 0.05), lit);
  m.position.set(x, y + h / 2, z);
  return m;
};
function roof(w: number, d: number, h: number, k: Pigment, y: number) {
  const m = shade(new Mesh(new ConeGeometry(Math.SQRT1_2, 1, 4), mat(k)), 0, y + h / 2, 0);
  m.rotation.y = Math.PI / 4;
  m.scale.set(w, h, d);
  return m;
}
function domus() {
  const g = new Group();
  g.add(box(6.4, 1.9, 3.6, 'cream', 0, 0, -1), roof(7.4, 4.6, 1.5, 'red', 1.9));
  for (let i = 0; i < 6; i++) g.add(cyl(0.16, 1.9, 'cream', -3 + i * 1.2, 0, 1.2));
  g.add(box(6.8, 0.26, 0.6, 'ochre', 0, 1.9, 1.2), pane(1.1, 1.4, 0, 0, 0.83), pane(0.8, 0.7, -2, 0.7, 0.83), pane(0.8, 0.7, 2, 0.7, 0.83));
  return g;
}
function workshop() {
  const g = new Group();
  g.add(box(3.4, 1.7, 2.6, 'ochre'), roof(4.2, 3.4, 1.1, 'ink', 1.7), pane(0.8, 1.2, 0.6, 0, 1.33), pane(0.7, 0.6, -0.8, 0.7, 1.33));
  // a servo arm, reaching for something
  g.add(box(1, 0.3, 1, 'ink', -3.1), cyl(0.2, 1.5, 'cream', -3.1, 0.3));
  const arm = box(0.28, 2, 0.28, 'red', -2.6, 1.6);
  arm.rotation.z = -0.8;
  g.add(arm, blob(0.3, 'ochre', -3.1, 1.85));
  return g;
}
function milestones() {
  const g = new Group();
  [-3, -1, 1, 3].forEach((x, i) => g.add(cyl(0.34, 1.5 + (i % 2) * 0.7, 'cream', x), box(0.86, 0.2, 0.86, 'ochre', x, 1.5 + (i % 2) * 0.7)));
  g.add(box(1.1, 3.2, 1.1, 'cream', 5.2), box(3.3, 0.5, 1.1, 'cream', 6.3, 3.2), box(1.1, 3.2, 1.1, 'cream', 7.4));
  return g;
}
function cottage() {
  const g = new Group();
  g.add(box(3, 1.5, 2.4, 'cream'), roof(3.9, 3.3, 1.5, 'red', 1.5), pane(0.7, 1.05, 0, 0, 1.23), pane(0.55, 0.5, -0.95, 0.65, 1.23), pane(0.55, 0.5, 0.95, 0.65, 1.23));
  // the letterbox
  g.add(cyl(0.08, 1.1, 'ink', 2.8, 0, 1.4), box(0.8, 0.5, 0.55, 'red', 2.8, 1.1, 1.4), box(0.08, 0.34, 0.06, 'cream', 3.25, 1.5, 1.4));
  // a fence, because every house wants one
  for (let i = 0; i < 7; i++) g.add(box(0.14, 0.7, 0.14, 'ochre', -3.2 + i * 0.75, 0, 2.4));
  g.add(box(4.7, 0.1, 0.08, 'ochre', -0.95, 0.5, 2.4));
  return g;
}
function hortus() {
  const g = new Group();
  for (let r = 0; r < 2; r++) {
    g.add(box(5.2, 0.22, 0.9, 'ink', 0, 0, r * 1.7));
    for (let i = 0; i < 5; i++) {
      const x = -2.1 + i * 1.05;
      const z = r * 1.7;
      g.add(cyl(0.05, 1.4, 'ochre', x, 0.2, z, 5), blob(0.42, 'olive', x, 1.1, z), blob(0.14, 'red', x + 0.28, 0.85, z + 0.25), blob(0.13, 'red', x - 0.25, 1.2, z + 0.26));
    }
  }
  return g;
}
function moth() {
  const g = new Group();
  g.add(blob(1.1, 'ink', 0, 0.55, 0), box(0.3, 0.3, 1.4, 'ink', 0, 1.5, 0));
  [1, -1].forEach((s) => {
    const w = box(1.6, 0.08, 1.4, 'ochre', s * 0.94, 1.6, -0.05);
    w.rotation.z = s * 0.26;
    g.add(w, blob(0.2, 'cream', s, 1.78, 0.2));
  });
  return g;
}
function tempietto() {
  const g = new Group();
  g.add(cyl(2.3, 0.3, 'cream', 0, 0, 0, 16));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(cyl(0.15, 2.2, 'cream', Math.cos(a) * 1.85, 0.3, Math.sin(a) * 1.85));
  }
  g.add(cyl(2.2, 0.3, 'ochre', 0, 2.5, 0, 16), cone(2.4, 1.2, 'red', 0, 2.8, 0, 16), box(1.1, 0.7, 0.8, 'ink', 0, 0.3, 0));
  const l = new Mesh(new IcosahedronGeometry(0.28, 1), lit);
  l.position.y = 1.8;
  g.add(l);
  return g;
}
function juiceBox() {
  const g = new Group();
  const body = new Group();
  body.add(box(0.9, 1.15, 0.62, 'ochre'), box(0.9, 0.16, 0.62, 'ink', 0, 1.15), box(0.92, 0.3, 0.64, 'cream', 0, 0.38));
  body.add(box(0.1, 0.1, 0.02, 'ink', -0.17, 0.72, 0.32), box(0.1, 0.1, 0.02, 'ink', 0.17, 0.72, 0.32), box(0.3, 0.05, 0.02, 'red', 0, 0.56, 0.32));
  const straw = cyl(0.04, 0.7, 'red', 0.26, 1.3);
  straw.rotation.z = -0.18;
  const left = box(0.14, 0.26, 0.16, 'ink', -0.2, -0.26);
  const right = box(0.14, 0.26, 0.16, 'ink', 0.2, -0.26);
  body.add(straw, left, right);
  body.position.y = 0.26;
  g.add(body);
  return { g, body, left, right };
}

// ═══ Bayer, as in scripts/dither.mjs, drawn live ═══
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
const ditherFrag = `
precision highp float;
uniform sampler2D tex;
uniform vec3 pal[6];
uniform vec3 dayTop, dayGlow, nightTop, nightGlow, starTone;
uniform float night, time;
uniform float cell;   // one dither cell, in device pixels
uniform float coarse; // cells merged per block, for arrivals
uniform vec2 size;    // the scene, in cells
uniform vec2 centre;  // the planet underfoot, in cells
uniform float rad;
const float B[64] = float[64](${BAYER.map((v) => `${v}.`).join(',')});
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, vec3(.0031308)), vec3(1. / 2.4)) - .055, step(vec3(.0031308), c)); }
float rnd(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  ivec2 at = ivec2(floor(gl_FragCoord.xy / cell));
  ivec2 block = ivec2(floor(vec2(at) / coarse) * coarse);
  vec4 s = texelFetch(tex, clamp(block, ivec2(0), ivec2(size) - 1), 0);
  float d = distance(vec2(block), centre) / rad;
  float air = smoothstep(1.34, 1., d); // the atmosphere, hugging the planet
  vec3 sky = mix(mix(dayTop, dayGlow, air), mix(nightTop, nightGlow, air * .85), night);
  float star = rnd(floor(vec2(block) / 2.));
  if (star > .9965 && d > 1.05) sky = mix(sky, starTone, night * (.6 + .4 * sin(time * 2. + star * 900.)));
  vec3 c = mix(sky, srgb(s.rgb), step(.5, s.a));
  float t = (B[(block.x / int(coarse)) % 8 + ((block.y / int(coarse)) % 8) * 8] + .5) / 64. - .5;
  c += t * 52. / 255.;
  float best = 1e9; vec3 picked = pal[0];
  for (int i = 0; i < 6; i++) {
    vec3 e = c - pal[i];
    float m = 2. * e.r * e.r + 4. * e.g * e.g + 3. * e.b * e.b;
    if (m < best) { best = m; picked = pal[i]; }
  }
  gl_FragColor = vec4(picked, 1.);
}`;

const haloMat = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: AdditiveBlending,
  uniforms: { amount: { value: 0 }, tint: { value: hex('ochre') } },
  vertexShader: 'varying vec2 p; void main() { p = uv - .5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'varying vec2 p; uniform float amount; uniform vec3 tint; void main() { float a = 1. - smoothstep(0., .5, length(p)); gl_FragColor = vec4(tint * a * a * amount, 1.); }',
});

type Plate = { i: number; dir: Vector3; g: Group; face: Mesh; zone: number; label: HTMLButtonElement; size: number };
type Planet = {
  R: number;
  group: Group;
  sea: Mesh;
  q: Quaternion;
  ds: District[];
  height: (d: Vector3) => number;
  plates: Plate[];
  slot: number; // which place in the sky, or -1 underfoot
  chip: HTMLButtonElement;
  section: string;
};

// Where the other planets hang, in screen space (overview, then seen from the ground).
const SLOTS = [
  { far: new Vector2(-0.56, -0.42), near: new Vector2(-0.8, 0.8), radius: 7.6 },
  { far: new Vector2(-0.24, -0.76), near: new Vector2(-0.58, 0.86), radius: 4.8 },
];

// ═══ The world ═══
export function mountWorld({ root, items, sections, open, select, reduced, active, night: startNight }: WorldOptions): World {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const labels = root.querySelector<HTMLElement>('[data-w-labels]')!;
  const identity = root.querySelector<HTMLElement>('[data-w-id]')!;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.5, 500);
  const ambient = new AmbientLight(0xffffff, 1.75);
  const sun = new DirectionalLight(0xffffff, 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera as OrthographicCamera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 170 });
  sun.shadow.bias = -0.002;
  sun.shadow.normalBias = 0.06;
  scene.add(ambient, sun, sun.target);
  const white = new Color(0xffffff);
  const moonlight = hex('blue');

  // ═══ Planets ═══
  const loader = new TextureLoader();
  const geoFace = new PlaneGeometry(2.1, 2.62);
  const FACE_W = 1.05;
  const FACE_H = 1.31;

  function districts(names: string[], R: number): District[] {
    const az = [Math.PI, 1.05, -1.05];
    return names.map((section, i) => {
      const n = items.filter((it) => it.section === section).length;
      const pole = names.length === 1;
      const dir = pole ? NORTH.clone() : new Vector3(Math.sin(TILT) * Math.sin(az[i % 3]), Math.cos(TILT), Math.sin(TILT) * Math.cos(az[i % 3])).normalize();
      return { section, dir, ...frameAt(dir), ring: Math.min(ringFor(n), R * 0.5) };
    });
  }

  function makePlanet(names: string[], R: number, detail: number, coast: number, trees: number, ridge?: Vector3): Planet {
    const group = new Group();
    const ds = districts(names, R);
    const { height, paved } = makeGround(R, ds, coast, ridge);
    group.add(terrain(R, detail, height, paved));
    const sea = new Mesh(new IcosahedronGeometry(R + SEA, Math.max(10, Math.round(detail * 0.5))), new MeshLambertMaterial({ color: hex('blue').multiplyScalar(0.6) })); // deeper than the sky
    sea.receiveShadow = true;
    group.add(sea);

    const basis = new Matrix4();
    const at = (obj: Group | Mesh, dir: Vector3, u: Vector3, v: Vector3, x: number, z: number, yaw = 0, lift = 0) => {
      const d = dir.clone().multiplyScalar(R).addScaledVector(u, x).addScaledVector(v, z).normalize();
      obj.position.copy(d).multiplyScalar(R + Math.max(height(d), SEA) + lift);
      const inward = new Vector3().copy(v).negate().addScaledVector(d, v.dot(d)).normalize();
      const right = new Vector3().crossVectors(d, inward).normalize();
      basis.makeBasis(right, d, inward);
      obj.quaternion.setFromRotationMatrix(basis);
      obj.rotateY(yaw);
      group.add(obj);
      return d;
    };
    const clear = (d: Vector3) => {
      if (paved(d) > 0.02) return false;
      if (ds.length > 1 && d.angleTo(NORTH) * R < 8.5) return false;
      return ds.every((z) => d.angleTo(z.dir) * R > z.ring + 5.8);
    };
    const spots = (n: number, test = clear) => {
      const out: { d: Vector3; h: number }[] = [];
      for (let tries = 0; out.length < n && tries < n * 60; tries++) {
        const d = new Vector3(rand() - 0.5, rand() * 0.8 - 0.1, rand() - 0.5).normalize();
        const h = height(d);
        if (!test(d) || h < SEA + 0.5 || h > 3) continue;
        out.push({ d, h });
      }
      return out;
    };
    const tmp = new Matrix4();
    const q0 = new Quaternion();
    const scale = new Vector3();
    const forest = (geo: BufferGeometry, m: MeshLambertMaterial, list: { d: Vector3; h: number }[], yOff: number, size: number) => {
      if (!list.length) return;
      const inst = new InstancedMesh(geo, m, list.length);
      inst.castShadow = true;
      list.forEach(({ d, h }, i) => {
        q0.setFromUnitVectors(NORTH, d);
        const s = size * (0.8 + hash(d.x, d.z, d.y) * 0.45);
        scale.setScalar(s);
        tmp.compose(d.clone().multiplyScalar(R + h + yOff * s), q0, scale);
        inst.setMatrixAt(i, tmp);
      });
      group.add(inst);
    };
    // Round, fat fruit trees; a few dark cypresses; flowers along the edges.
    const round = spots(trees);
    forest(new IcosahedronGeometry(0.82, 2), soft('olive'), round, 1.45, 1);
    forest(new CylinderGeometry(0.11, 0.16, 1, 7), soft('ink'), round, 0.5, 1);
    const fruit: { d: Vector3; h: number }[] = [];
    round.forEach(({ d, h }, i) => {
      if (i % 2) return;
      const { u, v } = frameAt(d);
      [0, 2.1, 4.2].forEach((a) => fruit.push({ d: d.clone().multiplyScalar(R).addScaledVector(u, Math.cos(a + i) * 0.72).addScaledVector(v, Math.sin(a + i) * 0.72).normalize(), h: h + 1.2 }));
    });
    forest(new IcosahedronGeometry(0.15, 1), soft('red'), fruit, 0, 1);
    forest(new ConeGeometry(0.34, 2.5, 10), soft('ink'), spots(Math.round(trees * 0.25)), 1.25, 1);
    const verge = (d: Vector3) => paved(d) < 0.02 && ds.some((z) => d.angleTo(z.dir) * R < z.ring + 5);
    (['cream', 'red', 'ochre'] as Pigment[]).forEach((k) => forest(new IcosahedronGeometry(0.1, 1), soft(k), spots(Math.round(trees * 0.55), verge), 0.12, 1));

    // Plates
    const plates: Plate[] = [];
    ds.forEach((z, zi) => {
      const here = items.map((_, i) => i).filter((i) => items[i].section === z.section);
      here.forEach((i, k) => {
        const a = here.length > 1 ? -ARC + (k / (here.length - 1)) * ARC * 2 : 0;
        const g = new Group();
        const tex = loader.load(`/img/s-${items[i].slug}.png`);
        tex.colorSpace = SRGBColorSpace;
        tex.magFilter = LinearFilter;
        tex.minFilter = LinearMipmapLinearFilter;
        const face = new Mesh(geoFace, new MeshBasicMaterial({ map: tex, side: DoubleSide }));
        face.position.y = 1.86;
        g.add(box(2.3, 2.82, 0.14, 'ink', 0, 0.45, -0.09), box(0.9, 0.46, 0.5, 'cream'), face);
        const dir = at(g, z.dir, z.u, z.v, Math.sin(a) * z.ring, Math.cos(a) * z.ring);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'w-tomb';
        b.innerHTML = `<span class="t"></span><span class="m"></span>`;
        b.querySelector('.t')!.textContent = items[i].title;
        b.querySelector('.m')!.textContent = `${items[i].kind} · ${items[i].year}`;
        const plate: Plate = { i, dir, g, face, zone: zi, label: b, size: 0 };
        b.addEventListener('click', () => visit(plate));
        b.addEventListener('focus', () => {
          if (b.matches(':focus-visible')) go(dir, 1);
        });
        labels.append(b);
        plates.push(plate);
      });
    });

    // Lanterns along the roads, and fireflies once it is dark.
    const lantern = (dir: Vector3) => {
      const g = new Group();
      g.add(cyl(0.06, 1.5, 'ink'));
      const l = new Mesh(new IcosahedronGeometry(0.17, 1), lit);
      l.position.y = 1.6;
      const pool = new Mesh(new CircleGeometry(2.8, 18), haloMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.06;
      g.add(l, pool);
      at(g, dir, frameAt(dir).u, frameAt(dir).v, 0, 0);
    };
    if (ds.length > 1) {
      ds.forEach((z) => {
        [0.34, 0.62].forEach((t) => {
          const d = NORTH.clone().lerp(z.dir, t).normalize();
          lantern(d.multiplyScalar(R).addScaledVector(z.u, 1.5).normalize());
        });
      });
    } else {
      [0.4, 2.5, 4.6].forEach((a) => lantern(NORTH.clone().multiplyScalar(R).add(new Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(ds[0].ring + 2.6)).normalize()));
    }
    const motes = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      const d = new Vector3(rand() - 0.5, rand() * 0.7 + 0.1, rand() - 0.5).normalize().multiplyScalar(R + 0.8 + rand() * 2);
      motes.set([d.x, d.y, d.z], i * 3);
    }
    const flies = new BufferGeometry();
    flies.setAttribute('position', new BufferAttribute(motes, 3));
    group.add(new Points(flies, fliesMat));
    scene.add(group);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'w-zone caps';
    labels.append(chip);
    return { R, group, sea, q: new Quaternion(), ds, height, plates, slot: -1, chip, section: names[0] };
  }
  const fliesMat = new PointsMaterial({ color: hex('ochre'), size: 0.07, transparent: true, opacity: 0, depthWrite: false });

  // The home planet takes the working districts, the others one each.
  const own = sections.filter((s) => s !== 'Gallery' && s !== 'Posts');
  const home = makePlanet(own, 20, 44, 1.28, 150, new Vector3(-0.7, 0.34, 0.62).normalize());
  const gallery = makePlanet(['Gallery'], 9.5, 26, 1.5, 34);
  const writing = makePlanet(['Posts'], 6.8, 20, 1.42, 16);
  const planets = [home, gallery, writing];
  gallery.slot = 0;
  writing.slot = 1;
  home.chip.textContent = 'Home';
  gallery.chip.textContent = 'Gallery';
  writing.chip.textContent = 'Posts';
  home.chip.addEventListener('click', () => select('all'));
  gallery.chip.addEventListener('click', () => select('Gallery'));
  writing.chip.addEventListener('click', () => select('Posts'));
  let cur = home;

  // Buildings, set outward from each district and looking back at the plaza.
  const placeOn = (p: Planet, obj: Group, dir: Vector3, u: Vector3, v: Vector3, x: number, z: number, yaw = 0) => {
    const d = dir.clone().multiplyScalar(p.R).addScaledVector(u, x).addScaledVector(v, z).normalize();
    obj.position.copy(d).multiplyScalar(p.R + Math.max(p.height(d), SEA));
    const inward = v.clone().negate().addScaledVector(d, v.dot(d)).normalize();
    obj.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(d, inward).normalize(), d, inward));
    obj.rotateY(yaw);
    p.group.add(obj);
  };
  const poleFrame = frameAt(NORTH);
  placeOn(home, domus(), NORTH, poleFrame.u, poleFrame.v, 0, -3.3, Math.PI);
  const buildings: Record<string, () => Group> = { Projects: workshop, Experience: milestones, About: cottage };
  home.ds.forEach((z) => placeOn(home, (buildings[z.section] ?? workshop)(), z.dir, z.u, z.v, z.section === 'Experience' ? -2 : 0, z.ring + 3.6));
  const g0 = gallery.ds[0];
  placeOn(gallery, hortus(), g0.dir, g0.u, g0.v, 0, g0.ring + 2.2);
  placeOn(gallery, moth(), g0.dir, g0.u, g0.v, -g0.ring - 2.2, -1.2, 0.9);
  const w0 = writing.ds[0];
  placeOn(writing, tempietto(), w0.dir, w0.u, w0.v, 0, w0.ring + 2.6);

  // Clouds ride above the camera's path, so they shade the ground and never block it.
  const clouds = new Group();
  for (let i = 0; i < 9; i++) {
    const c = new Group();
    const n = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < n; j++) {
      const m = blob(0.85 + (1 - Math.abs(j / (n - 1) - 0.5) * 2) * 0.6, 'cream', (j - (n - 1) / 2) * 1.05, 0, rand() * 0.5);
      m.scale.y = 0.72;
      c.add(m);
    }
    const d = new Vector3(rand() - 0.5, rand() * 0.55 + 0.25, rand() - 0.5).normalize();
    c.position.copy(d).multiplyScalar(20 + 12.5);
    c.quaternion.setFromUnitVectors(NORTH, d);
    c.rotateY(rand() * 6);
    clouds.add(c);
  }
  scene.add(clouds);
  // One plane on its way to somewhere warm.
  const orbit = new Group();
  orbit.rotation.set(1.25, 0.2, 0.55);
  const spin = new Group();
  orbit.add(spin);
  const aloft = 20 + 6.2;
  const plane = new Group();
  plane.add(box(0.36, 2.2, 0.36, 'cream', 0, -1.1, 0), box(3.2, 0.5, 0.1, 'cream', 0, -0.3, 0), box(1.1, 0.3, 0.1, 'cream', 0, 0.75, 0), box(0.08, 0.5, 0.5, 'red', 0, 0.7, 0.28));
  plane.position.set(aloft, 0, 0);
  spin.add(plane);
  scene.add(orbit);

  // Sun and moon take turns in the same corner of the sky.
  const sunDisc = new Mesh(new IcosahedronGeometry(1, 3), new MeshBasicMaterial({ color: hex('ochre') }));
  const moon = new Group();
  moon.add(new Mesh(new IcosahedronGeometry(1, 3), new MeshBasicMaterial({ color: hex('cream') })));
  [
    [0.34, 0.3, 0.86, 0.13],
    [-0.4, -0.12, 0.88, 0.17],
    [0.1, -0.5, 0.84, 0.09],
  ].forEach(([x, y, z, r]) => {
    const c = new Mesh(new IcosahedronGeometry(r, 2), new MeshBasicMaterial({ color: hex('olive') }));
    c.position.set(x, y, z);
    moon.add(c);
  });
  scene.add(sunDisc, moon);

  const hero = juiceBox();
  scene.add(hero.g);

  // ═══ Dither pass ═══
  const target = new WebGLRenderTarget(4, 4, { type: HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true });
  const uniforms = {
    tex: { value: target.texture },
    pal: { value: (['ink', 'olive', 'red', 'ochre', 'cream', 'blue'] as Pigment[]).map(rgb) },
    dayTop: { value: rgb('blue') },
    dayGlow: { value: rgb('cream') },
    nightTop: { value: rgb('ink') },
    nightGlow: { value: rgb('blue') },
    starTone: { value: rgb('cream') },
    night: { value: startNight ? 1 : 0 },
    time: { value: 0 },
    cell: { value: PX },
    coarse: { value: 1 },
    size: { value: new Vector2(4, 4) },
    centre: { value: new Vector2() },
    rad: { value: 1 },
  };
  const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new Scene();
  quadScene.add(new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader: 'void main() { gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: ditherFrag, depthTest: false, depthWrite: false })));

  let W = 1;
  let H = 1;
  function resize() {
    W = root.clientWidth || 1;
    H = root.clientHeight || 1;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    const cw = Math.ceil(W / PX);
    const ch = Math.ceil(H / PX);
    target.setSize(cw, ch);
    uniforms.size.value.set(cw, ch);
    uniforms.cell.value = PX * dpr;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(root);
  resize();

  // ═══ Moving ═══
  // The hero stays at the top of the scene. Walking turns the planet under it.
  const qHome = new Quaternion();
  const axisY = new Vector3(0, 1, 0);
  const dq = new Quaternion();
  let zoom = 0;
  let zoomGoal = 0;
  let trip: { from: Quaternion; to: Quaternion; t0: number; dur: number; then?: () => void } | null = null;
  let warp: { from: Planet; to: Planet; t0: number; dur: number; then?: () => void } | null = null;
  let vel = { x: 0, z: 0 };
  let lastInput = -1e9;
  let heroY = cur.R + GROUND;
  let heroYaw = 0;
  let stride = 0;
  let hop = 0;
  let jumpV = 0;
  let jumpY = 0;
  let nightNow = startNight ? 1 : 0;
  let nightGoal = nightNow;
  const started = performance.now();
  let intro = reduced() ? 0 : 2800;
  const keys = new Set<string>();

  const touch = () => {
    lastInput = performance.now();
    intro = 0;
  };
  function roll(x: number, z: number) {
    // x turns the planet about +X (walking away from the camera), z about +Z (walking right)
    const len = Math.hypot(x, z);
    if (!len) return;
    dq.setFromAxisAngle(new Vector3(x / len, 0, z / len), len);
    cur.q.premultiply(dq).normalize();
  }
  function go(dir: Vector3, zoomTo: number, then?: () => void) {
    if (warp) return;
    const now = dir.clone().applyQuaternion(cur.q);
    const to = new Quaternion().setFromUnitVectors(now, NORTH).multiply(cur.q).normalize();
    const dur = reduced() ? 1 : Math.min(1500, 520 + now.angleTo(NORTH) * 1000);
    trip = { from: cur.q.clone(), to, t0: performance.now(), dur, then };
    zoomGoal = zoomTo;
    vel = { x: 0, z: 0 };
    touch();
  }
  // Into a district, turned so its open side faces the camera.
  function arrive(z: District) {
    if (warp) return;
    const to = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(z.dir, z.v).negate().normalize(), z.dir, z.v.clone().negate())).invert();
    trip = { from: cur.q.clone(), to, t0: performance.now(), dur: reduced() ? 1 : 1300 };
    zoomGoal = 1;
    vel = { x: 0, z: 0 };
    touch();
  }
  function visit(plate: Plate) {
    const z = cur.ds[plate.zone];
    // stop just short of it, on the district's side
    go(plate.dir.clone().lerp(z.dir, 0.3).normalize(), 1, () => open(plate.i));
  }
  function jump(to: Planet, then?: () => void) {
    if (to === cur || warp) return then?.();
    trip = null;
    vel = { x: 0, z: 0 };
    keys.clear();
    warp = { from: cur, to, t0: performance.now(), dur: reduced() ? 1 : 1700, then };
    cur.plates.forEach((p) => p.label.classList.remove('on'));
    to.slot = -1;
    touch();
  }
  function travel(name: string) {
    if (name === 'all') {
      jump(home, () => {
        trip = { from: home.q.clone(), to: qHome.clone(), t0: performance.now(), dur: reduced() ? 1 : 1100 };
        zoomGoal = 0;
      });
      if (cur === home && !warp) {
        trip = { from: home.q.clone(), to: qHome.clone(), t0: performance.now(), dur: reduced() ? 1 : 1100 };
        zoomGoal = 0;
      }
      return;
    }
    const p = planets.find((x) => x.ds.some((z) => z.section === name));
    if (!p) return;
    const z = p.ds.find((d) => d.section === name)!;
    if (p === cur && !warp) return arrive(z);
    jump(p, () => arrive(z));
  }

  // Dragging grabs the ground.
  const ray = new Raycaster();
  const ndc = new Vector2();
  let down: { x: number; y: number; moved: boolean } | null = null;
  let hovered: Plate | null = null;
  let chosen: Plate | null = null; // the plate within reach: what Enter opens
  const pick = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(
      cur.plates.map((p) => p.face),
      false,
    );
    for (const h of hits) {
      const p = cur.plates.find((x) => x.face === h.object)!;
      if (p.dir.clone().applyQuaternion(cur.q).dot(camera.position.clone().normalize()) > 0.05) return p;
    }
    return null;
  };
  // Planets in the sky are hit in screen space: a generous circle around each.
  const skyAt = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    return planets.find((p) => p.slot >= 0 && Math.hypot(cx - r.left - skyPos[planets.indexOf(p)].x, cy - r.top - skyPos[planets.indexOf(p)].y) < skyPos[planets.indexOf(p)].r + 6);
  };
  const PER_PX = 0.0034;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY, moved: false };
    trip = null;
    vel = { x: 0, z: 0 };
    touch();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) {
      hovered = warp ? null : pick(e.clientX, e.clientY);
      canvas.style.cursor = hovered || skyAt(e.clientX, e.clientY) ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) < 5) return;
    down.moved = true;
    canvas.style.cursor = 'grabbing';
    if (warp) return;
    const speed = PER_PX * lerp(1.5, 1, zoom) * (20 / cur.R);
    roll(dy * speed, -dx * speed);
    vel = { x: dy * speed, z: -dx * speed };
    down.x = e.clientX;
    down.y = e.clientY;
    touch();
  });
  const release = (e: PointerEvent) => {
    if (!down) return;
    const wasClick = !down.moved;
    down = null;
    canvas.style.cursor = 'grab';
    if (!wasClick) return;
    const sky = skyAt(e.clientX, e.clientY);
    if (sky) return sky.chip.click();
    const p = pick(e.clientX, e.clientY);
    if (p) visit(p);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => (hovered = null));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomGoal = Math.min(1, Math.max(0, zoomGoal - e.deltaY * 0.0014));
      touch();
    },
    { passive: false },
  );

  const WALK: Record<string, [number, number]> = {
    ArrowUp: [1, 0], w: [1, 0], k: [1, 0],
    ArrowDown: [-1, 0], s: [-1, 0], j: [-1, 0],
    ArrowLeft: [0, -1], a: [0, -1], h: [0, -1],
    ArrowRight: [0, 1], d: [0, 1], l: [0, 1],
  };
  const keyName = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
  addEventListener('keydown', (e) => {
    if (!active() || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = keyName(e);
    if (k === 'Enter') {
      // A control the keyboard is on keeps its own Enter.
      const on = document.activeElement as HTMLElement | null;
      if (on?.matches('a, button') && on.matches(':focus-visible')) return;
      const p = hovered ?? chosen;
      if (!p || warp || e.repeat) return;
      e.preventDefault();
      visit(p);
      return;
    }
    if (k === ' ' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
      if (jumpY === 0) jumpV = 7;
      touch();
      return;
    }
    if (!WALK[k] || warp) return;
    e.preventDefault();
    keys.add(k);
    trip = null;
    zoomGoal = 1;
    touch();
  });
  addEventListener('keyup', (e) => keys.delete(keyName(e)));
  addEventListener('blur', () => keys.clear());

  // ═══ Frame ═══
  const camPos = new Vector3();
  const camTarget = new Vector3();
  const v = new Vector3();
  const w = new Vector3();
  const look = new Matrix4();
  const up = new Vector3();
  const forward = new Vector3();
  const right = new Vector3();
  const toCam = new Vector3();
  const camLocal = new Vector3();
  const camUp = new Vector3();
  const under = new Vector3();
  const inv = new Quaternion();
  const ELEV = 0.78; // the whole planet is seen from this high, in radians
  const CAM_DIR = new Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
  const CAM_UP = new Vector3(0, Math.cos(ELEV), -Math.sin(ELEV));
  const skyPos = planets.map(() => ({ x: 0, y: 0, r: 0 }));
  let last = performance.now();
  let tick = 0;
  const toScreen = (p: Vector3) => {
    p.project(camera);
    return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H, front: Math.abs(p.z) < 1 };
  };
  const place = (el: HTMLElement, on: boolean, x = 0, y = 0, above = false) => {
    el.classList.toggle('on', on);
    if (on) el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, ${above ? '-100%' : '0'})`;
  };
  const inSky = (slot: Vector2, dist: number) => v.set(slot.x, slot.y, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(dist).add(camera.position);

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (document.hidden || !active()) {
      last = now;
      keys.clear();
      return;
    }
    const ease = (now - last) / 1000; // real time, so a slow machine still arrives
    const dt = Math.min(0.05, ease);
    last = now;
    const before = cur.q.clone();

    // walking
    let wx = 0;
    let wz = 0;
    keys.forEach((k) => {
      wx += WALK[k][0];
      wz += WALK[k][1];
    });
    if (warp) {
      // handled below, with the camera
    } else if (wx || wz) {
      const len = Math.hypot(wx, wz);
      const step = (8.4 / cur.R) * dt;
      roll((wx / len) * step, (wz / len) * step);
      touch();
    } else if (trip) {
      const t = Math.min(1, (now - trip.t0) / trip.dur);
      cur.q.copy(trip.from).slerp(trip.to, easeInOut(t));
      if (t === 1) {
        const then = trip.then;
        trip = null;
        then?.();
      }
    } else if (!down && Math.abs(vel.x) + Math.abs(vel.z) > 0.0003) {
      roll(vel.x, vel.z);
      vel.x *= 0.93;
      vel.z *= 0.93;
    } else if (zoom < 0.12 && !hovered && !down && !reduced() && now - lastInput > 3000) {
      dq.setFromAxisAngle(axisY, dt * 0.05);
      cur.q.premultiply(dq).normalize();
    }

    // Moving between planets: this one rises into the sky as that one comes down.
    let f = 1;
    let rEff = cur.R;
    if (warp) {
      const t = Math.min(1, (now - warp.t0) / warp.dur);
      f = easeInOut(t);
      rEff = lerp(warp.from.R, warp.to.R, f);
      zoomGoal = 0;
      if (t === 1) {
        const { from, to, then } = warp;
        const free = [0, 1].find((s) => !planets.some((p) => p !== from && p.slot === s))!;
        from.slot = free;
        cur = to;
        warp = null;
        rEff = cur.R;
        f = 1;
        then?.();
      }
    }
    zoom += (zoomGoal - zoom) * (reduced() ? 1 : 1 - Math.pow(0.0025, Math.min(0.3, ease)));
    if (Math.abs(zoomGoal - zoom) < 0.0005) zoom = zoomGoal;

    nightNow += Math.sign(nightGoal - nightNow) * Math.min(Math.abs(nightGoal - nightNow), reduced() ? 1 : ease / 1.5);
    const dusk = easeInOut(nightNow);
    uniforms.night.value = dusk;
    uniforms.time.value = now / 1000;
    ambient.intensity = lerp(1.75, 1.3, dusk);
    ambient.color.copy(white).lerp(moonlight, dusk * 0.55);
    sun.intensity = lerp(2.8, 2.3, dusk);
    sun.color.copy(white).lerp(moonlight, dusk * 0.55);
    lit.color.copy(hex('ink')).lerp(hex('ochre'), smooth(0.45, 0.9, dusk));
    haloMat.uniforms.amount.value = dusk * 1.7;
    fliesMat.opacity = dusk;

    clouds.rotation.y += dt * 0.016;
    clouds.scale.setScalar(rEff / 20 + 0.02);
    clouds.visible = cur === home || !!warp;
    orbit.visible = clouds.visible;
    spin.rotation.z -= dt * 0.16;

    // How far did the ground move under the hero?
    dq.copy(cur.q).multiply(inv.copy(before).invert()).normalize();
    const speed = (2 * Math.acos(Math.min(1, Math.abs(dq.w)))) / Math.max(dt, 0.001);
    inv.copy(cur.q).invert();
    under.copy(NORTH).applyQuaternion(inv);
    const ground = rEff + (warp ? GROUND : Math.max(cur.height(under), SEA));
    heroY += (ground - heroY) * (1 - Math.pow(0.0001, Math.min(0.3, ease)));
    const walking = speed > 0.06 && (zoom > 0.15 || keys.size > 0 || !!trip);
    if (walking) {
      const s = dq.w < 0 ? -1 : 1;
      const yaw = Math.atan2(dq.z * s, -dq.x * s);
      let diff = yaw - heroYaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heroYaw += diff * Math.min(1, dt * 12);
      stride += (speed * cur.R * dt * 62) / 20;
      hop = Math.abs(Math.sin(stride)) * 0.3;
    } else {
      let diff = -heroYaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heroYaw += diff * Math.min(1, dt * 4);
      hop *= Math.pow(0.001, dt);
    }
    if (jumpV || jumpY) {
      jumpY += jumpV * dt;
      jumpV -= 22 * dt;
      if (jumpY <= 0) jumpY = jumpV = 0;
    }
    // Between planets the hero is gone: it shrinks away, and arrives the same way.
    const present = warp ? Math.abs(f * 2 - 1) ** 2 : 1;
    hero.g.position.set(0, heroY + hop + jumpY, 0);
    hero.g.rotation.y = heroYaw;
    hero.g.scale.setScalar(Math.max(0.001, present));
    const swing = walking ? Math.sin(stride) * 0.6 : 0;
    hero.left.rotation.x = swing;
    hero.right.rotation.x = -swing;
    hero.body.scale.y = 1 - hop * 0.14;
    hero.body.scale.x = 1 + hop * 0.09;

    // Camera: the whole planet to the right of the words, or close behind the hero.
    const e = smooth(0, 1, zoom);
    const k = rEff / 20;
    const aspect = W / H;
    const D = 88 * k;
    const halfH = D * Math.tan((34 * Math.PI) / 360);
    const halfW = halfH * aspect;
    const sx = Math.max(0, rEff - 0.1 * halfW) * (aspect > 1.15 ? 1 : 0.2);
    camPos.set(-sx, 0, 0).addScaledVector(CAM_DIR, D);
    camTarget.set(-sx, 0, 0);
    const n = Math.min(1, 0.6 + 0.4 * k);
    // a wider district needs the camera a little further back
    const nearest = cur.ds.reduce((a, b) => (under.angleTo(a.dir) < under.angleTo(b.dir) ? a : b));
    const room = lerp(1, 1.24, smooth(4.5, 7, nearest.ring));
    camPos.lerp(w.set(0, heroY + 9.6 * n * room, 13 * n * room), e);
    camTarget.lerp(w.set(0, heroY + 0.5, -0.5), e);
    let pixelate = 1;
    if (intro) {
      const t = Math.min(1, (now - started) / intro);
      if (t === 1) intro = 0;
      const eo = easeOut(t);
      camPos.sub(camTarget).multiplyScalar(1 + (1 - eo) * 3).add(camTarget);
      pixelate = Math.max(1, Math.round((1 - eo) ** 1.5 * 22));
    }
    if (warp) pixelate = Math.max(pixelate, Math.round((1 - Math.abs(f * 2 - 1)) * 14) || 1);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();
    uniforms.coarse.value = pixelate;

    // Sun overhead up close, low and to the side from afar: that is what makes it a globe.
    sun.position.set(lerp(-46, -14, e), lerp(30, 56, e), lerp(26, 18, e)).multiplyScalar(Math.max(0.55, k));
    sun.position.y += heroY * e;
    sun.target.position.set(0, heroY * e * 0.8, 0);
    sun.shadow.autoUpdate = (tick++ & 1) === 0;

    // Everything in the sky is held in screen space.
    const dist = lerp(D * 1.32, 62, e);
    const skyScale = dist / 110;
    planets.forEach((p, idx) => {
      const isFrom = warp?.from === p;
      const isTo = warp?.to === p;
      p.sea.rotation.y += dt * 0.012;
      const lastSlot = isFrom ? [0, 1].find((s) => !planets.some((o) => o !== p && o.slot === s)) ?? 0 : isTo ? warpSlot(p) : p.slot;
      if (p.slot < 0 && !isFrom && !isTo) {
        p.group.position.set(0, 0, 0);
        p.group.scale.setScalar(1);
        p.group.quaternion.copy(p.q);
        p.chip.classList.remove('on');
        return;
      }
      const s = SLOTS[lastSlot];
      const slot = ndc.copy(s.far).lerp(s.near, e);
      const rd = s.radius * skyScale * lerp(1, 0.55, e);
      w.copy(inSky(slot, dist));
      const t = isTo ? f : isFrom ? 1 - f : 0;
      p.group.position.copy(w).multiplyScalar(1 - t);
      p.group.scale.setScalar(lerp(rd / p.R, 1, t));
      if (t < 0.02) {
        dq.setFromAxisAngle(axisY, dt * 0.12);
        p.q.premultiply(dq).normalize();
      }
      p.group.quaternion.copy(p.q);
      const c = toScreen(v.copy(w));
      const r = (rd / (dist * Math.tan((34 * Math.PI) / 360))) * (H / 2);
      skyPos[idx] = { x: c.x, y: c.y, r };
      place(p.chip, !warp && !intro && p.slot >= 0, c.x, c.y + r + 6);
    });

    // Plates turn to face whoever is looking.
    cur.group.updateMatrixWorld(true);
    camLocal.copy(camera.position).applyQuaternion(inv);
    camUp.set(0, 1, 0).applyQuaternion(camera.quaternion).applyQuaternion(inv);
    const showTombs = zoom > 0.55 && !warp;
    chosen = null;
    if (showTombs) {
      let best = 8.5;
      for (const p of cur.plates) {
        const a = p.dir.angleTo(under) * cur.R;
        if (a < best) {
          best = a;
          chosen = p;
        }
      }
    }
    const heroScreen = toScreen(v.set(0, heroY, 0));
    const rects: { l: number; r: number; t: number; b: number; depth: number; p: Plate }[] = [];
    for (const p of cur.plates) {
      up.copy(p.dir);
      toCam.copy(camLocal).sub(p.g.position).normalize();
      forward.copy(toCam).addScaledVector(up, -toCam.dot(up)).normalize();
      forward.lerp(toCam, 0.72).normalize(); // lean back, like a card propped up to be read
      up.lerp(camUp, 0.68).normalize(); // less of the planet's curve, so they stay level enough to read
      right.crossVectors(up, forward).normalize();
      up.crossVectors(forward, right).normalize();
      look.makeBasis(right, up, forward);
      p.g.quaternion.setFromRotationMatrix(look);
      const lift = p === hovered || (!hovered && p === chosen) ? 1.08 : 1;
      p.g.scale.setScalar(p.g.scale.x + (lift - p.g.scale.x) * 0.2);
      p.g.updateMatrixWorld(true);
      const a = toScreen(p.face.localToWorld(w.set(-FACE_W, FACE_H, 0)));
      const b = toScreen(p.face.localToWorld(w.set(FACE_W, -FACE_H, 0)));
      const worldPos = p.g.getWorldPosition(w);
      const depth = worldPos.distanceTo(camera.position);
      rects.push({ l: Math.min(a.x, b.x), r: Math.max(a.x, b.x), t: Math.min(a.y, b.y), b: Math.max(a.y, b.y), depth, p });
    }
    // Nearest first: a sign that would land on one already placed stays away.
    rects.sort((a, b) => a.depth - b.depth);
    const placed: { l: number; r: number; t: number; b: number }[] = [];
    for (const rc of rects) {
      const { p } = rc;
      const worldPos = p.g.getWorldPosition(w);
      const facing = worldPos.clone().normalize().dot(v.copy(camera.position).sub(worldPos).normalize());
      const close = worldPos.distanceTo(hero.g.position) < 12.5;
      const focused = p.label === document.activeElement;
      const midY = (rc.t + rc.b) / 2;
      // Plates behind the hero carry their sign on top, those in front underneath.
      const above = midY < heroScreen.y;
      const x = (rc.l + rc.r) / 2;
      const y = above ? rc.t - 4 : rc.b + 4;
      const hidden = rects.some((o) => o !== rc && o.depth < rc.depth && x > o.l && x < o.r && y > o.t && y < o.b);
      const inFrame = x > 40 && x < W - 40 && rc.t > -40 && rc.b < H + 40;
      const width = Math.round(Math.max(164, Math.min(240, rc.r - rc.l)));
      const signY = Math.max(above ? 54 : 6, Math.min(H - 54, y));
      const sign = { l: x - width / 2 - 4, r: x + width / 2 + 4, t: above ? signY - 52 : signY, b: above ? signY : signY + 52 };
      const clash = placed.some((o) => sign.l < o.r && sign.r > o.l && sign.t < o.b && sign.b > o.t);
      const on = (p === hovered || p === chosen || focused || (showTombs && close && !hidden && !clash)) && facing > 0.08 && inFrame;
      if (on) placed.push(sign);
      if (on && width !== p.size) {
        p.size = width;
        p.label.style.width = `${width}px`;
      }
      place(p.label, on, x, signY, above);
      p.label.style.zIndex = String(1000 - Math.round(rc.depth * 8));
    }
    cur.ds.forEach((z) => {
      const chip = zoneChips.get(z)!;
      w.copy(z.dir).multiplyScalar(cur.R + 5.6).applyQuaternion(cur.q);
      const facing = v.copy(w).normalize().dot(toCam.copy(camera.position).sub(w).normalize());
      const c = toScreen(v.copy(w));
      place(chip, cur.ds.length > 1 && zoom < 0.45 && !intro && !warp && facing > -0.25, c.x, Math.max(10, c.y));
    });
    if (warp) zoneChips.forEach((c) => c.classList.remove('on'));

    const pc = v.set(0, 0, 0).project(camera);
    uniforms.centre.value.set(((pc.x + 1) / 2) * uniforms.size.value.x, ((pc.y + 1) / 2) * uniforms.size.value.y);
    uniforms.rad.value = (rEff / (camera.position.length() * Math.tan((34 * Math.PI) / 360))) * (uniforms.size.value.y / 2);

    // Sun down, moon up, in the same corner.
    const cornerX = lerp(0.9, 0.86, e);
    const cornerY = lerp(0.74, 0.86, e);
    const sd = lerp(D * 1.3, 90, e);
    sunDisc.position.copy(inSky(ndc.set(cornerX, lerp(cornerY, -1.5, dusk)), sd));
    sunDisc.scale.setScalar(sd * 0.03);
    moon.position.copy(inSky(ndc.set(cornerX, lerp(-1.5, cornerY, dusk)), sd));
    moon.scale.setScalar(sd * 0.034);
    moon.lookAt(camera.position);

    identity.classList.toggle('away', zoom > 0.3 || cur !== home);

    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }
  function warpSlot(p: Planet) {
    // a planet on its way down leaves from whichever place in the sky is unclaimed
    const taken = planets.filter((o) => o !== p && o.slot >= 0).map((o) => o.slot);
    return [0, 1].find((s) => !taken.includes(s)) ?? 0;
  }
  const zoneChips = new Map<District, HTMLButtonElement>();
  planets.forEach((p) =>
    p.ds.forEach((z) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'w-zone caps';
      b.textContent = z.section;
      b.addEventListener('click', () => select(z.section));
      labels.append(b);
      zoneChips.set(z, b);
    }),
  );
  requestAnimationFrame(frame);

  return {
    travel,
    zoomBy: (f: number) => {
      zoomGoal = Math.min(1, Math.max(0, zoomGoal + (f > 1 ? 0.25 : -0.25)));
      touch();
    },
    setNight: (on: boolean) => {
      nightGoal = on ? 1 : 0;
    },
  };
}
