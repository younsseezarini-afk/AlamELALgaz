(function () {
  const W = 1920, H = 1080;
  const stage = document.getElementById('stage');
  const TL = window.TL;
  const clips = TL.clips;
  const els = new Map();
  let pending = [];

  // ---------- math / easing ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const outExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const outQuart = t => 1 - Math.pow(1 - t, 4);
  const inCubic = t => t * t * t;
  const inOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const inOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const prog = (lt, a, d) => clamp((lt - a) / Math.max(d, 1e-6));
  function hash(k) { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function rng(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

  // ---------- dom helpers ----------
  function h(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function img(src, parent, cls) {
    const im = h('img', cls || '', parent);
    im.src = src;
    pending.push(im.decode().catch(() => {}));
    return im;
  }
  function maskLine(parent, cls, html) { const m = h('div', 'mask ' + (cls || ''), parent); return h('span', '', m, html); }
  function animMask(sp, lt, at, dur = .7) { const q = outExpo(prog(lt, at, dur)); sp.style.transform = `translateY(${(1 - q) * 105}%)`; }
  function words(parent, text) {
    const out = [];
    text.split(/\s+/).filter(Boolean).forEach((w, i, a) => { out.push(h('span', 'wd', parent, w)); if (i < a.length - 1) parent.appendChild(document.createTextNode(' ')); });
    return out;
  }
  function animWords(ws, lt, at, stagger = .05, dur = .55, dy = 26) {
    ws.forEach((w, i) => { const q = outQuart(prog(lt, at + i * stagger, dur)); w.style.opacity = q; w.style.transform = `translateY(${(1 - q) * dy}px)`; });
  }
  const fadeInOut = (lt, dur, fi, fo) => (fi ? inOutSine(prog(lt, 0, fi)) : 1) * (fo ? 1 - inOutSine(prog(lt, dur - fo, fo)) : 1);
  const R = {};

  // ---------- photo / archival document ----------
  R.photo = {
    create(c) {
      const p = c.p, el = h('div', 'clip photo' + (p.doc ? ' doc' : ''));
      if (p.doc) {
        el._w = h('div', 'docw', el);
        el._img = img(p.src, el._w);
        el._img.style.height = (p.dh || 860) + 'px';
      } else {
        el._img = img(p.src, el);
        if (p.pos) el._img.style.objectPosition = p.pos;
        if (!p.novig) h('div', 'vig', el);
      }
      if (p.gray) el._img.style.filter = 'grayscale(1) contrast(1.05)';
      if (p.sepia) el._img.style.filter = 'sepia(.35) contrast(1.04)';
      if (p.wash != null) el._wash = h('div', 'wash', el);
      if (p.cap) el._cap = h('div', 'cap', el, p.cap);
      if (p.dust) {
        el._cv = h('canvas', '', el); el._cv.width = 960; el._cv.height = 540;
        el._ctx = el._cv.getContext('2d');
        const r = rng(c.seed || 7);
        el._parts = [...Array(p.dust)].map(() => ({ x: r(), y: r(), z: r(), vx: (r() - .5) * .008, vy: (r() - .6) * .01, ph: r() * 6.28 }));
      }
      return el;
    },
    update(el, c, lt, dur) {
      const p = c.p, k = p.kb || {}, u = clamp(lt / dur);
      const sc = lerp(k.s0 ?? 1.0, k.s1 ?? 1.06, u) * (c.punch ? 1 + .075 * (1 - outExpo(prog(lt, 0, .6))) : 1);
      const x = lerp(k.x0 ?? 0, k.x1 ?? 0, u), y = lerp(k.y0 ?? 0, k.y1 ?? 0, u);
      if (p.doc) el._w.style.transform = `translate(-50%,-50%) translate(${x}%,${y}%) scale(${sc}) rotate(${p.rot || 0}deg)`;
      else el._img.style.transform = `translate(${x}%,${y}%) scale(${sc})`;
      el.style.opacity = fadeInOut(lt, dur, c.fi ?? .7, c.fo ?? 0);
      if (el._wash) el._wash.style.opacity = p.wash;
      if (el._cap) el._cap.style.opacity = outQuart(prog(lt, .6, .7)) * (1 - inCubic(prog(lt, dur - .9, .5)));
      if (el._ctx) {
        const ctx = el._ctx; ctx.clearRect(0, 0, 960, 540);
        for (const q of el._parts) {
          const px = (((q.x + q.vx * lt + .005 * Math.sin(lt * .6 + q.ph)) % 1) + 1) % 1 * 960;
          const py = (((q.y + q.vy * lt) % 1) + 1) % 1 * 540;
          ctx.fillStyle = `rgba(255,244,225,${(.1 + .4 * q.z) * (.6 + .4 * Math.sin(lt * 1.6 + q.ph))})`;
          ctx.beginPath(); ctx.arc(px, py, .5 + q.z * 1.4, 0, 6.283); ctx.fill();
        }
      }
    }
  };

  // ---------- flash (shutter / hit) ----------
  R.flash = {
    create(c) { const el = h('div', 'clip'); el.style.background = c.p.color || '#fff'; return el; },
    update(el, c, lt, dur) { el.style.opacity = (c.p.peak ?? .9) * Math.pow(1 - clamp(lt / dur), 2.4); }
  };

  // ---------- plain background ----------
  R.solid = {
    create(c) { const el = h('div', 'clip' + (c.p.bg ? ' bg' : '')); if (!c.p.bg) el.style.background = c.p.color || '#f7f6f2'; return el; },
    update(el, c, lt, dur) { el.style.opacity = fadeInOut(lt, dur, c.fi, c.fo); }
  };

  // ---------- main title ----------
  R.title = {
    create(c) {
      const el = h('div', 'clip title bg'), p = c.p;
      if (p.img) { el._ph = h('div', 'ph', el); el._phi = img(p.img, el._ph); if (p.imgpos) el._phi.style.objectPosition = p.imgpos; }
      const w = h('div', 'wrap', el); el._w = w;
      el._k = maskLine(w, 'kicker', p.kicker);
      el._l1 = maskLine(w, 'l1', p.l1);
      el._l2 = maskLine(w, 'l2', p.l2);
      el._r = h('div', 'rule', w);
      el._d = h('div', 'dates', w, p.dates);
      return el;
    },
    update(el, c, lt, dur) {
      animMask(el._k, lt, .5); animMask(el._l1, lt, .8, 1.1); animMask(el._l2, lt, 1.15, 1.1);
      el._r.style.transform = `scaleX(${inOutCubic(prog(lt, 1.7, .9))})`;
      const qd = outQuart(prog(lt, 2.2, .8)); el._d.style.opacity = qd; el._d.style.transform = `translateY(${(1 - qd) * 14}px)`;
      if (el._phi) { el._phi.style.transform = `scale(${1.02 + .05 * clamp(lt / dur)})`; el._ph.style.opacity = inOutSine(prog(lt, 0, 1.4)); }
      const qo = inCubic(prog(lt, dur - .7, .6));
      el._w.style.opacity = 1 - qo; el._w.style.transform = `translateY(${-12 * qo}px)`;
      el.style.opacity = fadeInOut(lt, dur, c.fi, c.fo);
    }
  };

  // ---------- chapter card ----------
  R.chapter = {
    create(c) {
      const el = h('div', 'clip chapter bg'), p = c.p;
      el._n = h('div', 'num', el, p.num);
      const w = h('div', 'wrap', el); el._w = w;
      el._r = h('div', 'rule', w);
      el._k = maskLine(w, 'k', p.k);
      el._h = maskLine(w, 'h', p.h);
      return el;
    },
    update(el, c, lt, dur) {
      el.style.opacity = fadeInOut(lt, dur, .5, .5);
      const qn = outQuart(prog(lt, .1, 1.4)); el._n.style.opacity = qn; el._n.style.transform = `translateX(${(1 - qn) * -40 - lt * 4}px)`;
      el._r.style.transform = `scaleX(${inOutCubic(prog(lt, .3, .6))})`;
      animMask(el._k, lt, .55); animMask(el._h, lt, .75, 1.0);
      const qo = inCubic(prog(lt, dur - .9, .5)); el._w.style.opacity = 1 - qo; el._w.style.transform = `translateY(${-10 * qo}px)`;
    }
  };

  // ---------- super (place / date) ----------
  R.super = {
    create(c) {
      const el = h('div', 'clip'), sp = h('div', 'super', el), p = c.p;
      el._bar = h('div', 'bar', sp);
      el._a = h('div', 'a', sp); el._at = h('span', '', el._a, p.a); el._at.style.display = 'inline-block';
      if (p.b) { el._b = h('div', 'b', sp); el._bt = h('span', '', el._b, p.b); }
      el._sp = sp;
      return el;
    },
    update(el, c, lt, dur) {
      const qo = inCubic(prog(lt, dur - .4, .4));
      el._bar.style.transform = `scaleY(${outExpo(prog(lt, 0, .4))})`;
      const qa = outExpo(prog(lt, .15, .7));
      el._a.style.clipPath = `inset(0 0 0 ${(1 - qa) * 100}%)`;
      el._at.style.transform = `translateX(${(1 - qa) * 30}px)`; el._at.style.opacity = qa;
      if (el._b) { const q2 = outExpo(prog(lt, .35, .7)); el._b.style.clipPath = `inset(0 0 0 ${(1 - q2) * 100}%)`; el._bt.style.opacity = q2; }
      el._sp.style.opacity = 1 - qo; el._sp.style.transform = `translateY(${qo * 10}px)`;
      el._sp.style.boxShadow = qa > .6 ? '' : 'none';
    }
  };

  // ---------- lower third ----------
  R.lower = {
    create(c) {
      const el = h('div', 'clip'), lw = h('div', 'lower', el), p = c.p;
      el._bar = h('div', 'bar', lw);
      el._pn = h('div', 'pn', lw);
      el._n = h('div', 'n', el._pn, p.n);
      el._t = h('div', 't', el._pn, p.t);
      el._lw = lw;
      return el;
    },
    update(el, c, lt, dur) {
      const qo = inCubic(prog(lt, dur - .4, .4));
      el._bar.style.transform = `scaleY(${outExpo(prog(lt, 0, .4))})`;
      const qp = outExpo(prog(lt, .15, .75));
      el._pn.style.clipPath = `inset(0 0 0 ${(1 - qp) * 100}%)`;
      const qn = outQuart(prog(lt, .3, .7)), qt = outQuart(prog(lt, .45, .7));
      el._n.style.opacity = qn; el._n.style.transform = `translateX(${(1 - qn) * 24}px)`;
      el._t.style.opacity = qt; el._t.style.transform = `translateX(${(1 - qt) * 24}px)`;
      el._lw.style.opacity = 1 - qo; el._lw.style.transform = `translateY(${qo * 10}px)`;
      el._lw.style.boxShadow = qp > .6 ? '' : 'none';
    }
  };

  // ---------- kinetic typography ----------
  R.ktext = {
    create(c) {
      const p = c.p, el = h('div', 'clip ktext ' + (p.align || 'center'));
      if (p.bg === 'paper') el.classList.add('bg');
      if (p.bg === 'wash') el.style.background = 'rgba(247,246,242,.9)';
      const box = h('div', 'box', el); el._box = box;
      if (p.rule) el._rule = h('div', 'rule', box);
      el._ls = p.lines.map(L => {
        const an = L.an || 'words';
        const d = h('div', 'ln ' + (L.c || 'w') + (L.font === 'naskh' ? ' nk' : ''), box);
        d.style.font = `${L.w || 700} ${L.sz || 96}px/1.32 ${L.font === 'naskh' ? 'var(--naskh)' : 'var(--sans)'}`;
        if (L.mt) d.style.marginTop = L.mt + 'px';
        if (!/[\u0600-\u06FF]/.test(L.tx)) { d.style.direction = 'ltr'; d.style.letterSpacing = '.04em'; }
        if (an === 'mask') { d.classList.add('mask'); return { d, an, sp: h('span', '', d, L.tx) }; }
        if (an === 'fade') { d.textContent = L.tx; return { d, an }; }
        return { d, an, ws: words(d, L.tx) };
      });
      return el;
    },
    update(el, c, lt, dur) {
      const p = c.p;
      if (el._top == null) { el._top = (p.y ?? 540) - el._box.offsetHeight / 2; el._box.style.top = el._top + 'px'; }
      el.style.opacity = fadeInOut(lt, dur, p.fi ?? (p.bg ? .22 : 0), p.fo ?? .3);
      if (el._rule) el._rule.style.transform = `scaleX(${inOutCubic(prog(lt, .15, .6))})`;
      p.lines.forEach((L, i) => {
        const o = el._ls[i], at = L.at ?? (.35 + i * .45);
        if (o.an === 'mask') animMask(o.sp, lt, at);
        else if (o.an === 'fade') { const q = outQuart(prog(lt, at, .9)); o.d.style.opacity = q; o.d.style.transform = `translateY(${(1 - q) * 16}px)`; }
        else animWords(o.ws, lt, at, L.st ?? .07);
        if (L.until != null) o.d.style.opacity = 1 - inCubic(prog(lt, L.until, .4));
      });
      const qo = inCubic(prog(lt, dur - .55, .45)); el._box.style.transform = `translateY(${-10 * qo}px)`;
    }
  };

  // ---------- quote ----------
  R.quote = {
    create(c) {
      const el = h('div', 'clip quote bg'), p = c.p;
      el._qm = h('div', 'qm', el, '«');
      const tx = h('div', 'tx', el);
      if (p.size) tx.style.fontSize = p.size + 'px';
      if (p.top) tx.style.top = p.top + 'px';
      el._ws = words(tx, p.text);
      el._at = h('div', 'at', el, `<i></i><span>${p.attr}</span>`);
      return el;
    },
    update(el, c, lt, dur) {
      const p = c.p, n = el._ws.length, t0 = p.t0 ?? .7, t1 = p.t1 ?? Math.max(t0 + 1, dur - 1.6);
      if (el._top == null) { const tx = el._ws[0].parentNode, hh = tx.offsetHeight; el._top = Math.max(220, 520 - hh / 2); tx.style.top = el._top + 'px'; el._qm.style.top = (el._top - 120) + 'px'; el._at.style.top = (el._top + hh + 40) + 'px'; el._at.style.bottom = 'auto'; }
      el.style.opacity = fadeInOut(lt, dur, .5, .5);
      const qq = outQuart(prog(lt, .2, .9)); el._qm.style.opacity = qq; el._qm.style.transform = `translateY(${(1 - qq) * 20}px)`;
      el._ws.forEach((w, i) => { const q = outQuart(prog(lt, t0 + (t1 - t0) * (i / n), .7)); w.style.opacity = .14 + .86 * q; });
      el._at.style.opacity = outQuart(prog(lt, Math.min(t1, dur - 1.6), .8));
    }
  };

  // ---------- big stat ----------
  R.stat = {
    create(c) {
      const el = h('div', 'clip stat'), w = h('div', 'wrap', el), p = c.p;
      if (p.bg === 'wash') el.style.background = 'rgba(247,246,242,.92)'; else el.classList.add('bg');
      el._v = h('div', 'v', w, '');
      el._u = maskLine(w, 'u', p.u || '');
      el._s = h('div', 's', w, p.s || '');
      return el;
    },
    update(el, c, lt, dur) {
      const p = c.p;
      el.style.opacity = fadeInOut(lt, dur, .22, .3);
      const q = outExpo(prog(lt, .1, p.count ?? 1.2));
      el._v.textContent = (p.pre || '') + Math.round(lerp(p.from ?? 0, p.v, q)).toLocaleString('en-US') + (p.post || '');
      el._v.style.opacity = outQuart(prog(lt, .05, .3));
      animMask(el._u, lt, .35);
      el._s.style.opacity = outQuart(prog(lt, .6, .5));
    }
  };

  // ---------- list ----------
  R.list = {
    create(c) {
      const el = h('div', 'clip list'), p = c.p;
      if (p.bg === 'wash') el.style.background = 'rgba(247,246,242,.93)'; else el.classList.add('bg');
      const hd = h('div', 'hd', el);
      el._k = maskLine(hd, 'k', p.k || ''); el._h = maskLine(hd, 'h', p.h || '');
      const box = h('div', 'items', el);
      el._it = p.items.map((t, i) => { const r = h('div', 'it', box); h('div', 'n', r, p.nums ? p.nums[i] : String(i + 1).padStart(2, '0')); h('div', 't', r, t); return r; });
      return el;
    },
    update(el, c, lt, dur) {
      const p = c.p;
      el.style.opacity = fadeInOut(lt, dur, .5, .5);
      animMask(el._k, lt, .3); animMask(el._h, lt, .45);
      el._it.forEach((r, i) => { const q = outQuart(prog(lt, p.times ? p.times[i] : 1 + i * .6, .8)); r.style.opacity = q; r.style.transform = `translateY(${(1 - q) * 18}px)`; });
    }
  };

  // ---------- map ----------
  const M = window.MAP;
  const CITY_AR = { basra: 'البصرة', baghdad: 'بغداد', cairo: 'القاهرة', aswan: 'أسوان', oxford: 'أكسفورد', viterbo: 'فيتربو', basel: 'بازل', prague: 'براغ', toledo: 'طليطلة', damascus: 'دمشق', mecca: 'مكة' };
  function sampleCurve(a, b, bend, n) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * bend, cy = my + dx * bend, pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]); }
    return pts;
  }
  function partial(pts, q) {
    const f = q * (pts.length - 1), n = Math.floor(f), r = f - n, out = pts.slice(0, n + 1);
    if (n < pts.length - 1) out.push([lerp(pts[n][0], pts[n + 1][0], r), lerp(pts[n][1], pts[n + 1][1], r)]);
    return out.length > 1 ? 'M' + out.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') : '';
  }
  R.map = {
    create(c) {
      const p = c.p, el = h('div', 'clip svgclip');
      el.style.background = '#f7f6f2';
      const sv = s('svg', { viewBox: `0 0 ${M.W} ${M.H}`, preserveAspectRatio: 'xMidYMid slice', style: 'direction:ltr' }, el);
      el._sv = sv;
      const hi = new Set(p.hi || []);
      const gc = s('g', {}, sv);
      for (const k of M.countries) s('path', { d: k.d, fill: hi.has(k.name) ? '#d9d4ca' : '#e8e5de', stroke: '#ffffff', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }, gc);
      el._regions = (p.regions || []).map(r => s('text', { x: r.x, y: r.y, 'text-anchor': 'middle', class: 'lblg', 'font-size': 60, opacity: 0 }, sv, r.tx));
      if (p.nile) {
        el._nile = s('path', { d: '', fill: 'none', stroke: '#8aa6bf', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, sv);
        const pts = []; for (let i = 0; i < M.nile.length - 1; i++) for (let j = 0; j < 8; j++) { const t = j / 8; pts.push([lerp(M.nile[i][0], M.nile[i + 1][0], t), lerp(M.nile[i][1], M.nile[i + 1][1], t)]); }
        pts.push(M.nile[M.nile.length - 1]); el._nilePts = pts;
      }
      if (p.tigris) s('path', { d: 'M' + M.tigris.map(q => q.join(',')).join('L'), fill: 'none', stroke: '#8aa6bf', 'stroke-width': 2.4, 'vector-effect': 'non-scaling-stroke' }, sv);
      el._routes = (p.routes || []).map(r => ({ r, pts: sampleCurve(M.cities[r.a], M.cities[r.b], r.bend ?? .18, 160), line: s('path', { d: '', fill: 'none', stroke: '#c8102e', 'stroke-width': 4, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, sv) }));
      el._cities = (p.cities || []).map(ct => {
        const g = s('g', { opacity: 0 }, sv), xy = M.cities[ct.k];
        const ring = s('circle', { cx: xy[0], cy: xy[1], r: 10, fill: 'none', stroke: '#c8102e', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, g);
        const dot = s('circle', { cx: xy[0], cy: xy[1], r: 8, fill: ct.red ? '#c8102e' : '#141414', stroke: '#fff', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, g);
        const left = ct.side !== 'r';
        const tx = s('text', { x: xy[0], y: xy[1], 'text-anchor': left ? 'end' : 'start', class: (ct.red ? 'lblr' : 'lbl') + ' halo', 'font-size': 30 }, g, ct.tx || CITY_AR[ct.k]);
        const sub = ct.sub ? s('text', { x: xy[0], y: xy[1], 'text-anchor': left ? 'end' : 'start', class: 'lblg halo', 'font-size': 20 }, g, ct.sub) : null;
        return { ct, g, ring, dot, tx, sub, xy, left };
      });
      if (p.pin) {
        el._pin = { xy: M.cities[p.pin.k] };
        el._pinBox = h('div', '', el);
        Object.assign(el._pinBox.style, { position: 'absolute', display: 'flex', alignItems: 'stretch', boxShadow: '0 12px 32px rgba(20,20,20,.14)', opacity: 0, direction: 'rtl' });
        el._pinBox.innerHTML = `<div style="width:8px;background:#c8102e"></div><div style="background:#fff;color:#141414;font:700 40px/1 var(--sans);padding:18px 26px 22px;white-space:nowrap">${p.pin.tx}</div>`;
        el._pinLine = s('line', { stroke: '#c8102e', 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke', opacity: 0 }, sv);
      }
      return el;
    },
    update(el, c, lt, dur) {
      const p = c.p;
      el.style.opacity = fadeInOut(lt, dur, c.fi ?? .6, c.fo ?? .6);
      const cam = p.cam; let cx, cy, w;
      if (lt <= cam[0][0]) [, cx, cy, w] = cam[0];
      else if (lt >= cam[cam.length - 1][0]) [, cx, cy, w] = cam[cam.length - 1];
      else for (let i = 0; i < cam.length - 1; i++) if (lt >= cam[i][0] && lt <= cam[i + 1][0]) {
        const q = inOutCubic((lt - cam[i][0]) / (cam[i + 1][0] - cam[i][0]));
        cx = lerp(cam[i][1], cam[i + 1][1], q); cy = lerp(cam[i][2], cam[i + 1][2], q);
        w = Math.exp(lerp(Math.log(cam[i][3]), Math.log(cam[i + 1][3]), q)); break;
      }
      const hh = w * 9 / 16, k = w / W;
      el._sv.setAttribute('viewBox', `${cx - w / 2} ${cy - hh / 2} ${w} ${hh}`);
      (p.regions || []).forEach((r, i) => { const t = el._regions[i]; t.setAttribute('font-size', 52 * k); t.setAttribute('opacity', .55 * outQuart(prog(lt, r.t ?? .4, 1))); });
      if (el._nile) el._nile.setAttribute('d', partial(el._nilePts, inOutCubic(prog(lt, p.nile.t ?? 0, p.nile.d ?? 2.2))));
      for (const R0 of el._routes) R0.line.setAttribute('d', partial(R0.pts, inOutCubic(prog(lt, R0.r.t, R0.r.d ?? 2.4))));
      for (const C of el._cities) {
        const t0 = C.ct.t ?? 0, q = outQuart(prog(lt, t0, .7));
        C.g.setAttribute('opacity', q);
        C.dot.setAttribute('r', (C.ct.big ? 9 : 7) * k);
        const ph = Math.max(0, ((lt - t0) * .5) % 1);
        C.ring.setAttribute('r', (10 + 26 * outQuart(ph)) * k);
        C.ring.setAttribute('opacity', (1 - ph) * q * .9);
        const off = 22 * k * (C.left ? -1 : 1), fs = 32 * k * (C.ct.sz || 1);
        C.tx.setAttribute('x', C.xy[0] + off); C.tx.setAttribute('y', C.xy[1] + fs * .34 + (1 - q) * 10 * k);
        C.tx.setAttribute('font-size', fs); C.tx.setAttribute('stroke-width', 7 * k);
        if (C.sub) { C.sub.setAttribute('x', C.xy[0] + off); C.sub.setAttribute('y', C.xy[1] + fs * .34 + 32 * k); C.sub.setAttribute('font-size', 22 * k); C.sub.setAttribute('stroke-width', 6 * k); }
      }
      if (el._pin) {
        const P = el._pin, sx = (P.xy[0] - (cx - w / 2)) / k, sy = (P.xy[1] - (cy - hh / 2)) / k;
        const ql = inOutCubic(prog(lt, p.pin.t, .6)), qb = outExpo(prog(lt, p.pin.t + .45, .8));
        el._pinLine.setAttribute('x1', P.xy[0]); el._pinLine.setAttribute('y1', P.xy[1]);
        el._pinLine.setAttribute('x2', P.xy[0] + 160 * ql * k); el._pinLine.setAttribute('y2', P.xy[1] - 150 * ql * k);
        el._pinLine.setAttribute('opacity', ql > 0 ? 1 : 0);
        Object.assign(el._pinBox.style, { left: (sx + 160) + 'px', top: (sy - 210) + 'px', opacity: qb, clipPath: `inset(0 0 0 ${(1 - qb) * 100}%)` });
      }
    }
  };

  // ---------- diagrams ----------
  const INK = '#141414', RED = '#c8102e', GREY = '#9a978f';
  function eyeShape(g, x, y, sc) {
    const e = s('g', { transform: `translate(${x},${y}) scale(${sc})` }, g);
    s('path', { d: 'M-130,0 Q0,-92 130,0 Q0,92 -130,0 Z', fill: '#fff', stroke: INK, 'stroke-width': 4 }, e);
    s('circle', { cx: 0, cy: 0, r: 46, fill: 'none', stroke: INK, 'stroke-width': 4 }, e);
    s('circle', { cx: 0, cy: 0, r: 19, fill: INK }, e);
    return e;
  }
  function flame(g, x, y, sc) {
    const f = s('g', { transform: `translate(${x},${y}) scale(${sc})` }, g);
    s('circle', { cx: 0, cy: -12, r: 52, fill: 'url(#glow)' }, f);
    s('path', { d: 'M0,-46 C16,-24 20,-8 12,6 C6,16 -6,16 -12,6 C-20,-8 -16,-24 0,-46 Z', fill: '#f6b443' }, f);
    s('path', { d: 'M0,-24 C7,-13 8,-4 4,3 C1,7 -2,7 -4,3 C-8,-4 -7,-13 0,-24 Z', fill: '#fff3d6' }, f);
    s('rect', { x: -11, y: 12, width: 22, height: 70, rx: 2, fill: '#fff', stroke: INK, 'stroke-width': 3 }, f);
    return f;
  }
  function svgBase(el) {
    const sv = s('svg', { viewBox: '0 0 1920 1080', style: 'direction:ltr' }, el);
    const defs = s('defs', {}, sv);
    const rg = s('radialGradient', { id: 'glow' }, defs);
    s('stop', { offset: '0%', 'stop-color': '#ffcf7a', 'stop-opacity': '.75' }, rg);
    s('stop', { offset: '100%', 'stop-color': '#ffcf7a', 'stop-opacity': '0' }, rg);
    return sv;
  }
  function line(g, x1, y1, x2, y2, st) { return s('line', Object.assign({ x1, y1, x2: x1, y2: y1, 'data-x2': x2, 'data-y2': y2, 'stroke-linecap': 'round' }, st), g); }
  function growLine(l, q) {
    const x1 = +l.getAttribute('x1'), y1 = +l.getAttribute('y1'), x2 = +l.getAttribute('data-x2'), y2 = +l.getAttribute('data-y2');
    l.setAttribute('x2', lerp(x1, x2, q)); l.setAttribute('y2', lerp(y1, y2, q)); l.setAttribute('opacity', q > 0 ? 1 : 0);
  }
  function dhead(el, txt, sub) { const d = h('div', 'dhd', el); return { a: maskLine(d, 'h', txt), b: sub ? maskLine(d, 's', sub) : null }; }
  const fadeG = (g, q) => g.setAttribute('opacity', q);

  R.diagram = {
    create(c) {
      const p = c.p, el = h('div', 'clip svgclip bg');
      const sv = svgBase(el); el._d = {}; const D = el._d;
      D.hd = dhead(el, p.h, p.sub);
      const g = s('g', {}, sv);
      if (p.kind === 'emission' || p.kind === 'intro') {
        D.eye = s('g', { opacity: 0 }, g); eyeShape(D.eye, 430, 610, 1.1);
        s('text', { x: 430, y: 770, 'text-anchor': 'middle', class: 'lblg', 'font-size': 32 }, D.eye, 'العين');
        D.obj = s('g', { opacity: 0 }, g);
        s('path', { d: 'M1270,490 L1410,490 L1400,530 C1460,570 1460,700 1400,730 L1280,730 C1220,700 1220,570 1280,530 Z', fill: '#fff', stroke: INK, 'stroke-width': 4 }, D.obj);
        s('text', { x: 1340, y: 800, 'text-anchor': 'middle', class: 'lblg', 'font-size': 32 }, D.obj, 'الجسم');
        D.rays = [];
        if (p.kind === 'emission') {
          for (let i = 0; i < 6; i++) D.rays.push(line(g, 565, 610, 1225, 500 + i * 44, { stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '2 14' }));
          D.x = s('g', { opacity: 0 }, g);
          s('path', { d: 'M800,440 L1000,780', stroke: RED, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, D.x);
          s('path', { d: 'M1000,440 L800,780', stroke: RED, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, D.x);
        } else {
          D.sun = s('g', { transform: 'translate(1660,420)', opacity: 0 }, g);
          s('circle', { cx: 0, cy: 0, r: 150, fill: 'url(#glow)' }, D.sun);
          s('circle', { cx: 0, cy: 0, r: 52, fill: '#fff', stroke: INK, 'stroke-width': 4 }, D.sun);
          for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; s('line', { x1: Math.cos(a) * 72, y1: Math.sin(a) * 72, x2: Math.cos(a) * 98, y2: Math.sin(a) * 98, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, D.sun); }
          D.in1 = []; D.in2 = [];
          for (let i = 0; i < 4; i++) D.in1.push(line(g, 1585, 440 + i * 16, 1300 + i * 36, 500, { stroke: '#e09a2a', 'stroke-width': 3.5 }));
          for (let i = 0; i < 6; i++) D.in2.push(line(g, 1235, 500 + i * 44, 565, 610, { stroke: RED, 'stroke-width': 3.5 }));
        }
      } else if (p.kind === 'radiate') {
        D.rays = [];
        D.c = s('g', { opacity: 0 }, g);
        s('circle', { cx: 1250, cy: 610, r: 110, fill: 'url(#glow)' }, D.c);
        s('circle', { cx: 1250, cy: 610, r: 14, fill: INK }, D.c);
        for (let i = 0; i < 32; i++) {
          const a = i / 32 * 6.283, L = 470, toEye = Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < .12;
          D.rays.push({ l: line(g, 1250, 610, 1250 + Math.cos(a) * L, 610 + Math.sin(a) * L, { stroke: toEye ? RED : 'rgba(20,20,20,.45)', 'stroke-width': toEye ? 4.5 : 2 }), i });
        }
        D.eye = s('g', { opacity: 0 }, g); eyeShape(D.eye, 560, 610, .85);
      } else if (p.kind === 'camera') {
        const G = s('g', { transform: 'translate(70,150) scale(.88)' }, g);
        D.room = s('g', { opacity: 0 }, G);
        s('rect', { x: 180, y: 190, width: 800, height: 760, fill: '#1c1b1a' }, D.room);
        s('rect', { x: 966, y: 190, width: 28, height: 336, fill: INK }, D.room);
        s('rect', { x: 966, y: 554, width: 28, height: 396, fill: INK }, D.room);
        s('text', { x: 580, y: 1015, 'text-anchor': 'middle', class: 'lblg', 'font-size': 32 }, D.room, 'الغرفة المظلمة');
        s('text', { x: 1020, y: 500, 'text-anchor': 'start', class: 'lblr', 'font-size': 32 }, D.room, 'الثقب');
        D.c = [340, 540, 740].map(y => {
          const yy = 540 + (540 - (y - 30)) * (980 - 180) / (1560 - 980);
          const ray1 = line(G, 1560, y - 30, 980, 540, { stroke: '#e09a2a', 'stroke-width': 4 });
          const ray2 = line(G, 980, 540, 190, yy, { stroke: '#ffcf7a', 'stroke-width': 4 });
          const spot = s('g', { opacity: 0 }, G);
          s('ellipse', { cx: 200, cy: yy, rx: 40, ry: 64, fill: 'url(#glow)' }, spot);
          s('ellipse', { cx: 194, cy: yy, rx: 8, ry: 24, fill: '#fff3d6' }, spot);
          const fl = flame(G, 1560, y - 10, 1.05); fl.setAttribute('opacity', 0);
          return { ray1, ray2, spot, fl };
        });
        D.lab = s('text', { x: 1700, y: 900, 'text-anchor': 'middle', class: 'lblg', 'font-size': 32, opacity: 0 }, G, 'الشموع');
        D.block = s('rect', { x: 1400, y: 0, width: 34, height: 150, fill: RED, opacity: 0 }, G);
      } else if (p.kind === 'method') {
        const xs = [1490, 1100, 710, 320];
        D.st = p.steps.map((t, i) => {
          const gg = s('g', { opacity: 0 }, g), hot = i === (p.hot ?? 2);
          s('rect', { x: xs[i] - 160, y: 480, width: 320, height: 140, fill: hot ? RED : '#fff', stroke: hot ? RED : INK, 'stroke-width': 3 }, gg);
          s('text', { x: xs[i], y: 568, 'text-anchor': 'middle', class: 'lbl', 'font-size': 50, style: hot ? 'fill:#fff' : '' }, gg, t);
          s('text', { x: xs[i], y: 450, 'text-anchor': 'middle', class: 'lblr', 'font-size': 32 }, gg, String(i + 1).padStart(2, '0'));
          let ar = null;
          if (i < 3) { ar = s('g', { opacity: 0 }, g); s('line', { x1: xs[i] - 172, y1: 550, x2: xs[i + 1] + 186, y2: 550, stroke: INK, 'stroke-width': 3 }, ar); s('path', { d: `M${xs[i + 1] + 172},550 l18,-11 l0,22 z`, fill: INK }, ar); }
          return { gg, ar };
        });
        D.loop = s('g', { opacity: 0 }, g);
        s('path', { d: 'M790,636 C790,750 630,750 630,636', fill: 'none', stroke: RED, 'stroke-width': 4, 'stroke-dasharray': '10 10' }, D.loop);
        s('path', { d: 'M790,630 l-12,22 l24,0 z', fill: RED }, D.loop);
        s('text', { x: 710, y: 800, 'text-anchor': 'middle', class: 'lblg', 'font-size': 32 }, D.loop, 'تُعاد مرّة بعد مرّة');
      } else if (p.kind === 'timeline') {
        const y0 = 600, xa = 1700, xb = 220, X = yr => lerp(xa, xb, (yr - p.from) / (p.to - p.from));
        D.axis = line(g, xa, y0, xb, y0, { stroke: INK, 'stroke-width': 3 });
        D.items = p.items.map((it, i) => {
          const gg = s('g', { opacity: 0 }, g), x = X(it.y), up = it.up ?? (i % 2 === 0);
          s('circle', { cx: x, cy: y0, r: 11, fill: it.red ? RED : INK, stroke: '#f7f6f2', 'stroke-width': 4 }, gg);
          s('line', { x1: x, y1: y0 + (up ? -18 : 18), x2: x, y2: up ? y0 - 80 : y0 + 80, stroke: GREY, 'stroke-width': 2 }, gg);
          s('text', { x, y: up ? y0 - 150 : y0 + 140, 'text-anchor': 'middle', class: it.red ? 'lblr' : 'lbl', 'font-size': 52 }, gg, it.yl || it.y);
          s('text', { x, y: up ? y0 - 100 : y0 + 190, 'text-anchor': 'middle', class: 'lblg', 'font-size': 30 }, gg, it.l);
          return { gg, it };
        });
        if (p.gap) {
          D.gap = s('g', { opacity: 0 }, g);
          const x1 = X(p.gap[0]), x2 = X(p.gap[1]);
          s('path', { d: `M${x1},${y0 + 46} L${x1},${y0 + 62} L${x2},${y0 + 62} L${x2},${y0 + 46}`, fill: 'none', stroke: RED, 'stroke-width': 3 }, D.gap);
          s('text', { x: (x1 + x2) / 2, y: y0 + 130, 'text-anchor': 'middle', class: 'lblr', 'font-size': 52 }, D.gap, p.gapl);
        }
      }
      return el;
    },
    update(el, c, lt, dur) {
      const p = c.p, D = el._d;
      el.style.opacity = fadeInOut(lt, dur, c.fi ?? .5, c.fo ?? .5);
      animMask(D.hd.a, lt, .25); if (D.hd.b) animMask(D.hd.b, lt, .45);
      if (p.kind === 'emission' || p.kind === 'intro') {
        fadeG(D.eye, outQuart(prog(lt, .5, .8))); fadeG(D.obj, outQuart(prog(lt, .7, .8)));
        if (p.kind === 'emission') {
          D.rays.forEach((l, i) => { growLine(l, inOutCubic(prog(lt, 1.2 + i * .1, 1.2))); l.setAttribute('stroke-dashoffset', -lt * 40); });
          if (p.tx != null) { const q = outQuart(prog(lt, p.tx, .6)); fadeG(D.x, q); D.rays.forEach(l => l.style.opacity = 1 - .75 * q); }
        } else {
          fadeG(D.sun, outQuart(prog(lt, .6, .8)));
          D.in1.forEach((l, i) => growLine(l, inOutCubic(prog(lt, 1.2 + i * .08, 1.0))));
          D.in2.forEach((l, i) => growLine(l, inOutCubic(prog(lt, (p.t2 ?? 2.2) + i * .08, 1.2))));
        }
      } else if (p.kind === 'radiate') {
        fadeG(D.c, outQuart(prog(lt, .4, .7))); fadeG(D.eye, outQuart(prog(lt, .6, .7)));
        D.rays.forEach(r => growLine(r.l, inOutCubic(prog(lt, .9 + (r.i % 8) * .06, 1.8))));
      } else if (p.kind === 'camera') {
        fadeG(D.room, outQuart(prog(lt, .4, .8))); fadeG(D.lab, outQuart(prog(lt, .9, .8)));
        D.c.forEach((C, i) => {
          const a = (p.tr ?? 1.2) + i * .45;
          const blocked = p.blk != null && i === 0 ? clamp(prog(lt, p.blk, .35) - prog(lt, p.unb ?? 1e9, .35)) : 0;
          fadeG(C.fl, outQuart(prog(lt, .6 + i * .12, .7)));
          growLine(C.ray1, inOutCubic(prog(lt, a, .8))); growLine(C.ray2, inOutCubic(prog(lt, a + .6, .9)));
          C.ray1.style.opacity = C.ray2.style.opacity = 1 - blocked;
          fadeG(C.spot, outQuart(prog(lt, a + 1.3, .5)) * (1 - blocked));
        });
        if (p.blk != null) {
          const qin = outExpo(prog(lt, p.blk - .45, .55)), qout = inOutCubic(prog(lt, p.unb ?? 1e9, .6));
          D.block.setAttribute('y', lerp(-200, 228, qin) - qout * 460);
          D.block.setAttribute('opacity', qin > 0 ? 1 : 0);
        }
      } else if (p.kind === 'method') {
        D.st.forEach((S, i) => {
          const q = outQuart(prog(lt, p.times[i], .7));
          fadeG(S.gg, q); S.gg.setAttribute('transform', `translate(0,${(1 - q) * 16})`);
          if (S.ar) fadeG(S.ar, outQuart(prog(lt, p.times[i + 1] - .25, .5)));
        });
        if (p.loop != null) fadeG(D.loop, outQuart(prog(lt, p.loop, .7)));
      } else if (p.kind === 'timeline') {
        growLine(D.axis, inOutCubic(prog(lt, .4, 1.6)));
        D.items.forEach((I, i) => { const q = outQuart(prog(lt, I.it.t ?? (1 + i * .6), .7)); fadeG(I.gg, q); I.gg.setAttribute('transform', `translate(0,${(1 - q) * 12})`); });
        if (D.gap) fadeG(D.gap, outQuart(prog(lt, p.gapt ?? 3, .7)));
      }
    }
  };

  // ---------- split screen ----------
  R.split = {
    create(c) {
      const el = h('div', 'clip'), p = c.p;
      el.style.background = '#f7f6f2';
      el._a = h('div', '', el); el._b = h('div', '', el);
      for (const [d, src, lab, right] of [[el._a, p.a, p.la, true], [el._b, p.b, p.lb, false]]) {
        Object.assign(d.style, { position: 'absolute', top: 0, width: '954px', height: '1080px', overflow: 'hidden', [right ? 'right' : 'left']: 0 });
        d._im = img(src, d); Object.assign(d._im.style, { width: '100%', height: '100%', objectFit: 'cover' });
        d._t = h('div', '', d);
        d._t.innerHTML = `<div style="width:8px;background:${right ? '#c8102e' : '#141414'}"></div><div style="background:#fff;color:#141414;font:700 52px/1 var(--sans);padding:16px 26px 20px">${lab}</div>`;
        Object.assign(d._t.style, { position: 'absolute', bottom: '90px', [right ? 'right' : 'left']: '70px', display: 'flex', direction: 'rtl', boxShadow: '0 12px 32px rgba(20,20,20,.14)' });
      }
      el._ln = h('div', '', el); Object.assign(el._ln.style, { position: 'absolute', left: '954px', top: 0, width: '12px', height: '1080px', background: '#f7f6f2', transformOrigin: '50% 0' });
      return el;
    },
    update(el, c, lt, dur) {
      el.style.opacity = fadeInOut(lt, dur, .5, .5);
      const qa = outExpo(prog(lt, .1, 1)), qb = outExpo(prog(lt, .45, 1));
      el._a.style.clipPath = `inset(0 0 0 ${(1 - qa) * 100}%)`; el._b.style.clipPath = `inset(0 ${(1 - qb) * 100}% 0 0)`;
      el._a._im.style.transform = `scale(${1.02 + .05 * lt / dur})`; el._b._im.style.transform = `scale(${1.07 - .05 * lt / dur})`;
      el._ln.style.transform = `scaleY(${inOutCubic(prog(lt, .2, .8))})`;
      el._a._t.style.opacity = outQuart(prog(lt, 1, .6)); el._b._t.style.opacity = outQuart(prog(lt, 1.3, .6));
    }
  };

  // ---------- subscribe reminder ----------
  R.subpill = {
    create(c) { const el = h('div', 'clip'), d = h('div', 'subpill', el); el._d = d; h('div', 'b', d, 'اشترك'); h('div', 'c', d, c.p.tx || 'قناة يونس'); return el; },
    update(el, c, lt, dur) {
      const q = outExpo(prog(lt, 0, .7)), qo = inCubic(prog(lt, dur - .4, .4));
      el._d.style.clipPath = `inset(0 0 0 ${(1 - q) * 100}%)`; el._d.style.opacity = 1 - qo;
      el._d.style.boxShadow = q > .6 ? '' : 'none';
    }
  };

  // ---------- end card ----------
  R.endcard = {
    create(c) {
      const el = h('div', 'clip endc bg');
      const lg = h('div', 'logo', el); el._lg = lg;
      lg.innerHTML = `<div class="row"><div class="mk"></div><div class="nm">يونس</div></div><div class="tag">${c.p.tag || 'وثائقيات تكشف ما وراء التاريخ'}</div>`;
      el._b = h('div', 'btn', el, 'اشترك في القناة');
      return el;
    },
    update(el, c, lt, dur) {
      el.style.opacity = fadeInOut(lt, dur, .7, 1);
      const q = outQuart(prog(lt, .4, 1)); el._lg.style.opacity = q; el._lg.style.transform = `translateY(${(1 - q) * 20}px)`;
      const qb = outQuart(prog(lt, 1.2, .8)); el._b.style.opacity = qb; el._b.style.transform = `translateX(-50%) translateY(${(1 - qb) * 16}px)`;
    }
  };

  // ---------- global overlays ----------
  const grain = h('div', '', stage); grain.id = 'grain';
  const GR = [...Array(8)].map((_, i) => { const im = new Image(); im.src = `tex/grain${i}.jpg`; pending.push(im.decode().catch(() => {})); return `url(tex/grain${i}.jpg)`; });
  const bug = h('div', '', stage); bug.id = 'bug';
  bug.innerHTML = '<div class="mk"></div><div class="nm">يونس</div>';
  function inRanges(t, rs) { for (const r of rs || []) if (t >= r[0] && t < r[1]) return Math.min(1, (t - r[0]) / .8, (r[1] - t) / .8); return 0; }
  function inAny(t, rs) { for (const r of rs || []) if (t >= r[0] && t < r[1]) return true; return false; }

  window.renderFrame = async function (t, frameIndex) {
    for (const c of clips) {
      const on = t >= c.s && t < c.e;
      let el = els.get(c.id);
      if (on) {
        if (!el) { el = R[c.type].create(c); el.style.zIndex = c.z || 1; stage.appendChild(el); els.set(c.id, el); }
        R[c.type].update(el, c, t - c.s, c.e - c.s, t);
      } else if (el) { el.remove(); els.delete(c.id); }
    }
    grain.style.backgroundImage = GR[frameIndex % 8];
    const r = rng(frameIndex + 17);
    grain.style.backgroundPosition = `${Math.floor(r() * 400)}px ${Math.floor(r() * 300)}px`;
    bug.style.opacity = inRanges(t, TL.bug);
    bug.classList.toggle('onphoto', inAny(t, TL.bugLight));
    if (pending.length) { const p = pending; pending = []; await Promise.all(p); }
    return true;
  };
  window.ENGINE_READY = (async () => {
    const specs = ['400 40px "IBM Plex Sans Arabic"', '500 40px "IBM Plex Sans Arabic"', '600 40px "IBM Plex Sans Arabic"', '700 40px "IBM Plex Sans Arabic"', '500 40px "Noto Naskh Arabic"', '700 40px "Noto Naskh Arabic"'];
    await Promise.all(specs.map(f => document.fonts.load(f, 'ابن الهيثم 0123456789 abc «»')));
    await document.fonts.ready;
    const p = pending; pending = []; await Promise.all(p);
    return true;
  })();
})();
