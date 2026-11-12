// ═══ The lab ═══
// The software side of the workbench: a small studio of interface experiments,
// shown on the laptop's screen. Each panel is one idea to touch: a dial, a
// wallet of cards, a spacing inspector, a status tooltip, a receipt printer, a
// signature pad, a hold-to-publish button and a voice note.

import { play } from './sound';

const CSS = `
.lab-veil{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:3vh 3vw;background:rgb(20 24 30/.55);opacity:0;transition:opacity .35s}
.lab-veil.in{opacity:1}
.lab-laptop{width:min(1080px,94vw);transform:translateY(40px) scale(.86);transition:transform .55s cubic-bezier(.2,.7,.1,1)}
.lab-veil.in .lab-laptop{transform:none}
.lab-lid{padding:14px 14px 18px;border-radius:18px 18px 6px 6px;background:#1d2128;box-shadow:inset 0 0 0 1px #2c323b}
.lab-cam{width:6px;height:6px;margin:-6px auto 6px;border-radius:50%;background:#3a414c}
.lab-screen{height:min(70vh,640px);overflow:auto;border-radius:4px;background:#ededeb;color:#151515;font-family:inherit;scrollbar-width:thin;
  background-image:radial-gradient(circle,#c9c9c4 1px,transparent 1.2px);background-size:22px 22px;overscroll-behavior:contain}
.lab-base{position:relative;height:16px;margin:0 -5%;border-radius:0 0 14px 14px;background:linear-gradient(#c9ccd1,#9aa0a8)}
.lab-base::after{content:'';position:absolute;top:0;left:50%;width:16%;height:6px;border-radius:0 0 8px 8px;background:#7e858e;transform:translateX(-50%)}
.lab-page{max-width:760px;margin:0 auto;padding:40px 28px 60px}
.lab-mono{font-family:ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace;letter-spacing:.04em}
.lab-back{display:inline-flex;gap:.5rem;align-items:center;padding:0;border:0;color:#555;background:none;font-size:13px;cursor:pointer}
.lab-back:hover{color:#151515}
.lab-kicker{display:flex;gap:.6rem;align-items:center;margin:34px 0 10px;font-size:13px}
.lab-kicker i{width:8px;height:8px;border-radius:50%;background:#c95a40}
.lab-h{max-width:20ch;margin:0 0 34px;font-size:clamp(26px,3.4vw,38px);font-weight:400;line-height:1.15;letter-spacing:-.02em}
.lab-panel{position:relative;margin:0 0 14px;padding:22px 26px;border:1px solid #d6d6d1;border-radius:6px;background:#f5f5f3;min-height:280px;display:grid;grid-template-rows:auto 1fr}
.lab-panel>h3{margin:0;font-size:13px;font-weight:400}
.lab-stage{display:grid;place-items:center;padding:20px 0}
.lab-hint{position:absolute;right:20px;bottom:14px;margin:0;color:#8a8a85;font-size:11px}
/* dial */
.lab-num{display:flex;align-items:baseline;gap:2px;font-size:64px;line-height:1}
.lab-wheel{display:inline-block;height:1em;overflow:hidden}
.lab-wheel>span{display:block;transition:transform .35s cubic-bezier(.2,.7,.1,1)}
.lab-wheel>span>b{display:block;height:1em;font-weight:500}
.lab-wheel.dim{color:#cfcfca}
.lab-num small{margin-left:8px;color:#666;font-size:20px}
.lab-arc{width:min(560px,100%);height:110px;margin-top:22px;cursor:ew-resize;touch-action:none}
/* wallet */
.lab-wallet{position:relative;width:240px;height:190px;margin-top:70px;cursor:pointer}
.lab-card{position:absolute;left:0;right:0;top:0;height:140px;padding:14px 16px;border-radius:12px;color:#eee;background:#1b1d22;box-shadow:0 10px 24px -12px rgb(0 0 0/.5);transition:transform .5s cubic-bezier(.2,.7,.1,1)}
.lab-card:nth-child(2){background:#26303a}.lab-card:nth-child(3){background:#c95a40}
.lab-card header{display:flex;justify-content:space-between;font-size:14px}
.lab-card header span{opacity:.5}
.lab-card footer{position:absolute;left:16px;bottom:12px;font-size:11px;opacity:.6}
.lab-case{position:absolute;left:-10px;right:-10px;bottom:0;height:96px;padding:40px 16px 0;border:1px solid #cfcfca;border-radius:6px 6px 14px 14px;background:#f2f2ef;box-shadow:0 -6px 14px -10px rgb(0 0 0/.3);font-size:11px;line-height:1.5}
/* inspect */
.lab-form{position:relative;width:min(340px,100%);padding:16px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px #e3e3df}
.lab-form label{display:block;margin-bottom:8px;font-size:14px;font-weight:500}
.lab-form input{box-sizing:border-box;width:100%;height:44px;padding:0 14px;border:1px solid #d9d9d4;border-radius:8px;background:#fafaf8;font:inherit;font-size:15px}
.lab-form p{margin:8px 0 16px;color:#777;font-size:12px}
.lab-form button{width:100%;height:44px;border:0;border-radius:8px;color:#fff;background:#151515;font:inherit;font-size:15px;cursor:pointer}
.lab-guide{position:absolute;display:grid;place-items:center;color:#c95a40;font-size:10px;background:rgb(201 90 64/.1);outline:1px dashed rgb(201 90 64/.6);opacity:0;transition:opacity .2s;pointer-events:none}
.lab-form:hover .lab-guide,.lab-form.show .lab-guide{opacity:1}
/* tooltip */
.lab-pill{position:relative;padding:10px 16px;border:1px solid #d6d6d1;border-radius:999px;background:#fff;font-size:12px;cursor:default}
.lab-tip{position:absolute;bottom:calc(100% + 12px);left:50%;width:220px;padding:12px 14px;border-radius:10px;color:#ddd;background:#1b1d22;font-size:11px;line-height:1.9;opacity:0;transform:translate(-50%,6px);transition:opacity .2s,transform .25s;pointer-events:none}
.lab-tip div{display:flex;justify-content:space-between}
.lab-tip b{color:#fff;font-weight:400}.lab-tip .live{color:#8fd19e}
.lab-pill:hover .lab-tip,.lab-pill:focus-visible .lab-tip{opacity:1;transform:translate(-50%,0)}
/* receipt */
.lab-printer{position:relative;width:250px;outline:0}
.lab-head{position:relative;z-index:1;padding:14px 16px;border-radius:12px;color:#ddd;background:#1b1d22;font-size:12px}
.lab-head .sel{display:flex;justify-content:space-between;margin-top:8px;color:#fff;font-size:15px}
.lab-slot{height:6px;margin:-3px 18px 0;border-radius:3px;background:#000}
.lab-paper{margin:0 26px;overflow:hidden;height:0;transition:height .7s cubic-bezier(.2,.7,.1,1)}
.lab-paper>div{padding:12px 14px 16px;background:#fff;font-size:11px;line-height:1.8;box-shadow:0 1px 0 #ddd;
  -webkit-mask:linear-gradient(#000 calc(100% - 6px),transparent 0),conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/10px 6px repeat-x;mask:linear-gradient(#000 calc(100% - 6px),transparent 0),conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/10px 6px repeat-x}
.lab-paper .row{display:flex;justify-content:space-between}
.lab-paper hr{border:0;border-top:1px dashed #bbb;margin:6px 0}
/* signature */
.lab-sign{position:relative;width:min(420px,100%)}
.lab-sign canvas{display:block;width:100%;height:150px;border-bottom:1px solid #bbb;cursor:crosshair;touch-action:none}
.lab-sign .ph{position:absolute;inset:0 0 auto;display:grid;place-items:center;height:150px;color:#aaa;font-size:14px;pointer-events:none;transition:opacity .2s}
.lab-sign footer{display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#777}
.lab-sign button{padding:0;border:0;background:none;color:#555;font:inherit;cursor:pointer}
.lab-sign .ok{color:#3c8a50;opacity:0;transition:opacity .2s}
/* hold */
.lab-hold{position:relative;overflow:hidden;padding:14px 30px;border:0;border-radius:999px;color:#fff;background:#151515;font:inherit;font-size:15px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none}
.lab-hold i{position:absolute;inset:0;background:#c95a40;transform:scaleX(0);transform-origin:left}
.lab-hold span{position:relative}
.lab-hold.done{background:#3c8a50}
/* voice */
.lab-voice{display:flex;gap:14px;align-items:center;padding:10px 18px 10px 10px;border-radius:999px;color:#fff;background:#1b1d22}
.lab-voice button{display:grid;place-items:center;width:44px;height:44px;border:0;border-radius:50%;background:#fff;cursor:pointer}
.lab-voice button svg{width:16px;height:16px}
.lab-bars{display:flex;gap:3px;align-items:center;height:30px}
.lab-bars i{width:3px;border-radius:2px;background:#555;transition:background .1s}
.lab-bars i.on{background:#fff}
.lab-voice time{min-width:3ch;font-size:12px;opacity:.7}
@media (prefers-reduced-motion:reduce){.lab-veil *{transition:none!important}}
`;

