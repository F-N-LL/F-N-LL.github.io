// ═══ The computer ═══
// What the camera dives into on the desk: a small 8-bit desktop with one
// folder per job. A folder opens into a window that draws the work as a game
// screen, a factory (machines joined by belts, documents riding along them)
// or a world map (levels along a road, students walking it), with an
// inspector in the corner that says what each piece is and what it gave.
// The same desktop, in miniature, is what the monitor shows from outside.

import { play } from './sound';
import { PIGMENTS } from '../data/pigments';
import { folders, type Folder, type Machine } from '../data/work';

const rgb = (k: keyof typeof PIGMENTS, a = 1) => `rgb(${PIGMENTS[k].join(' ')} / ${a})`;
const CELL = 40; // one grid cell of the factory floor, in SVG units
const GRID = { w: 30, h: 15 };
// where the inspector sits on the floor, in cells: the empty corner bottom right
const INSP = { x: 19.5, y: 11.4, w: 10, h: 3.35 };

// 8 × 8 icons, one character per pixel
const ICONS: Record<Machine['icon'], string[]> = {
  docs: ['..#####.', '..#...#.', '#####.#.', '#...#.#.', '#.#.#.#.', '#...###.', '#.#.#...', '#####...'],
  rust: ['#......#', '#.#..#.#', '.######.', '##.##.##', '.######.', '#.#..#.#', '..#..#..', '........'],
  vault: ['.######.', '#......#', '.######.', '#......#', '.######.', '#......#', '#......#', '.######.'],
  lens: ['..###...', '.#...#..', '#.....#.', '#.....#.', '.#...#..', '..####..', '.....##.', '......##'],
  screen: ['########', '#......#', '#.#.##.#', '#......#', '#.##.#.#', '########', '...##...', '.######.'],
  brain: ['..#..#..', '.######.', '##....##', '.#.##.#.', '##.##.##', '.#....#.', '.######.', '..#..#..'],
  pen: ['......##', '.....###', '....###.', '...###..', '..###...', '.###....', '##......', '#.......'],
  people: ['........', '.##..##.', '.##..##.', '........', '###..###', '###..###', '###..###', '........'],
  chat: ['#######.', '#.....#.', '#.#.#.#.', '#.....#.', '#######.', '##......', '#.......', '........'],
  crate: ['........', '..####..', '.#.##.#.', '########', '#.#..#.#', '########', '.######.', '........'],
  flag: ['#.......', '#####...', '#######.', '#####...', '#.......', '#.......', '#.......', '##......'],
  book: ['.######.', '#......#', '#.####.#', '#......#', '#.###..#', '#......#', '.######.', '........'],
  atom: ['...##...', '.#.##.#.', '#.#..#.#', '.######.', '.######.', '#.#..#.#', '.#.##.#.', '...##...'],
  trophy: ['########', '#.####.#', '#.####.#', '.######.', '..####..', '...##...', '..####..', '.######.'],
  branch: ['.#......', '.#...##.', '.#...##.', '.#....#.', '.#...#..', '.#.##...', '.##.....', '.#......'],
  hex: ['...##...', '.##..##.', '#......#', '#.#..#.#', '#.####.#', '#......#', '.##..##.', '...##...'],
  check: ['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........'],
  rocket: ['...##...', '..####..', '..#..#..', '..####..', '..####..', '.######.', '##.##.##', '#..##..#'],
  scales: ['...##...', '########', '.#....#.', '#.#..#.#', '###..###', '...##...', '...##...', '.######.'],
  bottle: ['...##...', '...##...', '..####..', '.######.', '.#....#.', '.#.##.#.', '.#....#.', '.######.'],
  tooth: ['.##..##.', '########', '########', '.######.', '.######.', '.##..##.', '.#....#.', '........'],
};
const FOLDER_ICON = ['.#####..........', '#.....#.........', '################', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '################'];
const bitmap = (rows: string[], px: number, fill: string, x = 0, y = 0) =>
  rows.flatMap((r, j) => [...r].map((c, i) => (c === '#' ? `<rect x="${x + i * px}" y="${y + j * px}" width="${px}" height="${px}" fill="${fill}"/>` : ''))).join('');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
.pc{position:fixed;inset:0;z-index:60;display:grid;grid-template-rows:auto 1fr;color:${rgb('cream')};font-family:var(--f-pixel);font-size:15px;line-height:1.4;
  background:${rgb('ink')};background-image:repeating-conic-gradient(rgb(0 0 0/.14) 0 25%,transparent 0 50%);background-size:4px 4px;-webkit-font-smoothing:none}
