// Renders every specimen plate in the cabinet: photos and SVG compositions,
// ordered-dithered (Bayer 8×8) into six pigments from Pompeii.
// Usage: node scripts/dither.mjs   (reads art/, writes public/img/)
import sharp from 'sharp';

const PIGMENTS = {
  charcoal: [43, 41, 38],
  olive: [98, 96, 68],
  red: [158, 63, 50],
  ochre: [197, 138, 61],
  cream: [226, 214, 192],
  aegean: [107, 141, 160],
};
const ALL = Object.keys(PIGMENTS);

const B8 = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
].map((r) => r.map((v) => (v + 0.5) / 64 - 0.5));

const W = 160;
const H = 200;
const c = (k) => `rgb(${PIGMENTS[k].join(',')})`;
const svg = (body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
const grad = (id, a, b, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c(a)}"/><stop offset="1" stop-color="${c(b)}"/></linearGradient>`;
const mono = (x, y, text, fill, size = 10) =>
  `<text x="${x}" y="${y}" font-family="Noto Sans Mono, monospace" font-size="${size}" font-weight="700" fill="${c(fill)}">${text}</text>`;

// ── Compositions ──
const compositions = {
  'trackpad-curve': `
    <defs>${grad('g', 'cream', 'ochre')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    <path d="M22 30 V172 H146" stroke="${c('charcoal')}" stroke-width="1.5" fill="none"/>
    ${[50, 78, 106, 134].map((x) => `<path d="M${x} 170 V174" stroke="${c('charcoal')}" stroke-width="1.5"/>`).join('')}
    <path d="M22 168 C70 166 92 150 108 110 S132 44 146 34" stroke="${c('charcoal')}" stroke-width="3.5" fill="none"/>
    <circle cx="108" cy="110" r="5" fill="${c('red')}"/>`,

  haskarm: `
    <defs><radialGradient id="g" cx=".7" cy=".25" r=".9"><stop offset="0" stop-color="${c('olive')}"/><stop offset="1" stop-color="${c('charcoal')}"/></radialGradient></defs>
    <rect width="160" height="200" fill="url(#g)"/>
    <circle cx="118" cy="52" r="20" stroke="${c('red')}" stroke-width="1.5" fill="none"/>
    <circle cx="118" cy="52" r="7" fill="${c('red')}"/>
    <path d="M118 22 V34 M118 70 V82 M88 52 H100 M136 52 H148" stroke="${c('red')}" stroke-width="1.5"/>
    <rect x="30" y="168" width="44" height="12" fill="${c('cream')}"/>
    <path d="M52 168 L70 112 L104 70" stroke="${c('cream')}" stroke-width="9" stroke-linecap="square" fill="none"/>
    <circle cx="70" cy="112" r="7" fill="${c('ochre')}"/>
    <circle cx="52" cy="166" r="6" fill="${c('ochre')}"/>`,

  dino_ML: `
    <defs>${grad('s', 'aegean', 'cream')}${grad('d', 'ochre', 'red')}</defs>
    <rect width="160" height="130" fill="url(#s)"/>
    <circle cx="104" cy="112" r="26" fill="${c('red')}"/>
    <rect y="128" width="160" height="72" fill="url(#d)"/>
    <path d="M0 128 H160" stroke="${c('charcoal')}" stroke-width="1.5"/>
    <g fill="${c('charcoal')}">
      <rect x="34" y="96" width="9" height="34"/><rect x="26" y="104" width="6" height="14"/><rect x="26" y="114" width="10" height="5"/>
      <rect x="45" y="100" width="6" height="12"/><rect x="41" y="108" width="10" height="5"/>
      <rect x="126" y="112" width="6" height="18"/><rect x="120" y="116" width="5" height="8"/>
    </g>
    ${[146, 158, 172, 188].map((y, i) => `<path d="M${10 + i * 14} ${y} H${40 + i * 22}" stroke="${c('charcoal')}" stroke-width="1.5" opacity=".6"/>`).join('')}`,

  HTTPServer_C: `
    <defs>${grad('g', 'charcoal', 'olive')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    ${mono(14, 36, 'GET / HTTP/1.1', 'cream')}
    ${mono(14, 50, 'Host: localhost', 'aegean')}
    ${mono(14, 84, 'HTTP/1.1 200 OK', 'red')}
    ${mono(14, 98, 'Content-Type:', 'aegean')}
    ${mono(22, 112, 'text/html', 'aegean')}
    ${mono(14, 146, '&lt;h1&gt;hello&lt;/h1&gt;', 'cream')}
    <rect x="14" y="166" width="7" height="12" fill="${c('ochre')}"/>`,

  // A window, a question, an answer.
  'ui-ai': `
    <defs>${grad('g', 'aegean', 'cream')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    <rect x="18" y="34" width="124" height="132" fill="${c('cream')}" stroke="${c('charcoal')}" stroke-width="2"/>
    <rect x="18" y="34" width="124" height="14" fill="${c('charcoal')}"/>
    <circle cx="27" cy="41" r="2.5" fill="${c('red')}"/><circle cx="35" cy="41" r="2.5" fill="${c('ochre')}"/>
    <rect x="62" y="60" width="70" height="18" fill="${c('ochre')}"/>
    <rect x="28" y="88" width="84" height="30" fill="${c('aegean')}"/>
    <rect x="28" y="146" width="104" height="10" fill="none" stroke="${c('charcoal')}" stroke-width="1.5"/>
    <path d="M100 120 l0 18 l5 -5 l4 8 l3 -1.5 l-4 -8 l7 0 z" fill="${c('charcoal')}"/>`,

  // An hourglass: efficiency.
  eficiencia: `
    <defs>${grad('g', 'cream', 'ochre')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    <rect x="44" y="30" width="72" height="8" fill="${c('charcoal')}"/>
    <rect x="44" y="162" width="72" height="8" fill="${c('charcoal')}"/>
    <path d="M52 38 H108 C108 72 86 90 82 100 C86 110 108 128 108 162 H52 C52 128 74 110 78 100 C74 90 52 72 52 38 Z" fill="${c('cream')}" stroke="${c('charcoal')}" stroke-width="2"/>
    <path d="M62 58 H98 C94 74 84 86 80 96 C76 86 66 74 62 58 Z" fill="${c('red')}"/>
    <path d="M79.5 100 V150" stroke="${c('red')}" stroke-width="1.5"/>
    <path d="M58 160 C64 140 96 140 102 160 Z" fill="${c('red')}"/>`,

  // Burying the twentieth century: a machine underground, a sprout above.
  'siglo-xx': `
    <defs>${grad('s', 'cream', 'aegean')}${grad('e', 'ochre', 'charcoal')}</defs>
    <rect width="160" height="92" fill="url(#s)"/>
    <rect y="92" width="160" height="108" fill="url(#e)"/>
    <path d="M80 92 V60" stroke="${c('olive')}" stroke-width="3"/>
    <path d="M80 72 C66 70 60 60 60 50 C72 50 80 58 80 72 Z M80 66 C92 64 100 54 100 44 C88 44 80 52 80 66 Z" fill="${c('olive')}"/>
    <rect x="50" y="124" width="60" height="46" fill="${c('charcoal')}" stroke="${c('cream')}" stroke-width="1.5"/>
    <rect x="58" y="131" width="44" height="28" fill="${c('olive')}"/>
    <path d="M80 92 C80 104 76 112 72 124" stroke="${c('cream')}" stroke-width="1" stroke-dasharray="2 3" fill="none"/>`,

  // Travel: sea, sun, a contrail.
  tui: `
    <defs>${grad('s', 'aegean', 'cream')}${grad('w', 'aegean', 'charcoal')}</defs>
    <rect width="160" height="126" fill="url(#s)"/>
    <circle cx="112" cy="126" r="22" fill="${c('ochre')}"/>
    <rect y="126" width="160" height="74" fill="url(#w)"/>
    ${[136, 146, 158, 172].map((y, i) => `<path d="M${96 - i * 6} ${y} H${128 + i * 6}" stroke="${c('ochre')}" stroke-width="2" opacity="${0.9 - i * 0.18}"/>`).join('')}
    <path d="M18 70 C50 56 84 48 118 44" stroke="${c('cream')}" stroke-width="2.5" fill="none"/>
    <path d="M118 40 l12 4 l-12 4 l2 -4 z M121 44 l-4 -7 l3 0 l6 7 z M121 44 l-4 7 l3 0 l6 -7 z" fill="${c('charcoal')}"/>`,

  // An exam on paper, 08:00.
  uned: `
    <defs>${grad('g', 'olive', 'charcoal')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    <rect x="26" y="30" width="96" height="140" fill="${c('cream')}" transform="rotate(-6 74 100)"/>
    <g transform="rotate(-6 74 100)">
      ${mono(34, 52, '#include', 'charcoal', 9)}
      ${mono(34, 64, 'int main(){', 'charcoal', 9)}
      ${[76, 88, 100, 112].map((y, i) => `<rect x="${42}" y="${y - 6}" width="${58 - i * 9}" height="4" fill="${c('aegean')}"/>`).join('')}
      ${mono(34, 136, '}', 'charcoal', 9)}
      <path d="M92 140 l6 6 l12 -14" stroke="${c('red')}" stroke-width="3" fill="none"/>
    </g>
    <circle cx="124" cy="160" r="18" fill="${c('cream')}" stroke="${c('charcoal')}" stroke-width="2"/>
    <path d="M124 160 V148 M124 160 H116" stroke="${c('red')}" stroke-width="2"/>`,

  // Statistics: a bell curve over its histogram.
  mitx: `
    <defs>${grad('g', 'cream', 'ochre')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    ${[4, 9, 18, 32, 50, 64, 70, 64, 50, 32, 18, 9, 4]
      .map((h, i) => `<rect x="${17 + i * 10}" y="${160 - h * 1.5}" width="8" height="${h * 1.5}" fill="${c('aegean')}"/>`)
      .join('')}
    <path d="M14 158 C50 156 60 50 80 50 C100 50 110 156 146 158" stroke="${c('charcoal')}" stroke-width="2.5" fill="none"/>
    <path d="M80 44 V166" stroke="${c('red')}" stroke-width="1.5" stroke-dasharray="3 3"/>
    <path d="M12 160 H148" stroke="${c('charcoal')}" stroke-width="1.5"/>`,

  // The Pompeii palette, as six pigment swatches.
  pigments: `
    <rect width="160" height="200" fill="${c('cream')}"/>
    ${['red', 'ochre', 'olive', 'charcoal', 'aegean', 'cream']
      .map((k, i) => `<rect x="${16 + (i % 2) * 68}" y="${18 + Math.floor(i / 2) * 58}" width="60" height="50" fill="${c(k)}" stroke="${c('charcoal')}" stroke-width="${k === 'cream' ? 1.5 : 0}"/>`)
      .join('')}`,

  // A network of student groups.
  sfl: `
    <defs>${grad('g', 'charcoal', 'olive')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    ${(() => {
      const pts = [[80, 100], [40, 52], [120, 48], [30, 118], [130, 112], [56, 160], [108, 162], [80, 36], [82, 176], [18, 80], [144, 78], [80, 68]];
      const lines = pts.slice(1).map(([x, y]) => `<path d="M80 100 L${x} ${y}" stroke="${c('aegean')}" stroke-width="1.2"/>`).join('');
      const dots = pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i ? 5 : 9}" fill="${c(i ? 'cream' : 'red')}"/>`).join('');
      return lines + dots;
    })()}`,

  // Night distribution: moon and bread.
  caritas: `
    <defs>${grad('g', 'charcoal', 'olive')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    <circle cx="112" cy="46" r="16" fill="${c('cream')}"/>
    <circle cx="120" cy="40" r="14" fill="${c('charcoal')}"/>
    ${[[30, 30], [60, 60], [140, 90], [22, 96], [96, 20]].map(([x, y]) => `<rect x="${x}" y="${y}" width="2" height="2" fill="${c('cream')}"/>`).join('')}
    <path d="M28 150 C28 118 132 118 132 150 C132 162 28 162 28 150 Z" fill="${c('ochre')}"/>
    <path d="M52 132 l10 12 M76 128 l10 14 M100 130 l10 12" stroke="${c('red')}" stroke-width="3"/>`,

  // An envelope under a wax seal.
  correspondence: `
    <defs>${grad('g', 'aegean', 'cream')}</defs>
    <rect width="160" height="200" fill="url(#g)"/>
    <rect x="20" y="62" width="120" height="80" fill="${c('cream')}" stroke="${c('charcoal')}" stroke-width="2"/>
    <path d="M20 62 L80 108 L140 62" stroke="${c('charcoal')}" stroke-width="2" fill="none"/>
    <circle cx="80" cy="110" r="14" fill="${c('red')}"/>
    <circle cx="80" cy="110" r="8" fill="none" stroke="${c('cream')}" stroke-width="1.5"/>
    <text x="80" y="114" text-anchor="middle" font-family="Noto Serif, serif" font-size="10" font-weight="700" fill="${c('cream')}">D</text>`,
};

// ── Photographs (crop boxes chosen by eye, all 4:5) ──
const photos = {
  pyrenees: { src: 'art/pyrenees.jpg', crop: { left: 520, top: 0, width: 400, height: 500 } },
  tomatoes: { src: 'art/tomatoes.jpg', crop: { left: 0, top: 0, width: 400, height: 500 }, brightness: 1.2 },
  moth: { src: 'art/moth.jpg', crop: { left: 220, top: 275, width: 480, height: 600 }, contrast: 1.5, colors: ['charcoal', 'olive', 'ochre', 'cream'] },
  spider: { src: 'art/spider.jpg', crop: { left: 185, top: 320, width: 480, height: 600 }, contrast: 1.6, brightness: 1.3, colors: ['charcoal', 'olive', 'ochre', 'cream'] },
};

async function dither(input, { flat = false, brightness = 1, contrast = 1.15, spread = 52, width = W, colors = ALL, out }) {
  let img = sharp(input).resize({ width, kernel: 'lanczos3' });
  if (!flat) img = img.modulate({ saturation: 1.15, brightness }).linear(contrast, 128 * (1 - contrast));
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pal = colors.map((k) => PIGMENTS[k]);
  const buf = Buffer.alloc(info.width * info.height * 3);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const t = B8[y % 8][x % 8] * spread;
      let best = pal[0];
      let bestD = Infinity;
      for (const p of pal) {
        const d = 2 * (data[i] + t - p[0]) ** 2 + 4 * (data[i + 1] + t - p[1]) ** 2 + 3 * (data[i + 2] + t - p[2]) ** 2;
        if (d < bestD) (bestD = d), (best = p);
      }
      buf.set(best, i);
    }
  }
  await sharp(buf, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png({ palette: true, colours: pal.length, compressionLevel: 9 })
    .toFile(out);
  console.log(`${out}  ${info.width}×${info.height}`);
}

for (const [name, body] of Object.entries(compositions)) {
  await dither(svg(body), { flat: true, spread: name === 'HTTPServer_C' || name === 'uned' ? 22 : 48, out: `public/img/s-${name}.png` });
}
for (const [name, p] of Object.entries(photos)) {
  const input = await sharp(p.src).extract(p.crop).toBuffer();
  await dither(input, { brightness: p.brightness, contrast: p.contrast, colors: p.colors, out: `public/img/s-${name}.png` });
}
// Wide panorama: the mosaic's source image and the social card.
await dither(await sharp('art/pyrenees.jpg').toBuffer(), { width: 360, spread: 60, out: 'public/img/panorama.png' });