let styled = false;
const el = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

export function openLab(onClose?: () => void) {
  if (!styled) {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.append(s);
    styled = true;
  }
  const veil = el(`<div class="lab-veil" role="dialog" aria-modal="true" aria-label="Lab"><div class="lab-laptop"><div class="lab-lid"><div class="lab-cam"></div><div class="lab-screen" tabindex="-1"><main class="lab-page"></main></div></div><div class="lab-base"></div></div></div>`);
  const page = veil.querySelector<HTMLElement>('.lab-page')!;
  const screen = veil.querySelector<HTMLElement>('.lab-screen')!;
  page.append(
    el(`<button type="button" class="lab-back lab-mono">← zumodeia.com</button>`),
    el(`<p class="lab-kicker lab-mono"><i></i>LAB</p>`),
    el(`<h2 class="lab-h">A bench for trying out interface ideas</h2>`),
  );
  const panel = (name: string, hint = '') => {
    const p = el(`<section class="lab-panel"><h3 class="lab-mono">${name}</h3><div class="lab-stage"></div>${hint ? `<p class="lab-hint lab-mono">${hint}</p>` : ''}</section>`);
    page.append(p);
    return p.querySelector<HTMLElement>('.lab-stage')!;
  };
  const cleanups: (() => void)[] = [];

  // ── Dial: drag the arc, scroll, or use the arrows; the digits roll ──
  {
    const st = panel('DIAL', 'DRAG · SCROLL · ← →');
    const num = el(`<div class="lab-num lab-mono" aria-live="polite"></div>`);
    const wheels = [0, 1, 2].map(() => {
      const w = el(`<span class="lab-wheel"><span>${[...Array(10).keys()].map((d) => `<b>${d}</b>`).join('')}</span></span>`);
      num.append(w);
      return w;
    });
    num.append(el(`<small>%</small>`));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-280 -40 560 110');
    svg.classList.add('lab-arc');
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'slider');
    svg.setAttribute('aria-label', 'Dial');
    const ticks = document.createElementNS(svg.namespaceURI, 'g');
    svg.append(ticks);
    const needle = document.createElementNS(svg.namespaceURI, 'g');
    needle.innerHTML = `<line x1="0" y1="-34" x2="0" y2="2" stroke="#c95a40" stroke-width="3"/><path d="M-9 26 L0 12 L9 26Z" fill="#c95a40"/>`;
    svg.append(needle);
    st.append(num, svg);
    let val = 50;
    const R = 520;
    const draw = () => {
      // the scale slides under a fixed needle, one tick per two percent
      let h = '';
      for (let i = -60; i <= 110; i++) {
        const tickVal = i * 2;
        const a = ((tickVal - val) / 2) * 0.034;
        if (Math.abs(a) > 0.62) continue;
        const major = tickVal % 10 === 0;
        const len = major ? 30 : 18;
        const fade = Math.max(0.12, 1 - Math.abs(a) / 0.62);
        const out = tickVal < 0 || tickVal > 100;
        const x1 = Math.sin(a) * R;
        const y1 = R - Math.cos(a) * R;
        const x2 = Math.sin(a) * (R - len);
        const y2 = R - Math.cos(a) * (R - len) + len;
        h += `<line x1="${x1.toFixed(1)}" y1="${(y1 - len).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(y2 - len).toFixed(1)}" stroke="${out ? '#bbb' : '#1b1b1b'}" stroke-opacity="${(out ? 0.4 : fade).toFixed(2)}" stroke-width="${major ? 2.4 : 1.4}"/>`;
      }
      ticks.innerHTML = h;
      const s = String(Math.round(val)).padStart(3, '0');
      wheels.forEach((w, i) => {
        (w.firstElementChild as HTMLElement).style.transform = `translateY(-${Number(s[i])}em)`;
        w.classList.toggle('dim', i < 3 - String(Math.round(val)).length);
      });
      svg.setAttribute('aria-valuenow', String(Math.round(val)));
    };
    const set = (v: number) => {
      const n = Math.max(0, Math.min(100, v));
      if (Math.round(n) !== Math.round(val)) play('flip');
      val = n;
      draw();
    };
    let drag: number | null = null;
    svg.addEventListener('pointerdown', (e) => {
      drag = e.clientX;
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (drag === null) return;
      set(val - (e.clientX - drag) * 0.25);
      drag = e.clientX;
    });
    svg.addEventListener('pointerup', () => (drag = null));
    svg.addEventListener('wheel', (e) => (e.preventDefault(), set(val + Math.sign(e.deltaY + e.deltaX))), { passive: false });
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') (e.preventDefault(), set(val + 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') (e.preventDefault(), set(val - 1));
    });
    draw();
  }

  // ── Wallet: the cards rise out of their case ──
  {
    const st = panel('WALLET', 'CLICK');
    const w = el(`<div class="lab-wallet" role="button" tabindex="0" aria-label="Wallet: open or close"></div>`);
    [1, 2, 3].forEach((n) => w.append(el(`<div class="lab-card lab-mono"><header>Card <span>0${n}</span></header><footer>zumodeia.com/lab</footer></div>`)));
    w.append(el(`<div class="lab-case lab-mono">CARD CASE<br>03 SLOTS</div>`));
    const cards = [...w.querySelectorAll<HTMLElement>('.lab-card')];
    let open = false;
    const lay = () =>
      cards.forEach((c, i) => {
        c.style.transform = open ? `translate(${(i - 1) * 70}px, ${-40 - (i === 1 ? 14 : 0)}px) rotate(${(i - 1) * 9}deg)` : `translateY(${36 + i * 9}px)`;
        c.style.zIndex = String(i);
      });
    const toggle = () => {
      open = !open;
      play(open ? 'open' : 'close');
      lay();
    };
    w.addEventListener('click', toggle);
    w.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle()));
    lay();
    st.append(w);
  }

  // ── Inspect: hover the form and its spacing shows ──
  {
    const st = panel('INSPECT', 'HOVER');
    const f = el(`<form class="lab-form" onsubmit="return false"><label>Email</label><input type="email" placeholder="you@zumodeia.com" aria-label="Email" /><p>One letter a season. Leave whenever you like.</p><button type="submit">Subscribe</button></form>`);
    const guide = (style: string, label: string) => f.append(el(`<span class="lab-guide lab-mono" style="${style}">${label}</span>`));
    guide('left:0;top:0;bottom:0;width:16px', '16');
    guide('right:0;top:0;bottom:0;width:16px', '16');
    guide('left:16px;right:16px;top:0;height:16px', '16');
    guide('left:16px;right:16px;bottom:0;height:16px', '16');
    guide('left:16px;right:16px;top:50px;height:8px', '8');
    guide('left:16px;right:16px;top:102px;height:44px', 'R 8 · 44');
    st.append(f);
  }

  // ── Tooltip: the site's status, on hover ──
  {
    const st = panel('TOOLTIP', 'HOVER');
    st.append(
      el(`<span class="lab-pill lab-mono" tabindex="0">ZUMODEIA.COM<span class="lab-tip lab-mono" role="tooltip"><div><span>LAB · 004</span></div><div><span>STATUS</span><b class="live">● LIVE</b></div><div><span>ROUTE</span><b>STATIC</b></div><div><span>BUILD</span><b>ASTRO · THREE</b></div><div><span>HOME</span><b>ALICANTE</b></div></span></span>`),
    );
  }

  // ── Receipt: pick something from the huerta, Enter prints it ──
  {
    const st = panel('RECEIPT', '← → TO TURN · ENTER TO PRINT');
    const goods: [string, number][] = [
      ['Tomatoes', 2.4],
      ['Aubergines', 1.8],
      ['Courgettes', 1.2],
      ['Peppers', 2.1],
      ['Leeks', 1.5],
      ['Lemons', 0.9],
    ];
    let k = 0;
    const pr = el(`<div class="lab-printer" tabindex="0" aria-label="Receipt printer"><div class="lab-head lab-mono">HUERTA · TERRACE<div class="sel"><span class="n"></span><span class="p"></span></div></div><div class="lab-slot"></div><div class="lab-paper lab-mono"><div></div></div></div>`);
    const n = pr.querySelector<HTMLElement>('.n')!;
    const pp = pr.querySelector<HTMLElement>('.p')!;
    const paper = pr.querySelector<HTMLElement>('.lab-paper')!;
    const show = () => {
      n.textContent = `‹ ${goods[k][0]} ›`;
      pp.textContent = `€${goods[k][1].toFixed(2)}`;
    };
    const print = () => {
      const [name, price] = goods[k];
      const qty = 1 + ((k * 7) % 3);
      paper.firstElementChild!.innerHTML = `<div class="row"><span>ZUMODEIA HUERTA</span><span>#${String(100 + k * 13).slice(-3)}</span></div><hr><div class="row"><span>${qty} × ${name}</span><span>€${(qty * price).toFixed(2)}</span></div><div class="row"><span>Sun, water</span><span>€0.00</span></div><hr><div class="row"><b>TOTAL</b><b>€${(qty * price).toFixed(2)}</b></div><div>${new Date().toLocaleDateString('en-GB')} · ALICANTE</div><div>THANK YOU · GRACIAS</div>`;
      paper.style.height = '0px';
      void paper.offsetHeight;
      paper.style.height = `${paper.firstElementChild!.scrollHeight}px`;
      play('squeak');
    };
    pr.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') (e.preventDefault(), (k = (k + 1) % goods.length), show(), play('flip'));
      if (e.key === 'ArrowLeft') (e.preventDefault(), (k = (k + goods.length - 1) % goods.length), show(), play('flip'));
      if (e.key === 'Enter') (e.preventDefault(), print());
    });
    pr.addEventListener('click', () => pr.focus());
    pr.addEventListener('dblclick', print);
    show();
    st.append(pr);
  }

  // ── Signature: draw with the pointer ──
  {
    const st = panel('SIGNATURE');
    const box = el(`<div class="lab-sign"><canvas aria-label="Signature pad"></canvas><span class="ph">Draw your signature</span><footer><span class="ok lab-mono">✓ SIGNED</span><button type="button" class="lab-mono">CLEAR</button></footer></div>`);
    st.append(box);
    const cv = box.querySelector('canvas')!;
    const ph = box.querySelector<HTMLElement>('.ph')!;
    const ok = box.querySelector<HTMLElement>('.ok')!;
    const ctx = cv.getContext('2d')!;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      cv.width = r.width * devicePixelRatio;
      cv.height = r.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.strokeStyle = '#151515';
    };
    requestAnimationFrame(fit);
    let last: { x: number; y: number; t: number } | null = null;
    let ink = 0;
    const at = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    };
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      last = at(e);
      ph.style.opacity = '0';
    });
    cv.addEventListener('pointermove', (e) => {
      if (!last) return;
      const p = at(e);
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      // faster strokes draw thinner, like a pen
      ctx.lineWidth = Math.max(1.2, 3.4 - (d / Math.max(1, p.t - last.t)) * 1.6);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ink += d;
      if (ink > 120) ok.style.opacity = '1';
      last = p;
    });
    cv.addEventListener('pointerup', () => (last = null));
    box.querySelector('button')!.addEventListener('click', () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ink = 0;
      ok.style.opacity = '0';
      ph.style.opacity = '1';
    });
  }

  // ── Hold: keep pressing to publish ──
  {
    const st = panel('HOLD', 'PRESS AND HOLD');
    const b = el(`<button type="button" class="lab-hold"><i></i><span>Hold to publish</span></button>`);
    const fill = b.querySelector('i')!;
    const label = b.querySelector('span')!;
    let raf = 0;
    let t0 = 0;
    const HOLD = 1200;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / HOLD);
      fill.style.transform = `scaleX(${t})`;
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        b.classList.add('done');
        label.textContent = 'Published ✓';
        play('open');
        window.setTimeout(() => {
          b.classList.remove('done');
          label.textContent = 'Hold to publish';
          fill.style.transform = 'scaleX(0)';
        }, 1800);
      }
    };
    const start = (e: Event) => {
      e.preventDefault();
      if (b.classList.contains('done')) return;
      t0 = performance.now();
      fill.style.transition = 'none';
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      if (b.classList.contains('done')) return;
      fill.style.transition = 'transform .3s';
      fill.style.transform = 'scaleX(0)';
    };
    b.addEventListener('pointerdown', start);
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointerleave', stop);
    b.addEventListener('keydown', (e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && start(e));
    b.addEventListener('keyup', stop);
    st.append(b);
  }

  // ── Voice notes: a waveform that plays ──
  {
    const st = panel('VOICE NOTES');
    const heights = Array.from({ length: 34 }, (_, i) => 6 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 22));
    const v = el(`<div class="lab-voice"><button type="button" aria-label="Play"><svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="#151515"/></svg></button><div class="lab-bars">${heights.map((h) => `<i style="height:${h}px"></i>`).join('')}</div><time class="lab-mono">0:12</time></div>`);
    const bars = [...v.querySelectorAll('i')];
    const btn = v.querySelector('button')!;
    const time = v.querySelector('time')!;
    let timer = 0;
    let at = 0;
    const stopV = () => {
      clearInterval(timer);
      timer = 0;
      btn.innerHTML = `<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="#151515"/></svg>`;
    };
    btn.addEventListener('click', () => {
      if (timer) return stopV();
      btn.innerHTML = `<svg viewBox="0 0 16 16"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="#151515"/></svg>`;
      timer = window.setInterval(() => {
        at = (at + 1) % (bars.length + 1);
        bars.forEach((b, i) => b.classList.toggle('on', i < at));
        time.textContent = `0:${String(12 - Math.round((at / bars.length) * 12)).padStart(2, '0')}`;
        if (at % 2) play('blip');
        if (at === bars.length) {
          stopV();
          at = 0;
          window.setTimeout(() => bars.forEach((b) => b.classList.remove('on')), 300);
        }
      }, 120);
    });
    cleanups.push(stopV);
    st.append(v);
  }

  // ── Open and close ──
  const close = () => {
    cleanups.forEach((f) => f());
    veil.classList.remove('in');
    window.setTimeout(() => veil.remove(), 400);
    play('close');
    onClose?.();
  };
  // the lab's keys stay in the lab: the world underneath does not hear them
  veil.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
  });
  veil.addEventListener('click', (e) => e.target === veil && close());
  page.querySelector('.lab-back')!.addEventListener('click', close);
  document.body.append(veil);
  requestAnimationFrame(() => {
    veil.classList.add('in');
    screen.focus({ preventScroll: true });
  });
  play('open');
}