.pc::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(transparent 0 2px,rgb(0 0 0/.12) 2px 3px);z-index:3}
.pc button{font:inherit;color:inherit;cursor:pointer}
.pc :focus-visible{outline:2px dashed ${rgb('ochre')};outline-offset:3px}
.pc-bar{display:flex;align-items:center;gap:22px;height:30px;padding:0 14px;color:${rgb('ink')};background:${rgb('cream')};box-shadow:0 3px 0 rgb(0 0 0/.35);position:relative;z-index:2}
.pc-bar b{font-weight:400}
.pc-bar .sp{flex:1}
.pc-bar button{padding:2px 8px;border:0;background:none}
.pc-bar button:hover{color:${rgb('cream')};background:${rgb('ink')}}
.pc-desk{position:relative;padding:34px 30px;overflow:hidden}
.pc-icons{display:grid;grid-auto-flow:row;gap:18px;width:max-content}
.pc-icon{display:grid;justify-items:center;gap:6px;width:112px;padding:8px 4px;border:0;background:none;animation:pc-pop .32s steps(3) both}
.pc-icon svg{width:64px;height:44px;image-rendering:pixelated}
.pc-icon span{padding:0 4px}
.pc-icon:hover span,.pc-icon:focus-visible span,.pc-icon.on span{color:${rgb('ink')};background:${rgb('ochre')}}
.pc-icon:focus-visible{outline:none}
.pc-hello{position:absolute;right:34px;bottom:30px;margin:0;color:${rgb('cream', 0.45)};text-align:right}
@keyframes pc-pop{from{opacity:0;transform:translateY(6px)}}
.pc-desk:has(.pc-win) .pc-hello{display:none}
.pc-win{position:absolute;inset:18px 22px 22px 170px;display:grid;grid-template-rows:auto 1fr;border:3px solid ${rgb('cream')};background:${rgb('ink')};box-shadow:8px 8px 0 rgb(0 0 0/.45);animation:pc-open .24s steps(4) both}
@keyframes pc-open{from{opacity:0;transform:scale(.92)}}
.pc-title{display:flex;align-items:center;gap:12px;height:30px;padding:0 4px 0 12px;color:${rgb('ink')};background:${rgb('cream')}}
.pc-title i{flex:1;height:12px;background:repeating-linear-gradient(${rgb('ink')} 0 2px,transparent 2px 4px)}
.pc-title button{width:26px;height:22px;border:2px solid ${rgb('ink')};background:${rgb('cream')};line-height:1}
.pc-title button:hover{color:${rgb('cream')};background:${rgb('red')}}
.pc-body{overflow:auto;padding:22px 26px 26px;scrollbar-width:thin;scrollbar-color:${rgb('cream', 0.4)} transparent;overscroll-behavior:contain}
.pc-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px 40px;align-items:end;margin-bottom:18px}
.pc-kick{margin:0 0 4px;color:${rgb('ochre')}}
.pc-h{margin:0;font-size:clamp(22px,2.4vw,32px);font-weight:400;line-height:1.15}
.pc-lead{max-width:62ch;margin:10px 0 0;color:${rgb('cream', 0.78)}}
.pc-stats{display:grid;grid-template-columns:repeat(2,auto);gap:8px 28px;margin:0}
.pc-stats div{display:grid}
.pc-stats dt{order:2;color:${rgb('cream', 0.6)};font-size:13px}
.pc-stats dd{margin:0;color:${rgb('ochre')};font-size:26px;line-height:1.1}
.pc-floor{display:block;width:100%;height:auto;border:3px solid rgb(0 0 0/.35);background:#1f2630;shape-rendering:crispEdges}
.pc-floor text{font-family:var(--f-pixel);-webkit-font-smoothing:none}
.pc-m{cursor:pointer;outline:none}
.pc-m .sel{fill:none;stroke:${rgb('red')};stroke-width:4;stroke-dasharray:10 6;opacity:0}
.pc-m:hover .sel{opacity:.55}
.pc-m.on .sel,.pc-m:focus-visible .sel{opacity:1;animation:pc-march .6s linear infinite}
@keyframes pc-march{to{stroke-dashoffset:-16}}
.pc-belt-run{animation:pc-run 1s linear infinite}
.pc-belt-run.slow{animation-duration:1.6s}
@keyframes pc-run{to{stroke-dashoffset:-16}}
.pc-led{animation:pc-blink 1.2s steps(1) infinite}
.pc-road{animation:pc-run 1.4s linear infinite}
.pc-bob{animation:pc-bob .5s steps(1) infinite}
@keyframes pc-bob{50%{transform:translateY(-3px)}}
@keyframes pc-blink{50%{opacity:.2}}
.pc-plant{position:relative}
.pc-insp{position:absolute;left:${(INSP.x / GRID.w) * 100}%;top:${(INSP.y / GRID.h) * 100}%;width:${(INSP.w / GRID.w) * 100}%;height:${(INSP.h / GRID.h) * 100}%;overflow:auto;box-sizing:border-box;padding:10px 12px;border:3px solid ${rgb('cream')};background:${rgb('ink')};box-shadow:6px 6px 0 rgb(0 0 0/.35);font-size:clamp(11px,1vw,14px);line-height:1.35;scrollbar-width:none}
.pc-insp h3{display:flex;justify-content:space-between;gap:12px;margin:0 0 4px;font-size:1.15em;font-weight:400}
.pc-insp h3 small{color:${rgb('cream', 0.55)};font-size:.8em}
.pc-insp p{margin:0;color:${rgb('cream', 0.85)}}
.pc-insp strong{display:block;margin-top:4px;color:${rgb('ochre')};font-weight:400}
.pc-stack{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.pc-stack li{padding:2px 8px;border:2px solid ${rgb('cream', 0.3)};color:${rgb('cream', 0.8)};font-size:13px}
.pc-soon{display:grid;place-items:center;align-content:center;gap:16px;min-height:340px;border:3px dashed ${rgb('cream', 0.25)};text-align:center}
.pc-soon p{margin:0;color:${rgb('cream', 0.7)}}
.pc-soon .cur{display:inline-block;width:.6em;height:1em;vertical-align:-2px;background:${rgb('ochre')};animation:pc-blink 1s steps(1) infinite}
@media (prefers-reduced-motion:reduce){.pc *{animation:none!important}}
`;

let styled = false;
const el = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

// One machine: a block with its icon, name, what it puts out and a light.
function machine(m: Machine, k: number) {
  const w = (m.w ?? 5) * CELL;
  const h = (m.h ?? 3) * CELL;
  const x = m.x * CELL;
  const y = m.y * CELL;
  const t = m.tone ?? 'ochre';
  const fill = rgb(t);
  const ink = t === 'cream' || t === 'ochre' ? rgb('ink') : rgb('cream');
  const small = h < 3 * CELL;
  const ipx = small ? 3 : 4;
  const iy = small ? (h - 8 * ipx) / 2 : 16;
  return `<g class="pc-m" data-m="${k}" tabindex="0" role="button" aria-label="${esc(`${m.name}, ${m.sub}`)}">
    <rect x="${x + 6}" y="${y + 6}" width="${w}" height="${h}" fill="rgb(0 0 0/.35)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${rgb('ink')}" stroke-width="4"/>
    <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="6" fill="rgb(255 255 255/.28)"/>
    ${[[6, 10], [w - 10, 10], [6, h - 10], [w - 10, h - 10]].map(([bx, by]) => `<rect x="${x + bx}" y="${y + by}" width="4" height="4" fill="${rgb('ink', 0.55)}"/>`).join('')}
    ${bitmap(ICONS[m.icon], ipx, ink, x + 14, y + iy)}
    <text x="${x + 14 + 8 * ipx + 10}" y="${y + (small ? h / 2 - 2 : 34)}" fill="${ink}" font-size="${small ? 15 : 18}">${esc(m.name)}</text>
    <text x="${x + 14 + 8 * ipx + 10}" y="${y + (small ? h / 2 + 14 : 54)}" fill="${ink}" fill-opacity=".7" font-size="12">${esc(m.sub)}</text>
    ${m.result && !small ? `<rect x="${x + 12}" y="${y + h - 34}" width="${w - 24}" height="22" fill="rgb(0 0 0/.18)"/><text x="${x + 20}" y="${y + h - 18}" fill="${ink}" font-size="13">▸ ${esc(m.result)}</text>` : ''}
    <rect class="pc-led" x="${x + w - 18}" y="${y + 14}" width="6" height="6" fill="${rgb(t === 'olive' ? 'ochre' : 'olive')}" style="animation-delay:-${(k * 0.37) % 1.2}s"/>
    <rect class="sel" x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}"/>
  </g>`;
}

// ── The factory floor of one job ──
function floor(f: Folder, reduced: boolean) {
  const { machines, belts } = f.plant!;
  const W = GRID.w * CELL;
  const H = GRID.h * CELL;
  const pt = ([x, y]: [number, number]) => `${x * CELL},${y * CELL}`;

  const beltsSvg = belts
    .map((b, k) => {
      const d = `M${b.path.map(pt).join(' L')}`;
      const len = b.path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - b.path[i][0], p[1] - b.path[i][1]) * CELL, 0);
      const speed = b.slow ? 46 : 80;
      const dur = len / speed;
      const n = Math.max(1, Math.round(len / 46));
      const [ex, ey] = b.path[b.path.length - 1];
      const [px, py] = b.path[b.path.length - 2];
      const ang = (Math.atan2(ey - py, ex - px) * 180) / Math.PI;
      const items = reduced
        ? ''
        : Array.from({ length: n }, (_, i) => `<rect x="-5" y="-5" width="10" height="10" fill="${rgb(b.slow ? 'olive' : 'cream')}" stroke="${rgb('ink')}" stroke-width="2"><animateMotion dur="${dur.toFixed(2)}s" begin="${(-(i / n) * dur).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></rect>`).join('');
      return `<g data-belt="${k}">
        <path d="${d}" fill="none" stroke="#151a21" stroke-width="22" stroke-linejoin="miter"/>
        <path d="${d}" fill="none" stroke="${rgb('cream', 0.14)}" stroke-width="16" stroke-linejoin="miter"/>
        <path class="pc-belt-run${b.slow ? ' slow' : ''}" d="${d}" fill="none" stroke="#151a21" stroke-width="16" stroke-dasharray="4 12"/>
        <path d="M-7,-9 L5,0 L-7,9 Z" fill="${rgb('ochre')}" transform="translate(${ex * CELL},${ey * CELL}) rotate(${ang}) translate(-10,0)"/>
        ${items}
      </g>`;
    })
    .join('');

  const machinesSvg = machines.map(machine).join('');

  return `<svg class="pc-floor" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(`How the work at ${f.org} fits together`)}">
    <defs><pattern id="pc-tile" width="${CELL}" height="${CELL}" patternUnits="userSpaceOnUse"><rect width="${CELL}" height="${CELL}" fill="#222a35"/><rect width="${CELL - 2}" height="${CELL - 2}" fill="#252e3a"/><rect x="6" y="${CELL - 12}" width="2" height="2" fill="#2d3745"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="url(#pc-tile)"/>
    ${beltsSvg}${machinesSvg}
  </svg>`;
}

