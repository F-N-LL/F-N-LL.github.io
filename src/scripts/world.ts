// Desktop: Daniel's universe as three small worlds in six Mediterranean
// pigments, drawn through the same Bayer dither as the plates. Home is a
// planet with the huerta, the workbench and the computer; inside the
// computer's screen turns a circuit-board planet with the projects and the
// work; a station in orbit, reached by rocket, keeps the posts, the links and
// the gallery. The juice box stands at the top of the scene while the ground
// turns under it, and shows the visitor around.
import {
  AdditiveBlending,
  AmbientLight,
  Box3,
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
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointLight,
  PointsMaterial,
  Quaternion,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { PIGMENTS } from '../data/pigments';
import { play, setEngine, setSea } from './sound';

export type WorldItem = { slug: string; title: string; kind: string; year: string; section: string; place?: string; room?: string; href?: string };
export type WorldOptions = {
  root: HTMLElement;
  items: WorldItem[];
  open: (i: number) => void;
  select: (name: string) => void;
  reduced: () => boolean;
  active: () => boolean;
  night: boolean;
  guide: { intro: string[]; back: string; places: Record<string, string> };
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
const FOV = 34;
const TAN = Math.tan((FOV * Math.PI) / 360);

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

// Which districts stand on which world. Anything else lives at a pole.
const WORLDS = {
  home: ['Garden', 'Workshop', 'Launch'],
  pc: ['Projects', 'Experience', 'Education'],
  station: ['Posts', 'Links', 'Gallery'],
};
const SHOWN: Record<string, string> = { Launch: 'Launch pad' };
// Districts of things rather than plates keep their own spacing.
const SPREAD: Record<string, { ring: number; arc: number }> = {
  Garden: { ring: 5.6, arc: 1.75 },
  Workshop: { ring: 4.6, arc: 1.0 },
  Launch: { ring: 3.4, arc: 0 },
};

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

type Look = 'earth' | 'chip' | 'hull';
type District = { section: string; dir: Vector3; u: Vector3; v: Vector3; ring: number; arc: number };
const frameAt = (dir: Vector3) => {
  const pole = Math.abs(dir.y) > 0.99;
  const u = pole ? new Vector3(1, 0, 0) : new Vector3().crossVectors(NORTH, dir).normalize();
  const v = new Vector3().crossVectors(u, dir).normalize(); // +v points away from the pole
  return { u, v };
};
// Plates stand on an open arc, leaving the near side free for the hero.
const ARC = 2.2;
const ringFor = (n: number) => Math.max(3.6, (n * 3.1) / (ARC * 2));

function makeGround(R: number, ds: District[], coast: number, look: Look, ridge?: Vector3) {
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
    if (look === 'hull') return GROUND;
    const lat = d.angleTo(NORTH);
    const edge = coast + relief(d) * 0.13;
    const land = smooth(edge, edge - 0.13, lat);
    let x = (look === 'chip' ? 0.5 : 0.8) + relief(d) * (look === 'chip' ? 0.55 : 0.75);
    if (ridge) x += Math.exp(-((d.angleTo(ridge) / 0.3) ** 2)) * 3.6;
    const h = lerp(-1.7, terrace(x) + 0.2, land);
    return lerp(h, GROUND, level(d));
  };
  return { height, paved };
}

// ═══ The sea ═══
// Flat colours, the way a print has them, so the dither lays an even weave
// rather than a smear: deep water a step darker than the sky, a band of
// turquoise over the shallows, a crisp line of surf on every beach, and short
// white wave lines drifting across the open sea.
const seaTime = { value: 0 };
const seaLight = { value: 1 };
function water(R: number, detail: number, height: (d: Vector3) => number) {
  const geo = new IcosahedronGeometry(R + SEA, detail);
  const pos = geo.getAttribute('position') as BufferAttribute;
  const shallow = new Float32Array(pos.count);
  const d = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    shallow[i] = smooth(SEA - 1.25, SEA + 0.05, height(d));
  }
  geo.setAttribute('shallow', new BufferAttribute(shallow, 1));
  const m = new MeshLambertMaterial({ color: 0xffffff });
  const vec = (c: Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
  const deep = hex('blue').lerp(hex('ink'), 0.5);
  const shoal = hex('blue').lerp(hex('cream'), 0.4);
  const foam = hex('cream');
  m.onBeforeCompile = (sh) => {
    sh.uniforms.seaTime = seaTime;
    sh.uniforms.seaLight = seaLight;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float shallow;\nvarying float vShallow;\nvarying vec3 vSea;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShallow = shallow;\nvSea = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float seaTime;\nuniform float seaLight;\nvarying float vShallow;\nvarying vec3 vSea;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float t = seaTime;
        // the surf line breathes in and out a little
        float edge = vShallow + 0.035 * sin(t * 1.3 + dot(vSea, vec3(1.7, 1.1, 2.3)));
        vec3 seaC = edge > 0.9 ? ${vec(foam)} : edge > 0.55 ? ${vec(shoal)} : ${vec(deep)};
        // wave lines: rings round a tilted axis, bent by a slow swell, cut into short dashes
        float v = dot(vSea, vec3(0.28, 0.82, 0.5)) + 0.45 * sin(dot(vSea, vec3(0.9, -0.2, 0.6)) + t * 0.5);
        float dist = abs(fract(v / 2.6 + t * 0.025) - 0.5) * 2.6;
        float dash = sin(dot(vSea, vec3(-0.5, 0.3, 1.1)) * 1.1 + t * 0.35) * sin(dot(vSea, vec3(0.8, 0.5, -0.3)) * 0.8);
        if (edge < 0.45 && dist < 0.09 && dash > 0.25) seaC = ${vec(foam)};`,
      )
      // lit evenly, not shaded round the sphere: shading would only smear the dither
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = seaC * seaLight;\ndiffuseColor.rgb = vec3(0.0);');
  };
  return new Mesh(geo, m);
}

type Paint = (c: Vector3, h: number, slope: number, paved: number, n: number) => Pigment;
function terrain(R: number, detail: number, height: (d: Vector3) => number, paved: (d: Vector3) => number, paint: Paint) {
  const geo = new IcosahedronGeometry(1, detail);
  const pos = geo.getAttribute('position') as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tones = new Map<Pigment, Color>();
  const tone = (k: Pigment) => tones.get(k) ?? tones.set(k, hex(k)).get(k)!;
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
    const t = tone(paint(c, h, slope, paved(c), hash(c.x, c.y, c.z)));
    for (let j = 0; j < 3; j++) {
      d.copy(corners[j]).multiplyScalar(R + heights[j]);
      pos.setXYZ(f + j, d.x, d.y, d.z);
      colors.set([t.r, t.g, t.b], (f + j) * 3);
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

// The coast: sand, pale limestone, pines and dry grass.
const paintEarth =
  (garden: (c: Vector3) => boolean): Paint =>
  (c, h, slope, pv, n) => {
    if (pv > 0.55) return garden(c) ? (n > 0.8 ? 'olive' : 'ochre') : n > 0.975 ? 'red' : n > 0.86 ? 'ochre' : 'cream';
    if (h < SEA + 0.34) return 'ochre'; // beach
    if (slope > 0.42) return n > 0.55 ? 'cream' : 'ochre'; // limestone
    if (h > 3.4) return n > 0.5 ? 'cream' : 'olive';
    return relief(c.clone().multiplyScalar(1.6)) > 0.38 ? 'ochre' : 'olive';
  };
// A circuit board: green laminate, gold traces, dark chips.
const paintChip: Paint = (c, h, slope, pv, n) => {
  if (pv > 0.55) return n > 0.9 ? 'cream' : n > 0.3 ? 'blue' : 'ink'; // lit, like a screen
  if (h < SEA + 0.34 || slope > 0.42) return 'ink';
  if (n > 0.985) return 'cream';
  const iso = (relief(c.clone().multiplyScalar(1.4)) + 2) * 3.2;
  return iso - Math.floor(iso) < 0.17 ? 'ochre' : 'olive';
};
// A hull of panels: mostly white, some solar, some dark.
const paintHull: Paint = (c, _h, _s, pv, n) => {
  if (pv > 0.55) return n > 0.9 ? 'ochre' : 'cream';
  const lat = Math.acos(Math.max(-1, Math.min(1, c.y)));
  const lon = Math.atan2(c.z, c.x);
  const b = hash(Math.floor(lat / 0.17), Math.floor(lon / 0.3), 3);
  return b < 0.6 ? 'cream' : b < 0.78 ? 'blue' : b < 0.9 ? 'ink' : 'ochre';
};

// ═══ Things that stand on it ═══
// Every model faces +Z: towards the middle of its district, and the camera.
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
// Lantern glass: pale by day, glowing by night.
const glass = new MeshBasicMaterial({ color: hex('cream') });
const flameMat = new MeshBasicMaterial({ color: hex('ochre') });
const flameCore = new MeshBasicMaterial({ color: hex('cream') });
function shade<T extends Mesh>(m: T, x = 0, y = 0, z = 0) {
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
const box = (w: number, h: number, d: number, k: Pigment, x = 0, y = 0, z = 0) => shade(new Mesh(new BoxGeometry(w, h, d), mat(k)), x, y + h / 2, z);
const cyl = (r: number, h: number, k: Pigment, x = 0, y = 0, z = 0, seg = 10) => shade(new Mesh(new CylinderGeometry(r, r, h, seg), soft(k)), x, y + h / 2, z);
const cone = (r: number, h: number, k: Pigment, x = 0, y = 0, z = 0, seg = 12) => shade(new Mesh(new ConeGeometry(r, h, seg), soft(k)), x, y + h / 2, z);
const blob = (r: number, k: Pigment, x = 0, y = 0, z = 0, sy = 1) => {
  const m = shade(new Mesh(new IcosahedronGeometry(r, 2), soft(k)), x, y, z);
  m.scale.y = sy;
  return m;
};
const pane = (w: number, h: number, x: number, y: number, z: number) => {
  const m = new Mesh(new BoxGeometry(w, h, 0.05), lit);
  m.position.set(x, y + h / 2, z);
  return m;
};
const tilt = <T extends Object3D>(o: T, x: number, y: number, z: number) => {
  o.rotation.set(x, y, z);
  return o;
};
function roof(w: number, d: number, h: number, k: Pigment, y: number, x = 0, z = 0) {
  const m = shade(new Mesh(new ConeGeometry(Math.SQRT1_2, 1, 4), mat(k)), x, y + h / 2, z);
  m.rotation.y = Math.PI / 4;
  m.scale.set(w, h, d);
  return m;
}

// Home: a whitewashed house with blue shutters and a bougainvillea.
function casita() {
  const g = new Group();
  g.add(box(4.6, 2.3, 3.2, 'cream', 0, 0, 0), box(4.8, 0.22, 3.4, 'cream', 0, 2.3, 0));
  g.add(box(2.3, 1.5, 2.1, 'cream', 1.1, 2.5, -0.5), roof(2.9, 2.7, 0.9, 'red', 4, 1.1, -0.5), box(0.4, 0.9, 0.4, 'cream', -1.5, 2.5, -0.9));
  g.add(box(0.9, 1.55, 0.08, 'blue', -0.7, 0, 1.62));
  [0.9, -2.0].forEach((x) => g.add(pane(0.6, 0.6, x + 0.5, 1.0, 1.62), box(0.3, 0.7, 0.06, 'blue', x + 0.05, 0.95, 1.64), box(0.3, 0.7, 0.06, 'blue', x + 0.95, 0.95, 1.64)));
  // the bougainvillea, all over the corner
  [
    [2.2, 1.9, 1.5, 0.55],
    [1.7, 2.5, 1.55, 0.42],
    [2.45, 1.2, 1.4, 0.38],
    [2.4, 2.4, 0.9, 0.4],
  ].forEach(([x, y, z, r]) => g.add(blob(r, 'red', x, y, z)));
  g.add(blob(0.3, 'olive', 2.0, 1.4, 1.7), cyl(0.06, 1.6, 'ink', 2.3, 0, 1.4));
  [-2.6, -1.9].forEach((x) => g.add(cyl(0.24, 0.4, 'red', x, 0, 2.0), blob(0.3, 'olive', x, 0.65, 2.0)));
  return g;
}
function palm() {
  const g = new Group();
  let x = 0;
  for (let i = 0; i < 6; i++) {
    x += i * 0.045;
    g.add(cyl(0.16 - i * 0.012, 0.62, 'ochre', x, i * 0.58, 0, 7));
  }
  const top = new Group();
  top.position.set(x, 3.55, 0);
  for (let i = 0; i < 7; i++) {
    const frond = box(0.34, 0.06, 1.7, 'olive', 0, 0, 0.85);
    const arm = new Group();
    arm.rotation.set(0, (i / 7) * Math.PI * 2, 0);
    frond.rotation.x = 0.42;
    arm.add(frond);
    top.add(arm);
  }
  top.add(blob(0.14, 'ink', 0.18, -0.12, 0.1), blob(0.14, 'ink', -0.12, -0.14, -0.1));
  g.add(top);
  return g;
}
function boat() {
  const g = new Group();
  g.add(box(1.5, 0.34, 0.62, 'cream'), box(1.52, 0.1, 0.64, 'blue', 0, 0.22), cyl(0.03, 1.5, 'ink', 0.1, 0.3));
  const sail = box(0.04, 1.05, 0.7, 'cream', 0.12, 0.6, 0.0);
  sail.rotation.y = Math.PI / 2;
  g.add(sail);
  return g;
}

// ── The huerta: one bed per crop ──
function bed(w: number, d: number) {
  const g = new Group();
  g.add(box(w, 0.36, d, 'ochre'), box(w - 0.18, 0.05, d - 0.18, 'ink', 0, 0.33));
  return g;
}
function tomatoes() {
  const g = bed(2.8, 1.2);
  for (let i = 0; i < 4; i++) {
    const x = -1.02 + i * 0.68;
    g.add(cyl(0.035, 1.8, 'ochre', x, 0.36, -0.05, 5), blob(0.34, 'olive', x, 1.05, 0), blob(0.27, 'olive', x + 0.06, 1.55, 0.04));
    g.add(blob(0.12, 'red', x + 0.2, 0.9, 0.22), blob(0.11, 'red', x - 0.16, 1.28, 0.24), blob(0.1, 'red', x + 0.1, 1.62, 0.22));
  }
  return g;
}
function eggplant() {
  const g = bed(2.1, 1.2);
  [-0.48, 0.48].forEach((x) => {
    g.add(blob(0.44, 'olive', x, 0.82, 0, 0.8), blob(0.3, 'olive', x + 0.18, 1.14, -0.1));
    g.add(blob(0.13, 'ink', x - 0.22, 0.6, 0.34, 1.9), blob(0.12, 'ink', x + 0.24, 0.66, 0.32, 1.8));
  });
  return g;
}
function zucchini() {
  const g = bed(2.5, 1.3);
  [-0.6, 0.6].forEach((x) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(blob(0.36, 'olive', x + Math.cos(a) * 0.32, 0.6 + (i % 2) * 0.12, Math.sin(a) * 0.26, 0.34));
    }
    g.add(tilt(cyl(0.09, 0.62, 'olive', x + 0.2, 0.4, 0.42), 0, 0.4, Math.PI / 2), cone(0.13, 0.22, 'ochre', x - 0.1, 0.78, 0.2, 6));
  });
  return g;
}
function pepper() {
  const g = bed(2.1, 1.2);
  [-0.5, 0.5].forEach((x, k) => {
    g.add(cyl(0.035, 0.5, 'olive', x, 0.36), blob(0.36, 'olive', x, 0.98, 0, 0.9));
    g.add(blob(0.11, k ? 'red' : 'olive', x + 0.22, 0.78, 0.26, 1.5), blob(0.1, 'red', x - 0.2, 0.86, 0.26, 1.5));
  });
  return g;
}
function leeks() {
  const g = bed(3.0, 1.0);
  for (let i = 0; i < 6; i++) {
    const x = -1.15 + i * 0.46;
    g.add(cyl(0.075, 0.62, 'cream', x, 0.36, 0, 8));
    [-0.38, 0.32].forEach((r) => g.add(tilt(box(0.07, 0.8, 0.18, 'olive', x, 0.86, 0), 0, 0, r)));
  }
  return g;
}
function lemonTree() {
  const g = new Group();
  g.add(cyl(0.5, 0.62, 'red'), cyl(0.56, 0.12, 'red', 0, 0.62), cyl(0.09, 1.1, 'ink', 0, 0.7), blob(0.95, 'olive', 0, 2.05));
  [
    [0.6, 1.8, 0.62],
    [-0.5, 2.2, 0.7],
    [0.2, 2.55, 0.78],
    [-0.75, 1.75, 0.4],
    [0.8, 2.35, 0.2],
  ].forEach(([x, y, z]) => g.add(blob(0.14, 'ochre', x, y, z, 1.2)));
  return g;
}
// ── The workshop ──
function desk(g: Group) {
  g.add(box(2.7, 0.12, 1.15, 'ochre', 0, 0.9, 0), box(2.5, 0.06, 0.95, 'ochre', 0, 0.28, 0));
  [-1.22, 1.22].forEach((x) => [-0.46, 0.46].forEach((z) => g.add(box(0.1, 0.9, 0.1, 'ink', x, 0, z))));
}
function workbench() {
  const g = new Group();
  desk(g);
  // pegboard and tools
  g.add(box(2.7, 1.35, 0.06, 'cream', 0, 1.02, -0.58));
  [-1.0, -0.7, -0.4, 0.75, 1.05].forEach((x, i) => g.add(box(0.07, 0.42 + (i % 2) * 0.16, 0.04, 'ink', x, 1.62, -0.53)));
  // oscilloscope
  g.add(box(0.78, 0.5, 0.52, 'cream', -0.78, 1.02, -0.16), box(0.44, 0.3, 0.03, 'blue', -0.88, 1.12, 0.11), blob(0.05, 'ink', -0.5, 1.3, 0.11), blob(0.05, 'ink', -0.5, 1.16, 0.11));
  // multimeter, propped up
  const meter = new Group();
  meter.add(box(0.32, 0.46, 0.12, 'ochre'), box(0.22, 0.11, 0.02, 'ink', 0, 0.3, 0.07), blob(0.07, 'ink', 0, 0.15, 0.07));
  meter.position.set(0.02, 1.02, 0.02);
  meter.rotation.x = -0.32;
  g.add(meter);
  // soldering station and iron
  g.add(box(0.42, 0.22, 0.34, 'ink', 0.62, 1.02, -0.05), cyl(0.07, 0.2, 'cream', 1.0, 1.02, -0.02), tilt(cyl(0.028, 0.62, 'red', 0.9, 1.08, 0.12), 0, 0, 0.95));
  // breadboard with two wires, and a spool
  g.add(box(0.62, 0.04, 0.3, 'cream', -0.1, 1.02, 0.36), box(0.3, 0.03, 0.03, 'red', -0.1, 1.06, 0.34), box(0.03, 0.03, 0.2, 'blue', 0.05, 1.06, 0.36), cyl(0.1, 0.09, 'cream', 0.42, 1.02, 0.36));
  g.add(cyl(0.26, 0.62, 'red', 0, 0, 0.95), cyl(0.04, 0.62, 'ink', 0, 0, 0.95));
  return g;
}
function drawingBoard() {
  const g = new Group();
  g.add(tilt(box(0.08, 2.1, 0.08, 'ochre', -0.55, 0, 0), 0, 0, -0.12), tilt(box(0.08, 2.1, 0.08, 'ochre', 0.55, 0, 0), 0, 0, 0.12), tilt(box(0.08, 2.0, 0.08, 'ochre', 0, 0, -0.45), 0.25, 0, 0));
  const board = new Group();
  board.add(box(1.4, 1.05, 0.05, 'cream'), box(1.0, 0.06, 0.02, 'ink', 0, 0.62, 0.04), box(0.7, 0.05, 0.02, 'blue', -0.1, 0.42, 0.04), box(0.04, 0.04, 0.02, 'red', 0.4, 0.84, 0.04));
  board.position.set(0, 0.95, 0.12);
  board.rotation.x = -0.16;
  g.add(board, box(1.5, 0.06, 0.18, 'ochre', 0, 0.94, 0.2), cyl(0.09, 0.2, 'blue', 0.55, 1.0, 0.22), cyl(0.012, 0.22, 'red', 0.55, 1.1, 0.22, 4));
  return g;
}
// The screen shows the planet inside; its size sets how far the camera dives.
const SCREEN_W = 2.1;
const SCREEN_H = 1.26;
function computer(screen: Mesh) {
  const g = new Group();
  desk(g);
  // a white monitor, like the old all-in-ones: a broad frame, a deeper chin with a light, a thin dark lip round the glass
  g.add(box(0.6, 0.04, 0.36, 'cream', 0, 1.02, -0.28), box(0.12, 0.4, 0.1, 'cream', 0, 1.02, -0.32));
  g.add(box(2.46, 1.68, 0.1, 'cream', 0, 1.34, -0.3), box(2.16, 1.32, 0.12, 'ink', 0, 1.57, -0.3), box(0.07, 0.05, 0.02, 'ochre', 0.98, 1.44, -0.25));
  screen.position.set(0, 1.5 + 0.73, -0.225);
  g.add(screen, box(1.05, 0.05, 0.32, 'cream', -0.05, 1.02, 0.22), blob(0.07, 'cream', 0.7, 1.06, 0.24, 0.6));
  g.add(box(0.5, 1.05, 0.9, 'ink', 1.65, 0, -0.05), pane(0.08, 0.08, 1.75, 0.82, 0.41));
  g.add(cyl(0.38, 0.1, 'red', 0, 0.55, 1.05), cyl(0.05, 0.55, 'ink', 0, 0, 1.05), box(0.7, 0.62, 0.08, 'red', 0, 0.65, 1.42));
  return g;
}
// The rocket and its pad; the rocket is the part that flies.
function launchPad() {
  const g = new Group();
  g.add(cyl(1.7, 0.14, 'cream', 0, 0, 0, 20), cyl(1.8, 0.08, 'ochre', 0, 0, 0, 20));
  g.add(box(0.28, 4.2, 0.28, 'ink', 1.7, 0, -0.2), box(0.9, 0.08, 0.08, 'ink', 1.25, 3.0, -0.2), box(0.9, 0.08, 0.08, 'ink', 1.25, 1.6, -0.2));
  const rocket = new Group();
  rocket.add(cyl(0.62, 2.5, 'cream', 0, 0.55, 0, 16), cone(0.62, 1.15, 'red', 0, 3.05, 0, 16), cyl(0.64, 0.2, 'red', 0, 2.3, 0, 16));
  rocket.add(tilt(cyl(0.26, 0.1, 'blue', 0, 2.0 - 0.05, 0.6, 14), Math.PI / 2, 0, 0), tilt(cyl(0.32, 0.08, 'ink', 0, 1.96, 0.57, 14), Math.PI / 2, 0, 0));
  for (let i = 0; i < 3; i++) {
    const fin = new Group();
    fin.rotation.y = (i / 3) * Math.PI * 2 + Math.PI / 6;
    fin.add(box(0.12, 1.0, 0.75, 'red', 0, 0.12, 0.72));
    rocket.add(fin);
  }
  const flame = new Group();
  const outer = new Mesh(new ConeGeometry(0.46, 1.4, 10), flameMat);
  const inner = new Mesh(new ConeGeometry(0.24, 0.9, 8), flameCore);
  outer.rotation.x = inner.rotation.x = Math.PI;
  outer.position.y = -0.2;
  inner.position.y = 0.05;
  flame.add(outer, inner);
  flame.position.y = 0.45;
  flame.visible = false;
  rocket.add(flame);
  g.add(rocket);
  g.userData = { rocket, flame };
  return g;
}

// ── Inside the computer ──
function cpu() {
  const g = new Group();
  g.add(box(5, 0.55, 5, 'ink'), box(2.6, 0.06, 1.6, 'cream', 0, 0.55, 0.6), box(1.0, 0.06, 0.3, 'ochre', -0.6, 0.55, -1.2));
  for (let i = 0; i < 9; i++) {
    const t = -2 + i * 0.5;
    g.add(box(0.14, 0.12, 0.5, 'ochre', t, 0, 2.7), box(0.14, 0.12, 0.5, 'ochre', t, 0, -2.7), box(0.5, 0.12, 0.14, 'ochre', 2.7, 0, t), box(0.5, 0.12, 0.14, 'ochre', -2.7, 0, t));
  }
  return g;
}
function rack() {
  const g = new Group();
  g.add(box(1.4, 3.0, 1.1, 'ink'));
  for (let i = 0; i < 5; i++) g.add(box(1.2, 0.06, 0.02, 'cream', 0, 0.35 + i * 0.52, 0.56), pane(0.12, 0.12, 0.4, 0.45 + i * 0.52, 0.58), pane(0.12, 0.12, 0.2, 0.45 + i * 0.52, 0.58));
  return g;
}
function milestones() {
  const g = new Group();
  [-3, -1, 1, 3].forEach((x, i) => g.add(cyl(0.34, 1.5 + (i % 2) * 0.7, 'cream', x), box(0.86, 0.2, 0.86, 'ochre', x, 1.5 + (i % 2) * 0.7)));
  return g;
}
function shelf() {
  const g = new Group();
  g.add(box(2.6, 0.1, 0.7, 'ochre', 0, 0, 0), box(2.6, 0.1, 0.7, 'ochre', 0, 1.2, 0), box(0.1, 2.3, 0.7, 'ochre', -1.25, 0, 0), box(0.1, 2.3, 0.7, 'ochre', 1.25, 0, 0));
  const tones: Pigment[] = ['red', 'blue', 'cream', 'olive', 'ochre', 'ink'];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) g.add(box(0.2, 0.8 + hash(i, r, 1) * 0.25, 0.5, tones[(i + r * 2) % 6], -1.0 + i * 0.25, 0.1 + r * 1.2, 0));
  return g;
}
// ── The station ──
function pod(k: Pigment) {
  const g = new Group();
  const body = tilt(cyl(0.9, 3, k, 0, 0.9, 0, 14), 0, 0, Math.PI / 2);
  body.position.y = 0.9;
  g.add(body, pane(0.35, 0.35, -0.6, 0.75, 0.9), pane(0.35, 0.35, 0.4, 0.75, 0.9), box(0.5, 0.9, 0.5, 'ink', 0, 0, 0));
  return g;
}
function antenna() {
  const g = new Group();
  g.add(cyl(0.06, 2.4, 'ink'), blob(0.16, 'red', 0, 2.5, 0));
  const dish = new Mesh(new ConeGeometry(0.7, 0.3, 14, 1, true), new MeshLambertMaterial({ color: hex('cream'), side: DoubleSide }));
  dish.position.set(0, 1.6, 0.3);
  dish.rotation.x = -1.1;
  g.add(dish);
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
  // after dark, a little paper lantern held out on a short arm, swinging as it walks
  const lamp = new Group();
  lamp.add(box(0.36, 0.09, 0.09, 'ink', -0.14, 0.02));
  const shade = new Group();
  // the paper burns brighter than anything else on the planet
  const paper = new Mesh(new BoxGeometry(0.3, 0.36, 0.3), flameMat);
  paper.position.y = -0.4;
  // the flame, showing through the paper as a bright stripe
  const wick = new Mesh(new BoxGeometry(0.12, 0.2, 0.31), flameCore);
  wick.position.y = -0.42;
  shade.add(cyl(0.015, 0.2, 'ink', 0, -0.2, 0, 4), box(0.36, 0.06, 0.36, 'red', 0, -0.25), paper, box(0.36, 0.06, 0.36, 'red', 0, -0.64), wick);
  shade.position.x = 0.06;
  lamp.add(shade);
  lamp.position.set(0.62, 0.78, 0.3);
  lamp.visible = false;
  body.add(lamp);
  body.position.y = 0.26;
  g.add(body);
  return { g, body, left, right, lamp, shade };
}

// ═══ Bayer, as in scripts/dither.mjs, drawn live ═══
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
const ditherFrag = `
precision highp float;
uniform sampler2D tex;
uniform vec3 pal[6];
uniform vec3 dayTop, dayGlow, nightTop, nightGlow, starTone;
uniform float night, time;
uniform float space;  // 1 in orbit: a black sky whatever the hour
uniform float scan;   // 1 inside the computer: scanlines
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
  float dark = max(space, scan);
  sky = mix(sky, mix(nightTop, nightGlow, air * mix(.5, .9, scan)), dark);
  float star = rnd(floor(vec2(block) / 2.));
  if (star > .9965 && d > 1.05) sky = mix(sky, starTone, max(night, dark) * (.6 + .4 * sin(time * 2. + star * 900.)));
  vec3 c = mix(sky, srgb(s.rgb), step(.5, s.a));
  if (scan > 0. && (block.y / int(coarse)) % 3 == 0) c *= 1. - .22 * scan;
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

// Something to open: a plate on a stand, or a thing (a bed, a desk, a rocket).
type Spot = {
  i: number;
  dir: Vector3;
  inward: Vector3;
  right: Vector3;
  g: Group;
  hits: Object3D[];
  box: Box3; // in the group's own space
  card: boolean;
  zone: number;
  label: HTMLButtonElement;
  size: number;
  scale: number; // things are built small and shown a little larger
  reach: number; // how far in front of it the hero stands to open it
};
// Something the hero cannot walk through: a circle on the ground.
type Solid = { dir: Vector3; r: number };
const HERO_R = 0.45;
// A thing's footprint as a row of circles along its longer side, in its
// planet's own space. Call once it stands where it will stay.
function footprint(obj: Object3D, pad = 0): Solid[] {
  const parent = obj.parent;
  const keep = { p: obj.position.clone(), q: obj.quaternion.clone() };
  obj.removeFromParent();
  obj.position.set(0, 0, 0);
  obj.quaternion.identity();
  const scale = obj.scale.x;
  obj.scale.setScalar(1);
  obj.updateMatrixWorld(true);
  const b = new Box3().setFromObject(obj);
  obj.position.copy(keep.p);
  obj.quaternion.copy(keep.q);
  obj.scale.setScalar(scale);
  obj.updateMatrix();
  parent?.add(obj);
  const w = b.max.x - b.min.x;
  const d = b.max.z - b.min.z;
  const cx = (b.max.x + b.min.x) / 2;
  const cz = (b.max.z + b.min.z) / 2;
  const long = Math.max(w, d);
  const r = Math.min(w, d) / 2;
  const n = Math.max(1, Math.ceil(long / Math.max(r * 2, 0.01)));
  return Array.from({ length: n }, (_, k) => {
    const t = n === 1 ? 0 : -long / 2 + r + (k * (long - 2 * r)) / (n - 1);
    const at = w >= d ? new Vector3(cx + t, 0, cz) : new Vector3(cx, 0, cz + t);
    return { dir: at.applyMatrix4(obj.matrix).normalize(), r: (r + pad) * scale };
  });
}
type Planet = {
  name: string;
  look: Look;
  R: number;
  group: Group;
  sea: Mesh;
  q: Quaternion;
  ds: District[];
  height: (d: Vector3) => number;
  spots: Spot[];
  slot: number; // which place in the sky; -1 underfoot; -2 never in the sky
  chip: HTMLButtonElement;
  solids: Solid[];
};

// Where the other world hangs, in screen space (overview, then seen from the ground).
const SLOTS = [
  { far: new Vector2(-0.56, -0.42), near: new Vector2(-0.8, 0.8), radius: 7.6 },
  { far: new Vector2(-0.24, -0.76), near: new Vector2(-0.58, 0.86), radius: 4.8 },
];

// ═══ The world ═══
export function mountWorld({ root, items, open, select, reduced, active, night: startNight, guide }: WorldOptions): World {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const labels = root.querySelector<HTMLElement>('[data-w-labels]')!;
  const identity = root.querySelector<HTMLElement>('[data-w-id]')!;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.3, 500);
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

  // The computer's screen: the planet inside, rendered small and live.
  const screenRT = new WebGLRenderTarget(336, 202, { minFilter: NearestFilter, magFilter: NearestFilter });
  const screen = new Mesh(new PlaneGeometry(SCREEN_W, SCREEN_H), new MeshBasicMaterial({ map: screenRT.texture }));
  const screenCam = new PerspectiveCamera(FOV, SCREEN_W / SCREEN_H, 0.5, 500);

  const BUILD: Record<string, () => Group> = {
    tomatoes,
    eggplant,
    zucchini,
    pepper,
    leek: leeks,
    lemon: lemonTree,
    workbench,
    drawings: drawingBoard,
    computer: () => computer(screen),
    rocket: launchPad,
    'rocket-home': launchPad,
  };
  const districtOf = (it: WorldItem) => it.place ?? it.section;

  // ═══ Worlds ═══
  const loader = new TextureLoader();
  const geoFace = new PlaneGeometry(2.1, 2.62);
  const FACE_W = 1.05;
  const FACE_H = 1.31;

  function districts(names: string[], R: number): District[] {
    const az = [Math.PI, 1.05, -1.05];
    return names.map((section, i) => {
      const n = items.filter((it) => districtOf(it) === section).length;
      const dir = new Vector3(Math.sin(TILT) * Math.sin(az[i % 3]), Math.cos(TILT), Math.sin(TILT) * Math.cos(az[i % 3])).normalize();
      const own = SPREAD[section];
      return { section, dir, ...frameAt(dir), ring: own?.ring ?? Math.min(ringFor(n), R * 0.5), arc: own?.arc ?? ARC };
    });
  }

  let tabbing = false;
  // Lights that only come on after dark: lanterns, the house's windows, the juice box's own glow.
  const lamps: PointLight[] = [];
  function makePlanet(name: string, look: Look, names: string[], R: number, detail: number, coast: number, trees: number, ridge?: Vector3): Planet {
    const group = new Group();
    const ds = districts(names, R);
    const { height, paved } = makeGround(R, ds, coast, look, ridge);
    const garden = ds.find((z) => z.section === 'Garden');
    const paint = look === 'chip' ? paintChip : look === 'hull' ? paintHull : paintEarth((c) => !!garden && c.angleTo(garden.dir) * R < garden.ring + 2.4);
    group.add(terrain(R, detail, height, paved, paint));
    const sea = look === 'earth' ? water(R, detail, height) : new Mesh(new IcosahedronGeometry(R + SEA, Math.max(10, Math.round(detail * 0.5))), new MeshLambertMaterial({ color: hex('ink').multiplyScalar(0.7) }));
    sea.receiveShadow = true;
    sea.visible = look !== 'hull';
    group.add(sea);

    const solids: Solid[] = [];
    const basis = new Matrix4();
    // The ground as drawn: the mesh runs straight between its corners, so on a
    // slope it sits below the height at a point. The lowest height a step round
    // a point is where anything planted there should stand, so nothing floats;
    // the spread says how steep it is there.
    const footing = (d: Vector3) => {
      const { u, v } = frameAt(d);
      let lo = height(d);
      let hi = lo;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const h = height(d.clone().multiplyScalar(R).addScaledVector(u, Math.cos(a) * 0.6).addScaledVector(v, Math.sin(a) * 0.6).normalize());
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
      return { lo, hi };
    };
    const at = (obj: Object3D, dir: Vector3, u: Vector3, v: Vector3, x: number, z: number, yaw = 0, lift = 0) => {
      const d = dir.clone().multiplyScalar(R).addScaledVector(u, x).addScaledVector(v, z).normalize();
      obj.position.copy(d).multiplyScalar(R + Math.max(footing(d).lo, SEA) + lift);
      const inward = new Vector3().copy(v).negate().addScaledVector(d, v.dot(d)).normalize();
      const right = new Vector3().crossVectors(d, inward).normalize();
      basis.makeBasis(right, d, inward);
      obj.quaternion.setFromRotationMatrix(basis);
      obj.rotateY(yaw);
      group.add(obj);
      return { d, inward, right };
    };
    const clear = (d: Vector3) => {
      if (paved(d) > 0.02) return false;
      if (ds.length > 1 && d.angleTo(NORTH) * R < 8.5) return false;
      return ds.every((z) => d.angleTo(z.dir) * R > z.ring + 5.8);
    };
    const spots = (n: number, test = clear, lo = SEA + 0.5, hi = 3) => {
      const out: { d: Vector3; h: number }[] = [];
      for (let tries = 0; out.length < n && tries < n * 80; tries++) {
        const d = new Vector3(rand() - 0.5, rand() * 0.8 - 0.1, rand() - 0.5).normalize();
        const f = footing(d);
        const h = f.lo;
        // not on the cliffs between terraces: half the roots would hang in the air
        if (!test(d) || h < lo || h > hi || f.hi - f.lo > 0.45) continue;
        out.push({ d, h });
      }
      return out;
    };
    const tmp = new Matrix4();
    const q0 = new Quaternion();
    const scale = new Vector3();
    const forest = (geo: BufferGeometry, m: MeshLambertMaterial, list: { d: Vector3; h: number }[], yOff: number, size: number, sy = 1) => {
      if (!list.length) return;
      const inst = new InstancedMesh(geo, m, list.length);
      inst.castShadow = true;
      list.forEach(({ d, h }, i) => {
        q0.setFromUnitVectors(NORTH, d);
        const s = size * (0.8 + hash(d.x, d.z, d.y) * 0.45);
        scale.set(s, s * sy, s);
        tmp.compose(d.clone().multiplyScalar(R + h + yOff * s), q0, scale);
        inst.setMatrixAt(i, tmp);
      });
      group.add(inst);
    };
    const stand = (obj: Object3D, d: Vector3) => {
      const { u, v } = frameAt(d);
      at(obj, d, u, v, 0, 0, hash(d.x, d.y, d.z) * 6);
    };
    const verge = (d: Vector3) => paved(d) < 0.02 && ds.some((z) => d.angleTo(z.dir) * R < z.ring + 5);

    if (look === 'earth') {
      // Fruit trees heavy with lemons and oranges, umbrella pines, palms by the sea, boats on it.
      const round = spots(trees);
      round.forEach(({ d }) => solids.push({ dir: d, r: 0.55 }));
      forest(new IcosahedronGeometry(0.82, 2), soft('olive'), round, 1.45, 1);
      forest(new CylinderGeometry(0.11, 0.16, 1, 7), soft('ink'), round, 0.5, 1);
      const fruit: { d: Vector3; h: number }[] = [];
      round.forEach(({ d, h }, i) => {
        if (i % 2) return;
        const { u, v } = frameAt(d);
        [0, 2.1, 4.2].forEach((a) => fruit.push({ d: d.clone().multiplyScalar(R).addScaledVector(u, Math.cos(a + i) * 0.72).addScaledVector(v, Math.sin(a + i) * 0.72).normalize(), h: h + 1.2 }));
      });
      forest(new IcosahedronGeometry(0.15, 1), soft('ochre'), fruit, 0, 1);
      const pines = spots(Math.round(trees * 0.3));
      pines.forEach(({ d }) => solids.push({ dir: d, r: 0.3 }));
      // the trunk runs from the ground up into the crown (it used to start a metre up, and the pines hovered)
      forest(new CylinderGeometry(0.08, 0.13, 1, 7), soft('ink'), pines, 0.5, 3, 1);
      forest(new IcosahedronGeometry(1, 2), soft('olive'), pines, 2.75, 1.25, 0.42);
      spots(Math.round(trees * 0.12), clear, SEA + 0.5, SEA + 1.6).forEach(({ d }) => {
        stand(palm(), d);
        solids.push({ dir: d, r: 0.3 });
      });
      for (let tries = 0, n = 0; n < 4 && tries < 400; tries++) {
        const d = new Vector3(rand() - 0.5, rand() * 0.9 - 0.2, rand() - 0.5).normalize();
        if (height(d) > SEA - 0.6) continue;
        const b = boat();
        const { u, v } = frameAt(d);
        at(b, d, u, v, 0, 0, rand() * 6);
        b.position.copy(d).multiplyScalar(R + SEA - 0.08);
        n++;
      }
      (['cream', 'red', 'ochre'] as Pigment[]).forEach((k) => forest(new IcosahedronGeometry(0.1, 1), soft(k), spots(Math.round(trees * 0.55), verge), 0.12, 1));
    } else if (look === 'chip') {
      // Chips and capacitors instead of trees.
      const chips = spots(trees);
      chips.forEach(({ d }) => solids.push({ dir: d, r: 0.8 }));
      forest(new BoxGeometry(1.5, 0.4, 1.1), mat('ink'), chips, 0.2, 1);
      forest(new BoxGeometry(0.9, 0.06, 0.5), mat('cream'), chips, 0.44, 1);
      const caps = spots(Math.round(trees * 0.6));
      caps.forEach(({ d }) => solids.push({ dir: d, r: 0.35 }));
      forest(new CylinderGeometry(0.3, 0.3, 1, 12), soft('blue'), caps, 0.5, 1);
      forest(new CylinderGeometry(0.31, 0.31, 0.08, 12), soft('cream'), caps, 1.02, 1);
      forest(new IcosahedronGeometry(0.1, 1), soft('red'), spots(Math.round(trees * 0.5), verge), 0.12, 1);
    }

    // Spots: plates on stands, or things, each with a sign
    const all: Spot[] = [];
    const makeSpot = (i: number, zi: number, a: number, z: District | null) => {
      const it = items[i];
      const build = look !== 'chip' ? BUILD[it.slug] : undefined;
      let g: Group;
      let box3: Box3;
      if (build) {
        g = build();
        box3 = new Box3().setFromObject(g);
      } else {
        g = new Group();
        const tex = loader.load(`/img/s-${it.slug}.png`);
        tex.colorSpace = SRGBColorSpace;
        tex.magFilter = LinearFilter;
        tex.minFilter = LinearMipmapLinearFilter;
        const face = new Mesh(geoFace, new MeshBasicMaterial({ map: tex, side: DoubleSide }));
        face.position.y = 1.86;
        g.add(box(2.3, 2.82, 0.14, 'ink', 0, 0.45, -0.09), box(0.9, 0.46, 0.5, 'cream'), face);
        box3 = new Box3(new Vector3(-FACE_W, 1.86 - FACE_H, 0), new Vector3(FACE_W, 1.86 + FACE_H, 0));
      }
      const place = z ?? { dir: NORTH, ...frameAt(NORTH), ring: 3.4 };
      const { d, inward, right } = at(g, place.dir, place.u, place.v, Math.sin(a) * place.ring, Math.cos(a) * place.ring);
      const hits: Object3D[] = [];
      g.traverse((o) => (o as Mesh).isMesh && hits.push(o));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'w-tomb';
      b.innerHTML = `<span class="t"></span><span class="m"><span class="mt"></span><span class="k">Enter</span></span>`;
      b.querySelector('.t')!.textContent = it.title;
      b.querySelector('.mt')!.textContent = `${it.kind} · ${it.year}`;
      const scale = build ? 1.25 : 1;
      const spot: Spot = { i, dir: d, inward, right, g, hits, box: box3, card: !build, zone: zi, label: b, size: 0, scale, reach: build ? box3.max.z * scale + HERO_R + 0.5 : 2.2 };
      g.scale.setScalar(scale);
      if (build) solids.push(...footprint(g));
      else solids.push({ dir: d, r: 0.75 });
      b.addEventListener('click', () => {
        if (!tabbing) b.blur();
        visit(spot);
      });
      b.addEventListener('focus', () => {
        if (b.matches(':focus-visible')) face(spot);
      });
      labels.append(b);
      all.push(spot);
    };
    ds.forEach((z, zi) => {
      const here = items.map((_, i) => i).filter((i) => districtOf(items[i]) === z.section);
      here.forEach((i, k) => makeSpot(i, zi, here.length > 1 ? -z.arc + (k / (here.length - 1)) * z.arc * 2 : 0, z));
    });
    // The station's dock sits at its pole.
    if (look === 'hull') items.forEach((it, i) => it.place === 'Dock' && makeSpot(i, -1, 0, null));

    // Lanterns along the roads, and fireflies once it is dark.
    const lantern = (dir: Vector3) => {
      const g = new Group();
      g.add(cyl(0.06, 1.45, 'ink'), box(0.36, 0.06, 0.36, 'ink', 0, 1.42), cone(0.3, 0.22, 'red', 0, 1.86, 0, 4));
      const l = new Mesh(new BoxGeometry(0.26, 0.38, 0.26), glass);
      l.position.y = 1.67;
      const pool = new Mesh(new CircleGeometry(2.8, 18), haloMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.06;
      g.add(l, pool);
      // at home, a real light too, that warms the ground, the walls and the hero when it is dark
      if (look === 'earth') {
        const lamp = new PointLight(hex('ochre'), 0, 9, 1.4);
        lamp.position.y = 1.67;
        g.add(lamp);
        lamps.push(lamp);
      }
      at(g, dir, frameAt(dir).u, frameAt(dir).v, 0, 0);
    };
    ds.forEach((z) => {
      [0.34, 0.62].forEach((t) => {
        const d = NORTH.clone().lerp(z.dir, t).normalize();
        lantern(d.multiplyScalar(R).addScaledVector(z.u, 1.5).normalize());
      });
    });
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
    return { name, look, R, group, sea, q: new Quaternion(), ds, height, spots: all, slot: -1, chip, solids };
  }
  const fliesMat = new PointsMaterial({ color: hex('ochre'), size: 0.07, transparent: true, opacity: 0, depthWrite: false });

  const home = makePlanet('Home', 'earth', WORLDS.home, 20, 44, 1.28, 150, new Vector3(-0.7, 0.34, 0.62).normalize());
  const pc = makePlanet('Computer', 'chip', WORLDS.pc, 13, 34, 1.5, 70);
  const station = makePlanet('Station', 'hull', WORLDS.station, 10, 26, 3.2, 0);
  const planets = [home, pc, station];
  station.slot = 0;
  pc.slot = -2;
  home.chip.textContent = 'Home';
  station.chip.textContent = 'Station';
  home.chip.addEventListener('click', () => select('Home'));
  station.chip.addEventListener('click', () => select('Station'));
  // Nothing inside the computer casts or catches a shadow: it is all light.
  pc.group.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  let cur = home;
  const spotOf = (slug: string) => planets.flatMap((p) => p.spots).find((s) => items[s.i].slug === slug)!;
  const computerSpot = spotOf('computer');
  const rocketSpot = spotOf('rocket');
  const dockSpot = spotOf('rocket-home');
  const padOf = (p: Planet) => (p === home ? rocketSpot : p === station ? dockSpot : null);

  // Buildings, set outward from each district and looking back at the plaza.
  const placeOn = (p: Planet, obj: Object3D, dir: Vector3, u: Vector3, v: Vector3, x: number, z: number, yaw = 0, lift = 0) => {
    const d = dir.clone().multiplyScalar(p.R).addScaledVector(u, x).addScaledVector(v, z).normalize();
    obj.position.copy(d).multiplyScalar(p.R + Math.max(p.height(d), SEA) + lift);
    const inward = v.clone().negate().addScaledVector(d, v.dot(d)).normalize();
    obj.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(d, inward).normalize(), d, inward));
    obj.rotateY(yaw);
    p.group.add(obj);
    if (lift === 0) p.solids.push(...footprint(obj));
  };
  const poleFrame = frameAt(NORTH);
  const house = casita();
  // the windows throw a warm light out onto the terrace
  const window1 = new PointLight(hex('ochre'), 0, 8, 1.4);
  window1.position.set(-0.4, 1.3, 2.6);
  house.add(window1);
  lamps.push(window1);
  placeOn(home, house, NORTH, poleFrame.u, poleFrame.v, 0, -3.4, Math.PI);
  placeOn(home, palm(), NORTH, poleFrame.u, poleFrame.v, 4.2, -2.6);
  placeOn(pc, cpu(), NORTH, poleFrame.u, poleFrame.v, 0, -3.4);
  const backs: Record<string, () => Group> = { Projects: rack, Experience: milestones, Education: shelf };
  pc.ds.forEach((z) => placeOn(pc, backs[z.section](), z.dir, z.u, z.v, 0, z.ring + 3.4));
  // The station: a ring round its middle, two solar wings, modules and dishes on the hull.
  const ring = new Mesh(new TorusGeometry(station.R + 3.2, 0.32, 8, 72), mat('cream'));
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  station.group.add(ring);
  [0, 1, 2, 3].forEach((k) => {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    const spoke = shade(new Mesh(new CylinderGeometry(0.12, 0.12, 3.6, 6), mat('ink')), Math.cos(a) * (station.R + 1.5), 0, Math.sin(a) * (station.R + 1.5));
    spoke.rotation.set(0, -a, Math.PI / 2);
    station.group.add(spoke);
  });
  [1, -1].forEach((s) => {
    const wing = new Group();
    wing.add(box(5.4, 0.08, 2.4, 'blue', 0, -0.04, 0), box(5.6, 0.1, 0.1, 'ink', 0, -0.05, 0), box(0.1, 0.1, 2.5, 'ink', 0, -0.05, 0));
    wing.position.set(s * (station.R + 6.4), 0, 0);
    station.group.add(wing, shade(new Mesh(new BoxGeometry(3.4, 0.14, 0.14), mat('ink')), s * (station.R + 4.6), 0, 0));
  });
  station.ds.forEach((z, k) => {
    placeOn(station, pod(k % 2 ? 'cream' : 'ochre'), z.dir, z.u, z.v, 0, z.ring + 3.2);
    placeOn(station, antenna(), z.dir, z.u, z.v, z.ring + 2.5, z.ring + 1.6);
  });

  // Clouds ride above the camera's path. They cast no shadow: they hang still
  // over the hero while the ground turns, so their shade would follow it about.
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
  clouds.traverse((o) => (o.castShadow = false));
  scene.add(clouds);
  // One plane on its way to somewhere warm.
  const orbit = new Group();
  orbit.rotation.set(1.25, 0.2, 0.55);
  const spin = new Group();
  orbit.add(spin);
  const plane = new Group();
  plane.add(box(0.36, 2.2, 0.36, 'cream', 0, -1.1, 0), box(3.2, 0.5, 0.1, 'cream', 0, -0.3, 0), box(1.1, 0.3, 0.1, 'cream', 0, 0.75, 0), box(0.08, 0.5, 0.5, 'red', 0, 0.7, 0.28));
  plane.position.set(26.2, 0, 0);
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
  // a soft glow that keeps the hero readable at night, wherever it wanders
  // At night, whatever the hero walks up to lights up, as if a lamp came on over it.
  const spotLamp = new PointLight(hex('cream'), 0, 9, 1.3);
  scene.add(spotLamp);
  let spotAt: Spot | null = null;
  // its glow comes from the lantern in its hand
  const heroGlow = new PointLight(hex('ochre'), 0, 6, 1.5);
  heroGlow.position.set(0, -0.4, 0.3);
  hero.shade.add(heroGlow);
  const heroHits: Object3D[] = [];
  hero.g.traverse((o) => (o as Mesh).isMesh && heroHits.push(o));

  // ═══ Water ═══
  // Wading in the sea, the juice box leaves rings that spread on the water
  // where it stepped, and a splash of drops when it goes in or lands in it.
  const ringGeo = new RingGeometry(0.46, 0.6, 22).rotateX(-Math.PI / 2);
  const ripples = Array.from({ length: 12 }, () => {
    const m = new Mesh(ringGeo, new MeshBasicMaterial({ color: hex('cream'), transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    return { m, t: 1, big: 1 };
  });
  let rippleK = 0;
  const ripple = (big = 1, spot?: Vector3) => {
    const r = ripples[rippleK++ % ripples.length];
    const d = spot ?? under;
    r.m.removeFromParent();
    cur.group.add(r.m);
    // where the hero stands (or a fish went in), in the planet's own frame, just over the water
    r.m.position.copy(d).multiplyScalar(cur.R + SEA + 0.04);
    r.m.quaternion.setFromUnitVectors(axisUp, d);
    r.t = 0;
    r.big = big;
    r.m.visible = true;
  };
  const DROPS = 14;
  const dropPos = new Float32Array(DROPS * 3);
  const dropVel = new Float32Array(DROPS * 3);
  const dropGeo = new BufferGeometry();
  dropGeo.setAttribute('position', new BufferAttribute(dropPos, 3));
  const dropMat = new PointsMaterial({ color: hex('cream'), size: 0.16, transparent: true, opacity: 0, depthWrite: false });
  const drops = new Points(dropGeo, dropMat);
  drops.frustumCulled = false;
  scene.add(drops);
  let dropT = 1;
  const splash = (y: number) => {
    for (let i = 0; i < DROPS; i++) {
      const a = (i / DROPS) * Math.PI * 2 + Math.random() * 0.4;
      const sp = 1.2 + Math.random() * 1.6;
      dropPos.set([Math.cos(a) * 0.3, y, Math.sin(a) * 0.3], i * 3);
      dropVel.set([Math.cos(a) * sp, 4 + Math.random() * 3, Math.sin(a) * sp], i * 3);
    }
    dropT = 0;
    ripple(1.6);
  };

  // ═══ Passers-by ═══
  // Now and then something lives here too: a cat crossing the terrace, a
  // hedgehog after dark, a mouse in a hurry, a crab on the sand, gulls over
  // the coast, a fish leaping, butterflies by day. Never many, never for long.
  // Shells lie on the beaches all the time.
  const critter = {
    cat() {
      const g = new Group();
      const k: Pigment = Math.random() < 0.5 ? 'ochre' : 'ink';
      g.add(box(0.24, 0.24, 0.56, k, 0, 0.16), box(0.26, 0.24, 0.22, k, 0, 0.32, 0.34));
      g.add(cone(0.06, 0.12, k, -0.08, 0.56, 0.34, 4), cone(0.06, 0.12, k, 0.08, 0.56, 0.34, 4));
      g.add(box(0.05, 0.05, 0.02, k === 'ink' ? 'ochre' : 'ink', -0.06, 0.44, 0.46), box(0.05, 0.05, 0.02, k === 'ink' ? 'ochre' : 'ink', 0.06, 0.44, 0.46));
      const tail = cyl(0.035, 0.5, k, 0, 0.2, -0.3, 5);
      tail.rotation.x = -0.6;
      g.add(tail);
      [-0.08, 0.08].forEach((x) => [-0.18, 0.18].forEach((z) => g.add(box(0.07, 0.16, 0.07, k, x, 0, z))));
      return g;
    },
    hedgehog() {
      const g = new Group();
      g.add(blob(0.24, 'ink', 0, 0.18, 0, 0.72), box(0.14, 0.12, 0.14, 'ochre', 0, 0.1, 0.24), box(0.05, 0.05, 0.04, 'ink', 0, 0.12, 0.32));
      for (let i = 0; i < 9; i++) {
        const sp = cone(0.05, 0.16, 'ochre', 0, 0, 0, 4);
        const a = (i / 9) * Math.PI * 2;
        sp.position.set(Math.cos(a) * 0.16, 0.26, Math.sin(a) * 0.14 - 0.03);
        sp.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
        g.add(sp);
      }
      return g;
    },
    mouse() {
      const g = new Group();
      g.add(box(0.12, 0.1, 0.2, 'cream', 0, 0.02), box(0.08, 0.08, 0.08, 'cream', 0, 0.05, 0.13), box(0.05, 0.05, 0.02, 'red', -0.04, 0.13, 0.1), box(0.05, 0.05, 0.02, 'red', 0.04, 0.13, 0.1));
      g.add(tilt(box(0.015, 0.015, 0.22, 'red', 0, 0.04, -0.2), 0.3, 0, 0));
      return g;
    },
    crab() {
      const g = new Group();
      g.add(box(0.3, 0.1, 0.2, 'red', 0, 0.08), box(0.04, 0.08, 0.04, 'ink', -0.06, 0.18, 0.06), box(0.04, 0.08, 0.04, 'ink', 0.06, 0.18, 0.06));
      [-1, 1].forEach((sx) => {
        g.add(box(0.1, 0.08, 0.08, 'red', sx * 0.2, 0.12, 0.12));
        [-0.06, 0.04].forEach((z) => g.add(box(0.12, 0.03, 0.03, 'red', sx * 0.2, 0.04, z)));
      });
      return g;
    },
    gull() {
      const g = new Group();
      g.add(box(0.18, 0.16, 0.6, 'cream'), box(0.08, 0.05, 0.12, 'ochre', 0, 0.04, 0.34), box(0.16, 0.04, 0.2, 'ink', 0, 0.04, -0.34));
      const wings = [-1, 1].map((sx) => {
        const w = new Group();
        w.add(box(0.7, 0.03, 0.26, 'cream', sx * 0.35, 0), box(0.2, 0.035, 0.26, 'ink', sx * 0.62, 0));
        w.position.y = 0.1;
        g.add(w);
        return w;
      });
      g.userData.wings = wings;
      return g;
    },
    fish() {
      const g = new Group();
      const body = new Group();
      body.add(box(0.12, 0.2, 0.42, Math.random() < 0.5 ? 'blue' : 'ochre', 0, -0.1), box(0.04, 0.2, 0.14, 'cream', 0, -0.1, -0.26), box(0.13, 0.04, 0.04, 'ink', 0, 0, 0.14));
      g.add(body);
      g.userData.body = body;
      return g;
    },
    butterfly() {
      const g = new Group();
      const k: Pigment = Math.random() < 0.5 ? 'cream' : 'ochre';
      g.add(box(0.03, 0.03, 0.14, 'ink'));
      const wings = [-1, 1].map((sx) => {
        const w = new Group();
        w.add(box(0.16, 0.01, 0.14, k, sx * 0.08, 0, 0.02), box(0.1, 0.01, 0.08, 'red', sx * 0.06, 0, -0.08));
        g.add(w);
        return w;
      });
      g.userData.wings = wings;
      return g;
    },
  };
  type Kind = keyof typeof critter;
  type Life = { kind: Kind; g: Group; p: Vector3; h: Vector3; t: number; dur: number; speed: number; alt: number; still: number };
  const living: Life[] = [];
  let nextCritter = performance.now() + 9000;
  const onLand = (d: Vector3) => home.height(d) > SEA + 0.12;
  const onSand = (d: Vector3) => home.height(d) > SEA + 0.02 && home.height(d) < SEA + 0.4;
  // Somewhere a few steps from the hero that suits the kind.
  // In front of the hero, where the camera looks, rather than behind it.
  const near = (test: (d: Vector3) => boolean, lo: number, hi: number) => {
    const back = new Quaternion().copy(home.q).invert();
    const fwd = new Vector3(0, 0, -1).applyQuaternion(back);
    const right = new Vector3(1, 0, 0).applyQuaternion(back);
    for (let i = 0; i < 40; i++) {
      const a = (Math.random() - 0.5) * 1.6;
      const r = lo + Math.random() * (hi - lo);
      const d = under.clone().multiplyScalar(home.R).addScaledVector(fwd, Math.cos(a) * r).addScaledVector(right, Math.sin(a) * r).normalize();
      if (test(d)) return d;
    }
    return null;
  };
  const tangent = (p: Vector3) => {
    const { u, v } = frameAt(p);
    const a = Math.random() * Math.PI * 2;
    return u.multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)).normalize();
  };
  function spawn(force?: Kind) {
    const dark = nightNow > 0.5;
    const pool: Kind[] = dark ? ['hedgehog', 'hedgehog', 'cat', 'mouse', 'fish', 'crab'] : ['cat', 'mouse', 'crab', 'gull', 'gull', 'fish', 'butterfly', 'butterfly', 'hedgehog'];
    const kind = force ?? pool[Math.floor(Math.random() * pool.length)];
    const test = kind === 'fish' ? (d: Vector3) => home.height(d) < SEA - 0.5 : kind === 'crab' ? onSand : kind === 'gull' ? () => true : onLand;
    const p = near(test, 3, kind === 'fish' ? 13 : 7.5);
    if (!p) return;
    const flock = kind === 'gull' ? 2 + Math.floor(Math.random() * 2) : kind === 'butterfly' ? 2 : 1;
    for (let i = 0; i < flock; i++) {
      const g = critter[kind]();
      home.group.add(g);
      const q = i ? p.clone().multiplyScalar(home.R).add(new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(2.4)).normalize() : p.clone();
      const life: Life = {
        kind,
        g,
        p: q,
        h: i && living.length ? living[living.length - 1].h.clone() : tangent(q),
        t: 0,
        dur: { cat: 11, hedgehog: 13, mouse: 6, crab: 8, gull: 12, fish: 1.1, butterfly: 12 }[kind],
        speed: { cat: 0.9, hedgehog: 0.35, mouse: 2.6, crab: 0.6, gull: 3.2, fish: 0, butterfly: 0.7 }[kind],
        alt: kind === 'gull' ? 6 + Math.random() * 2 : kind === 'butterfly' ? 0.8 : 0,
        still: 0,
      };
      living.push(life);
    }
    if (kind === 'cat' && Math.random() < 0.6) window.setTimeout(() => play('meow'), 800);
    if (kind === 'gull') window.setTimeout(() => play('gull'), 600);
    if (kind === 'mouse') play('squeak');
    if (kind === 'fish') play('splash');
  }
  const basisM = new Matrix4();
  const side = new Vector3();
  function lives(dt: number, now: number) {
    if (cur === home && !busy() && !aboard && zoom > 0.5 && now > nextCritter) {
      if (living.length < 4) spawn();
      nextCritter = now + 14000 + Math.random() * 22000;
    }
    for (let i = living.length - 1; i >= 0; i--) {
      const L = living[i];
      L.t += dt;
      const end = L.t >= L.dur || cur !== home;
      if (end) {
        L.g.removeFromParent();
        living.splice(i, 1);
        continue;
      }
      // in and out by growing and shrinking, like the hero between worlds
      const grow = Math.min(1, L.t / 0.4, (L.dur - L.t) / 0.5);
      if (L.kind === 'fish') {
        // a leap: out of the water and back in, with a ring each way
        const t = L.t / L.dur;
        const y = Math.sin(t * Math.PI) * 1.5;
        L.g.position.copy(L.p).multiplyScalar(home.R + SEA - 0.1 + y);
        side.crossVectors(L.p, L.h).normalize();
        basisM.makeBasis(side, L.p, L.h);
        L.g.quaternion.setFromRotationMatrix(basisM);
        (L.g.userData.body as Group).rotation.x = -Math.cos(t * Math.PI) * 0.9;
        L.g.position.addScaledVector(L.h, (t - 0.5) * 1.6);
        if (L.t - dt < 0.02) ripple(0.7, L.p);
        if (t > 0.92 && !L.still) {
          L.still = 1;
          ripple(0.8, L.g.position.clone().normalize());
          play('splash');
        }
        L.g.scale.setScalar(1.6);
        continue;
      }
      // the mouse darts and stops; the cat sits a while halfway; butterflies wander
      let go = L.speed;
      if (L.kind === 'mouse') go *= Math.sin(L.t * 5) > -0.2 ? 1 : 0;
      if (L.kind === 'cat' && L.t > L.dur * 0.4 && L.t < L.dur * 0.62) go = 0;
      if (L.kind === 'butterfly' || L.kind === 'gull') {
        const turn = L.kind === 'butterfly' ? Math.sin(L.t * 2.3 + i) * 1.8 : 0.22;
        L.h.applyAxisAngle(L.p, turn * dt);
      }
      const step = (go * dt) / home.R;
      const next = L.p.clone().addScaledVector(L.h, step).normalize();
      const ok = L.alt > 0 || (L.kind === 'crab' ? onSand(next) : onLand(next));
      if (ok) L.p.copy(next);
      else L.h.negate(); // the water's edge: turn back
      L.h.addScaledVector(L.p, -L.h.dot(L.p)).normalize();
      const ground = L.alt > 0 ? 0 : Math.max(home.height(L.p), SEA);
      const bob = L.kind === 'butterfly' ? Math.sin(L.t * 9) * 0.15 : L.kind === 'gull' ? Math.sin(L.t * 0.8) * 0.4 : go ? Math.abs(Math.sin(L.t * go * 9)) * 0.04 : 0;
      L.g.position.copy(L.p).multiplyScalar(home.R + ground + L.alt + bob);
      // crabs walk sideways
      const face = L.kind === 'crab' ? side.crossVectors(L.p, L.h).normalize().clone() : L.h;
      side.crossVectors(L.p, face).normalize();
      basisM.makeBasis(side, L.p, face);
      L.g.quaternion.setFromRotationMatrix(basisM);
      if (L.kind === 'gull') L.g.rotateZ(-0.35); // banking round the turn
      const wings = L.g.userData.wings as Group[] | undefined;
      if (wings) {
        const f = L.kind === 'butterfly' ? Math.sin(now * 0.03) * 1.1 : Math.sin(now * 0.008) * 0.45;
        wings[0].rotation.z = f;
        wings[1].rotation.z = -f;
      }
      // a touch larger than life, so they read from the camera
      L.g.scale.setScalar(Math.max(0.001, grow) * (L.kind === 'gull' ? 1.8 : L.kind === 'butterfly' ? 2.2 : 1.6));
    }
  }
  // Shells on the sand: scallops and cockles, a few on every beach.
  for (let n = 0, tries = 0; n < 16 && tries < 3000; tries++) {
    const d = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    if (!onSand(d)) continue;
    const shell = new Group();
    const k: Pigment = (['cream', 'red', 'ochre'] as Pigment[])[n % 3];
    const fan = cone(0.14, 0.05, k, 0, 0, 0, 7);
    fan.scale.z = 0.8;
    shell.add(fan, box(0.06, 0.03, 0.05, k, 0, 0, -0.1));
    shell.position.copy(d).multiplyScalar(home.R + home.height(d) + 0.02);
    shell.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d);
    shell.rotateY(Math.random() * 6);
    home.group.add(shell);
    n++;
  }

  let wet = 0; // 0 on land, 1 up to the knees in the sea
  let wasWet = false;
  let lapse = 0; // time since the last ring, while standing in the water

  // ═══ Dither pass ═══
  const target = new WebGLRenderTarget(4, 4, { type: HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true });
  const uniforms = {
    tex: { value: target.texture },
    pal: { value: (['ink', 'olive', 'red', 'ochre', 'cream', 'blue'] as Pigment[]).map(rgb) },
    dayTop: { value: rgb('blue') },
    dayGlow: { value: rgb('blue').lerp(rgb('cream'), 0.42) }, // a haze, not a halo
    nightTop: { value: rgb('ink') },
    nightGlow: { value: rgb('blue') },
    starTone: { value: rgb('cream') },
    night: { value: startNight ? 1 : 0 },
    time: { value: 0 },
    space: { value: 0 },
    scan: { value: 0 },
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

  // ═══ The guide ═══
  // The juice box talks in a bubble over its head, a letter at a time.
  const bubble = document.createElement('div');
  bubble.className = 'w-say';
  bubble.setAttribute('role', 'status');
  bubble.innerHTML = `<p class="w-say-who caps">Zumo</p><p class="w-say-txt"></p><p class="w-say-foot"><span class="w-say-n"></span><button type="button" class="w-say-skip">Skip</button><button type="button" class="w-say-next">Next</button></p>`;
  labels.append(bubble);
  const sayTxt = bubble.querySelector<HTMLElement>('.w-say-txt')!;
  const sayN = bubble.querySelector<HTMLElement>('.w-say-n')!;
  const sayNext = bubble.querySelector<HTMLButtonElement>('.w-say-next')!;
  let talk: { lines: string[]; k: number; shown: number; until: number; tour: boolean } | null = null;
  const TOURED = 'df-toured';
  const remember = () => {
    try {
      localStorage.setItem(TOURED, '1');
    } catch {}
  };
  function say(lines: string[], tour: boolean, ms = 0) {
    talk = { lines, k: 0, shown: 0, until: ms ? performance.now() + ms : Infinity, tour };
    bubble.classList.toggle('tour', tour);
    sayTxt.textContent = '';
  }
  function hush() {
    // the tour is given close up; when it ends, the whole planet and the name come back
    if (talk?.tour) {
      remember();
      if (cur === home && !busy()) overview();
    }
    talk = null;
  }
  // Finish the line being typed, or go on to the next one.
  function onward() {
    if (!talk) return;
    const line = talk.lines[talk.k];
    if (talk.shown < line.length) return void (talk.shown = line.length);
    if (talk.k + 1 >= talk.lines.length) return hush();
    talk.k++;
    talk.shown = 0;
  }
  bubble.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.w-say-skip')) return hush();
    onward();
  });

  // ═══ Moving ═══
  // The hero stays at the top of the scene. Walking turns the planet under it.
  const qHome = new Quaternion();
  const axisY = new Vector3(0, 1, 0);
  const axisUp = axisY;
  const dq = new Quaternion();
  let zoom = 0;
  let zoomGoal = 0;
  type Then = (() => void) | undefined;
  let trip: { from: Quaternion; to: Quaternion; t0: number; dur: number; then?: Then } | null = null;
  let warp: { from: Planet; to: Planet; t0: number; dur: number; then?: Then } | null = null;
  // Into the screen (1) or back out of it (-1).
  let dive: { dir: 1 | -1; t0: number; dur: number; then?: Then } | null = null;
  // A rocket going up from a pad, or coming down onto one.
  let launch: { p: Planet; t0: number; dur: number; then?: Then } | null = null;
  let land: { p: Planet; t0: number; dur: number; then?: Then } | null = null;
  let aboard = false; // the hero is in the rocket
  let pending: string | null = null;
  let burst = -1e9; // a moment of coarse pixels, to cover a cut
  let qDesk: Quaternion | null = null;
  const busy = () => !!(warp || dive || launch || land);
  let vel = { x: 0, z: 0 };
  let lastInput = -1e9;
  let heroY = cur.R + GROUND;
  let heroYaw = 0;
  let stride = 0;
  let hop = 0;
  let jumpV = 0;
  let jumpY = 0;
  let ahead = 0; // how much the camera leans to show what lies ahead of the hero
  let nightNow = startNight ? 1 : 0;
  let nightGoal = nightNow;
  const started = performance.now();
  let intro = reduced() ? 0 : 2800;
  let greeted = false;
  const keys = new Set<string>();
  const ms = (n: number) => (reduced() ? 1 : n);

  const touch = () => {
    lastInput = performance.now();
    intro = 0;
    hovered = null; // the ground is about to move under a still cursor
  };
  function roll(x: number, z: number) {
    // x turns the planet about +X (walking away from the camera), z about +Z (walking right)
    const len = Math.hypot(x, z);
    if (!len) return;
    dq.setFromAxisAngle(new Vector3(x / len, 0, z / len), len);
    cur.q.premultiply(dq).normalize();
  }
  function turnTo(to: Quaternion, dur: number, then?: Then) {
    trip = { from: cur.q.clone(), to, t0: performance.now(), dur, then };
    vel = { x: 0, z: 0 };
    touch();
  }
  // Into a district, turned so its open side faces the camera.
  function arrive(z: District) {
    if (busy()) return;
    heading.set(0, -1);
    const to = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(z.dir, z.v).negate().normalize(), z.dir, z.v.clone().negate())).invert();
    turnTo(to, ms(1300));
    zoomGoal = 1;
  }
  function overview() {
    turnTo(qHome.clone(), ms(1100));
    zoomGoal = 0;
  }
  // Standing just in front of a thing, which faces the camera over the hero's head.
  function facing(s: Spot) {
    const R = planets.find((p) => p.spots.includes(s))!.R;
    const a = s.dir.clone().multiplyScalar(R).addScaledVector(s.inward, s.reach).normalize();
    const inward = s.inward.clone().addScaledVector(a, -s.inward.dot(a)).normalize();
    const right = new Vector3().crossVectors(a, inward).normalize();
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, a, inward)).invert();
  }
  function face(s: Spot, then?: Then) {
    if (busy()) return;
    const to = facing(s);
    heading.set(0, -1);
    zoomGoal = 1;
    const angle = cur.q.angleTo(to);
    if (angle < 0.01) {
      touch();
      return then?.();
    }
    turnTo(to, ms(Math.min(1500, 600 + angle * 900)), then);
  }
  function visit(s: Spot) {
    if (busy()) return;
    play('tap');
    const it = items[s.i];
    // The web opens now, while the click still counts as one.
    if (it.href) {
      window.open(it.href, '_blank', 'noopener');
      return face(s);
    }
    face(s, () => (it.room ? select(it.room) : open(s.i)));
  }
  function jump(to: Planet, then?: Then) {
    if (to === cur || warp) return then?.();
    trip = null;
    vel = { x: 0, z: 0 };
    keys.clear();
    warp = { from: cur, to, t0: performance.now(), dur: ms(1700), then };
    play('warp');
    cur.spots.forEach((p) => p.label.classList.remove('on'));
    to.slot = -1;
    touch();
  }
  // Up in the rocket from here, down onto the pad there.
  function fly(to: Planet, then?: Then) {
    aboard = true;
    zoomGoal = 0.55; // back far enough to watch it go
    play('launch');
    launch = {
      p: cur,
      t0: performance.now(),
      dur: ms(1500),
      then: () => {
        to.q.copy(facing(padOf(to)!));
        jump(to, () => {
          zoomGoal = 1;
          play('land');
          land = {
            p: to,
            t0: performance.now(),
            dur: ms(1400),
            then: () => {
              aboard = false;
              then?.();
            },
          };
        });
      },
    };
    touch();
  }
  function enterPC(then?: Then) {
    qDesk = home.q.clone();
    play('dive');
    dive = {
      dir: 1,
      t0: performance.now(),
      dur: ms(1800),
      then: () => {
        cur.spots.forEach((p) => p.label.classList.remove('on'));
        cur = pc;
        zoom = zoomGoal = 0;
        heroY = pc.R + GROUND;
        burst = performance.now();
        then?.();
      },
    };
    touch();
  }
  function exitPC(then?: Then) {
    cur.spots.forEach((p) => p.label.classList.remove('on'));
    cur = home;
    home.q.copy(qDesk ?? facing(computerSpot));
    trip = null;
    zoom = zoomGoal = 1;
    heroY = home.R + GROUND;
    burst = performance.now();
    dive = { dir: -1, t0: performance.now(), dur: ms(1400), then };
    play('surface');
    touch();
  }
  // Names a place: a district, a world, or 'all' for the whole home planet.
  function resolve(name: string) {
    if (name === 'all' || name === 'Home') return { p: home, z: null };
    if (name === 'Computer') return { p: pc, z: null };
    if (name === 'Station') return { p: station, z: null };
    for (const p of planets) {
      const z = p.ds.find((d) => d.section === name);
      if (z) return { p, z };
    }
    return null;
  }
  function travel(name: string) {
    if (busy()) return void (pending = name);
    const to = resolve(name);
    if (!to) return;
    const done = () => {
      if (to.z) arrive(to.z);
      else if (name === 'all') overview();
      else if (to.p !== home) say([guide.places[to.p.name]], false, 4200);
    };
    if (cur === to.p) {
      if (to.z) return arrive(to.z);
      if (name !== 'Home') overview();
      return;
    }
    if (cur === pc) return exitPC(() => (name === 'Home' ? undefined : travel(name)));
    if (to.p === pc) {
      if (cur === station) return fly(home, () => travel(name));
      return face(computerSpot, () => enterPC(done));
    }
    face(padOf(cur)!, () => fly(to.p, () => (to.p === home && !to.z && name !== 'all' ? say([guide.places.Home], false, 2600) : done())));
  }

  // Dragging grabs the ground.
  const ray = new Raycaster();
  const ndc = new Vector2();
  let down: { x: number; y: number; moved: boolean } | null = null;
  let hovered: Spot | null = null;
  let chosen: Spot | null = null; // the thing within reach: what Enter opens
  let lastPtr = { x: -1, y: -1 };
  const heading = new Vector2(0, -1); // where the hero last walked; into the screen on arrival
  const aim = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const pick = (cx: number, cy: number) => {
    aim(cx, cy);
    const hits = ray.intersectObjects(
      cur.spots.flatMap((s) => s.hits),
      false,
    );
    for (const h of hits) {
      const s = cur.spots.find((x) => x.hits.includes(h.object))!;
      if (s.dir.clone().applyQuaternion(cur.q).dot(camera.position.clone().normalize()) > 0.05) return s;
    }
    return null;
  };
  const onHero = (cx: number, cy: number) => {
    aim(cx, cy);
    return !aboard && ray.intersectObjects(heroHits, false).length > 0;
  };
  // Worlds in the sky are hit in screen space: a generous circle around each.
  const skyAt = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    return planets.find((p, k) => p.slot >= 0 && Math.hypot(cx - r.left - skyPos[k].x, cy - r.top - skyPos[k].y) < skyPos[k].r + 6);
  };
  const PER_PX = 0.0034;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY, moved: false };
    trip = busy() ? trip : null;
    vel = { x: 0, z: 0 };
    touch();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) {
      // Browsers also send moves when things slide under a still cursor: only a real one counts.
      if (e.clientX === lastPtr.x && e.clientY === lastPtr.y) return;
      lastPtr = { x: e.clientX, y: e.clientY };
      hovered = busy() ? null : pick(e.clientX, e.clientY);
      canvas.style.cursor = hovered || skyAt(e.clientX, e.clientY) || onHero(e.clientX, e.clientY) ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) < 5) return;
    down.moved = true;
    canvas.style.cursor = 'grabbing';
    if (busy()) return;
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
    if (!wasClick || busy()) return;
    const sky = skyAt(e.clientX, e.clientY);
    if (sky) return sky.chip.click();
    const p = pick(e.clientX, e.clientY);
    if (p) return visit(p);
    if (onHero(e.clientX, e.clientY)) say(guide.intro, true);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => (hovered = null));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (busy()) return;
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
    const on = document.activeElement as HTMLElement | null;
    // While the guide talks, Enter and Space are for it.
    if (talk?.tour && (k === 'Enter' || k === ' ') && !(tabbing && on?.matches('a, button:not(.w-say-next)'))) {
      e.preventDefault();
      if (!e.repeat) onward();
      return;
    }
    if (k === 'Escape' && talk) hush();
    if (k === 'Enter') {
      // A control reached with Tab keeps its own Enter; one merely left focused by a click does not.
      if (tabbing && on?.matches('a, button')) return;
      e.preventDefault();
      if (busy() || e.repeat) return;
      const p = hovered ?? chosen;
      if (p) visit(p);
      else if (zoom < 0.55) zoomGoal = 1; // from afar, Enter takes you down to the ground
      return;
    }
    if (k === ' ' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
      if (jumpY === 0 && !aboard) {
        jumpV = 7;
        play('jump');
      }
      touch();
      return;
    }
    if (!WALK[k] || busy()) return;
    e.preventDefault();
    keys.add(k);
    trip = null;
    zoomGoal = 1;
    touch();
  });
  addEventListener('keydown', (e) => e.key === 'Tab' && (tabbing = true), true);
  addEventListener('pointerdown', () => (tabbing = false), true);
  addEventListener('keyup', (e) => keys.delete(keyName(e)));
  addEventListener('blur', () => keys.clear());

  // Out of the computer, by a button where the name was.
  const leave = document.createElement('button');
  leave.type = 'button';
  leave.className = 'w-leave caps';
  leave.textContent = '← Leave the computer';
  leave.addEventListener('click', () => select('Home'));
  labels.append(leave);

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
  const sq = new Quaternion();
  const corner = new Vector3();
  const ELEV = 0.78; // the whole planet is seen from this high, in radians
  const CAM_DIR = new Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
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
  // The planet inside, as the screen shows it: the same view as arriving there.
  screenCam.position.copy(CAM_DIR).multiplyScalar(88 * 1.18 * (pc.R / 20));
  screenCam.lookAt(0, 0, 0);
  const inkClear = hex('ink');
  function paintScreen() {
    const shown = scene.children.map((o) => o.visible);
    scene.children.forEach((o) => (o.visible = o === pc.group || o === ambient || o === sun || o === sun.target));
    pc.group.position.set(0, 0, 0);
    pc.group.scale.setScalar(1);
    pc.group.quaternion.copy(pc.q);
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(screenRT);
    renderer.setClearColor(inkClear, 1);
    renderer.clear();
    renderer.render(scene, screenCam);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.autoUpdate = true;
    scene.children.forEach((o, k) => (o.visible = shown[k]));
  }
  paintScreen();

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
    if (warp || dive || launch || land) {
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
    // Things are solid: the hero slides round them instead of through them.
    if (!busy() && !trip) {
      for (let pass = 0; pass < 2; pass++) {
        under.copy(NORTH).applyQuaternion(inv.copy(cur.q).invert());
        for (const c of cur.solids) {
          const min = (c.r + HERO_R) / cur.R;
          const ang = under.angleTo(c.dir);
          if (ang >= min) continue;
          const axis = v.crossVectors(c.dir, under);
          if (axis.lengthSq() < 1e-10) axis.set(1, 0, 0);
          const out = w.copy(c.dir).applyAxisAngle(axis.normalize(), min);
          cur.q.multiply(sq.setFromUnitVectors(out, under)).normalize();
          under.copy(out);
        }
      }
    }
    if (!busy() && !trip && pending) {
      const next = pending;
      pending = null;
      travel(next);
    }

    // The rockets: up from one pad, down onto the other.
    [home, station].forEach((p) => {
      const pad = padOf(p)!.g.userData as { rocket: Group; flame: Group };
      let h = 0;
      let burning = false;
      if (launch?.p === p) {
        const t = Math.min(1, (now - launch.t0) / launch.dur);
        h = 34 * Math.max(0, t - 0.18) ** 2.2;
        burning = t > 0.1;
      } else if (land?.p === p) {
        const t = Math.min(1, (now - land.t0) / land.dur);
        h = 22 * (1 - easeOut(t));
        burning = t < 0.9;
      }
      pad.rocket.position.y = h;
      pad.rocket.position.x = launch?.p === p && h < 0.5 ? Math.sin(now * 0.09) * 0.04 : 0;
      pad.flame.visible = burning;
      if (burning) pad.flame.scale.set(1, 0.85 + Math.sin(now * 0.05) * 0.2, 1);
    });
    // The engine burns for the whole trip: hardest going up, steady across the sky, easing off down onto the pad.
    let burn = 0;
    if (aboard) {
      if (launch) burn = 0.55 + 0.45 * Math.min(1, (now - launch.t0) / launch.dur);
      else if (land) burn = 0.9 * (1 - smooth(0.7, 1, (now - land.t0) / land.dur)) + 0.1;
      else burn = 0.8;
    }
    setEngine(burn);
    if (launch && now - launch.t0 >= launch.dur) {
      const then = launch.then;
      launch = null;
      then?.();
    }
    if (land && now - land.t0 >= land.dur) {
      const then = land.then;
      land = null;
      then?.();
    }

    // Moving between worlds: this one rises into the sky as that one comes down.
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
        heroY = cur.R + GROUND;
        then?.();
      }
    }
    zoom += (zoomGoal - zoom) * (reduced() ? 1 : 1 - Math.pow(0.0025, Math.min(0.3, ease)));
    if (Math.abs(zoomGoal - zoom) < 0.0005) zoom = zoomGoal;

    nightNow += Math.sign(nightGoal - nightNow) * Math.min(Math.abs(nightGoal - nightNow), reduced() ? 1 : ease / 1.5);
    const dusk = easeInOut(nightNow);
    const orbiting = warp ? lerp(warp.from === station ? 1 : 0, warp.to === station ? 1 : 0, f) : cur === station ? 1 : 0;
    uniforms.night.value = dusk;
    uniforms.space.value = orbiting;
    uniforms.scan.value = cur === pc ? 1 : 0;
    uniforms.time.value = now / 1000;
    seaTime.value = reduced() ? 0 : now / 1000;
    seaLight.value = lerp(1, 0.42, dusk);
    // At home after dark the moon is dim and blue, and the lamps do the work.
    const lampNight = dusk * (cur === home ? 1 : 0.35);
    ambient.intensity = lerp(1.75, lerp(1.3, 0.75, lampNight), dusk);
    lamps.forEach((l) => (l.intensity = lampNight * 14 * (0.94 + Math.sin(now * 0.011 + l.id) * 0.06)));
    heroGlow.intensity = lampNight * 4.5 * (0.92 + Math.sin(now * 0.017) * 0.08);
    // the lantern comes out at dusk and goes away by day
    hero.lamp.visible = dusk > 0.05;
    hero.lamp.scale.setScalar(Math.max(0.001, smooth(0.05, 0.5, dusk)));
    ambient.color.copy(white).lerp(moonlight, dusk * 0.55);
    sun.intensity = lerp(2.8, lerp(2.3, 1.1, lampNight), dusk);
    sun.color.copy(white).lerp(moonlight, dusk * 0.55);
    lit.color.copy(hex('ink')).lerp(hex('ochre'), cur === pc ? 1 : smooth(0.45, 0.9, Math.max(dusk, orbiting)));
    glass.color.copy(hex('cream')).lerp(hex('ochre'), smooth(0.45, 0.9, Math.max(dusk, orbiting)));
    haloMat.uniforms.amount.value = Math.max(dusk, orbiting * 0.6) * 1.7;
    fliesMat.opacity = cur === home ? dusk : cur === pc ? 1 : 0;

    clouds.rotation.y += dt * 0.016;
    clouds.scale.setScalar(rEff / 20 + 0.02);
    clouds.visible = cur === home && !warp;
    orbit.visible = clouds.visible;
    spin.rotation.z -= dt * 0.16;

    // How far did the ground move under the hero?
    dq.copy(cur.q).multiply(inv.copy(before).invert()).normalize();
    const speed = (2 * Math.acos(Math.min(1, Math.abs(dq.w)))) / Math.max(dt, 0.001);
    inv.copy(cur.q).invert();
    under.copy(NORTH).applyQuaternion(inv);
    // In the sea, a step at a time: deep enough, and the hero wades in to the knees.
    const inSea = !warp && !aboard && cur.look === 'earth' && cur.height(under) < SEA - 0.08;
    wet += ((inSea ? 1 : 0) - wet) * Math.min(1, dt * 6);
    const ground = rEff + (warp ? GROUND : Math.max(cur.height(under), SEA) - wet * 0.32);
    heroY += (ground - heroY) * (1 - Math.pow(0.0001, Math.min(0.3, ease)));
    const walking = speed > 0.06 && (zoom > 0.15 || keys.size > 0 || !!trip) && !aboard;
    if (walking) {
      const s = dq.w < 0 ? -1 : 1;
      const yaw = Math.atan2(dq.z * s, -dq.x * s);
      let diff = yaw - heroYaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heroYaw += diff * Math.min(1, dt * 12);
      heading.set(dq.z * s, -dq.x * s).normalize();
      const foot = Math.floor(stride / Math.PI);
      stride += (speed * cur.R * dt * 62) / 20;
      if (Math.floor(stride / Math.PI) !== foot && !jumpY) {
        if (inSea) {
          play('splash');
          ripple();
          lapse = 0;
        } else play('step', cur.look);
      }
      hop = Math.abs(Math.sin(stride)) * 0.3;
      // The view comes round behind the hero, slowly, so what it walks towards
      // ends up in front of the camera. Not while dragging: the ground would
      // slip out from under the cursor. Walking at the camera turns nothing;
      // the camera lifts and backs off instead (below).
      const err = Math.atan2(heading.x, -heading.y);
      if (!down && !trip && !reduced() && Math.abs(err) < 1.9) {
        const a = err * Math.min(1, dt * 1.3);
        dq.setFromAxisAngle(axisY, a);
        cur.q.premultiply(dq).normalize();
        const c = Math.cos(a);
        const sn = Math.sin(a);
        heading.set(heading.x * c + heading.y * sn, -heading.x * sn + heading.y * c);
        vel = { x: vel.x * c + vel.z * sn, z: -vel.x * sn + vel.z * c };
      }
    } else {
      let diff = -heroYaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heroYaw += diff * Math.min(1, dt * 4);
      hop *= Math.pow(0.001, dt);
    }
    if (jumpV || jumpY) {
      jumpY += jumpV * dt;
      jumpV -= 22 * dt;
      if (jumpY <= 0) {
        jumpY = jumpV = 0;
        if (inSea) {
          play('plunge');
          splash(heroY);
        }
      }
    }
    if (inSea && !wasWet && !jumpY) {
      play('plunge');
      splash(heroY + 0.3);
    }
    wasWet = inSea;
    // standing in the sea, the water still rings round the hero now and then
    lapse += dt;
    if (inSea && !walking && lapse > 1.4) {
      ripple(0.8);
      lapse = 0;
    }
    setSea(wet * (zoom > 0.3 ? 1 : 0.4));
    ripples.forEach((r) => {
      if (r.t >= 1) return;
      r.t = Math.min(1, r.t + dt / (1.3 * r.big));
      r.m.scale.setScalar((0.7 + r.t * 1.9) * r.big);
      (r.m.material as MeshBasicMaterial).opacity = 0.6 * (1 - r.t) ** 1.5;
      r.m.visible = r.t < 1 && r.m.parent === cur.group;
    });
    if (dropT < 1) {
      dropT = Math.min(1, dropT + dt / 0.75);
      for (let i = 0; i < DROPS; i++) {
        dropVel[i * 3 + 1] -= 18 * dt;
        dropPos[i * 3] += dropVel[i * 3] * dt;
        dropPos[i * 3 + 1] += dropVel[i * 3 + 1] * dt;
        dropPos[i * 3 + 2] += dropVel[i * 3 + 2] * dt;
      }
      dropGeo.attributes.position.needsUpdate = true;
      dropMat.opacity = 1 - dropT ** 2;
    }
    drops.visible = dropT < 1;
    lives(dt, now);
    // Between worlds the hero is gone: it shrinks away, and arrives the same way.
    let present = warp ? Math.abs(f * 2 - 1) ** 2 : 1;
    if (aboard) {
      present = 0;
      if (launch) present = 1 - smooth(0.02, 0.16, (now - launch.t0) / launch.dur);
      if (land) present = smooth(0.82, 1, (now - land.t0) / land.dur);
    }
    hero.g.position.set(0, heroY + hop + jumpY, 0);
    hero.g.rotation.y = heroYaw;
    hero.g.scale.setScalar(Math.max(0.001, present));
    hero.g.visible = present > 0.002;
    const swing = walking ? Math.sin(stride) * 0.6 : 0;
    hero.left.rotation.x = swing;
    hero.right.rotation.x = -swing;
    // the lantern swings from its hook, more as the hero walks or jumps
    hero.shade.rotation.x = -swing * 0.5 + jumpV * 0.03;
    hero.shade.rotation.z = Math.sin(now * 0.002) * 0.06;
    hero.body.scale.y = 1 - hop * 0.14;
    hero.body.scale.x = 1 + hop * 0.09;

    // Camera: the whole planet to the right of the words, or close behind the hero.
    const e = smooth(0, 1, zoom);
    const k = rEff / 20;
    const aspect = W / H;
    // only home leaves room for the words on the left
    const homeness = warp ? lerp(warp.from === home ? 1 : 0, warp.to === home ? 1 : 0, f) : cur === home ? 1 : 0;
    const D = 88 * k * lerp(1.18, 1, homeness); // small worlds, seen from a little further off
    const halfW = D * TAN * aspect;
    const sx = Math.max(0, rEff - 0.1 * halfW) * (aspect > 1.15 ? 1 : 0.2) * homeness;
    camPos.set(-sx, 0, 0).addScaledVector(CAM_DIR, D);
    camTarget.set(-sx, 0, 0);
    const n = Math.min(1, 0.6 + 0.4 * k);
    // a wider district needs the camera a little further back
    const nearest = cur.ds.reduce((a, b) => (under.angleTo(a.dir) < under.angleTo(b.dir) ? a : b));
    const room = lerp(1, 1.24, smooth(4.5, 7, nearest.ring));
    ahead += ((walking && !down ? Math.max(0, heading.y) : 0) - ahead) * Math.min(1, dt * 2);
    camPos.lerp(w.set(0, heroY + 9.6 * n * room * (1 + 0.8 * ahead), 13 * n * room * (1 + 0.1 * ahead)), e);
    camTarget.lerp(w.set(0, heroY + 0.5, -0.5 + 2.5 * ahead), e);
    // Following a rocket up, the camera looks up after it.
    if (launch) {
      const t = Math.min(1, (now - launch.t0) / launch.dur);
      camTarget.y += 14 * k * smooth(0.3, 1, t);
    }
    let pixelate = 1;
    if (intro) {
      const t = Math.min(1, (now - started) / intro);
      if (t === 1) intro = 0;
      const eo = easeOut(t);
      camPos.sub(camTarget).multiplyScalar(1 + (1 - eo) * 3).add(camTarget);
      pixelate = Math.max(1, Math.round((1 - eo) ** 1.5 * 22));
    }
    if (warp) pixelate = Math.max(pixelate, Math.round((1 - Math.abs(f * 2 - 1)) * 14) || 1);
    pixelate = Math.max(pixelate, Math.round((1 - Math.min(1, (now - burst) / 600)) * 12) || 1);
    // Diving: the camera flies at the screen until it fills the view.
    camera.up.set(0, 1, 0);
    if (dive) {
      const t = Math.min(1, (now - dive.t0) / dive.dur);
      const kk = dive.dir > 0 ? easeInOut(t) : 1 - easeInOut(t);
      home.group.quaternion.copy(home.q);
      home.group.updateMatrixWorld(true);
      const c = screen.getWorldPosition(new Vector3());
      screen.getWorldQuaternion(sq);
      const normal = v.set(0, 0, 1).applyQuaternion(sq);
      const dist = Math.max(SCREEN_H / 2 / TAN, SCREEN_W / 2 / (TAN * aspect)) / 0.94;
      camPos.lerp(c.clone().addScaledVector(normal, dist), kk);
      camTarget.lerp(c, kk);
      camera.up.lerp(w.set(0, 1, 0).applyQuaternion(sq), kk).normalize();
      if (dive.dir > 0) pixelate = Math.max(pixelate, Math.round(smooth(0.82, 1, t) * 12) || 1);
      if (t === 1) {
        const then = dive.then;
        dive = null;
        then?.();
      }
    }
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();
    uniforms.coarse.value = pixelate;

    // Close up, a cloud that comes between the camera and the hero puffs away,
    // and drifts back once it is out of the way. From afar they all stay.
    if (clouds.visible) {
      clouds.updateMatrixWorld(true);
      const span = w.copy(camTarget).sub(camPos);
      const len2 = span.lengthSq() || 1;
      const clearance = 2.6 * clouds.scale.x + 3.5;
      for (const c of clouds.children) {
        c.getWorldPosition(v).sub(camPos);
        const t = Math.min(1, Math.max(0, v.dot(span) / len2));
        const d = v.addScaledVector(span, -t).length();
        const goal = e > 0.3 && d < clearance ? 0 : 1;
        const s = (c.userData.s ?? 1) + (goal - (c.userData.s ?? 1)) * Math.min(1, dt * (goal ? 2 : 7));
        c.userData.s = s;
        c.scale.setScalar(Math.max(0.001, s));
        c.visible = s > 0.02;
      }
    }

    // Sun overhead up close, low and to the side from afar: that is what makes it a globe.
    sun.position.set(lerp(-46, -14, e), lerp(30, 56, e), lerp(26, 18, e)).multiplyScalar(Math.max(0.55, k));
    sun.position.y += heroY * e;
    sun.target.position.set(0, heroY * e * 0.8, 0);
    sun.shadow.autoUpdate = (tick++ & 1) === 0;

    // Everything in the sky is held in screen space. Inside the computer there is no sky.
    const dist = lerp(D * 1.32, 62, e);
    const skyScale = dist / 110;
    const inside = cur === pc && !dive;
    planets.forEach((p, idx) => {
      const isFrom = warp?.from === p;
      const isTo = warp?.to === p;
      p.sea.rotation.y += dt * 0.012;
      p.group.visible = inside ? p === pc : p !== pc;
      // A world hung in the sky casts no shadow on the one underfoot.
      const aloft = p.slot >= 0 && !isTo;
      if (p.group.userData.aloft !== aloft) {
        p.group.userData.aloft = aloft;
        p.group.traverse((o) => {
          if (o.userData.cast === undefined) o.userData.cast = o.castShadow;
          o.castShadow = !aloft && o.userData.cast;
        });
      }
      if (p.slot < 0 && !isFrom && !isTo) {
        p.group.position.set(0, 0, 0);
        p.group.scale.setScalar(1);
        p.group.quaternion.copy(p.q);
        p.chip.classList.remove('on');
        return;
      }
      const lastSlot = isFrom ? [0, 1].find((s) => !planets.some((o) => o !== p && o.slot === s)) ?? 0 : isTo ? warpSlot(p) : p.slot;
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
      const r = (rd / (dist * TAN)) * (H / 2);
      skyPos[idx] = { x: c.x, y: c.y, r };
      place(p.chip, !warp && !intro && !inside && !busy() && p.slot >= 0, c.x, c.y + r + 6);
    });

    // Plates turn to face whoever is looking; things stay as they stand.
    cur.group.updateMatrixWorld(true);
    camLocal.copy(camera.position).applyQuaternion(inv);
    camUp.set(0, 1, 0).applyQuaternion(camera.quaternion).applyQuaternion(inv);
    const showTombs = zoom > 0.55 && !busy();
    // Within reach, and favouring what the hero is walking towards; a small
    // bias to the current pick keeps it from flickering between two equals.
    const held: Spot | null = chosen;
    chosen = null;
    if (showTombs) {
      let best = Infinity;
      for (const p of cur.spots) {
        w.copy(p.dir).applyQuaternion(cur.q);
        const a = w.angleTo(NORTH) * cur.R;
        if (a > 9.5) continue;
        const along = (w.x * heading.x + w.z * heading.y) / (Math.hypot(w.x, w.z) || 1);
        const score = a + (1 - along) * 3.2 - (p === held ? 0.7 : 0);
        if (score < best) {
          best = score;
          chosen = p;
        }
      }
    }
    const aimed: Spot | null = busy() ? null : hovered ?? chosen;
    {
      // fade out, move over, fade back in
      const want = dusk > 0.05 && aimed && !aimed.card ? aimed : null;
      if (want !== spotAt && spotLamp.intensity < 0.3) spotAt = want;
      const goal = spotAt && spotAt === want ? dusk * 11 : 0;
      spotLamp.intensity += (goal - spotLamp.intensity) * Math.min(1, dt * (goal ? 3 : 6));
      if (spotAt) {
        // above the thing and a little out in front of it, where the hero stands
        spotAt.g.getWorldPosition(w);
        up.copy(w).normalize();
        spotLamp.position.copy(w).addScaledVector(up, 2.6 * spotAt.scale).add(v.copy(spotAt.inward).applyQuaternion(cur.group.quaternion).multiplyScalar(1.4));
      }
    }
    const heroScreen = toScreen(v.set(0, heroY, 0));
    const rects: { l: number; r: number; t: number; b: number; depth: number; p: Spot }[] = [];
    for (const p of cur.spots) {
      if (p.card) {
        up.copy(p.dir);
        toCam.copy(camLocal).sub(p.g.position).normalize();
        forward.copy(toCam).addScaledVector(up, -toCam.dot(up)).normalize();
        forward.lerp(toCam, 0.72).normalize(); // lean back, like a card propped up to be read
        up.lerp(camUp, 0.68).normalize(); // less of the planet's curve, so they stay level enough to read
        right.crossVectors(up, forward).normalize();
        up.crossVectors(forward, right).normalize();
        look.makeBasis(right, up, forward);
        p.g.quaternion.setFromRotationMatrix(look);
      }
      const lift = (p === aimed ? 1.08 : 1) * p.scale;
      p.g.scale.setScalar(p.g.scale.x + (lift - p.g.scale.x) * 0.2);
      p.g.updateMatrixWorld(true);
      let l = Infinity;
      let r = -Infinity;
      let t = Infinity;
      let b = -Infinity;
      for (let c = 0; c < 8; c++) {
        corner.set(c & 1 ? p.box.max.x : p.box.min.x, c & 2 ? p.box.max.y : p.box.min.y, c & 4 ? p.box.max.z : p.box.min.z);
        const s = toScreen(p.g.localToWorld(corner));
        l = Math.min(l, s.x);
        r = Math.max(r, s.x);
        t = Math.min(t, s.y);
        b = Math.max(b, s.y);
      }
      const depth = p.g.getWorldPosition(w).distanceTo(camera.position);
      rects.push({ l, r, t, b, depth, p });
    }
    // Nearest first: a sign that would land on one already placed stays away.
    rects.sort((a, b) => Number(b.p === aimed) - Number(a.p === aimed) || a.depth - b.depth);
    const placed: { l: number; r: number; t: number; b: number }[] = [];
    for (const rc of rects) {
      const { p } = rc;
      const worldPos = p.g.getWorldPosition(w);
      const facing = worldPos.clone().normalize().dot(v.copy(camera.position).sub(worldPos).normalize());
      const close = worldPos.distanceTo(hero.g.position) < 12.5;
      const focused = p.label === document.activeElement;
      const midY = (rc.t + rc.b) / 2;
      // Things behind the hero carry their sign on top, those in front underneath.
      const above = midY < heroScreen.y;
      const x = (rc.l + rc.r) / 2;
      const y = above ? rc.t - 4 : rc.b + 4;
      const hidden = rects.some((o) => o !== rc && o.depth < rc.depth && x > o.l && x < o.r && y > o.t && y < o.b);
      const inFrame = x > 40 && x < W - 40 && rc.t > -40 && rc.b < H + 40;
      const width = Math.round(Math.max(164, Math.min(240, rc.r - rc.l)));
      const signY = Math.max(above ? 54 : 6, Math.min(H - 54, y));
      const sign = { l: x - width / 2 - 4, r: x + width / 2 + 4, t: above ? signY - 52 : signY, b: above ? signY : signY + 52 };
      const clash = placed.some((o) => sign.l < o.r && sign.r > o.l && sign.t < o.b && sign.b > o.t);
      const on = !busy() && (p === aimed || focused || (showTombs && close && !hidden && !clash)) && facing > 0.08 && inFrame;
      if (on) placed.push(sign);
      if (on && width !== p.size) {
        p.size = width;
        p.label.style.width = `${width}px`;
      }
      place(p.label, on, x, signY, above);
      p.label.classList.toggle('chosen', p === aimed);
      p.label.style.zIndex = String(1000 - Math.round(rc.depth * 8));
    }
    zoneChips.forEach((chip, z) => {
      if (!cur.ds.includes(z) || busy()) return chip.classList.remove('on');
      w.copy(z.dir).multiplyScalar(cur.R + 5.6).applyQuaternion(cur.q);
      const fc = v.copy(w).normalize().dot(toCam.copy(camera.position).sub(w).normalize());
      const c = toScreen(v.copy(w));
      place(chip, zoom < 0.45 && !intro && fc > -0.25, c.x, Math.max(10, c.y));
    });
    leave.classList.toggle('on', cur === pc && !busy());

    const pc0 = v.set(0, 0, 0).project(camera);
    uniforms.centre.value.set(((pc0.x + 1) / 2) * uniforms.size.value.x, ((pc0.y + 1) / 2) * uniforms.size.value.y);
    uniforms.rad.value = (rEff / (camera.position.length() * TAN)) * (uniforms.size.value.y / 2);

    // Sun down, moon up, in the same corner.
    const cornerX = lerp(0.9, 0.86, e);
    const cornerY = lerp(0.74, 0.86, e);
    const sd = lerp(D * 1.3, 90, e);
    sunDisc.position.copy(inSky(ndc.set(cornerX, lerp(cornerY, -1.5, dusk)), sd));
    sunDisc.scale.setScalar(sd * 0.03);
    moon.position.copy(inSky(ndc.set(cornerX, lerp(-1.5, cornerY, dusk)), sd));
    moon.scale.setScalar(sd * 0.034);
    moon.lookAt(camera.position);
    sunDisc.visible = moon.visible = !inside;

    identity.classList.toggle('away', zoom > 0.3 || cur !== home || busy());

    // The guide: first the tour, or a hello for someone who has had it.
    if (!greeted && !intro && now - started > 600) {
      greeted = true;
      let toured = false;
      try {
        toured = localStorage.getItem(TOURED) === '1';
      } catch {}
      say(toured ? [guide.back] : guide.intro, !toured, toured ? 5000 : 0);
      if (!toured) zoomGoal = 1; // down to the juice box, which starts talking
    }
    if (talk && now > talk.until) talk = null;
    const speaking = !!talk && !busy() && present > 0.9;
    bubble.classList.toggle('on', speaking);
    if (talk && speaking) {
      const line = talk.lines[talk.k];
      if (talk.shown < line.length) {
        const was = Math.floor(talk.shown);
        talk.shown = reduced() ? line.length : Math.min(line.length, talk.shown + dt * 52);
        const n = Math.floor(talk.shown);
        sayTxt.textContent = line.slice(0, n);
        // a syllable every few letters, as the juice box talks
        if (Math.floor(n / 3) > Math.floor(was / 3) && line[n - 1] !== ' ') play('blip');
      } else if (sayTxt.textContent !== line) sayTxt.textContent = line;
      sayN.textContent = talk.tour ? `${talk.k + 1}/${talk.lines.length}` : '';
      sayNext.textContent = talk.k + 1 >= talk.lines.length ? 'Done' : 'Next';
      const top = toScreen(v.set(0, heroY + 2.1 * Math.max(0.6, e), 0));
      const bw = bubble.offsetWidth;
      const bh = bubble.offsetHeight;
      // Over its head when there is room, otherwise beside it.
      const side = top.y - bh - 10 < 12;
      const bx = side ? Math.min(W - bw - 12, top.x + 26) : Math.max(12, Math.min(W - bw - 12, top.x - 40));
      const by = side ? Math.max(12, top.y + 10 - bh / 2) : top.y - bh - 10;
      bubble.classList.toggle('side', side);
      bubble.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;
      bubble.style.setProperty('--tail', `${Math.round(Math.max(18, Math.min(bw - 18, top.x - bx)))}px`);
    }

    // The screen on the desk shows the planet inside, turning.
    if (cur === home && (dive || ((zoom > 0.3 || tick % 30 === 0) && tick % 3 === 0))) {
      dq.setFromAxisAngle(axisY, dt * 0.15 * (dive ? 1 : 3));
      pc.q.premultiply(dq).normalize();
      paintScreen();
    }

    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }
  function warpSlot(p: Planet) {
    // a world on its way down leaves from whichever place in the sky is unclaimed
    const taken = planets.filter((o) => o !== p && o.slot >= 0).map((o) => o.slot);
    return [0, 1].find((s) => !taken.includes(s)) ?? 0;
  }
  const zoneChips = new Map<District, HTMLButtonElement>();
  planets.forEach((p) =>
    p.ds.forEach((z) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'w-zone caps';
      b.textContent = SHOWN[z.section] ?? z.section;
      b.addEventListener('click', () => select(z.section));
      labels.append(b);
      zoneChips.set(z, b);
    }),
  );
  requestAnimationFrame(frame);

  return {
    travel,
    zoomBy: (f: number) => {
      if (busy()) return;
      zoomGoal = Math.min(1, Math.max(0, zoomGoal + (f > 1 ? 0.25 : -0.25)));
      touch();
    },
    setNight: (on: boolean) => {
      nightGoal = on ? 1 : 0;
    },
  };
}
