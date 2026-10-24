/* pruthvip.tech: progressive enhancements. The page is complete without JavaScript;
   everything here adds the Earth, the orbits, motion, play and conveniences on top. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const EMAIL = 'pruthvipanchal46@gmail.com';
  const RAD = Math.PI / 180;

  const onChange = (mq, fn) => (mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn));
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } };
  const recall = (key) => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const smooth = () => (reduceMotion.matches ? 'auto' : 'smooth');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* Theme: night by default, day one click away (remembered in this browser). ---- */

  const root = document.documentElement;
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const themeWatchers = []; // canvases redraw in the new colours
  const THEME_COLORS = { dark: '#04060D', light: '#F3F6FC' };
  const theme = () => (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  function syncTheme() {
    const t = theme();
    themeBtn?.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[t]);
    themeWatchers.forEach((fn) => fn());
  }

  function setTheme(t) {
    if (t === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    store('pu-theme', t);
    syncTheme();
  }

  /** Flips day and night. Where View Transitions exist, the new theme grows out of `origin`. */
  function toggleTheme(origin) {
    const next = theme() === 'light' ? 'dark' : 'light';
    if (!origin || !document.startViewTransition || reduceMotion.matches) { setTheme(next); return; }
    const r = origin.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => setTheme(next)).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 560, easing: 'cubic-bezier(.2, .7, .2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => {});
  }

  themeBtn?.addEventListener('click', () => toggleTheme(themeBtn));
  syncTheme();

  /* Header and mobile menu ------------------------------------------------ */

  const header = document.querySelector('[data-header]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('site-nav');
  const menuOpen = () => menuBtn?.getAttribute('aria-expanded') === 'true';

  function setMenu(open) {
    if (!header || !menuBtn) return;
    header.toggleAttribute('data-menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  menuBtn?.addEventListener('click', () => setMenu(!menuOpen()));
  nav?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => { if (menuOpen() && !header.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen()) { setMenu(false); menuBtn.focus(); }
  });

  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Current section in the nav ---------------------------------------------- */

  const navLinks = new Map();
  document.querySelectorAll('.nav a[href^="#"]').forEach((a) => navLinks.set(a.getAttribute('href').slice(1), a));

  if ('IntersectionObserver' in window && navLinks.size) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute('aria-current'));
        navLinks.get(entry.target.id)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', ...navLinks.keys()].forEach((id) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* Scroll reveal: only content that starts below the fold is ever hidden. */

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealer = new IntersectionObserver((entries) => {
      let n = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        revealer.unobserve(el);
        el.style.setProperty('--d', `${Math.min(n++, 5) * 90}ms`); // siblings that arrive together stagger
        el.classList.add('is-in');
        // Hand transitions back to the element's own styles (hover effects).
        const done = (e) => {
          if (e.target !== el || e.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', done);
          el.classList.remove('reveal', 'is-in');
          el.style.removeProperty('--d');
        };
        el.addEventListener('transitionend', done);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const fold = window.innerHeight;
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add('reveal');
      revealer.observe(el);
    });
  }

  /* The headline numbers count up once, when they come into view. */

  function initCounters() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length || reduceMotion.matches || !('IntersectionObserver' in window)) return;
    const counter = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        counter.unobserve(entry.target);
        const el = entry.target;
        const end = Number(el.dataset.count);
        const t0 = performance.now();
        const step = (now) => {
          const p = Math.min(1, (now - t0) / 1400);
          el.textContent = Math.round(end * (1 - (1 - p) ** 3)).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => { el.textContent = '0'; counter.observe(el); });
  }

  /** Briefly marks an element, e.g. after jumping to it. */
  function flash(el) {
    if (!el) return;
    el.classList.remove('is-entering');
    void el.offsetWidth; // restart the animation
    el.classList.add('is-entering');
  }

  /* Stars behind the page: drawn once, redrawn only when the window changes size. */

  function initStars() {
    const canvas = document.querySelector('[data-stars]');
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return;
    let size = '';

    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h || `${w}x${h}` === size) return;
      size = `${w}x${h}`;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let seed = 11;
      const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const count = Math.round((w * h) / 2200);
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 0.35 + rand() ** 7 * 1.6;
        const a = 0.2 + rand() * 0.6;
        const tint = rand();
        ctx.fillStyle = tint > 0.93 ? `rgba(255, 214, 170, ${a})` : tint > 0.72 ? `rgba(170, 205, 255, ${a})` : `rgba(236, 241, 255, ${a})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    draw();
    let timer = 0;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(draw, 150); });
  }

  /* The Earth ------------------------------------------------------------------
     Pruthvi (पृथ्वी) means Earth. The globe is ~5,800 land dots from Natural Earth's
     coastlines (assets/js/earth-data.js), lit by the real Sun: it is day or night
     on the dots exactly as it is outside right now. */

  const EARTH = (() => {
    const data = window.PU_EARTH;
    if (!data || typeof atob !== 'function') return null;
    const bits = atob(data.land);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const xs = [];
    const ys = [];
    const zs = [];
    for (let i = 0; i < data.n; i++) {
      if (!(bits.charCodeAt(i >> 3) & (1 << (i & 7)))) continue;
      const y = 1 - ((i + 0.5) * 2) / data.n; // the same sphere tools/build-earth.mjs used
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      xs.push(r * Math.cos(t));
      ys.push(y);
      zs.push(r * Math.sin(t));
    }
    const count = xs.length;
    const spread = new Float32Array(count); // how far each dot starts out, for the intro
    const delay = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      spread[i] = 0.5 + Math.random() * 1.8;
      delay[i] = Math.random() * 0.45;
    }
    return { x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), count, spread, delay };
  })();

  /** A place on Earth as a unit vector: x east (at 90°E), y north, z through 0°, 0°. */
  const toVec = (lat, lon) => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];

  /** Where the Sun is overhead right now, as a unit vector in the Earth's frame. */
  function sunVector(ms) {
    const wrap = (x) => ((x % 360) + 360) % 360;
    const n = ms / 86400000 + 2440587.5 - 2451545; // days since J2000
    const g = wrap(357.528 + 0.9856003 * n) * RAD;
    const lon = wrap(280.46 + 0.9856474 * n + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const e = (23.439 - 4e-7 * n) * RAD;
    const ra = Math.atan2(Math.cos(e) * Math.sin(lon), Math.cos(lon));
    const dec = Math.asin(Math.sin(e) * Math.sin(lon));
    const gmst = wrap(280.46061837 + 360.98564736629 * n) * RAD;
    const subLon = ra - gmst; // the longitude where it's noon
    return [Math.cos(dec) * Math.sin(subLon), Math.sin(dec), Math.cos(dec) * Math.cos(subLon)];
  }

  /* Canvas colours for each theme (CSS can't reach inside a canvas). Colours given as
     "r, g, b" get their alpha where they're used. */
  const PALETTES = {
    dark: {
      glow: '90, 169, 255', ocean: ['#11305e', '#0a1d3d', '#06132b'], rim: 'rgba(150, 205, 255, .3)',
      night: [48, 86, 152], day: [176, 220, 255],
      orbit: 'rgba(160, 190, 255, .16)', accent: '255, 181, 71', arcHead: '255, 225, 170', arcDot: '#ffe6b8',
      city: '255, 190, 110', tag: 'rgba(8, 12, 26, .88)', tagText: '#eef2ff', blend: 'lighter',
      star: ['200, 228, 255', 'rgba(225, 240, 255, .75)', null], speck: '#ffffff',
      ring: 'rgba(255, 225, 175, .95)', host: 'rgba(140, 170, 255, .1)', jet: '150, 235, 255', core: '190, 240, 255',
    },
    light: {
      glow: '70, 130, 245', ocean: ['#f6f9ff', '#dfeaff', '#c8dbfb'], rim: 'rgba(40, 100, 220, .35)',
      night: [128, 154, 206], day: [20, 84, 200],
      orbit: 'rgba(50, 80, 150, .24)', accent: '212, 118, 8', arcHead: '235, 135, 10', arcDot: '#d97706',
      city: '225, 130, 15', tag: 'rgba(255, 255, 255, .96)', tagText: '#0b1530', blend: 'source-over',
      star: ['80, 140, 255', 'rgba(40, 90, 200, .6)', 'rgba(40, 90, 200, .8)'], speck: '#3b3f8a',
      ring: 'rgba(200, 110, 20, .9)', host: 'rgba(60, 90, 200, .08)', jet: '20, 140, 210', core: '60, 170, 240',
    },
  };
  const palette = () => PALETTES[theme()];

  const LEVELS = 10;
  /** Soft round dots in ten brightnesses, from the night side's colour to daylight. */
  function dotSprites(pal) {
    const { night, day } = pal;
    return Array.from({ length: LEVELS }, (_, k) => {
      const c = night.map((v, i) => Math.round(v + ((day[i] - v) * k) / (LEVELS - 1)));
      const s = document.createElement('canvas');
      s.width = 24;
      s.height = 24;
      const g = s.getContext('2d');
      const grad = g.createRadialGradient(12, 12, 0, 12, 12, 12);
      grad.addColorStop(0, `rgba(${c}, 1)`);
      grad.addColorStop(0.45, `rgba(${c}, .95)`);
      grad.addColorStop(1, `rgba(${c}, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, 24, 24);
      return s;
    });
  }

  /** The view's rotation: the place at (lat, lon) in radians faces the viewer. */
  const viewOf = (lat, lon) => ({ cl: Math.cos(lon), sl: Math.sin(lon), cp: Math.cos(lat), sp: Math.sin(lat) });

  /** Projects a vector on (or above) the globe: [x, y, depth], where depth > 0 faces the viewer. */
  function project(v, view, cx, cy, R) {
    const x1 = v[0] * view.cl - v[2] * view.sl;
    const z1 = v[0] * view.sl + v[2] * view.cl;
    return [cx + R * x1, cy - R * (v[1] * view.cp - z1 * view.sp), v[1] * view.sp + z1 * view.cp];
  }

  function drawEarth(ctx, sprites, o) {
    const { cx, cy, R, view, sun, dot, intro = 1, stride = 1 } = o;
    const pal = palette();
    const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.32);
    glow.addColorStop(0, `rgba(${pal.glow}, .36)`);
    glow.addColorStop(0.3, `rgba(${pal.glow}, .12)`);
    glow.addColorStop(1, `rgba(${pal.glow}, 0)`);
    ctx.globalAlpha = intro;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.32, 0, 2 * Math.PI);
    ctx.fill();
    const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    ocean.addColorStop(0, pal.ocean[0]);
    ocean.addColorStop(0.7, pal.ocean[1]);
    ocean.addColorStop(1, pal.ocean[2]);
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;

    const E = EARTH;
    for (let i = 0; i < E.count; i += stride) {
      const x = E.x[i];
      const y = E.y[i];
      const z = E.z[i];
      const x1 = x * view.cl - z * view.sl;
      const z1 = x * view.sl + z * view.cl;
      const z2 = y * view.sp + z1 * view.cp;
      if (z2 <= 0.02) continue;
      let light = 1;
      if (sun) {
        const d = x * sun[0] + y * sun[1] + z * sun[2];
        light = d > 0.18 ? 1 : d < -0.18 ? 0 : (d + 0.18) / 0.36;
      }
      const b = (0.36 + 0.64 * light) * (0.5 + 0.5 * z2);
      let size = dot * (0.6 + 0.4 * z2);
      let px = cx + R * x1;
      let py = cy - R * (y * view.cp - z1 * view.sp);
      if (intro < 1) {
        const t = clamp((intro - E.delay[i]) / 0.55, 0, 1);
        if (t <= 0) continue;
        const k = E.spread[i] * (1 - t) ** 3;
        px = cx + (px - cx) * (1 + k);
        py = cy + (py - cy) * (1 + k);
        size *= t;
      }
      ctx.drawImage(sprites[Math.min(LEVELS - 1, (b * LEVELS) | 0)], px - size / 2, py - size / 2, size, size);
    }

    ctx.globalAlpha = intro;
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawMoonBall(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#f2f4f8');
    g.addColorStop(0.55, '#aeb4c2');
    g.addColorStop(1, '#3b4150');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(66, 72, 88, .35)';
    [[0.25, -0.15, 0.22], [-0.3, 0.22, 0.16], [0.05, 0.45, 0.12], [-0.12, -0.42, 0.1]].forEach(([dx, dy, s]) => {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, s * r, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  /* Hero: the Earth you can spin, with Gandhinagar lit up, live prices arcing out from GIFT City,
     and the Moon in orbit. */

  function initHeroEarth(universe) {
    const stage = document.querySelector('[data-earth-stage]');
    const canvas = stage?.querySelector('[data-earth]');
    const ctx = canvas?.getContext?.('2d');
    if (!ctx || !EARTH) return null;

    const pin = stage.querySelector('[data-pin]');
    const tip = stage.querySelector('[data-pin-tip]');
    let sprites = dotSprites(palette());
    const HOME = toVec(23.2156, 72.6369); // Gandhinagar
    // Cities across India that the arcs land on (an illustration of prices streaming out to users).
    const CITIES = [
      [19.08, 72.88], [28.61, 77.21], [12.97, 77.59], [22.57, 88.36], [13.08, 80.27], [17.39, 78.49],
      [18.52, 73.86], [26.91, 75.79], [26.85, 80.95], [22.72, 75.86], [21.17, 72.83], [9.93, 76.27],
      [26.14, 91.74], [30.73, 76.78], [20.3, 85.82], [21.15, 79.09], [25.32, 82.97], [15.5, 73.83],
    ].map(([lat, lon]) => toVec(lat, lon));
    const BASE_LAT = 17 * RAD;
    const SPIN = -0.045; // radians a second: the surface drifts west to east, like the real thing

    function arcPoints(a, b, steps = 36) {
      const ang = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
      const s = Math.sin(ang) || 1;
      const lift = 0.05 + ang * 0.5;
      const pts = [];
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const f1 = Math.sin((1 - t) * ang) / s;
        const f2 = Math.sin(t * ang) / s;
        const h = 1 + lift * Math.sin(Math.PI * t);
        pts.push([(a[0] * f1 + b[0] * f2) * h, (a[1] * f1 + b[1] * f2) * h, (a[2] * f1 + b[2] * f2) * h]);
      }
      return pts;
    }
    const ARCS = CITIES.map((c) => arcPoints(HOME, c));

    const state = { lat: BASE_LAT, lon: 76 * RAD, vel: SPIN };
    let w = 0;
    let h = 0;
    let dpr = 1;
    let R = 1;
    let cx = 0;
    let cy = 0;
    let dot = 3;
    let stride = 1;
    let arcs = [];
    let nextArc = 0;
    let moonAngle = 2.2;
    const moon = { x: -99, y: -99, r: 0 };
    let hoverMoon = false;
    let introStart = performance.now(); // the dots gather into the globe once, as the page opens
    let last = 0;
    let raf = 0;
    let running = false;
    let onScreen = false;
    let dragging = false;
    let sun = sunVector(Date.now());
    let sunAt = Date.now();
    let stageLeft = 0; // layout numbers the pin needs, measured on resize rather than every frame
    let pinWidth = 0;
    let pageWidth = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      stageLeft = stage.getBoundingClientRect().left;
      pinWidth = pin.offsetWidth;
      pageWidth = document.documentElement.clientWidth;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      R = Math.min(h * 0.38, w * 0.32);
      cx = w / 2;
      cy = h * 0.46;
      dot = clamp(R * 0.017, 2.2, 5.6);
      stride = R < 170 ? 2 : 1;
    }

    function drawOrbit(front) {
      ctx.strokeStyle = palette().orbit;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.5, R * 0.34, -0.22, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function placeMoon() {
      const a = R * 1.5;
      const b = R * 0.34;
      const ex = a * Math.cos(moonAngle);
      const ey = b * Math.sin(moonAngle);
      const tilt = -0.22;
      moon.x = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      moon.y = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      moon.r = R * 0.075 * (1 + 0.14 * Math.sin(moonAngle));
      moon.front = Math.sin(moonAngle) > 0;
    }

    function drawMoonLabel() {
      const text = 'The Moon · see Moonsplit →';
      ctx.font = '600 12px Archivo, sans-serif';
      const tw = ctx.measureText(text).width;
      const bx = clamp(moon.x - tw / 2 - 10, 4, w - tw - 24);
      const by = moon.y - moon.r - 34;
      const pal = palette();
      ctx.fillStyle = pal.tag;
      ctx.strokeStyle = `rgba(${pal.accent}, .6)`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, tw + 20, 24, 12); else ctx.rect(bx, by, tw + 20, 24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pal.tagText;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 10, by + 12.5);
    }

    function drawCities(view, intro) {
      if (intro < 1) return;
      const { city } = palette();
      CITIES.forEach((c) => {
        const d = c[0] * sun[0] + c[1] * sun[1] + c[2] * sun[2];
        if (d > 0.05) return; // city lights only show at night
        const [x, y, z] = project(c, view, cx, cy, R);
        if (z < 0.1) return;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 5);
        glow.addColorStop(0, `rgba(${city}, .9)`);
        glow.addColorStop(1, `rgba(${city}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    function drawArcs(view, now) {
      const DUR = 1500;
      const FADE = 700;
      arcs = arcs.filter((a) => now - a.born < DUR + FADE);
      ctx.lineCap = 'round';
      const { accent, arcHead, arcDot } = palette();
      arcs.forEach((a) => {
        const age = (now - a.born) / DUR;
        const pts = ARCS[a.to].map((p) => project(p, view, cx, cy, R));
        const n = pts.length - 1;
        const fade = age > 1 ? 1 - (age - 1) / (FADE / DUR) : 1;
        const head = Math.min(1, age);
        ctx.strokeStyle = `rgba(${accent}, ${0.28 * fade})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let pen = false;
        for (let k = 0; k <= head * n; k++) {
          const p = pts[k];
          if (p[2] < -0.04) { pen = false; continue; }
          if (pen) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
          pen = true;
        }
        ctx.stroke();
        if (age < 1) {
          const k1 = Math.max(0, Math.floor((head - 0.25) * n));
          const k2 = Math.floor(head * n);
          const p1 = pts[k1];
          const p2 = pts[k2];
          if (p2[2] > -0.04 && k2 > k1) {
            const grad = ctx.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
            grad.addColorStop(0, `rgba(${accent}, 0)`);
            grad.addColorStop(1, `rgba(${arcHead}, .95)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p1[0], p1[1]);
            for (let k = k1 + 1; k <= k2; k++) ctx.lineTo(pts[k][0], pts[k][1]);
            ctx.stroke();
            ctx.fillStyle = arcDot;
            ctx.beginPath();
            ctx.arc(p2[0], p2[1], 1.9, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else {
          const p = pts[n];
          if (p[2] > 0) {
            const t = (age - 1) / (FADE / DUR);
            ctx.strokeStyle = `rgba(${accent}, ${0.85 * (1 - t)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(p[0], p[1], 2 + 9 * t, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      });
    }

    let tipOpen = false;
    function placePin(view, intro) {
      const [x, y, z] = project(HOME, view, cx, cy, R);
      const show = z > 0.12 && intro >= 1;
      pin.style.opacity = show ? String(clamp((z - 0.12) * 5, 0, 1)) : '0';
      pin.style.visibility = show ? 'visible' : 'hidden';
      // Near the right edge the label swaps to the left of the dot, so it never runs off the page.
      const room = stageLeft + x + pinWidth < pageWidth - 8;
      pin.classList.toggle('is-flip', !room);
      pin.style.transform = `translate(${(room ? x : x - pinWidth + 18).toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (!show && tipOpen) setTip(false);
      if (tipOpen) tip.style.transform = `translate(${clamp(x - 30, 8, w - tip.offsetWidth - 8).toFixed(1)}px, ${(y + 24).toFixed(1)}px)`;
    }
    function setTip(open) {
      tipOpen = open;
      tip.hidden = !open;
      pin.setAttribute('aria-expanded', String(open));
      if (!running) draw(performance.now());
    }

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (Date.now() - sunAt > 60000) { sun = sunVector(Date.now()); sunAt = Date.now(); }
      const intro = reduceMotion.matches ? 1 : clamp((now - introStart) / 1900, 0, 1);
      const view = viewOf(state.lat, state.lon);
      placeMoon();
      ctx.globalAlpha = intro;
      drawOrbit(false);
      if (!moon.front) drawMoonBall(ctx, moon.x, moon.y, moon.r);
      ctx.globalAlpha = 1;
      drawEarth(ctx, sprites, { cx, cy, R, view, sun, dot, intro, stride });
      drawCities(view, intro);
      drawArcs(view, now);
      ctx.globalAlpha = intro;
      drawOrbit(true);
      if (moon.front) drawMoonBall(ctx, moon.x, moon.y, moon.r);
      ctx.globalAlpha = 1;
      if (hoverMoon) drawMoonLabel();
      placePin(view, intro);
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) {
        state.vel += (SPIN - state.vel) * Math.min(1, dt * 2.2); // settle back to the idle spin
        state.lon += state.vel * dt;
        state.lat += (BASE_LAT - state.lat) * Math.min(1, dt * 0.8);
      }
      moonAngle += dt * 0.14;
      // Launch a new arc now and then while Gandhinagar faces the viewer.
      if (now > nextArc && now - introStart > 1900) {
        nextArc = now + 260 + Math.random() * 420;
        if (project(HOME, viewOf(state.lat, state.lon), 0, 0, 1)[2] > 0.2 && arcs.length < 14) {
          arcs.push({ to: Math.floor(Math.random() * ARCS.length), born: now });
        }
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion.matches || !onScreen || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    /* Drag to spin (sideways on touch screens, so the page still scrolls), click the Moon. */

    let drag = null;
    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const overMoon = (x, y) => Math.hypot(x - moon.x, y - moon.y) < moon.r * 2 + 8
      && (moon.front || Math.hypot(moon.x - cx, moon.y - cy) > R + moon.r); // not while it's behind the Earth

    function goToMoonsplit() {
      universe?.select('moonsplit');
      document.getElementById('universe')?.scrollIntoView({ behavior: smooth(), block: 'start' });
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const now = performance.now();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lon: state.lon, lat: state.lat, moved: false, lastX: e.clientX, lastT: now, v: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) {
        if (e.pointerType !== 'mouse') return;
        const was = hoverMoon;
        hoverMoon = overMoon(...local(e));
        canvas.classList.toggle('is-over-moon', hoverMoon);
        if (was !== hoverMoon && !running) draw(performance.now());
        return;
      }
      if (e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) {
        drag.moved = true;
        dragging = true;
        canvas.classList.add('is-dragging');
        if (tipOpen) setTip(false);
      }
      if (!drag.moved) return;
      state.lon = drag.lon - dx / R;
      state.lat = clamp(drag.lat + dy / R, -1.2, 1.2);
      const now = performance.now();
      drag.v = (-(e.clientX - drag.lastX) / R) / Math.max(0.008, (now - drag.lastT) / 1000);
      drag.lastX = e.clientX;
      drag.lastT = now;
      if (!running) draw(now);
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {
        state.vel = performance.now() - drag.lastT < 80 ? clamp(drag.v, -3, 3) : SPIN; // a flick keeps it turning
      } else if (e.type === 'pointerup' && overMoon(...local(e))) {
        goToMoonsplit();
      }
      drag = null;
      dragging = false;
      canvas.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', () => {
      if (!hoverMoon) return;
      hoverMoon = false;
      canvas.classList.remove('is-over-moon');
      if (!running) draw(performance.now());
    });

    // The Gandhinagar pin explains itself on hover, focus or tap.
    pin.hidden = false;
    pin.setAttribute('aria-expanded', 'false');
    pin.addEventListener('click', () => setTip(finePointer.matches || !tipOpen)); // hover already opened it on desktop
    pin.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setTip(true); });
    pin.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') setTip(false); });
    pin.addEventListener('blur', () => setTip(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tipOpen) setTip(false); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) start(); else stop();
      }).observe(stage);
    } else {
      onScreen = true;
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    onChange(reduceMotion, () => { if (reduceMotion.matches) { stop(); arcs = []; draw(performance.now()); } else start(); });
    const relayout = () => { resize(); if (!running) draw(performance.now()); };
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(canvas); else window.addEventListener('resize', relayout);
    document.fonts?.ready.then(relayout);
    themeWatchers.push(() => { sprites = dotSprites(palette()); draw(performance.now()); });

    resize();
    draw(performance.now());
    start();

    return {
      /** Gives the globe a good spin, for the palette. */
      spin() {
        window.scrollTo({ top: 0, behavior: smooth() });
        state.vel = -5;
        if (reduceMotion.matches) { state.lon -= 1.5; draw(performance.now()); }
      },
    };
  }

  /* Pruthvi's Universe: the side projects orbit the Earth. Pick one on the orbit or in the tabs. */

  function initUniverse() {
    const tabs = [...document.querySelectorAll('[data-tab]')];
    const panels = tabs.map((t) => document.getElementById(t.dataset.tab));
    if (!tabs.length || panels.some((p) => !p)) return null;
    const stage = document.querySelector('[data-orbit-stage]');
    const canvas = stage?.querySelector('[data-orbit]');
    const ctx = canvas?.getContext?.('2d');
    const labelLayer = stage?.querySelector('[data-orbit-labels]');
    const labels = [];
    let current = 0;
    let draw = () => {};

    function select(which, { focus = false } = {}) {
      const i = typeof which === 'number' ? which : panels.findIndex((p) => p.id === which);
      if (i < 0) return;
      const changed = i !== current;
      current = i;
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', String(j === i));
        t.tabIndex = j === i ? 0 : -1;
      });
      panels.forEach((p, j) => { p.hidden = j !== i; });
      labels.forEach((l, j) => l.setAttribute('aria-pressed', String(j === i)));
      if (changed) flash(panels[i]);
      // On narrow screens the tab row scrolls sideways: bring the chosen tab to the middle.
      const list = tabs[i].parentElement;
      if (list.scrollWidth > list.clientWidth) {
        const lr = list.getBoundingClientRect();
        const tr = tabs[i].getBoundingClientRect();
        list.scrollBy({ left: tr.left - lr.left - (lr.width - tr.width) / 2, behavior: smooth() });
      }
      if (focus) tabs[i].focus({ preventScroll: true });
      draw();
    }

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const n = tabs.length;
        const moves = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
        if (!(e.key in moves)) return;
        e.preventDefault();
        select(moves[e.key], { focus: true });
      });
    });
    select(0);

    if (!ctx || !EARTH) return { select };

    let sprites = dotSprites(palette());
    const KINDS = panels.map((p) => p.dataset.body); // moon, star, nebula, hole, quasar
    const ORBITS = [0.36, 0.52, 0.67, 0.82, 0.96]; // share of the stage's half-width
    const SPEED = [0.3, 0.22, 0.17, 0.13, 0.1]; // radians a second
    const angles = [0.4, 2.6, 4.1, 5.5, 1.5];
    const TILT = -0.16;
    const FRONT = 0.8; // the chosen project glides round to the front, just right of the Earth
    const bodies = KINDS.map(() => ({ x: 0, y: 0, r: 0, front: true }));
    let w = 0;
    let h = 0;
    let dpr = 1;
    let pace = 1;
    let earthLon = 60 * RAD;
    let raf = 0;
    let running = false;
    let onScreen = false;
    let last = 0;
    const sun = sunVector(Date.now());

    tabs.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'orbit-label';
      b.textContent = t.textContent.trim();
      b.tabIndex = -1; // the tabs are the keyboard route; these are for pointers
      b.setAttribute('aria-hidden', 'true');
      b.setAttribute('aria-pressed', String(i === current));
      b.addEventListener('click', () => select(i));
      labelLayer.append(b);
      labels.push(b);
    });

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    function drawStar(x, y, r, t) {
      const pal = palette();
      const [glow, spike, edge] = pal.star;
      ctx.globalCompositeOperation = pal.blend;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, `rgba(${glow}, .7)`);
      g.addColorStop(1, `rgba(${glow}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, 2 * Math.PI);
      ctx.fill();
      const len = r * (4 + 0.4 * Math.sin(t * 2));
      ctx.strokeStyle = spike;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
      ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, 0, 2 * Math.PI);
      ctx.fill();
      if (edge) { ctx.strokeStyle = edge; ctx.stroke(); }
    }

    function drawNebula(x, y, r, t) {
      const pal = palette();
      ctx.globalCompositeOperation = pal.blend;
      [[-0.45, -0.2, 1.6, '255, 120, 200'], [0.5, 0.1, 1.4, '140, 110, 255'], [0, 0.4, 1.25, '90, 220, 230'], [0.1, -0.4, 1.05, '255, 170, 120']].forEach(([dx, dy, s, c], k) => {
        const a = t * 0.3 + k;
        const px = x + (dx * Math.cos(a * 0.2) - dy * Math.sin(a * 0.2)) * r;
        const py = y + (dx * Math.sin(a * 0.2) + dy * Math.cos(a * 0.2)) * r;
        const g = ctx.createRadialGradient(px, py, 0, px, py, s * r * 1.6);
        g.addColorStop(0, `rgba(${c}, .55)`);
        g.addColorStop(1, `rgba(${c}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, s * r * 1.6, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = pal.speck;
      [[0.2, -0.1], [-0.35, 0.25], [0.45, 0.35], [-0.1, -0.45]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, 0.9, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    function drawHole(x, y, r) {
      const pal = palette();
      ctx.globalCompositeOperation = pal.blend;
      const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3.2);
      g.addColorStop(0, 'rgba(255, 150, 60, .45)');
      g.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const disk = (from, to, alpha) => {
        ctx.strokeStyle = `rgba(255, 170, 80, ${alpha})`;
        ctx.lineWidth = r * 0.55;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 2.3, r * 0.7, -0.25, from, to);
        ctx.stroke();
      };
      disk(Math.PI, 2 * Math.PI, 0.75);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = pal.ring;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.06, 0, 2 * Math.PI);
      ctx.stroke();
      disk(0, Math.PI, 0.95);
    }

    function drawQuasar(x, y, r) {
      const pal = palette();
      ctx.globalCompositeOperation = pal.blend;
      ctx.fillStyle = pal.host;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 2.8, r * 1.3, 0.35, 0, 2 * Math.PI);
      ctx.fill();
      const jet = (dir) => {
        const ex = x + Math.cos(-1.15) * r * 4.6 * dir;
        const ey = y + Math.sin(-1.15) * r * 4.6 * dir;
        const g = ctx.createLinearGradient(x, y, ex, ey);
        g.addColorStop(0, `rgba(${pal.jet}, .9)`);
        g.addColorStop(1, `rgba(${pal.jet}, 0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = r * 0.35;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      };
      jet(1);
      jet(-1);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
      g.addColorStop(0, `rgba(${pal.core}, .8)`);
      g.addColorStop(1, `rgba(${pal.core}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, 2 * Math.PI);
      ctx.fill();
      if (pal.star[2]) { ctx.strokeStyle = pal.star[2]; ctx.lineWidth = 1; ctx.stroke(); }
    }

    const DRAW = {
      moon: (x, y, r) => drawMoonBall(ctx, x, y, r * 0.95),
      star: drawStar,
      nebula: drawNebula,
      hole: drawHole,
      quasar: drawQuasar,
    };

    draw = (now = performance.now()) => {
      if (!w) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      const cx = w / 2;
      const cy = h / 2;
      const Rx = w * 0.47;
      const squash = w < 560 ? 0.42 : 0.36;
      const eR = Math.min(w, h) * 0.115;
      const base = Math.min(w, h) * 0.022;

      bodies.forEach((b, i) => {
        const rx = Rx * ORBITS[i];
        const ry = rx * squash;
        const a = angles[i];
        const ex = rx * Math.cos(a);
        const ey = ry * Math.sin(a);
        b.x = cx + ex * Math.cos(TILT) - ey * Math.sin(TILT);
        b.y = cy + ex * Math.sin(TILT) + ey * Math.cos(TILT);
        b.front = Math.sin(a) > 0;
        b.r = base * (0.82 + 0.18 * Math.sin(a)) * (i === current ? 1.25 : 1);
        b.rx = rx;
        b.ry = ry;
      });

      const pal = palette();
      const orbit = (i, front) => {
        const b = bodies[i];
        ctx.strokeStyle = i === current ? `rgba(${pal.accent}, .5)` : pal.orbit;
        ctx.lineWidth = i === current ? 1.4 : 1;
        ctx.setLineDash(i === current ? [] : [3, 5]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, b.rx, b.ry, TILT, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      const body = (i) => {
        const b = bodies[i];
        ctx.globalAlpha = b.front ? 1 : 0.75;
        DRAW[KINDS[i]](b.x, b.y, b.r, t);
        ctx.globalAlpha = 1;
        if (i === current) {
          ctx.strokeStyle = `rgba(${pal.accent}, .9)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 2.3, 0, 2 * Math.PI);
          ctx.stroke();
          const p = (t % 2) / 2;
          ctx.strokeStyle = `rgba(${pal.accent}, ${0.6 * (1 - p)})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * (2.3 + 1.6 * p), 0, 2 * Math.PI);
          ctx.stroke();
        }
      };

      const order = bodies.map((_, i) => i).sort((a, b) => bodies[a].y - bodies[b].y);
      bodies.forEach((_, i) => orbit(i, false));
      order.filter((i) => !bodies[i].front).forEach(body);
      drawEarth(ctx, sprites, { cx, cy, R: eR, view: viewOf(12 * RAD, earthLon), sun, dot: clamp(eR * 0.05, 1.6, 3.4), stride: 3 });
      bodies.forEach((_, i) => orbit(i, true));
      order.filter((i) => bodies[i].front).forEach(body);

      labels.forEach((l, i) => {
        const b = bodies[i];
        const top = b.y + b.r * 2.4 + 6;
        // A world passing behind the Earth hides its label too.
        const hidden = !b.front && Math.abs(b.x - cx) < eR * 1.5 && top < cy + eR * 1.2;
        l.style.left = `${b.x.toFixed(1)}px`;
        l.style.top = `${top.toFixed(1)}px`;
        l.style.opacity = hidden ? '0' : b.front || i === current ? '1' : '.7';
        l.style.visibility = hidden ? 'hidden' : 'visible';
        l.style.zIndex = b.front ? '2' : '1';
      });
    };

    function frame(now) {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      angles.forEach((a, i) => {
        if (i === current) {
          // Ease the chosen project round to the front of its orbit.
          let d = ((FRONT - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
          angles[i] = a + d * Math.min(1, dt * 2.2);
        } else {
          angles[i] = (a + SPEED[i] * pace * dt) % (2 * Math.PI);
        }
      });
      earthLon -= 0.12 * dt;
      draw(now);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion.matches || !onScreen || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // Clicking near a world picks it; hovering slows the orbits down so they're easy to catch.
    const nearest = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      let best = -1;
      let dist = Infinity;
      bodies.forEach((b, i) => {
        const d = Math.hypot(x - b.x, y - b.y);
        if (d < Math.max(22, b.r * 3) && d < dist) { dist = d; best = i; }
      });
      return best;
    };
    canvas.addEventListener('click', (e) => { const i = nearest(e); if (i >= 0) select(i); });
    canvas.addEventListener('pointermove', (e) => { canvas.style.cursor = nearest(e) >= 0 ? 'pointer' : ''; });
    stage.addEventListener('pointerenter', () => { pace = 0.25; });
    stage.addEventListener('pointerleave', () => { pace = 1; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) start(); else stop();
      }).observe(stage);
    } else {
      onScreen = true;
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    onChange(reduceMotion, () => (reduceMotion.matches ? stop() : start()));
    const relayout = () => { resize(); draw(); };
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(canvas); else window.addEventListener('resize', relayout);
    themeWatchers.push(() => { sprites = dotSprites(palette()); draw(); });

    if (reduceMotion.matches) angles[current] = FRONT;
    resize();
    draw();
    start();
    return {
      select(which) {
        select(which);
        if (reduceMotion.matches) { angles[current] = FRONT; draw(); }
      },
    };
  }

  /* Local time in Gandhinagar ---------------------------------------------- */

  const clockEl = document.querySelector('[data-clock]');
  if (clockEl && window.Intl) {
    const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
    const tick = () => { clockEl.textContent = `It's ${fmt.format(new Date())} here in Gandhinagar right now.`; };
    tick();
    setInterval(tick, 15000);
  }

  /* Copy email ------------------------------------------------------------- */

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  const copyStatus = document.querySelector('[data-copy-status]');
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    let timer;
    btn.addEventListener('click', async () => {
      const ok = await copyText(btn.getAttribute('data-copy'));
      btn.textContent = ok ? 'Copied' : 'Copy failed';
      if (copyStatus) copyStatus.textContent = ok ? 'Email address copied to clipboard' : 'Could not copy the email address';
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.textContent = 'Copy';
        if (copyStatus) copyStatus.textContent = '';
      }, 2000);
    });
  });

  /* Footer: year and measured page load time --------------------------------- */

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  const loadEl = document.querySelector('[data-loadtime]');
  if (loadEl && window.performance && performance.getEntriesByType) {
    window.addEventListener('load', () => setTimeout(() => {
      const entry = performance.getEntriesByType('navigation')[0];
      const ms = entry ? entry.loadEventEnd || entry.domContentLoadedEventEnd : 0;
      if (!ms) return;
      loadEl.textContent = `, loaded in ${ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`}`;
    }, 0));
  }

  /* See how it works: packets move between services over the bus. Visitors can switch a
     service off: messages for it wait in JetStream and catch up when it's back. */

  function initTopology() {
    const svg = document.querySelector('.topo-svg');
    const layer = svg?.querySelector('.t-packets');
    const figure = svg?.closest('.topo');
    if (!svg || !layer || !figure) return null;

    const NS = 'http://www.w3.org/2000/svg';
    const LANE = 193;
    const SPEED = 0.14; // viewBox units per millisecond

    // Consumers have a `door` (where the bus meets them) and a spot for their queue badge.
    const INFO = {
      md: { name: 'market-data', what: 'Takes in live prices from the exchange.', stops: 'no new prices' },
      bc: { name: 'broadcast', what: 'Streams live prices to 10,000+ connections per server, in under a millisecond.', door: [210, 114], badge: [210, 137], kind: 'md' },
      or: { name: 'orders', what: 'Handles orders in 250µs on average, 1,250+ a second.', stops: 'no new orders' },
      pay: { name: 'payments', what: 'Three payment gateways (ATOM, Razorpay, HDFC UPI) behind one interface.', stops: 'no new payments' },
      nt: { name: 'notify', what: 'Turns orders and payments into alerts for users.', door: [210, 252], badge: [210, 229], kind: 'ev' },
      sr: { name: 'search', what: 'Search, made 40% faster with Redis tuning.', door: [350, 252], badge: [350, 229], kind: 'md' },
    };
    const isConsumer = (id) => Boolean(INFO[id].door);

    const nodes = {};
    svg.querySelectorAll('[data-node]').forEach((g) => { nodes[g.getAttribute('data-node')] = g; });

    const route = (...points) => {
      const segs = [];
      let total = 0;
      for (let i = 1; i < points.length; i++) {
        const [x1, y1] = points[i - 1];
        const [x2, y2] = points[i];
        const len = Math.hypot(x2 - x1, y2 - y1);
        segs.push({ x1, y1, x2, y2, len, start: total });
        total += len;
      }
      return { segs, total };
    };

    const PATHS = {
      feed: [[70, 36], [70, 64]],
      mdToBroadcast: [[70, 114], [70, LANE], [210, LANE], [210, 114]],
      mdToSearch: [[70, 114], [70, LANE], [350, LANE], [350, 252]],
      order: [[350, 36], [350, 64]],
      orderToNotify: [[350, 114], [350, LANE], [210, LANE], [210, 252]],
      paymentToNotify: [[70, 252], [70, LANE], [210, LANE], [210, 252]],
    };
    const ROUTES = {};
    const HELD = {}; // the same paths, stopping on the bus under their consumer
    Object.entries(PATHS).forEach(([key, points]) => {
      ROUTES[key] = route(...points);
      HELD[key] = route(...points.slice(0, -1));
    });
    const REPLAY = {};
    Object.keys(INFO).filter(isConsumer).forEach((id) => { REPLAY[id] = route([INFO[id].door[0], LANE], INFO[id].door); });
    const FAN_OUT = [170, 190, 210, 230, 250].map((x) => route([210, 64], [x, 36]));

    let packets = [];
    let timers = [];
    const hitUntil = {};
    const down = new Set();
    const held = { bc: 0, nt: 0, sr: 0 };
    const badges = {};
    let clock = 0;
    let last = 0;
    let raf = 0;
    let running = false;
    let onScreen = true;
    let marketCount = 0;

    const after = (ms, fn) => timers.push({ at: clock + ms, fn });

    function spawn(path, kind, onArrive, speed = SPEED) {
      const small = kind === 'fan';
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `pk pk-${small ? 'md' : kind}`);
      const halo = document.createElementNS(NS, 'circle');
      halo.setAttribute('class', 'pk-halo');
      halo.setAttribute('r', small ? '3.8' : '6');
      const core = document.createElementNS(NS, 'circle');
      core.setAttribute('r', small ? '1.8' : '2.6');
      g.append(halo, core);
      layer.appendChild(g);
      packets.push({ el: g, path, born: clock, speed, onArrive });
    }

    function hit(name, kind) {
      const node = nodes[name];
      if (!node || down.has(name)) return;
      node.classList.add('is-hit');
      node.classList.toggle('ev', kind === 'ev');
      hitUntil[name] = clock + 240;
    }

    const fanOut = () => [2, 1, 3, 0, 4].forEach((n, i) => after(i * 55, () => spawn(FAN_OUT[n], 'fan', null, SPEED * 0.55)));

    function arrive(id, i = 0) {
      hit(id, INFO[id].kind);
      if (id === 'bc' && i % 3 === 0) fanOut();
    }

    /** Sends a message toward a consumer; while it's off, JetStream holds it on the bus. */
    function deliver(key, consumer) {
      if (down.has(consumer)) spawn(HELD[key], INFO[consumer].kind, () => hold(consumer));
      else spawn(ROUTES[key], INFO[consumer].kind, () => arrive(consumer));
    }

    function hold(id) {
      if (!down.has(id)) { spawn(REPLAY[id], INFO[id].kind, () => arrive(id)); return; } // it came back meanwhile
      held[id]++;
      drawBadge(id);
      refreshStatus();
      if (tipFor === id) showTip(id);
    }

    function drawBadge(id) {
      let badge = badges[id];
      if (!held[id]) { badge?.remove(); delete badges[id]; return; }
      if (!badge) {
        const [x, y] = INFO[id].badge;
        badge = document.createElementNS(NS, 'g');
        badge.setAttribute('class', 't-queue');
        badge.setAttribute('transform', `translate(${x} ${y})`);
        badge.setAttribute('aria-hidden', 'true');
        badge.append(document.createElementNS(NS, 'rect'), document.createElementNS(NS, 'text'));
        svg.insertBefore(badge, layer);
        badges[id] = badge;
      }
      const text = badge.querySelector('text');
      text.textContent = `${held[id]} waiting`;
      text.setAttribute('y', '3.4');
      const w = Math.ceil(text.getComputedTextLength() || 40) + 14;
      const rect = badge.querySelector('rect');
      rect.setAttribute('x', String(-w / 2));
      rect.setAttribute('y', '-8.5');
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', '17');
      rect.setAttribute('rx', '8.5');
    }

    function marketTick() {
      if (down.has('md')) return;
      spawn(ROUTES.feed, 'md', () => {
        if (down.has('md')) return;
        hit('md', 'md');
        after(90, () => {
          if (++marketCount % 4 === 0) deliver('mdToSearch', 'sr');
          else deliver('mdToBroadcast', 'bc');
        });
      });
    }

    function orderTick() {
      if (down.has('or')) return;
      spawn(ROUTES.order, 'ev', () => {
        if (down.has('or')) return;
        hit('or', 'ev');
        after(70, () => deliver('orderToNotify', 'nt'));
      });
    }

    function paymentTick() {
      if (down.has('pay')) return;
      hit('pay', 'ev');
      deliver('paymentToNotify', 'nt');
    }

    const schedules = [
      { fn: marketTick, min: 420, max: 760, next: 0 },
      { fn: orderTick, min: 900, max: 1500, next: 350 },
      { fn: paymentTick, min: 2600, max: 4200, next: 1500 },
    ];

    function frame(now) {
      if (!running) return;
      clock += Math.min(now - last, 64);
      last = now;

      schedules.forEach((s) => {
        if (clock < s.next) return;
        s.fn();
        s.next = clock + s.min + Math.random() * (s.max - s.min);
      });

      if (timers.length) {
        const due = timers.filter((t) => t.at <= clock);
        timers = timers.filter((t) => t.at > clock);
        due.forEach((t) => t.fn());
      }

      const arrived = [];
      packets = packets.filter((p) => {
        const dist = (clock - p.born) * p.speed;
        if (dist >= p.path.total) {
          p.el.remove();
          if (p.onArrive) arrived.push(p.onArrive);
          return false;
        }
        const seg = p.path.segs.find((s) => dist < s.start + s.len) || p.path.segs[p.path.segs.length - 1];
        const t = (dist - seg.start) / seg.len;
        const x = seg.x1 + (seg.x2 - seg.x1) * t;
        const y = seg.y1 + (seg.y2 - seg.y1) * t;
        p.el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        return true;
      });
      arrived.forEach((fn) => fn());

      Object.keys(hitUntil).forEach((name) => {
        if (clock < hitUntil[name]) return;
        nodes[name].classList.remove('is-hit');
        delete hitUntil[name];
      });

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion.matches || !onScreen || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function reset() {
      stop();
      packets.forEach((p) => p.el.remove());
      packets = [];
      timers = [];
      Object.keys(hitUntil).forEach((name) => { nodes[name].classList.remove('is-hit'); delete hitUntil[name]; });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) start(); else stop();
      }).observe(svg);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    onChange(reduceMotion, () => (reduceMotion.matches ? reset() : start()));

    /* Switching services off and back on. */

    const verb = () => (finePointer.matches ? 'click' : 'tap');
    const statusEl = figure.querySelector('[data-topo-status]');
    const live = document.createElement('span');
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');
    figure.append(live);
    let quietUntil = 0;

    function refreshStatus() {
      if (!statusEl || Date.now() < quietUntil) return;
      const waiting = held.bc + held.nt + held.sr;
      statusEl.textContent = down.size
        ? `${down.size} switched off${waiting ? ` · ${waiting} messages waiting` : ''} · ${verb()} to turn back on`
        : `all systems running · ${verb()} a box to switch it off`;
    }

    function announce(text) {
      live.textContent = text;
      if (statusEl) statusEl.textContent = text;
      quietUntil = Date.now() + 3500;
      setTimeout(refreshStatus, 3600);
    }

    function setSub(id, text) {
      const sub = nodes[id].querySelector('.t-sub');
      if (!sub) return;
      if (!sub.dataset.text) sub.dataset.text = sub.textContent;
      sub.textContent = text ?? sub.dataset.text;
    }

    function label(id) {
      const state = down.has(id) ? 'switched off. Press to turn it back on' : 'running. Press to switch it off';
      nodes[id].setAttribute('aria-label', `${INFO[id].name}, ${state}. ${INFO[id].what}`);
    }

    function takeDown(id) {
      down.add(id);
      nodes[id].classList.remove('is-hit', 'ev');
      delete hitUntil[id];
      nodes[id].classList.add('is-down');
      setSub(id, 'off');
      announce(isConsumer(id)
        ? `${INFO[id].name} is off. Its messages are waiting safely.`
        : `${INFO[id].name} is off: ${INFO[id].stops}.`);
    }

    function restore(id) {
      down.delete(id);
      nodes[id].classList.remove('is-down');
      setSub(id, null);
      const n = held[id] || 0;
      if (!n) { announce(`${INFO[id].name} is back on.`); return; }
      held[id] = 0;
      drawBadge(id);
      for (let i = 0; i < Math.min(n, 30); i++) after(i * 75, () => spawn(REPLAY[id], INFO[id].kind, () => arrive(id, i)));
      announce(`${INFO[id].name} is back. ${n} waiting message${n === 1 ? '' : 's'} delivered.`);
    }

    function toggle(id) {
      if (down.has(id)) restore(id); else takeDown(id);
      label(id);
      if (tipFor === id) showTip(id);
    }

    const tip = document.createElement('div');
    tip.className = 'topo-tip';
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true'); // the same words are in each service's label
    figure.append(tip);
    let tipFor = null;
    let tipTimer = 0;

    function showTip(id) {
      const name = document.createElement('b');
      name.textContent = INFO[id].name;
      const what = document.createElement('span');
      what.textContent = INFO[id].what;
      const state = document.createElement('span');
      const isDown = down.has(id);
      state.className = `tip-state${isDown ? ' is-down' : ''}`;
      state.textContent = isDown
        ? `off${held[id] ? ` · ${held[id]} waiting` : ''} · ${verb()} to turn on`
        : `running · ${verb()} to switch off`;
      tip.replaceChildren(name, what, state);
      tip.hidden = false;
      tipFor = id;
      const fr = figure.getBoundingClientRect();
      const nr = nodes[id].getBoundingClientRect();
      const left = Math.max(8, Math.min(nr.left - fr.left + nr.width / 2 - tip.offsetWidth / 2, fr.width - tip.offsetWidth - 8));
      let top = nr.top - fr.top - tip.offsetHeight - 8;
      if (top < 8) top = nr.bottom - fr.top + 8;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    }

    function hideTip() {
      tip.hidden = true;
      tipFor = null;
    }

    svg.removeAttribute('aria-hidden');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Services in the diagram');
    svg.querySelectorAll('.t-links, .t-ext, .t-bus, .t-bus-label, .t-lane, .t-packets').forEach((el) => el.setAttribute('aria-hidden', 'true'));
    Object.keys(INFO).forEach((id) => {
      const g = nodes[id];
      if (!g) return;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      label(id);
      g.addEventListener('click', () => {
        toggle(id);
        if (!finePointer.matches) {
          showTip(id);
          clearTimeout(tipTimer);
          tipTimer = setTimeout(hideTip, 2600);
        }
      });
      g.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggle(id);
      });
      g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showTip(id); });
      g.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
      g.addEventListener('focus', () => showTip(id));
      g.addEventListener('blur', hideTip);
    });
    refreshStatus();
    start();

    return {
      /** Switches off a random running consumer (the interesting case), for the palette. */
      chaos() {
        const consumers = ['bc', 'nt', 'sr'].filter((id) => !down.has(id));
        const pool = consumers.length ? consumers : Object.keys(INFO).filter((id) => !down.has(id));
        figure.scrollIntoView({ behavior: smooth(), block: 'center' });
        if (pool.length) toggle(pool[Math.floor(Math.random() * pool.length)]);
      },
    };
  }

  /* "Can you beat 250µs?": a reaction race against the order system. ---------- */

  function initRace() {
    const dialog = document.querySelector('[data-race]');
    if (!dialog || typeof dialog.showModal !== 'function') return null;
    const pad = dialog.querySelector('[data-race-pad]');
    const big = dialog.querySelector('[data-race-big]');
    const small = dialog.querySelector('[data-race-small]');
    const verdict = dialog.querySelector('[data-race-verdict]');
    const youEl = dialog.querySelector('[data-race-you]');
    const bestEl = dialog.querySelector('[data-race-best]');
    const SERVICE_MS = 0.25; // the order system's average latency
    const ORDERS_PER_MS = 1.25; // 1,250+ orders a second
    const HOW = 'Click, tap or press Space';
    let state = 'idle';
    let timer = 0;
    let t0 = 0;
    let best = Number(recall('race-best')) || 0;
    const ms = (v) => `${Math.round(v)} ms`;
    const count = (n) => Math.round(n).toLocaleString('en-IN');

    function show(next, headline, sub) {
      state = next;
      pad.dataset.state = next;
      big.textContent = headline;
      small.textContent = sub;
    }

    function arm() {
      verdict.textContent = '';
      show('wait', 'Wait for green…', 'Not yet');
      clearTimeout(timer);
      timer = setTimeout(() => {
        show('go', 'Now!', HOW);
        requestAnimationFrame(() => { t0 = performance.now(); });
      }, 1200 + Math.random() * 2400);
    }

    function press() {
      if (state === 'wait') {
        clearTimeout(timer);
        show('early', 'Too soon!', 'Press to try again');
        verdict.textContent = 'False start. The exchange would have rejected that order.';
        return;
      }
      if (state === 'go') {
        if (!t0) return; // the green hasn't been painted yet
        const took = performance.now() - t0;
        t0 = 0;
        youEl.textContent = ms(took);
        if (!best || took < best) { best = Math.round(took); store('race-best', String(best)); }
        bestEl.textContent = ms(best);
        const opener = took < 180 ? 'Sharp.' : took < 300 ? 'Respectable.' : 'The market moved on.';
        verdict.textContent = `${opener} My order system is ${count(took / SERVICE_MS)}× faster, and handled at least ${count(Math.floor(took * ORDERS_PER_MS))} orders while you reacted.`;
        show('done', ms(took), 'Press to race again');
        return;
      }
      arm();
    }

    pad.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); press(); } });
    pad.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); }
    });
    pad.addEventListener('click', (e) => e.preventDefault());
    dialog.querySelector('[data-race-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      clearTimeout(timer);
      show('idle', 'Start', HOW);
      verdict.textContent = '';
    });

    const open = () => {
      youEl.textContent = '—';
      bestEl.textContent = best ? ms(best) : '—';
      show('idle', 'Start', HOW);
      dialog.showModal();
      pad.focus();
    };
    document.querySelectorAll('[data-race-open]').forEach((b) => b.addEventListener('click', open));
    return open;
  }

  /* Command palette: Ctrl/⌘ + K or "/" ------------------------------------------ */

  function initPalette({ openRace, topology, universe, earth }) {
    const dialog = document.querySelector('[data-palette]');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const input = dialog.querySelector('[data-palette-input]');
    const list = dialog.querySelector('[data-palette-list]');
    const msg = dialog.querySelector('[data-palette-msg]');

    const go = (selector) => () => document.querySelector(selector)?.scrollIntoView({ behavior: smooth(), block: 'start' });
    const project = (id) => () => {
      universe?.select(id);
      document.getElementById('universe')?.scrollIntoView({ behavior: smooth(), block: 'start' });
    };
    const visit = (url) => () => window.open(url, '_blank', 'noopener');

    let closeTimer = 0;
    function say(text) {
      msg.textContent = text;
      msg.hidden = false;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(close, 1600);
    }

    // `stay` commands answer inside the palette before it closes.
    const commands = [
      { group: 'Go to', label: 'About', run: go('#about') },
      { group: 'Go to', label: 'Experience', keys: 'work jobs greeksoft career', run: go('#experience') },
      { group: 'Go to', label: 'Work', hint: 'things I built', keys: 'systems platform', run: go('#work') },
      { group: 'Go to', label: 'Skills', keys: 'toolbox stack tech', run: go('#skills') },
      { group: 'Go to', label: "Pruthvi's Universe", hint: 'side projects', keys: 'projects universe orbit', run: go('#universe') },
      { group: 'Go to', label: 'Contact', keys: 'email hire', run: go('#contact') },
      { group: 'Projects', label: 'Moonsplit', hint: 'the Moon', keys: 'rent flat expenses', run: project('moonsplit') },
      { group: 'Projects', label: 'Sirius', hint: 'a star', keys: 'interview prep flashcards', run: project('sirius') },
      { group: 'Projects', label: 'CodeNebula', hint: 'a nebula', keys: 'c++ go python learning', run: project('codenebula') },
      { group: 'Projects', label: 'Gravitone', hint: 'a black hole', keys: 'music sync audio', run: project('gravitone') },
      { group: 'Projects', label: 'Quasar', hint: 'a quasar', keys: 'qr share webrtc encryption', run: project('quasar') },
      { group: 'Play', label: 'Can you beat 250µs?', hint: 'reaction race', keys: 'race game reaction latency', run: () => openRace?.() },
      { group: 'Play', label: 'Spin the Earth', keys: 'globe world earth pruthvi', run: () => earth?.spin() },
      { group: 'Play', label: 'Switch off a service', hint: 'see how it works', keys: 'chaos fail jetstream topology', run: () => topology?.chaos() },
      { group: 'Do', label: 'Copy email address', hint: EMAIL, stay: true, run: async () => say((await copyText(EMAIL)) ? 'Email copied. Talk soon.' : `Could not copy. It's ${EMAIL}.`) },
      { group: 'Do', label: 'Email Pruthvi', keys: 'mail contact hire', run: () => { location.href = `mailto:${EMAIL}`; } },
      { group: 'Do', label: 'Download resume', keys: 'resume cv pdf', run: () => document.querySelector('a[download][href$=".pdf"]')?.click() },
      { group: 'Do', label: 'Switch theme', hint: 'day / night', keys: 'dark light mode', run: () => toggleTheme(themeBtn) },
      { group: 'Open', label: 'GitHub', hint: '@pruthvipanchal', run: visit('https://github.com/pruthvipanchal') },
      { group: 'Open', label: 'LinkedIn', hint: '/in/pruthvipanchal', run: visit('https://linkedin.com/in/pruthvipanchal') },
      { group: 'Open', label: 'CodeNebula', hint: 'live site', keys: 'learn c++ galaxy', run: visit('https://codenebula-dev.vercel.app/') },
      { group: 'Open', label: 'CodeNebula reference', hint: 'docs', keys: 'docs reference', run: visit('https://pruthvipanchal.github.io/CodeNebula/') },
      {
        group: 'Secret', label: 'sudo hire pruthvi', secret: true, keys: 'sudo hire', stay: true,
        run: () => {
          say('Permission granted. Opening your email…');
          setTimeout(() => { location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Let's talk")}`; }, 900);
        },
      },
    ];

    function score(cmd, q) {
      const label = cmd.label.toLowerCase();
      const keys = (cmd.keys || '').split(' ');
      if (cmd.secret) return q.length >= 3 && (label.startsWith(q) || keys.some((k) => k.startsWith(q))) ? 90 : -1;
      if (!q) return 1;
      if (label.startsWith(q)) return 100;
      if (label.split(/\s+/).some((w) => w.startsWith(q))) return 70;
      if (`${label} ${cmd.keys || ''} ${cmd.group.toLowerCase()}`.includes(q)) return 40;
      return -1;
    }

    let shown = [];
    let active = 0;
    let lastFocus = null;

    function setActive(i) {
      active = Math.max(0, Math.min(i, shown.length - 1));
      list.querySelectorAll('.palette-opt').forEach((li, j) => li.setAttribute('aria-selected', String(j === active)));
      const el = document.getElementById(`pal-${active}`);
      if (!el) return;
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    }

    function render() {
      const q = input.value.trim().toLowerCase();
      shown = commands.map((c) => ({ c, s: score(c, q) })).filter((x) => x.s >= 0);
      if (q) shown.sort((a, b) => b.s - a.s);
      list.textContent = '';
      if (!shown.length) {
        const li = document.createElement('li');
        li.className = 'palette-empty';
        li.textContent = 'Nothing matches. Try “universe”, “race” or “email”.';
        list.append(li);
        input.removeAttribute('aria-activedescendant');
        return;
      }
      let group = null;
      shown.forEach(({ c }, i) => {
        if (!q && c.group !== group) {
          group = c.group;
          const g = document.createElement('li');
          g.className = 'palette-group';
          g.setAttribute('role', 'presentation');
          g.textContent = group;
          list.append(g);
        }
        const li = document.createElement('li');
        li.className = 'palette-opt';
        li.id = `pal-${i}`;
        li.setAttribute('role', 'option');
        const name = document.createElement('span');
        name.textContent = c.label;
        li.append(name);
        if (c.hint) {
          const hint = document.createElement('span');
          hint.className = 'palette-hint';
          hint.textContent = c.hint;
          li.append(hint);
        }
        li.addEventListener('pointermove', () => { if (active !== i) setActive(i); });
        li.addEventListener('click', () => runAt(i));
        list.append(li);
      });
      setActive(0);
    }

    function runAt(i) {
      const cmd = shown[i]?.c;
      if (!cmd) return;
      if (cmd.stay) { cmd.run(); return; }
      close();
      cmd.run();
    }

    function open() {
      if (dialog.open) return;
      lastFocus = document.activeElement;
      input.value = '';
      msg.hidden = true;
      render();
      dialog.showModal();
      input.focus();
    }

    function close() {
      clearTimeout(closeTimer);
      if (dialog.open) dialog.close();
    }

    dialog.addEventListener('close', () => { lastFocus?.focus?.({ preventScroll: true }); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runAt(active); }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        if (dialog.open) close(); else if (!document.querySelector('dialog[open]')) open();
        return;
      }
      const t = e.target;
      const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        open();
      }
    });
  }

  initStars();
  initCounters();
  const universe = initUniverse();
  const earth = initHeroEarth(universe);
  const topology = initTopology();
  initPalette({ openRace: initRace(), topology, universe, earth });
})();