// ── A world map: the worlds as tinted ground, the levels on a road, students walking it ──
function worldMap(f: Folder, reduced: boolean) {
  const { worlds, levels, road, sides, walkers } = f.map!;
  const W = GRID.w * CELL;
  const H = GRID.h * CELL;
  const pts = (path: [number, number][]) => `M${path.map(([x, y]) => `${x * CELL},${y * CELL}`).join(' L')}`;
  const worldsSvg = worlds
    .map(({ name, sub, x, y, w, h, tone }) => {
      const [X, Y] = [x * CELL, y * CELL];
      // a few stepped hills, the same ones every time
      const hills = [0.18, 0.5, 0.8]
        .map((t, i) => {
          const hx = X + t * w * CELL;
          const hy = Y + h * CELL - 22 - (i % 2) * 70;
          return `<rect x="${hx - 18}" y="${hy}" width="36" height="8" fill="${rgb(tone, 0.32)}"/><rect x="${hx - 10}" y="${hy - 8}" width="20" height="8" fill="${rgb(tone, 0.32)}"/><rect x="${hx - 4}" y="${hy - 14}" width="8" height="6" fill="${rgb(tone, 0.32)}"/>`;
        })
        .join('');
      return `<rect x="${X}" y="${Y}" width="${w * CELL}" height="${h * CELL}" fill="${rgb(tone, 0.13)}" stroke="${rgb(tone, 0.6)}" stroke-width="3" stroke-dasharray="12 8"/>${hills}
        <text x="${X + 14}" y="${Y + 26}" fill="${rgb(tone)}" font-size="18">${esc(name)}</text><text x="${X + 14}" y="${Y + 44}" fill="${rgb('cream', 0.7)}" font-size="12">${esc(sub)}</text>`;
    })
    .join('');
  const roadD = pts(road);
  const roadSvg = `${sides.map((p) => `<path d="${pts(p)}" fill="none" stroke="${rgb('cream', 0.3)}" stroke-width="4" stroke-dasharray="4 8"/>`).join('')}
    <path d="${roadD}" fill="none" stroke="#151a21" stroke-width="18"/>
    <path class="pc-road" d="${roadD}" fill="none" stroke="${rgb('ochre')}" stroke-width="6" stroke-dasharray="6 10"/>`;
  const shirts: (keyof typeof PIGMENTS)[] = ['red', 'blue', 'cream', 'olive', 'ochre'];
  const skins = ['#f1c9a0', '#c98e5c', '#8a5a3a', '#e8b48a'];
  const walkersSvg = reduced
    ? ''
    : Array.from({ length: walkers }, (_, i) => {
        const dur = 22;
        return `<g><g class="pc-bob" style="animation-delay:-${(i * 0.13) % 0.5}s"><rect x="-4" y="-22" width="8" height="8" fill="${skins[i % skins.length]}" stroke="${rgb('ink')}" stroke-width="2"/><rect x="-5" y="-14" width="10" height="9" fill="${rgb(shirts[i % shirts.length])}" stroke="${rgb('ink')}" stroke-width="2"/><rect x="-4" y="-5" width="3" height="5" fill="${rgb('ink')}"/><rect x="1" y="-5" width="3" height="5" fill="${rgb('ink')}"/></g><animateMotion dur="${dur}s" begin="${(-(i / walkers) * dur).toFixed(2)}s" repeatCount="indefinite" path="${roadD}"/></g>`;
      }).join('');
  const levelsSvg = levels
    .map((m, k) => {
      const w = (m.w ?? 2) * CELL;
      const h = (m.h ?? 2) * CELL;
      const x = m.x * CELL;
      const y = m.y * CELL;
      const tone = m.tone ?? 'ochre';
      const ink = tone === 'cream' || tone === 'ochre' ? rgb('ink') : rgb('cream');
      const big = w > 2 * CELL;
      const px = big ? 7 : 5;
      // the last level is a castle: battlements along its top
      const crenels = big ? Array.from({ length: 5 }, (_, i) => `<rect x="${x + 4 + i * ((w - 20) / 4)}" y="${y - 12}" width="12" height="14" fill="${rgb(tone)}" stroke="${rgb('ink')}" stroke-width="4"/>`).join('') : '';
      const labelW = Math.max(m.name.length * 9, m.sub.length * 7) + 18;
      return `<g class="pc-m" data-m="${k}" tabindex="0" role="button" aria-label="${esc(`${m.name}, ${m.sub}`)}">
        ${crenels}
        <rect x="${x + 6}" y="${y + 6}" width="${w}" height="${h}" fill="rgb(0 0 0/.35)"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${rgb(tone)}" stroke="${rgb('ink')}" stroke-width="4"/>
        <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="6" fill="rgb(255 255 255/.28)"/>
        ${bitmap(ICONS[m.icon], px, ink, x + (w - 8 * px) / 2, y + (h - 8 * px) / 2)}
        <rect x="${x + w / 2 - labelW / 2}" y="${y + h + 8}" width="${labelW}" height="36" fill="${rgb('ink')}" stroke="${rgb('cream', 0.5)}" stroke-width="2"/>
        <text x="${x + w / 2}" y="${y + h + 24}" fill="${rgb('cream')}" font-size="14" text-anchor="middle">${esc(m.name)}</text>
        <text x="${x + w / 2}" y="${y + h + 38}" fill="${rgb('cream', 0.6)}" font-size="11" text-anchor="middle">${esc(m.sub)}</text>
        <rect class="sel" x="${x - 7}" y="${y - (big ? 19 : 7)}" width="${w + 14}" height="${h + (big ? 26 : 14)}"/>
      </g>`;
    })
    .join('');
  return `<svg class="pc-floor" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(`The road through the work at ${f.org}`)}">
    <rect width="${W}" height="${H}" fill="#1f2630"/>
    <pattern id="pc-dots" width="20" height="20" patternUnits="userSpaceOnUse"><rect x="9" y="9" width="2" height="2" fill="#2d3745"/></pattern>
    <rect width="${W}" height="${H}" fill="url(#pc-dots)"/>
    ${worldsSvg}${roadSvg}${levelsSvg}${walkersSvg}
  </svg>`;
}

// ── A town: the clients' buildings along one street, the way each job went below ──
const STREET = 9.5; // the pavement, in cells from the top
function town(f: Folder, reduced: boolean) {
  const { buildings, steps } = f.town!;
  const W = GRID.w * CELL;
  const H = GRID.h * CELL;
  const base = STREET * CELL;
  let seed = 3;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 40 }, () => `<rect x="${Math.round(rand() * W)}" y="${Math.round(rand() * (base - 120))}" width="2" height="2" fill="${rgb('cream', 0.25 + rand() * 0.4)}"/>`).join('');
  const houses = buildings
    .map((m, k) => {
      const x = m.x * CELL;
      const w = (m.w ?? 5) * CELL;
      const h = (m.h ?? 5) * CELL;
      const top = base - h;
      const t = m.tone ?? 'ochre';
      const ink = t === 'cream' || t === 'ochre' ? rgb('ink') : rgb('cream');
      // a stepped gable on every other one, a flat cornice on the rest
      const roof =
        k % 2
          ? `<rect x="${x - 4}" y="${top - 10}" width="${w + 8}" height="12" fill="${rgb('ink')}"/>`
          : [0, 1, 2].map((i) => `<rect x="${x + w * (0.12 + i * 0.12)}" y="${top - 12 - i * 12}" width="${w * (0.76 - i * 0.24)}" height="14" fill="${rgb(t)}" stroke="${rgb('ink')}" stroke-width="4"/>`).join('');
      const cols = Math.floor((w - 24) / 34);
      const rows = Math.max(0, Math.floor((h - 64 - 60) / 38));
      const left = x + (w - cols * 34 + 14) / 2;
      const windows = Array.from({ length: rows * cols }, (_, i) => {
        const lit = hash(k, i) > 0.45;
        return `<rect x="${left + (i % cols) * 34}" y="${top + 62 + Math.floor(i / cols) * 38}" width="18" height="22" fill="${lit ? rgb('ochre') : '#151a21'}" stroke="${rgb('ink')}" stroke-width="3"${lit && hash(i, k) > 0.8 && !reduced ? ' class="pc-led"' : ''}/>`;
      }).join('');
      const door = `<rect x="${x + w / 2 - 14}" y="${base - 44}" width="28" height="44" fill="${rgb('ink')}"/><rect x="${x + w / 2 + 6}" y="${base - 24}" width="4" height="4" fill="${rgb('ochre')}"/>`;
      // the shop gets an awning
      const awning = m.icon === 'bottle' ? Array.from({ length: Math.floor(w / 20) }, (_, i) => `<rect x="${x + 4 + i * 20}" y="${base - 66}" width="20" height="14" fill="${i % 2 ? rgb('cream') : rgb('red')}" stroke="${rgb('ink')}" stroke-width="2"/>`).join('') : '';
      return `<g class="pc-m" data-m="${k}" tabindex="0" role="button" aria-label="${esc(`${m.name}, ${m.sub}`)}">
        ${roof}
        <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${rgb(t)}" stroke="${rgb('ink')}" stroke-width="4"/>
        <rect x="${x + 10}" y="${top + 10}" width="${w - 20}" height="42" fill="${rgb('ink')}"/>
        ${bitmap(ICONS[m.icon], 3, rgb('ochre'), x + 18, top + 19)}
        <text x="${x + 52}" y="${top + 28}" fill="${rgb('cream')}" font-size="14">${esc(m.name)}</text>
        <text x="${x + 52}" y="${top + 44}" fill="${rgb('cream', 0.6)}" font-size="11">${esc(m.sub)}</text>
        ${windows}${awning}${door}
        <rect class="sel" x="${x - 9}" y="${top - (k % 2 ? 17 : 45)}" width="${w + 18}" height="${h + (k % 2 ? 24 : 52)}"/>
      </g>`;
    })
    .join('');
  const lamps = [6.25, 11.75, 18.25, 23.75].map((c) => `<rect x="${c * CELL - 2}" y="${base - 70}" width="4" height="70" fill="${rgb('ink')}"/><rect x="${c * CELL - 7}" y="${base - 80}" width="14" height="10" fill="${rgb('ochre')}"/>`).join('');
  const street = `<rect y="${base}" width="${W}" height="24" fill="${rgb('cream', 0.22)}"/><rect y="${base + 24}" width="${W}" height="40" fill="#151a21"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${i * 50 + 10}" y="${base + 42}" width="24" height="4" fill="${rgb('ochre', 0.7)}"/>`).join('')}`;
  const walkY = base + 12;
  const me = reduced
    ? ''
    : `<g><g class="pc-bob"><rect x="-4" y="-22" width="8" height="8" fill="#e8b48a" stroke="${rgb('ink')}" stroke-width="2"/><rect x="-5" y="-14" width="10" height="9" fill="${rgb('red')}" stroke="${rgb('ink')}" stroke-width="2"/><rect x="5" y="-10" width="6" height="5" fill="${rgb('ochre')}" stroke="${rgb('ink')}" stroke-width="1"/><rect x="-4" y="-5" width="3" height="5" fill="${rgb('ink')}"/><rect x="1" y="-5" width="3" height="5" fill="${rgb('ink')}"/></g><animateMotion dur="30s" repeatCount="indefinite" path="M${1.5 * CELL},${walkY} L${28.5 * CELL},${walkY} L${1.5 * CELL},${walkY}"/></g>`;
  const arrows = steps.slice(1).map((m) => `<path d="M-7,-9 L5,0 L-7,9 Z" fill="${rgb('ochre')}" transform="translate(${m.x * CELL - 6},${(m.y + (m.h ?? 2) / 2) * CELL})"/>`).join('');
  const stepsSvg = `<text x="${0.5 * CELL}" y="${11.7 * CELL}" fill="${rgb('cream', 0.6)}" font-size="13">How each job went</text>${steps.map((m, i) => machine(m, buildings.length + i)).join('')}${arrows}`;
  return `<svg class="pc-floor" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(`The clients of ${f.org}`)}">
    <rect width="${W}" height="${H}" fill="#1f2630"/>${stars}${lamps}${houses}${street}${me}${stepsSvg}
  </svg>`;
}
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function windowFor(f: Folder, reduced: boolean) {
  const head = `<header class="pc-head"><div><p class="pc-kick">${esc(f.org)} · ${esc(f.period)}</p><h2 class="pc-h">${esc(f.title)}</h2>${f.lead ? `<p class="pc-lead">${esc(f.lead)}</p>` : ''}</div>${
    f.stats ? `<dl class="pc-stats">${f.stats.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>` : ''
  }</header>`;
  const body = f.plant || f.map || f.town
    ? `<div class="pc-plant">${f.plant ? floor(f, reduced) : f.map ? worldMap(f, reduced) : town(f, reduced)}<section class="pc-insp" aria-live="polite"></section></div>${f.stack ? `<ul class="pc-stack" aria-label="Stack">${f.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}`
    : `<div class="pc-soon"><svg width="120" height="90" viewBox="0 0 120 90" aria-hidden="true"><rect x="10" y="10" width="100" height="70" fill="none" stroke="${rgb('cream', 0.4)}" stroke-width="4" stroke-dasharray="10 8"/>${bitmap(ICONS.brain, 5, rgb('cream', 0.3), 40, 25)}</svg><p>This factory is still being laid out.</p><p>Back soon<span class="cur"></span></p></div>`;
  return el(`<section class="pc-win" role="dialog" aria-label="${esc(f.name)}"><div class="pc-title"><span>${esc(f.name.toUpperCase())}</span><i></i><button type="button" class="pc-x" aria-label="Close ${esc(f.name)}">×</button></div><div class="pc-body" tabindex="-1">${head}${body}</div></section>`);
}

// ── Open and close ──
export function openPC(onClose?: () => void, reduced = false) {
  if (!styled) {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.append(s);
    styled = true;
  }
  const veil = el(`<div class="pc" role="dialog" aria-modal="true" aria-label="The computer"><nav class="pc-bar"><b>◆ zumOS</b><span>Work</span><span class="sp"></span><time></time><button type="button" class="pc-off">Shut down ⏻</button></nav><div class="pc-desk"><div class="pc-icons" role="list"></div><p class="pc-hello">${folders.length} folders · one per job<br />Open one to see how the work fit together</p></div></div>`);
  const desk = veil.querySelector<HTMLElement>('.pc-desk')!;
  const icons = veil.querySelector<HTMLElement>('.pc-icons')!;
  const clock = veil.querySelector('time')!;
  const tickClock = () => (clock.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  tickClock();
  const timer = window.setInterval(tickClock, 15000);

  let win: HTMLElement | null = null;
  let opener: HTMLElement | null = null;
  const buttons = folders.map((f, k) => {
    const b = el(`<button type="button" class="pc-icon" role="listitem" style="animation-delay:${k * 70}ms"><svg viewBox="0 0 64 44" aria-hidden="true"><rect x="6" y="14" width="58" height="30" fill="rgb(0 0 0/.35)"/><rect x="4" y="4" width="20" height="8" fill="${rgb('ochre')}"/><rect x="4" y="12" width="56" height="28" fill="${rgb('ochre')}"/><rect x="4" y="12" width="56" height="4" fill="rgb(255 255 255/.35)"/>${bitmap(FOLDER_ICON, 4, rgb('ink'))}</svg><span></span></button>`);
    b.querySelector('span')!.textContent = f.name;
    b.addEventListener('click', () => show(f, b));
    icons.append(b);
    return b;
  });

  function show(f: Folder, from: HTMLElement) {
    win?.remove();
    buttons.forEach((b) => b.classList.toggle('on', b === from));
    opener = from;
    win = windowFor(f, reduced);
    desk.append(win);
    play('open');
    win.querySelector('.pc-x')!.addEventListener('click', shut);
    const insp = win.querySelector<HTMLElement>('.pc-insp');
    const ms = f.plant?.machines ?? f.map?.levels ?? (f.town ? [...f.town.buildings, ...f.town.steps] : []);
    const pick = (k: number | null) => {
      if (!insp) return;
      win!.querySelectorAll('.pc-m').forEach((g, i) => g.classList.toggle('on', i === k));
      if (k === null) {
        insp.innerHTML = `<h3>Inspector<small>click a ${f.map ? 'level' : f.town ? 'building' : 'machine'}</small></h3><p>${esc(f.hint ?? '')}</p>`;
        return;
      }
      const m = ms[k];
      insp.innerHTML = `<h3>${esc(m.name)}<small>${esc(m.sub)}</small></h3><p>${esc(m.text)}</p>${m.result ? `<strong>${esc(m.result)}</strong>` : ''}`;
    };
    pick(null);
    win.querySelectorAll<SVGGElement>('.pc-m').forEach((g, k) => {
      const go = () => {
        play('blip');
        pick(k);
      };
      g.addEventListener('click', go);
      g.addEventListener('focus', () => g.matches(':focus-visible') && pick(k));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });
    });
    win.querySelector<HTMLElement>('.pc-body')!.focus({ preventScroll: true });
  }
  function shut() {
    if (!win) return;
    win.remove();
    win = null;
    buttons.forEach((b) => b.classList.remove('on'));
    play('close');
    opener?.focus({ preventScroll: true });
  }
  const close = () => {
    window.clearInterval(timer);
    veil.remove();
    play('close');
    onClose?.();
  };
  // the computer's keys stay in the computer: the world underneath does not hear them
  veil.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') return void (win ? shut() : close());
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0 || !/^Arrow(Up|Down)$/.test(e.key)) return;
    e.preventDefault();
    buttons[(at + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
  });
  veil.querySelector('.pc-off')!.addEventListener('click', close);
  document.body.append(veil);
  buttons[0].focus({ preventScroll: true });
  play('open');
}

// ── The same desktop, small, for the monitor on the desk ──
export function paintDesk(cv: HTMLCanvasElement) {
  const g = cv.getContext('2d')!;
  const { width: W, height: H } = cv;
  g.imageSmoothingEnabled = false;
  g.fillStyle = rgb('ink');
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgb(0 0 0 / .14)';
  for (let y = 0; y < H; y += 2) for (let x = (y / 2) % 2 ? 1 : 0; x < W; x += 2) g.fillRect(x, y, 1, 1);
  g.fillStyle = rgb('cream');
  g.fillRect(0, 0, W, 16);
  g.fillStyle = rgb('ink');
  g.font = '11px DotGothic16, monospace';
  g.textBaseline = 'middle';
  g.fillText('◆ zumOS   Work', 8, 8.5);
  folders.forEach((f, k) => {
    const x = 14;
    const y = 28 + k * 42;
    g.fillStyle = 'rgb(0 0 0 / .35)';
    g.fillRect(x + 2, y + 6, 30, 16);
    g.fillStyle = rgb('ochre');
    g.fillRect(x, y, 10, 4);
    g.fillRect(x, y + 4, 28, 16);
    g.fillStyle = rgb('cream');
    g.font = '10px DotGothic16, monospace';
    g.fillText(f.name, x - 2, y + 30);
  });
  // a window open on the first factory: two machines and a belt
  g.fillStyle = rgb('cream');
  g.fillRect(96, 30, 226, 160);
  g.fillStyle = '#1f2630';
  g.fillRect(99, 42, 220, 145);
  g.fillStyle = rgb('ink');
  g.fillText('TUI', 102, 36);
  g.fillStyle = '#151a21';
  g.fillRect(140, 82, 120, 8);
  g.fillRect(214, 82, 8, 56);
  ([[110, 70, 'cream'], [170, 70, 'red'], [230, 70, 'ochre'], [196, 128, 'olive']] as const).forEach(([x, y, k]) => {
    g.fillStyle = rgb(k);
    g.fillRect(x, y, 40, 30);
  });
}
