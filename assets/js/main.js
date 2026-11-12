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
  const IST = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
  const gandhinagarTime = () => IST.format(new Date()); // "8:44 am"

  /* Numbers the page keeps coming back to. */
  const LIGHT_KM_S = 299792.458; // the speed of light
  const EARTH_KM = 6371; // the Earth's mean radius
  const EARTH_ROUND_KM = 40075; // once round the equator
  const ORDER_MS = 0.25; // the order system's average: 250 µs
  const ORDERS_PER_S = 1250;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  /* One scroll listener feeds everything that follows the page's position. */
  const scrollFx = [];
  let scrollQueued = false;
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      scrollFx.forEach((fn) => fn(y, vh));
    });
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);

  /** Runs draw(now, dt) every frame while `el` is on screen, the tab is visible and motion is
      allowed. once() draws a single frame when the loop is idle. */
  function makeLoop(el, draw) {
    let raf = 0;
    let running = false;
    let onScreen = !('IntersectionObserver' in window);
    let last = 0;
    const frame = (now) => {
      raf = 0;
      if (!running) return;
      raf = requestAnimationFrame(frame); // booked first, so an error while drawing can't stop the loop
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(now, dt);
    };
    const start = () => {
      if (running || reduceMotion.matches || !onScreen || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const once = () => { if (!running) draw(performance.now(), 0); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) { start(); once(); } else stop();
      }).observe(el);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    onChange(reduceMotion, () => { if (reduceMotion.matches) { stop(); once(); } else start(); });
    return { start, stop, once, isOnScreen: () => onScreen };
  }

  // Instructions say "click" to a mouse and "tap" to a touch screen.
  const verb = () => (finePointer.matches ? 'click' : 'tap');
  document.querySelectorAll('[data-verb]').forEach((el) => { el.textContent = verb(); });

  /** Sizes a canvas to its box at the screen's pixel density and returns its CSS size. */
  function fitCanvas(canvas, ctx) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height };
  }

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

  /* The mark in the header doubles as a scroll gauge: its Moon goes once round the Earth as the
     page scrolls from top to bottom. Two copies of the Moon take turns, so it can pass behind. */
  const markBack = document.querySelector('.mark-moon-back');
  const markFront = document.querySelector('.mark-moon-front');
  if (markBack && markFront) {
    const TILT = -24 * RAD;
    const placeMarkMoon = (y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = 0.09 + 2 * Math.PI * (max > 0 ? clamp(y / max, 0, 1) : 0);
      const ex = 13.5 * Math.cos(t);
      const ey = 5.4 * Math.sin(t);
      const x = (16 + ex * Math.cos(TILT) - ey * Math.sin(TILT)).toFixed(2);
      const cy = (16 + ex * Math.sin(TILT) + ey * Math.cos(TILT)).toFixed(2);
      const inFront = Math.sin(t) >= 0;
      [markBack, markFront].forEach((m) => { m.setAttribute('cx', x); m.setAttribute('cy', cy); });
      markFront.style.opacity = inFront ? '1' : '0';
      markBack.style.opacity = inFront ? '0' : '1';
    };
    scrollFx.push(placeMarkMoon);
    placeMarkMoon(window.scrollY);
  }

  /* Current section in the nav ---------------------------------------------- */

  const navLinks = new Map();
  document.querySelectorAll('.nav a[href^="#"]').forEach((a) => navLinks.set(a.getAttribute('href').slice(1), a));

  // On wide screens one highlight glides from link to link instead of jumping.
  const navList = nav?.querySelector('ul');
  const pill = navList ? document.createElement('li') : null;
  if (pill) {
    pill.className = 'nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    pill.setAttribute('role', 'presentation');
    navList.append(pill);
    nav.classList.add('has-pill');
  }
  function movePill() {
    if (!pill) return;
    const a = navList.querySelector('a[aria-current]');
    pill.style.opacity = a ? '1' : '0';
    if (!a) return;
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  window.addEventListener('resize', movePill);
  document.fonts?.ready.then(movePill);

  if ('IntersectionObserver' in window && navLinks.size) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute('aria-current'));
        navLinks.get(entry.target.id)?.setAttribute('aria-current', 'true');
      });
      movePill();
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

    /* A nearer layer: a few brighter stars that twinkle, and drift past as the page scrolls. CSS
       does the twinkling and scrolling only moves two layers, so nothing runs while the page is
       still. Daylight (the light theme) hides it; reduced motion keeps it still. */
    const sky = document.createElement('div');
    sky.className = 'sky';
    sky.setAttribute('aria-hidden', 'true');
    let seed = 7;
    const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) {
      const star = document.createElement('i');
      const size = (1.4 + rand() ** 3 * 2).toFixed(1);
      star.style.cssText = `left:${(rand() * 100).toFixed(2)}%;top:${(rand() * 100).toFixed(2)}%;width:${size}px;height:${size}px;animation-duration:${(2.6 + rand() * 4.5).toFixed(2)}s;animation-delay:${(-rand() * 6).toFixed(2)}s`;
      if (rand() > 0.8) star.className = 'warm';
      sky.append(star);
    }
    canvas.after(sky);
    scrollFx.push((y) => {
      if (reduceMotion.matches) return;
      canvas.style.transform = `translate3d(0, ${(-Math.min(160, y * 0.02)).toFixed(1)}px, 0)`;
      sky.style.transform = `translate3d(0, ${(-Math.min(700, y * 0.08)).toFixed(1)}px, 0)`;
    });

    /* Now and then, a shooting star. */
    function shoot() {
      setTimeout(shoot, 6000 + Math.random() * 9000);
      if (document.hidden || reduceMotion.matches || theme() === 'light' || !sky.animate) return;
      // Only over open sky, at the top of the page and at the end of it: not behind the cards between.
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (y > window.innerHeight * 0.8 && y < max - window.innerHeight * 0.8) return;
      const m = document.createElement('b');
      m.className = 'meteor';
      m.style.left = `${(25 + Math.random() * 65).toFixed(1)}vw`;
      m.style.top = `${(4 + Math.random() * 42).toFixed(1)}vh`;
      document.body.append(m);
      const dx = -(240 + Math.random() * 200);
      const dy = -dx * (0.35 + Math.random() * 0.3);
      const turn = `rotate(${(Math.atan2(dy, dx) / RAD).toFixed(1)}deg)`;
      m.animate([
        { transform: `translate3d(0, 0, 0) ${turn} scaleX(.25)`, opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { transform: `translate3d(${dx.toFixed(0)}px, ${dy.toFixed(0)}px, 0) ${turn} scaleX(1)`, opacity: 0 },
      ], { duration: 850 + Math.random() * 450, easing: 'cubic-bezier(.3, .1, .6, 1)' }).onfinish = () => m.remove();
    }
    setTimeout(shoot, 3500);
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

  /** The Moon's phase at a moment: how much of its face is lit (0 new, 1 full), whether it is
      growing, and its everyday name. Meeus, Astronomical Algorithms, ch. 48: good to about 1%. */
  function moonPhase(ms) {
    const T = (ms / 86400000 + 2440587.5 - 2451545) / 36525; // centuries since J2000
    const D = (297.8501921 + 445267.1114034 * T) * RAD; // the Moon's mean elongation from the Sun
    const M = (357.5291092 + 35999.0502909 * T) * RAD; // the Sun's mean anomaly
    const Mp = (134.9633964 + 477198.8675055 * T) * RAD; // the Moon's mean anomaly
    const i = Math.PI - D + RAD * (-6.289 * Math.sin(Mp) + 2.1 * Math.sin(M) - 1.274 * Math.sin(2 * D - Mp)
      - 0.658 * Math.sin(2 * D) - 0.214 * Math.sin(2 * Mp) - 0.11 * Math.sin(D));
    const lit = (1 + Math.cos(i)) / 2;
    const waxing = Math.sin(i) > 0;
    const side = waxing ? 'waxing' : 'waning';
    const name = lit < 0.03 ? 'new' : lit > 0.97 ? 'full'
      : Math.abs(lit - 0.5) < 0.05 ? (waxing ? 'first quarter' : 'last quarter')
        : `${side} ${lit < 0.5 ? 'crescent' : 'gibbous'}`;
    return { lit, waxing, name };
  }

  /* Places the globe knows by name, as "name,lat,lon": they light up at night, and they name
     wherever a visitor sends light. Coordinates are city centres to two decimals. */
  const PLACES = [
    'Gandhinagar,23.22,72.64|Ahmedabad,23.02,72.57|Mumbai,19.08,72.88|Delhi,28.61,77.21|Bengaluru,12.97,77.59|Kolkata,22.57,88.36|Chennai,13.08,80.27|Hyderabad,17.39,78.49|Pune,18.52,73.86|Jaipur,26.91,75.79|Lucknow,26.85,80.95|Indore,22.72,75.86|Surat,21.17,72.83|Kochi,9.93,76.27|Guwahati,26.14,91.74|Chandigarh,30.73,76.78|Bhubaneswar,20.3,85.82|Nagpur,21.15,79.09|Varanasi,25.32,82.97|Goa,15.5,73.83',
    'Karachi,24.86,67.01|Lahore,31.55,74.34|Islamabad,33.69,73.05|Dhaka,23.81,90.41|Colombo,6.93,79.86|Kathmandu,27.72,85.32|Kabul,34.53,69.17|Tashkent,41.3,69.24|Almaty,43.24,76.89',
    'Dubai,25.2,55.27|Abu Dhabi,24.45,54.38|Doha,25.29,51.53|Riyadh,24.71,46.68|Jeddah,21.49,39.19|Kuwait City,29.38,47.98|Muscat,23.59,58.41|Tehran,35.69,51.39|Baghdad,33.31,44.37|Tel Aviv,32.09,34.78|Istanbul,41.01,28.98|Ankara,39.93,32.86',
    'London,51.51,-0.13|Paris,48.86,2.35|Frankfurt,50.11,8.68|Berlin,52.52,13.4|Amsterdam,52.37,4.9|Brussels,50.85,4.35|Zurich,47.37,8.54|Milan,45.46,9.19|Rome,41.9,12.5|Madrid,40.42,-3.7|Barcelona,41.39,2.17|Lisbon,38.72,-9.14|Dublin,53.35,-6.26|Edinburgh,55.95,-3.19|Copenhagen,55.68,12.57|Stockholm,59.33,18.07|Oslo,59.91,10.75|Helsinki,60.17,24.94|Warsaw,52.23,21.01|Vienna,48.21,16.37|Prague,50.08,14.44|Budapest,47.5,19.04|Athens,37.98,23.73|Bucharest,44.43,26.1|Kyiv,50.45,30.52|Moscow,55.76,37.62|St Petersburg,59.93,30.34|Reykjavik,64.15,-21.94',
    'Cairo,30.04,31.24|Casablanca,33.57,-7.59|Algiers,36.75,3.06|Tunis,36.81,10.18|Lagos,6.52,3.38|Accra,5.6,-0.19|Dakar,14.72,-17.47|Abidjan,5.36,-4.01|Addis Ababa,9.03,38.74|Nairobi,-1.29,36.82|Dar es Salaam,-6.79,39.21|Kinshasa,-4.44,15.27|Luanda,-8.84,13.23|Johannesburg,-26.2,28.05|Cape Town,-33.92,18.42|Khartoum,15.5,32.56|Antananarivo,-18.88,47.51|Port Louis,-20.16,57.5',
    'Singapore,1.35,103.82|Kuala Lumpur,3.14,101.69|Bangkok,13.76,100.5|Jakarta,-6.21,106.85|Manila,14.6,120.98|Ho Chi Minh City,10.82,106.63|Hanoi,21.03,105.85|Hong Kong,22.32,114.17|Shanghai,31.23,121.47|Beijing,39.9,116.41|Chengdu,30.57,104.07|Taipei,25.03,121.57|Seoul,37.57,126.98|Tokyo,35.68,139.69|Osaka,34.69,135.5|Yangon,16.87,96.2|Ulaanbaatar,47.89,106.91|Novosibirsk,55.01,82.93|Vladivostok,43.12,131.89',
    'Sydney,-33.87,151.21|Melbourne,-37.81,144.96|Brisbane,-27.47,153.03|Perth,-31.95,115.86|Auckland,-36.85,174.76|Wellington,-41.29,174.78|Port Moresby,-9.44,147.18|Suva,-18.14,178.44|Honolulu,21.31,-157.86',
    'New York,40.71,-74.01|Boston,42.36,-71.06|Washington,38.91,-77.04|Chicago,41.88,-87.63|Toronto,43.65,-79.38|Montreal,45.5,-73.57|Atlanta,33.75,-84.39|Miami,25.76,-80.19|Dallas,32.78,-96.8|Houston,29.76,-95.37|Denver,39.74,-104.99|Phoenix,33.45,-112.07|Los Angeles,34.05,-118.24|San Francisco,37.77,-122.42|Seattle,47.61,-122.33|Vancouver,49.28,-123.12|Anchorage,61.22,-149.9',
    'Mexico City,19.43,-99.13|Havana,23.11,-82.37|Panama City,8.98,-79.52|Bogotá,4.71,-74.07|Caracas,10.48,-66.9|Quito,-0.18,-78.47|Lima,-12.05,-77.04|La Paz,-16.49,-68.12|Santiago,-33.45,-70.67|Buenos Aires,-34.6,-58.38|Montevideo,-34.9,-56.16|São Paulo,-23.55,-46.63|Rio de Janeiro,-22.91,-43.17|Brasília,-15.79,-47.88|Manaus,-3.12,-60.02|Salvador,-12.97,-38.5',
  ].join('|').split('|').map((entry) => {
    const [name, lat, lon] = entry.split(',');
    return { name, lat: Number(lat), lon: Number(lon), v: toVec(Number(lat), Number(lon)) };
  });

  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  /** Great-circle distance between two unit vectors, in kilometres. */
  const kmBetween = (a, b) => Math.acos(clamp(dot3(a, b), -1, 1)) * EARTH_KM;
  /** How long light takes to cover a distance, in milliseconds. */
  const lightMs = (km) => (km / LIGHT_KM_S) * 1000;
  const fmtMs = (ms) => (ms < 10 ? ms.toFixed(2) : ms.toFixed(1));
  const fmtKm = (km) => (km < 100 ? Math.round(km) : Math.round(km / 10) * 10).toLocaleString('en-US');
  const latLon = (v) => [Math.asin(clamp(v[1], -1, 1)) / RAD, Math.atan2(v[0], v[2]) / RAD];
  const plain = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const placeNamed = (name) => PLACES.find((p) => plain(p.name) === plain(name)) || null;

  const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  /** Names a point on the globe by the nearest place the page knows. */
  function nameOf(v) {
    let best = PLACES[0];
    let most = -2;
    PLACES.forEach((p) => {
      const d = dot3(p.v, v);
      if (d > most) { most = d; best = p; }
    });
    const km = Math.acos(clamp(most, -1, 1)) * EARTH_KM;
    if (km < 60) return best.name;
    if (km < 450) return `Near ${best.name}`;
    const [lat, lon] = latLon(v);
    const dLon = (lon - best.lon) * RAD;
    const y = Math.sin(dLon) * Math.cos(lat * RAD);
    const x = Math.cos(best.lat * RAD) * Math.sin(lat * RAD) - Math.sin(best.lat * RAD) * Math.cos(lat * RAD) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) / RAD + 360) % 360;
    return `${fmtKm(km)} km ${COMPASS[Math.round(bearing / 45) % 8]} of ${best.name}`;
  }

  /** The place the visitor's clock is set to, when the globe knows it and it isn't India. */
  function visitorPlace() {
    let zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return null; }
    if (/Kolkata|Calcutta/.test(zone)) return null;
    const city = zone.split('/').pop().replace(/_/g, ' ');
    const alias = { Kiev: 'Kyiv', Saigon: 'Ho Chi Minh City', 'Ho Chi Minh': 'Ho Chi Minh City', Qatar: 'Doha', Katmandu: 'Kathmandu', Rangoon: 'Yangon', Dacca: 'Dhaka' };
    return placeNamed(alias[city] || city);
  }

  /* Canvas colours for each theme (CSS can't reach inside a canvas). Colours given as
     "r, g, b" get their alpha where they're used. */
  const PALETTES = {
    dark: {
      glow: '90, 169, 255', ocean: ['#11305e', '#0a1d3d', '#06132b'], rim: 'rgba(150, 205, 255, .3)',
      night: [48, 86, 152], day: [176, 220, 255], dusk: [255, 168, 92], limb: '190, 226, 255',
      light: '232, 244, 255', lightDot: '#ffffff', moonShade: 'rgba(7, 10, 20, .7)', moonRim: 'rgba(214, 224, 244, .3)', well: '43, 228, 176',
      orbit: 'rgba(160, 190, 255, .16)', accent: '255, 181, 71', arcHead: '255, 225, 170', arcDot: '#ffe6b8',
      city: '255, 190, 110', tag: 'rgba(8, 12, 26, .88)', tagText: '#eef2ff', blend: 'lighter',
      star: ['200, 228, 255', 'rgba(225, 240, 255, .75)', null], speck: '#ffffff',
      ring: 'rgba(255, 225, 175, .95)', host: 'rgba(140, 170, 255, .1)', jet: '150, 235, 255', core: '190, 240, 255',
    },
    light: {
      glow: '70, 130, 245', ocean: ['#f6f9ff', '#dfeaff', '#c8dbfb'], rim: 'rgba(40, 100, 220, .35)',
      night: [128, 154, 206], day: [20, 84, 200], dusk: [226, 122, 28], limb: '36, 104, 232',
      light: '16, 64, 190', lightDot: '#0b3fb0', moonShade: 'rgba(243, 246, 252, .88)', moonRim: 'rgba(96, 112, 150, .5)', well: '10, 150, 112',
      orbit: 'rgba(50, 80, 150, .24)', accent: '212, 118, 8', arcHead: '235, 135, 10', arcDot: '#d97706',
      city: '225, 130, 15', tag: 'rgba(255, 255, 255, .96)', tagText: '#0b1530', blend: 'source-over',
      star: ['80, 140, 255', 'rgba(40, 90, 200, .6)', 'rgba(40, 90, 200, .8)'], speck: '#3b3f8a',
      ring: 'rgba(200, 110, 20, .9)', host: 'rgba(60, 90, 200, .08)', jet: '20, 140, 210', core: '60, 170, 240',
    },
  };
  const palette = () => PALETTES[theme()];

  const LEVELS = 10;
  /** One soft round dot of a colour ("r, g, b"), drawn once and stamped many times. */
  function softDot(c, core = 0.45) {
    const s = document.createElement('canvas');
    s.width = 24;
    s.height = 24;
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(12, 12, 0, 12, 12, 12);
    grad.addColorStop(0, `rgba(${c}, 1)`);
    grad.addColorStop(core, `rgba(${c}, .95)`);
    grad.addColorStop(1, `rgba(${c}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 24, 24);
    return s;
  }

  /** Soft round dots in ten brightnesses, from the night side's colour to daylight. Two extras ride
      along: .dusk, the same dots tinted like a sunset for the line where day meets night, and
      .city, the glow of a city at night. */
  function dotSprites(pal) {
    const { night, day, dusk } = pal;
    const ramp = Array.from({ length: LEVELS }, (_, k) => night.map((v, i) => Math.round(v + ((day[i] - v) * k) / (LEVELS - 1))));
    const sprites = ramp.map((c) => softDot(c));
    sprites.dusk = ramp.map((c) => softDot(c.map((v, i) => Math.round(v + (dusk[i] - v) * 0.72))));
    sprites.city = softDot(pal.city, 0.18);
    return sprites;
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
    // Which way the Sun is on screen, and how side-on (1) or head-on (0) it lights the globe.
    let sunSide = 0;
    let sunAngle = 0;
    if (sun) {
      const sx = sun[0] * view.cl - sun[2] * view.sl;
      const sz = sun[0] * view.sl + sun[2] * view.cl;
      const sy = sun[1] * view.cp - sz * view.sp;
      sunSide = Math.hypot(sx, sy);
      sunAngle = Math.atan2(-sy, sx);
    }
    if (sunSide > 0.2) {
      // The atmosphere glows further out on the sunlit side.
      const hx = cx + Math.cos(sunAngle) * R * 0.3;
      const hy = cy + Math.sin(sunAngle) * R * 0.3;
      const halo = ctx.createRadialGradient(hx, hy, R * 0.78, hx, hy, R * 1.24);
      halo.addColorStop(0, `rgba(${pal.glow}, ${(0.3 * sunSide).toFixed(3)})`);
      halo.addColorStop(1, `rgba(${pal.glow}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(hx, hy, R * 1.24, 0, 2 * Math.PI);
      ctx.fill();
    }
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
      let set = sprites;
      if (sun) {
        const d = x * sun[0] + y * sun[1] + z * sun[2];
        light = d > 0.18 ? 1 : d < -0.18 ? 0 : (d + 0.18) / 0.36;
        if (d > -0.07 && d < 0.09) set = sprites.dusk; // a thin sunset line where day meets night
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
      ctx.drawImage(set[Math.min(LEVELS - 1, (b * LEVELS) | 0)], px - size / 2, py - size / 2, size, size);
    }

    ctx.globalAlpha = intro;
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();
    if (sunSide > 0.2) {
      // The edge of the planet catches the light on the Sun's side: three arcs, brightest in the middle.
      ctx.strokeStyle = `rgba(${pal.limb}, ${(0.3 * Math.min(1, sunSide * 1.15)).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.2, R * 0.007);
      [1.25, 0.8, 0.42].forEach((span) => {
        ctx.beginPath();
        ctx.arc(cx, cy, R, sunAngle - span, sunAngle + span);
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;
  }

  /** The Moon as a ball. Given a phase (from moonPhase), the unlit part is shaded the way it looks
      from the northern half of the Earth: lit on the right while waxing, on the left while waning. */
  function drawMoonBall(ctx, x, y, r, phase, shade = 'rgba(7, 10, 20, .7)', rim = 'rgba(214, 224, 244, .3)') {
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
    if (!phase) return;
    // The dark part: its outer edge is half a circle, and the line between light and dark is half an ellipse.
    const k = phase.lit;
    const edge = r * 1.02;
    ctx.save();
    ctx.translate(x, y);
    if (!phase.waxing) ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.arc(0, 0, edge, -Math.PI / 2, Math.PI / 2, true);
    if (k < 0.5) ctx.ellipse(0, 0, (1 - 2 * k) * r, edge, 0, Math.PI / 2, -Math.PI / 2, true);
    else ctx.ellipse(0, 0, (2 * k - 1) * r, edge, 0, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.restore();
    // A faint edge all the way round, like earthshine, so even a thin crescent reads as the Moon.
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();
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
    const pinTime = pin.querySelector('[data-pin-time]');
    const pinSky = pin.querySelector('[data-pin-sky]');
    const chip = stage.querySelector('[data-light-chip]'); // where the visitor's light landed
    const chipPlace = chip?.querySelector('[data-light-place]');
    const chipFact = chip?.querySelector('[data-light-fact]');
    const dayBtn = stage.querySelector('[data-day]');
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

    function arcPoints(a, b, steps = 36, maxLift = 9) {
      const ang = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
      const s = Math.sin(ang) || 1;
      const lift = Math.min(maxLift, 0.05 + ang * 0.5);
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
    let stageLeft = 0; // layout numbers the pin needs, measured on resize rather than every frame
    let pinWidth = 0;
    let pageWidth = 0;
    let signals = []; // light the visitor has sent: { to, pts, born, dur, km, ms }
    let landed = null; // the signal the chip is describing
    let fly = null; // { lon, lat, until }: the view is turning to show something
    let lapse = null; // { start }: "watch a day pass" is playing
    let clockShift = 0; // milliseconds the globe's clock runs ahead of the real one
    let moonNow = moonPhase(Date.now());
    let touched = false; // the visitor has played with the globe, so it stops volunteering things
    const SLOW = 25; // light is shown this many times slower than it really is
    const DAY = 86400000;

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
      // On phones the CSS leaves room for the line under the globe (--hint-room) and the planet sits
      // right on top of it. Elsewhere it floats a little above the middle of its stage.
      const room = parseFloat(getComputedStyle(stage).getPropertyValue('--hint-room')) || 0;
      R = room ? Math.min((h - room - 16) / 2, w * 0.32) : Math.min(h * 0.38, w * 0.32);
      cx = w / 2;
      cy = room ? h - room - R : h * 0.46;
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
      const text = `The Moon · ${moonNow.name} tonight · see Moonsplit →`;
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
      const size = clamp(R * 0.036, 7, 12);
      PLACES.forEach((p) => {
        const d = dot3(p.v, sun);
        if (d > 0.05) return; // city lights only show at night
        const [x, y, z] = project(p.v, view, cx, cy, R);
        if (z < 0.1) return;
        ctx.globalAlpha = clamp((0.05 - d) * 9, 0, 1) * (0.5 + 0.5 * z); // they come on through dusk
        ctx.drawImage(sprites.city, x - size / 2, y - size / 2, size, size);
      });
      ctx.globalAlpha = 1;
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

    /* Light the visitor sends. It leaves Gandhinagar along the great circle, shown SLOW times
       slower than the real thing, and a chip says how far it went and how long light needs. */

    /** A point on the canvas back to a place on the globe (the inverse of project); null off the disc. */
    function unproject(px, py, view) {
      const sx = (px - cx) / R;
      const sy = -(py - cy) / R;
      const d2 = sx * sx + sy * sy;
      if (d2 > 1) return null;
      const sz = Math.sqrt(1 - d2);
      const z1 = sz * view.cp - sy * view.sp;
      return [sx * view.cl + z1 * view.sl, sy * view.cp + sz * view.sp, z1 * view.cl - sx * view.sl];
    }

    function drawSignals(view, now) {
      if (!signals.length) return;
      const LINGER = 7000;
      const still = reduceMotion.matches;
      const { light, lightDot } = palette();
      signals = signals.filter((s) => now - s.born < s.dur + LINGER);
      ctx.lineCap = 'round';
      signals.forEach((s) => {
        // A click can be handled a few ms after the frame's timestamp was taken, so the light can
        // look "younger than zero" for one frame. Start it at zero instead.
        const age = still ? 1 : Math.max(0, (now - s.born) / s.dur);
        const after = still ? 1000 : now - s.born - s.dur; // milliseconds since it landed
        const pts = s.pts.map((p) => project(p, view, cx, cy, R));
        const n = pts.length - 1;
        const head = Math.min(1, age);
        const fade = clamp((LINGER - after) / 1200, 0, 1);
        ctx.strokeStyle = `rgba(${light}, ${(0.55 * fade).toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        let pen = false;
        for (let k = 0; k <= head * n; k++) {
          const p = pts[k];
          if (p[2] < -0.04) { pen = false; continue; }
          if (pen) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
          pen = true;
        }
        ctx.stroke();
        const p = pts[Math.floor(head * n)];
        if (p[2] < -0.04) return;
        if (age < 1) {
          // The pulse on its way.
          const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 10);
          g.addColorStop(0, `rgba(${light}, .9)`);
          g.addColorStop(1, `rgba(${light}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 10, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          // Where it landed: two rings go out.
          [0, 280].forEach((lag) => {
            const t = (after - lag) / 950;
            if (t <= 0 || t >= 1) return;
            ctx.strokeStyle = `rgba(${light}, ${(0.85 * (1 - t)).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(p[0], p[1], 3 + 16 * t, 0, 2 * Math.PI);
            ctx.stroke();
          });
        }
        ctx.globalAlpha = fade;
        ctx.fillStyle = lightDot;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2.3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    const chipKm = chip?.querySelector('[data-light-km]');
    const bold = (text) => {
      const el = document.createElement('b');
      el.textContent = text;
      return el;
    };
    let chipW = 0;
    let chipH = 0;

    function hideChip() {
      if (chip) chip.hidden = true;
      landed = null;
    }

    /** Keeps the chip beside the place the light landed, once it has landed. */
    function placeChip(view, now) {
      if (!chip || !landed) return;
      const since = reduceMotion.matches ? now - landed.born : now - landed.born - landed.dur;
      if (since < 0) return; // still on its way
      if (since > 6500) { hideChip(); return; }
      if (!landed.shown) {
        landed.shown = true;
        chipPlace.textContent = landed.hello ? `On ${landed.hello} time?` : nameOf(landed.to);
        chipKm.textContent = `${fmtKm(landed.km)} km`;
        chipFact.replaceChildren('Light needs ', bold(`${fmtMs(landed.ms)} ms`), landed.hello ? ' to reach you. ' : '. ', 'One order here: ', bold(`${ORDER_MS} ms`), '.');
        chip.hidden = false;
        chipW = chip.offsetWidth;
        chipH = chip.offsetHeight;
      }
      const [x, y, z] = project(landed.to, view, cx, cy, R);
      chip.style.opacity = z > 0.05 ? '1' : '0';
      const below = y + 18 + chipH < h - 4;
      chip.style.transform = `translate(${clamp(x - chipW / 2, 6, w - chipW - 6).toFixed(1)}px, ${(below ? y + 18 : y - chipH - 18).toFixed(1)}px)`;
    }

    /** How long the light takes on screen to reach a place, in milliseconds. */
    const travel = (to) => clamp(lightMs(kmBetween(HOME, to)) * SLOW, 160, 1900);

    function sendLight(to, { hello = '' } = {}) {
      const km = kmBetween(HOME, to);
      const ms = lightMs(km);
      const sig = { to, pts: arcPoints(HOME, to, 48, 0.2), born: performance.now(), dur: travel(to), km, ms, hello, shown: false };
      signals = [...signals.slice(-2), sig];
      if (chip) chip.hidden = true;
      landed = sig;
      if (!reduceMotion.matches) return;
      // Nothing animates with reduced motion: draw it landed, and tidy up afterwards.
      draw(performance.now());
      setTimeout(() => {
        if (landed === sig) hideChip();
        signals = signals.filter((s) => s !== sig);
        if (!running) draw(performance.now());
      }, 6500);
    }

    /** Turns the globe so a place faces the viewer, then holds it there for `hold` milliseconds. */
    function flyTo(v, hold) {
      const [lat, lon] = latLon(v);
      fly = { lon: lon * RAD, lat: clamp(lat * RAD, -0.95, 0.95), until: performance.now() + hold };
      if (reduceMotion.matches) { state.lon = fly.lon; state.lat = fly.lat; }
    }

    /** Sends light to a place, first turning the globe if the path wouldn't be in view. The globe
        holds still only while the light travels, then goes back to its slow spin; the chip
        follows the place as it turns. */
    function aim(to, opts) {
      const view = viewOf(state.lat, state.lon);
      const facing = (v) => project(v, view, 0, 0, 1)[2];
      const mid = [HOME[0] + to[0], HOME[1] + to[1], HOME[2] + to[2]];
      const len = Math.hypot(mid[0], mid[1], mid[2]);
      const LAND = 500; // a moment to see it land
      if (facing(to) > 0.4 && facing(HOME) > 0.2) {
        fly = { lon: state.lon, lat: state.lat, until: performance.now() + travel(to) + LAND };
        sendLight(to, opts);
        return;
      }
      const TURN = reduceMotion.matches ? 0 : 560;
      flyTo(len > 0.2 ? mid.map((c) => c / len) : to, TURN + travel(to) + LAND);
      setTimeout(() => sendLight(to, opts), TURN);
    }

    /* "Watch a day pass": 24 hours in ten seconds, with India facing the viewer. With reduced
       motion nothing plays; the button flips the globe twelve hours ahead, and back, instead. */
    function setDayLabel() {
      if (dayBtn) dayBtn.textContent = !reduceMotion.matches ? 'Watch a day pass' : clockShift ? 'Back to now' : 'See it 12 hours from now';
    }
    function playDay() {
      touched = true;
      if (reduceMotion.matches) {
        clockShift = clockShift ? 0 : DAY / 2;
        state.lon = 76 * RAD;
        state.lat = BASE_LAT;
        setDayLabel();
        tickPin();
        draw(performance.now());
        return;
      }
      if (!lapse) lapse = { start: performance.now() };
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

    // The pin shows the time in Gandhinagar, with a Sun or a Moon worked out from the same
    // Sun that lights the globe, so the chip and the day and night on the planet always agree.
    function tickPin() {
      const at = Date.now() + clockShift; // the globe's clock: now, unless a day is being played
      sun = sunVector(at);
      const day = dot3(HOME, sun) > 0; // the Sun is above Gandhinagar's horizon
      pinSky.setAttribute('href', day ? '#i-sun' : '#i-moon');
      pin.classList.toggle('is-night', !day);
      pin.classList.toggle('is-lapse', clockShift !== 0);
      const time = IST.format(new Date(at));
      if (pinTime.textContent === time) return;
      pinTime.textContent = time;
      pinWidth = pin.offsetWidth;
    }

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const intro = reduceMotion.matches ? 1 : clamp((now - introStart) / 1900, 0, 1);
      const view = viewOf(state.lat, state.lon);
      placeMoon();
      ctx.globalAlpha = intro;
      drawOrbit(false);
      const { moonShade, moonRim } = palette();
      if (!moon.front) drawMoonBall(ctx, moon.x, moon.y, moon.r, moonNow, moonShade, moonRim);
      ctx.globalAlpha = 1;
      drawEarth(ctx, sprites, { cx, cy, R, view, sun, dot, intro, stride });
      drawCities(view, intro);
      drawArcs(view, now);
      drawSignals(view, now);
      ctx.globalAlpha = intro;
      drawOrbit(true);
      if (moon.front) drawMoonBall(ctx, moon.x, moon.y, moon.r, moonNow, moonShade, moonRim);
      ctx.globalAlpha = 1;
      if (hoverMoon) drawMoonLabel();
      placePin(view, intro);
      placeChip(view, now);
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      raf = requestAnimationFrame(frame); // booked first, so an error while drawing can't stop the globe
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (lapse) {
        // A day in ten seconds: the clock runs ahead, easing in and out, while India stays in view.
        const t = (now - lapse.start) / 10000;
        clockShift = t >= 1 ? 0 : DAY * t * t * (3 - 2 * t);
        if (t >= 1) lapse = null; else fly = { lon: 76 * RAD, lat: BASE_LAT, until: now + 300 };
        tickPin();
      }
      if (dragging) {
        fly = null;
      } else if (fly) {
        // Turning to show something, the short way round, then holding still.
        const turn = ((fly.lon - state.lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        state.lon += turn * Math.min(1, dt * 3.4);
        state.lat += (fly.lat - state.lat) * Math.min(1, dt * 3.4);
        state.vel = 0;
        if (now > fly.until) fly = null;
      } else {
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
        touched = true;
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
      } else if (e.type === 'pointerup') {
        const [x, y] = local(e);
        if (overMoon(x, y)) {
          goToMoonsplit();
        } else {
          // A click or tap on the planet sends light there.
          const to = unproject(x, y, viewOf(state.lat, state.lon));
          if (to) { touched = true; aim(to); }
        }
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
    tickPin();
    setInterval(() => { tickPin(); if (onScreen && !running) draw(performance.now()); }, 15000);
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
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { stop(); return; }
      tickPin(); // timers slow down in background tabs, so catch the clock up first
      start();
      if (onScreen && !running) draw(performance.now());
    });
    onChange(reduceMotion, () => { if (reduceMotion.matches) { stop(); arcs = []; draw(performance.now()); } else start(); });
    const relayout = () => { resize(); if (!running) draw(performance.now()); };
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(canvas); else window.addEventListener('resize', relayout);
    document.fonts?.ready.then(relayout);
    themeWatchers.push(() => { sprites = dotSprites(palette()); draw(performance.now()); });

    resize();
    draw(performance.now());
    start();

    // The quick targets under the globe, the day button, and one hello for visitors from elsewhere.
    const toPlace = (name) => {
      const place = placeNamed(name);
      if (!place) return;
      touched = true;
      aim(place.v);
    };
    stage.querySelectorAll('[data-light-to]').forEach((b) => b.addEventListener('click', () => toPlace(b.dataset.lightTo)));
    dayBtn?.addEventListener('click', playDay);
    setDayLabel();
    onChange(reduceMotion, () => {
      clockShift = 0;
      lapse = null;
      setDayLabel();
      tickPin();
    });
    setInterval(() => { moonNow = moonPhase(Date.now()); }, 3600000);
    const guest = visitorPlace();
    if (guest && !reduceMotion.matches && kmBetween(HOME, guest.v) > 500) {
      setTimeout(() => {
        if (touched || !onScreen || document.hidden || window.scrollY > 120) return;
        aim(guest.v, { hello: guest.name });
      }, 3600);
    }

    // Palette commands can start anywhere on the page: go up to the globe first.
    const fromTop = (fn) => {
      const far = window.scrollY > 200;
      window.scrollTo({ top: 0, behavior: smooth() });
      setTimeout(fn, far && !reduceMotion.matches ? 700 : 0);
    };

    return {
      /** Gives the globe a good spin, for the palette. */
      spin() {
        window.scrollTo({ top: 0, behavior: smooth() });
        fly = null;
        state.vel = -5;
        if (reduceMotion.matches) { state.lon -= 1.5; draw(performance.now()); }
      },
      /** Sends light to a named place, for the palette. */
      sendTo(name) { fromTop(() => toPlace(name)); },
      /** Plays a day in ten seconds, for the palette. */
      day() { fromTop(playDay); },
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

    // A link straight to a project (pruthvip.tech/#sirius) opens its card and goes to the section.
    // A hidden panel can't be scrolled to, so the browser can't do this by itself.
    const fromHash = () => {
      let id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
      if (!id || !panels.some((p) => p.id === id)) return;
      api.select(id);
      document.getElementById('universe')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    const api = { select };
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('load', fromHash);
    fromHash();

    if (!ctx || !EARTH) return api;

    let sprites = dotSprites(palette());
    const KINDS = panels.map((p) => p.dataset.body); // moon, star, nebula, hole, quasar, well
    const ORBITS = [0.33, 0.46, 0.59, 0.72, 0.85, 0.97]; // share of the stage's half-width
    const SPEED = [0.3, 0.22, 0.17, 0.13, 0.1, 0.08]; // radians a second
    const angles = [0.4, 2.6, 4.1, 5.5, 1.5, 3.3];
    let fabric = 0; // 0 to 1: how much of the grid of spacetime shows (it fades in with Spacetime)
    let spin = null; // a sideways drag that turns all the orbits: { x, from, moved }
    const moonNow = moonPhase(Date.now());
    const TILT = -0.16;
    const FRONT = 0.8; // the chosen project glides round to the front, just right of the Earth
    const bodies = KINDS.map(() => ({ x: 0, y: 0, r: 0, front: true }));
    let w = 0;
    let h = 0;
    let dpr = 1;
    let halves = [];
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
      halves = labels.map((l) => l.offsetWidth / 2); // labels near the edge stay inside the stage
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

    /** Spacetime as a small world: a few rings, each smaller and lower, like a well seen from the side. */
    function drawWell(x, y, r) {
      const { well } = palette();
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) {
        const f = 1 - k * 0.25;
        ctx.strokeStyle = `rgba(${well}, ${(0.95 - k * 0.2).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.5 + k * k * r * 0.17, r * 1.5 * f, r * 0.52 * f, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${well}, .95)`;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.5 + 9 * r * 0.17 + r * 0.3, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    /** The fabric everything sits on: a grid in the plane of the orbits, sinking under the Earth,
        with a slow ripple running through it. It shows while Spacetime is the chosen project. */
    function drawFabric(cx, cy, Rx, squash, eR, t) {
      const { well } = palette();
      const LINES = 12;
      const STEPS = 28;
      const cosT = Math.cos(TILT);
      const sinT = Math.sin(TILT);
      const point = (u, v) => {
        const r2 = u * u + v * v;
        const dip = (eR * 1.5) / (1 + r2 / 0.035) + Math.sin(11 * Math.sqrt(r2) - t * 1.8) * Math.exp(-r2 * 3) * eR * 0.07;
        const ex = u * Rx * 1.04;
        const ey = v * Rx * 1.04 * squash + dip;
        return [cx + ex * cosT - ey * sinT, cy + ex * sinT + ey * cosT];
      };
      const fade = ctx.createRadialGradient(cx, cy, eR, cx, cy, Rx * 1.06);
      fade.addColorStop(0, `rgba(${well}, ${(0.55 * fabric).toFixed(3)})`);
      fade.addColorStop(0.55, `rgba(${well}, ${(0.2 * fabric).toFixed(3)})`);
      fade.addColorStop(1, `rgba(${well}, 0)`);
      ctx.strokeStyle = fade;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= LINES; i++) {
        const a = -1 + (2 * i) / LINES;
        for (let k = 0; k <= STEPS; k++) {
          const p = point(a, -1 + (2 * k) / STEPS);
          if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
        }
        for (let k = 0; k <= STEPS; k++) {
          const p = point(-1 + (2 * k) / STEPS, a);
          if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
        }
      }
      ctx.stroke();
    }

    const DRAW = {
      moon: (x, y, r) => drawMoonBall(ctx, x, y, r * 0.95, moonNow, palette().moonShade, palette().moonRim),
      star: drawStar,
      nebula: drawNebula,
      hole: drawHole,
      quasar: drawQuasar,
      well: drawWell,
    };

    draw = (now = performance.now()) => {
      if (!w) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      const narrow = w < 560; // phones get a shorter 8:5 stage
      const cx = w / 2;
      const cy = h * (narrow ? 0.44 : 0.5); // labels hang below the worlds, so lift them a little
      const Rx = w * 0.47;
      const squash = narrow ? 0.42 : 0.36;
      const eR = w * 0.086;
      const base = w * 0.0165;

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
      if (reduceMotion.matches) fabric = KINDS[current] === 'well' ? 1 : 0; // no fade without motion
      if (fabric > 0.01) drawFabric(cx, cy, Rx, squash, eR, t);
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
        l.style.left = `${clamp(b.x, halves[i] + 2, w - halves[i] - 2).toFixed(1)}px`;
        l.style.top = `${top.toFixed(1)}px`;
        l.style.opacity = hidden ? '0' : b.front || i === current ? '1' : '.7';
        l.style.visibility = hidden ? 'hidden' : 'visible';
        l.style.zIndex = b.front ? '2' : '1';
      });
    };

    function frame(now) {
      raf = 0;
      if (!running) return;
      raf = requestAnimationFrame(frame); // booked first, so an error while drawing can't stop the orbits
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!spin?.moved) {
        angles.forEach((a, i) => {
          if (i === current) {
            // Ease the chosen project round to the front of its orbit.
            let d = ((FRONT - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
            angles[i] = a + d * Math.min(1, dt * 2.2);
          } else {
            angles[i] = (a + SPEED[i] * pace * dt) % (2 * Math.PI);
          }
        });
      }
      fabric += ((KINDS[current] === 'well' ? 1 : 0) - fabric) * Math.min(1, dt * 3);
      earthLon -= 0.12 * dt;
      draw(now);
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
    // Dragging sideways turns all the orbits together (up and down still scrolls the page).
    let spunAt = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) spin = { id: e.pointerId, x: e.clientX, y: e.clientY, from: angles.slice(), moved: false };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!spin || e.pointerId !== spin.id) {
        canvas.style.cursor = nearest(e) >= 0 ? 'pointer' : 'grab';
        return;
      }
      const dx = e.clientX - spin.x;
      if (!spin.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - spin.y)) {
        spin.moved = true;
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('is-dragging');
      }
      if (!spin.moved) return;
      spin.from.forEach((a, i) => { angles[i] = a - dx / (w * 0.32); }); // the near side follows the pointer
      if (!running) draw();
    });
    const endSpin = (e) => {
      if (!spin || e.pointerId !== spin.id) return;
      if (spin.moved) spunAt = performance.now();
      spin = null;
      canvas.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', endSpin);
    canvas.addEventListener('pointercancel', endSpin);
    canvas.addEventListener('click', (e) => {
      if (performance.now() - spunAt < 350) return; // the end of a drag, not a click
      const i = nearest(e);
      if (i >= 0) select(i);
    });
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
    document.fonts?.ready.then(relayout); // label widths change once Archivo arrives
    themeWatchers.push(() => { sprites = dotSprites(palette()); draw(); });

    if (reduceMotion.matches) angles[current] = FRONT;
    resize();
    draw();
    start();
    api.select = (which) => {
      select(which);
      if (reduceMotion.matches) { angles[current] = FRONT; draw(); }
    };
    return api;
  }

  /* Project portraits: with scripts, each project's card opens on a window of sky with its
     namesake drawn in it, to the right of its name. Only the open card's picture runs, and only
     while it is on screen. The window is dark in both themes, so the colours here are fixed. */

  function initPortraits() {
    const tonight = moonPhase(Date.now());
    const hash = (n) => {
      const s = Math.sin(n * 127.1) * 43758.5453;
      return s - Math.floor(s);
    };
    /** A few faint stars, the same ones every frame. */
    const specks = (c, w, h, seed) => {
      for (let i = 0; i < 46; i++) {
        c.fillStyle = `rgba(214, 226, 255, ${(0.15 + hash(seed + i * 3) * 0.5).toFixed(2)})`;
        c.beginPath();
        c.arc(hash(seed + i * 3 + 1) * w, hash(seed + i * 3 + 2) * h, 0.4 + hash(seed + i * 7) * 0.8, 0, 2 * Math.PI);
        c.fill();
      }
    };
    /** A round glow: stops are [position, colour] pairs. */
    const glow = (c, x, y, r, stops) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      stops.forEach(([at, colour]) => g.addColorStop(at, colour));
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, 2 * Math.PI);
      c.fill();
    };

    const ART = {
      /* Moonsplit: the Moon at tonight's real phase. */
      moon(c, w, h, t) {
        specks(c, w, h, 3);
        const r = h * 0.33;
        const x = w * 0.76;
        const y = h * 0.5 + Math.sin(t * 0.5) * 1.5;
        glow(c, x, y, r * 2.3, [[0, 'rgba(200, 215, 245, .14)'], [1, 'rgba(200, 215, 245, 0)']]);
        drawMoonBall(c, x, y, r, tonight, 'rgba(5, 7, 15, .76)');
      },

      /* Sirius: blue-white and twinkling, with Sirius B, its faint companion, in a slow orbit. */
      star(c, w, h, t) {
        specks(c, w, h, 5);
        const x = w * 0.76;
        const y = h * 0.5;
        const twinkle = 1 + 0.06 * Math.sin(t * 5.3) + 0.04 * Math.sin(t * 8.1);
        c.globalCompositeOperation = 'lighter';
        glow(c, x, y, h * 0.6 * twinkle, [[0, 'rgba(210, 232, 255, .95)'], [0.12, 'rgba(150, 200, 255, .5)'], [1, 'rgba(90, 160, 255, 0)']]);
        c.lineWidth = 1.2;
        [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.42], [-Math.PI / 4, 0.42]].forEach(([a, k]) => {
          const dx = Math.cos(a) * h * 0.88 * k * twinkle;
          const dy = Math.sin(a) * h * 0.88 * k * twinkle;
          const spike = c.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
          spike.addColorStop(0, 'rgba(190, 220, 255, 0)');
          spike.addColorStop(0.5, 'rgba(235, 245, 255, .9)');
          spike.addColorStop(1, 'rgba(190, 220, 255, 0)');
          c.strokeStyle = spike;
          c.beginPath();
          c.moveTo(x - dx, y - dy);
          c.lineTo(x + dx, y + dy);
          c.stroke();
        });
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(x, y, h * 0.045, 0, 2 * Math.PI);
        c.fill();
        c.fillStyle = 'rgba(222, 236, 255, .9)';
        c.beginPath();
        c.arc(x + Math.cos(t * 0.35) * h * 0.3, y + Math.sin(t * 0.35) * h * 0.11, 1.6, 0, 2 * Math.PI);
        c.fill();
      },

      /* CodeNebula: drifting clouds in its purple, cyan and pink, with new stars flickering on. */
      nebula(c, w, h, t) {
        specks(c, w, h, 9);
        c.globalCompositeOperation = 'lighter';
        [[0.66, 0.5, 0.86, '168, 85, 247'], [0.8, 0.4, 0.72, '34, 211, 238'], [0.88, 0.64, 0.66, '236, 72, 153'], [0.72, 0.68, 0.58, '99, 102, 241']].forEach(([fx, fy, size, colour], k) => {
          const x = w * fx + Math.cos(t * 0.22 + k * 1.7) * h * 0.08;
          const y = h * fy + Math.sin(t * 0.18 + k * 2.3) * h * 0.07;
          glow(c, x, y, h * size, [[0, `rgba(${colour}, .4)`], [1, `rgba(${colour}, 0)`]]);
        });
        c.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 9; i++) {
          const a = 0.5 + 0.5 * Math.sin(t * (1.2 + hash(i * 3 + 3) * 2) + i);
          c.fillStyle = `rgba(255, 255, 255, ${(0.3 + 0.65 * a).toFixed(2)})`;
          c.beginPath();
          c.arc(w * (0.56 + 0.4 * hash(i * 3 + 1)), h * (0.18 + 0.64 * hash(i * 3 + 2)), 0.8 + a * 0.9, 0, 2 * Math.PI);
          c.fill();
        }
      },

      /* Gravitone: a black hole and its disk, with devices in one orbit pulsing on one beat. */
      hole(c, w, h, t) {
        specks(c, w, h, 13);
        const x = w * 0.76;
        const y = h * 0.5;
        const r = h * 0.19;
        const tilt = -0.2;
        const disk = (from, to) => {
          [['155, 107, 255', 3.3, 0.24], ['255, 138, 60', 2.75, 0.42], ['255, 200, 97', 2.2, 0.62], ['255, 244, 220', 1.72, 0.85]].forEach(([colour, k, alpha]) => {
            c.strokeStyle = `rgba(${colour}, ${alpha})`;
            c.lineWidth = r * 0.34;
            c.beginPath();
            c.ellipse(x, y, r * k, r * k * 0.24, tilt, from, to);
            c.stroke();
          });
        };
        c.globalCompositeOperation = 'lighter';
        glow(c, x, y, r * 4.2, [[0, 'rgba(255, 150, 70, .3)'], [0.24, 'rgba(255, 150, 70, .3)'], [1, 'rgba(124, 92, 255, 0)']]);
        c.globalCompositeOperation = 'source-over';
        disk(Math.PI, 2 * Math.PI); // the far half of the disk, behind the hole
        c.strokeStyle = 'rgba(255, 210, 130, .7)'; // light from behind, bent over the top
        c.lineWidth = r * 0.16;
        c.beginPath();
        c.arc(x, y, r * 1.2, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
        c.fillStyle = '#000';
        c.beginPath();
        c.arc(x, y, r, 0, 2 * Math.PI);
        c.fill();
        c.strokeStyle = 'rgba(255, 230, 190, .9)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(x, y, r * 1.04, 0, 2 * Math.PI);
        c.stroke();
        disk(0, Math.PI); // the near half, in front
        const beat = Math.max(0, Math.sin(t * Math.PI * 2)) ** 6; // one beat a second
        for (let i = 0; i < 5; i++) {
          const a = t * 0.5 + (i * 2 * Math.PI) / 5;
          const ex = Math.cos(a) * r * 4.3;
          const ey = Math.sin(a) * r * 4.3 * 0.24;
          const px = x + ex * Math.cos(tilt) - ey * Math.sin(tilt);
          const py = y + ex * Math.sin(tilt) + ey * Math.cos(tilt);
          if (Math.sin(a) < 0 && Math.hypot(px - x, py - y) < r) continue; // behind the hole
          c.fillStyle = `rgba(196, 178, 255, ${(0.6 + 0.4 * beat).toFixed(2)})`;
          c.beginPath();
          c.arc(px, py, 1.8 + beat * 1.6, 0, 2 * Math.PI);
          c.fill();
        }
      },

      /* Quasar: a core too bright to look at, and signals running out along its two jets. */
      quasar(c, w, h, t) {
        specks(c, w, h, 17);
        const x = w * 0.76;
        const y = h * 0.52;
        const dx = Math.cos(-1.05);
        const dy = Math.sin(-1.05);
        const reach = h * 0.95;
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = 'rgba(120, 150, 255, .1)'; // the galaxy it lives in
        c.beginPath();
        c.ellipse(x, y, h * 0.6, h * 0.19, -1.05 + Math.PI / 2, 0, 2 * Math.PI);
        c.fill();
        c.lineCap = 'round';
        [1, -1].forEach((dir) => {
          const ex = x + dx * reach * dir;
          const ey = y + dy * reach * dir;
          const jet = c.createLinearGradient(x, y, ex, ey);
          jet.addColorStop(0, 'rgba(34, 211, 238, .9)');
          jet.addColorStop(1, 'rgba(34, 211, 238, 0)');
          c.strokeStyle = jet;
          c.lineWidth = h * 0.05;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(ex, ey);
          c.stroke();
          for (let i = 0; i < 3; i++) {
            const p = (t * 0.45 + i / 3) % 1;
            c.fillStyle = `rgba(251, 191, 36, ${(0.95 * (1 - p)).toFixed(2)})`;
            c.beginPath();
            c.arc(x + dx * reach * p * dir, y + dy * reach * p * dir, 2 + (1 - p) * 1.4, 0, 2 * Math.PI);
            c.fill();
          }
        });
        c.lineCap = 'butt';
        glow(c, x, y, h * 0.36, [[0, 'rgba(210, 245, 255, .95)'], [0.3, 'rgba(34, 211, 238, .45)'], [1, 'rgba(34, 211, 238, 0)']]);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(x, y, h * 0.04, 0, 2 * Math.PI);
        c.fill();
      },

      /* Spacetime: its "well". A sheet sinks in the middle, rippling, and a photo spirals in. */
      well(c, w, h, t) {
        const x0 = w * 0.74;
        const y0 = h * 0.26;
        const LINES = 13;
        const STEPS = 30;
        const point = (u, v) => {
          const r2 = u * u + v * v;
          const ripple = Math.sin(10 * Math.sqrt(r2) + t * 2) * Math.exp(-r2 * 2.5) * h * 0.02;
          return [x0 + (u - v) * h * 0.72, y0 + (u + v) * h * 0.17 + (h * 0.5) / (1 + r2 / 0.06) + ripple];
        };
        const fade = c.createRadialGradient(x0, y0 + h * 0.32, 0, x0, y0 + h * 0.32, h * 1.25);
        fade.addColorStop(0, 'rgba(43, 228, 176, .95)');
        fade.addColorStop(0.5, 'rgba(43, 228, 176, .4)');
        fade.addColorStop(1, 'rgba(43, 228, 176, 0)');
        c.strokeStyle = fade;
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i <= LINES; i++) {
          const a = -1 + (2 * i) / LINES;
          for (let k = 0; k <= STEPS; k++) {
            const p = point(a, -1 + (2 * k) / STEPS);
            if (k) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]);
          }
          for (let k = 0; k <= STEPS; k++) {
            const p = point(-1 + (2 * k) / STEPS, a);
            if (k) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]);
          }
        }
        c.stroke();
        const fall = (t * 0.16) % 1;
        const p = point(Math.cos(fall * 9) * 0.8 * (1 - fall), Math.sin(fall * 9) * 0.8 * (1 - fall));
        c.fillStyle = `rgba(236, 255, 248, ${(0.3 + 0.7 * fall).toFixed(2)})`;
        c.beginPath();
        c.arc(p[0], p[1], 2.2, 0, 2 * Math.PI);
        c.fill();
      },
    };

    document.querySelectorAll('.project').forEach((project) => {
      const canvas = project.querySelector('[data-art]');
      const paint = ART[project.dataset.body];
      const c = canvas?.getContext?.('2d');
      if (!c || !paint) return;
      let size = { w: 0, h: 0 };
      const loop = makeLoop(canvas, (now) => {
        if (!size.w) return;
        c.clearRect(0, 0, size.w, size.h);
        paint(c, size.w, size.h, now / 1000);
      });
      const fit = () => {
        size = fitCanvas(canvas, c);
        loop.once();
      };
      if ('ResizeObserver' in window) new ResizeObserver(fit).observe(canvas); else window.addEventListener('resize', fit);
      fit();
    });

    // Moonsplit's caption gives tonight's real phase, in Moonsplit's own voice.
    const cap = document.querySelector('[data-moon-cap]');
    if (cap) {
      const phase = tonight.name === 'new' ? 'new Moon' : tonight.name === 'full' ? 'full Moon' : tonight.name;
      cap.textContent = `Tonight: ${phase}, ${Math.round(tonight.lit * 100)}% lit. Rent: still 100% due.`;
    }
  }

  /* Experience: the timeline's thread lights up as the page scrolls through it, and time served
     is worked out from the start date, so it never goes stale. ------------------------------- */

  const timeline = document.querySelector('.timeline');
  if (timeline) {
    scrollFx.push((y, vh) => {
      const r = timeline.getBoundingClientRect();
      timeline.style.setProperty('--tl', clamp((vh * 0.62 - r.top) / r.height, 0, 1).toFixed(3));
    });
  }

  const monthsSince = (ym) => {
    const [year, month] = ym.split('-').map(Number);
    const now = new Date();
    return (now.getFullYear() - year) * 12 + now.getMonth() + 1 - month;
  };
  document.querySelectorAll('[data-tenure]').forEach((el) => {
    const months = monthsSince(el.dataset.tenure);
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    if (yrs < 1) return;
    el.textContent = mos ? `${yrs} yr${yrs > 1 ? 's' : ''} ${mos} mo${mos > 1 ? 's' : ''}` : `${yrs} year${yrs > 1 ? 's' : ''}`;
  });
  document.querySelectorAll('[data-count][data-since]').forEach((el) => {
    const yrs = Math.floor(monthsSince(el.dataset.since) / 12);
    if (yrs < 1) return;
    el.dataset.count = String(yrs);
    el.textContent = String(yrs);
  });

  /* Cards are lit from the pointer, the way the Sun lights the globe: a soft glow under it and a
     brighter edge beside it (see .lit in the stylesheet). Only where there is a mouse. */

  if (finePointer.matches) {
    document.querySelectorAll('.card, .tl-card, .project, .focus li, .skill-group, .edu li, .topo').forEach((el) => el.classList.add('lit'));
    let lit = null;
    let at = null;
    let queued = false;
    const paint = () => {
      queued = false;
      if (!lit || !at) return;
      const r = lit.getBoundingClientRect();
      lit.style.setProperty('--mx', `${(at.clientX - r.left).toFixed(0)}px`);
      lit.style.setProperty('--my', `${(at.clientY - r.top).toFixed(0)}px`);
      lit.classList.add('is-lit');
    };
    document.addEventListener('pointermove', (e) => {
      const el = e.pointerType === 'mouse' ? e.target.closest?.('.lit') : null;
      if (lit && lit !== el) lit.classList.remove('is-lit');
      lit = el || null;
      at = e;
      if (lit && !queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      lit?.classList.remove('is-lit');
      lit = null;
    });
  }

  /* Work cards: each card's little picture only moves while the card is on screen. */

  const workCards = document.querySelectorAll('.card');
  if ('IntersectionObserver' in window) {
    const liveCards = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-live', entry.isIntersecting));
    });
    workCards.forEach((card) => liveCards.observe(card));
  } else {
    workCards.forEach((card) => card.classList.add('is-live'));
  }

  /* Skills: a chip with a data-used line says where the skill was used, on hover, focus or tap.
     The chips share one stop in the tab order; the arrow keys move between them. */

  const skillBox = document.querySelector('.skills');
  const skillChips = skillBox ? [...skillBox.querySelectorAll('li[data-used]')] : [];
  if (skillChips.length) {
    const tip = document.createElement('p');
    tip.className = 'skill-tip';
    tip.id = 'skill-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    skillBox.append(tip);
    let open = null;
    const hide = () => {
      if (!open) return;
      open.removeAttribute('aria-describedby');
      open.classList.remove('is-open');
      open = null;
      tip.hidden = true;
    };
    const show = (chip) => {
      if (open === chip) return;
      hide();
      open = chip;
      tip.textContent = chip.dataset.used;
      tip.hidden = false;
      chip.setAttribute('aria-describedby', tip.id);
      chip.classList.add('is-open');
      const box = skillBox.getBoundingClientRect();
      const c = chip.getBoundingClientRect();
      const above = c.top - tip.offsetHeight - 10 > 76; // below the chip when the header would cover it
      tip.style.left = `${clamp(c.left - box.left + c.width / 2 - tip.offsetWidth / 2, 0, box.width - tip.offsetWidth)}px`;
      tip.style.top = `${above ? c.top - box.top - tip.offsetHeight - 9 : c.bottom - box.top + 9}px`;
    };
    skillChips.forEach((chip, i) => {
      chip.tabIndex = i === 0 ? 0 : -1;
      chip.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(chip); });
      chip.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
      chip.addEventListener('focus', () => show(chip));
      chip.addEventListener('blur', hide);
      chip.addEventListener('click', () => show(chip));
      chip.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = skillChips[(i + step + skillChips.length) % skillChips.length];
        skillChips.forEach((c) => { c.tabIndex = -1; });
        next.tabIndex = 0;
        next.focus();
      });
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    document.addEventListener('pointerdown', (e) => { if (open && !e.target.closest?.('li[data-used]')) hide(); });
    document.querySelectorAll('[data-skill-verb]').forEach((el) => { el.textContent = finePointer.matches ? 'Hover over' : 'Tap'; });
  }

  /* A running count under the stats: what 1,250 orders a second adds up to since the page opened. */

  const liveEl = document.querySelector('[data-live]');
  const liveCount = liveEl?.querySelector('[data-live-count]');
  if (liveEl && liveCount) {
    liveEl.hidden = false;
    let timer = 0;
    let seen = !('IntersectionObserver' in window);
    const tick = () => { liveCount.textContent = fmt((performance.now() / 1000) * ORDERS_PER_S); };
    const run = () => {
      clearInterval(timer);
      if (!seen || document.hidden) return;
      tick();
      timer = setInterval(tick, reduceMotion.matches ? 1000 : 90);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        seen = entries[entries.length - 1].isIntersecting;
        run();
      }).observe(liveEl);
    }
    document.addEventListener('visibilitychange', run);
    onChange(reduceMotion, run);
    run();
  }

  /* Local time in Gandhinagar ---------------------------------------------- */

  const clockEl = document.querySelector('[data-clock]');
  if (clockEl) {
    /** How far the visitor's clock is from India's (UTC+5:30), in words; nothing when they match. */
    const gap = () => {
      const mins = -new Date().getTimezoneOffset() - 330;
      if (!mins) return '';
      const whole = Math.floor(Math.abs(mins) / 60);
      const rest = Math.abs(mins) % 60;
      const part = { 15: '¼', 30: '½', 45: '¾' }[rest] || '';
      const amount = whole ? `${whole}${part} hour${whole === 1 && !part ? '' : 's'}` : rest === 30 ? 'half an hour' : `${rest} minutes`;
      return ` You're ${amount} ${mins < 0 ? 'behind' : 'ahead'}.`;
    };
    const tick = () => { clockEl.textContent = `It's ${gandhinagarTime()} here in Gandhinagar right now.${gap()}`; };
    tick();
    setInterval(tick, 15000);
  }

  /* Contact: a Sun rises behind the Earth's edge as the section scrolls into view. */

  const contact = document.getElementById('contact');
  if (contact) {
    scrollFx.push((y, vh) => {
      const r = contact.getBoundingClientRect();
      contact.style.setProperty('--rise', clamp((vh - r.top) / (r.height * 0.9), 0, 1).toFixed(3));
    });
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

  const fmtTime = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);
  let openPerf = null; // opens "This page, measured" (set at the bottom, by initPerf)

  const loadEl = document.querySelector('[data-loadtime]');
  if (loadEl && window.performance && performance.getEntriesByType) {
    window.addEventListener('load', () => setTimeout(() => {
      const entry = performance.getEntriesByType('navigation')[0];
      const ms = entry ? entry.loadEventEnd || entry.domContentLoadedEventEnd : 0;
      if (!ms) return;
      if (!openPerf) { loadEl.textContent = `, loaded in ${fmtTime(ms)}`; return; }
      // The figure is a button: it opens the page's other numbers.
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'foot-perf';
      btn.textContent = `loaded in ${fmtTime(ms)}`;
      btn.title = 'See this page measured';
      btn.addEventListener('click', () => openPerf());
      loadEl.replaceChildren(', ', btn);
    }, 0));
  }

  /* "This page, measured": the page reads its own numbers in the visitor's browser. Whatever a
     browser can't tell it (largest paint, sizes when opened from a file) is simply left out. */

  function initPerf() {
    const dialog = document.querySelector('[data-perf]');
    if (!dialog || typeof dialog.showModal !== 'function' || !window.performance?.getEntriesByType) return null;
    const tiles = dialog.querySelector('[data-perf-tiles]');
    const fpsEl = dialog.querySelector('[data-perf-fps]');
    const spark = dialog.querySelector('[data-perf-spark]');
    const sparkLine = spark.querySelector('.spark-line');
    const sparkArea = spark.querySelector('.spark-area');
    const sparkDot = spark.querySelector('.spark-dot');
    const note = dialog.querySelector('[data-perf-note]');
    const KEEP = 120; // frames in the trace

    let largest = 0; // the largest paint so far, where the browser reports it
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) largest = entries[entries.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { /* this browser doesn't report it */ }

    function tile(label, value, sub) {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      wrap.append(dt, dd);
      if (sub) {
        const more = document.createElement('dd');
        more.className = 'perf-sub';
        more.textContent = sub;
        wrap.append(more);
      }
      return wrap;
    }

    let trip = 0; // the median round trip to the server, once measured
    function render() {
      const nav = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint');
      const files = performance.getEntriesByType('resource').filter((f) => !f.name.includes('trip=')); // not the timing requests below
      const bytes = (nav?.encodedBodySize || 0) + files.reduce((sum, f) => sum + (f.encodedBodySize || 0), 0);
      const loaded = nav ? nav.loadEventEnd || nav.domContentLoadedEventEnd : 0;
      const out = [];
      if (loaded) out.push(tile('Loaded in', fmtTime(loaded), nav.responseStart > 0 ? `first byte after ${fmtTime(nav.responseStart)}` : ''));
      if (paint) out.push(tile('First paint', fmtTime(paint.startTime)));
      if (largest) out.push(tile('Largest paint', fmtTime(largest)));
      if (bytes) out.push(tile('Page weight', `${fmt(bytes / 1024)} KB`, `${files.length + 1} files, as sent`));
      if (trip) out.push(tile('Round trip to the server', fmtTime(trip), `one order here: ${ORDER_MS} ms`));
      tiles.replaceChildren(...out);
    }

    /** Five tiny requests for the favicon, timed; the middle one is the round trip. */
    async function measureTrip() {
      if (trip || !/^https?:$/.test(location.protocol)) return;
      const times = [];
      try {
        for (let i = 0; i < 5; i++) {
          const t0 = performance.now();
          await fetch(`favicon.svg?trip=${Date.now()}${i}`, { method: 'HEAD', cache: 'no-store' });
          times.push(performance.now() - t0);
        }
      } catch (e) { return; }
      trip = times.sort((a, b) => a - b)[2];
      if (dialog.open) render();
    }

    // The live trace: how long each recent frame took.
    let frames = [];
    let lastFrame = 0;
    let raf = 0;
    function trace() {
      const W = spark.clientWidth || 400;
      const H = 56;
      spark.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const top = Math.max(34, ...frames); // the scale: at least two 60 Hz frames tall
      const pts = frames.map((f, i) => [(i / (KEEP - 1)) * (W - 8) + 4, H - 5 - (f / top) * (H - 12)]);
      const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
      const end = pts[pts.length - 1];
      sparkLine.setAttribute('d', line);
      sparkArea.setAttribute('d', `${line}L${end[0].toFixed(1)} ${H}L4 ${H}Z`);
      sparkDot.setAttribute('cx', end[0].toFixed(1));
      sparkDot.setAttribute('cy', end[1].toFixed(1));
      const average = frames.reduce((a, b) => a + b, 0) / frames.length;
      fpsEl.textContent = `${Math.round(1000 / average)} fps`;
      note.textContent = `Slowest of the last ${frames.length} frames: ${Math.max(...frames).toFixed(1)} ms. A 60 Hz screen allows 16.7 ms a frame; an order here takes ${ORDER_MS} ms.`;
    }
    function frame(now) {
      if (lastFrame) frames.push(now - lastFrame);
      if (frames.length > KEEP) frames.shift();
      lastFrame = now;
      if (frames.length > 4 && frames.length % 5 === 0) trace();
      // With reduced motion the trace is taken once, over a second, and then left still.
      if (reduceMotion.matches && frames.length >= 60) { trace(); return; }
      raf = requestAnimationFrame(frame);
    }

    const open = () => {
      if (dialog.open) return;
      render();
      dialog.showModal();
      frames = [];
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
      measureTrip();
    };
    dialog.addEventListener('close', () => cancelAnimationFrame(raf));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.querySelector('[data-perf-close]')?.addEventListener('click', () => dialog.close());
    return open;
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
    // Where each consumer's messages come from. With all of its sources off, it goes quiet.
    const SOURCES = { bc: ['md'], sr: ['md'], nt: ['or', 'pay'] };
    const starved = (id) => Boolean(SOURCES[id]?.every((s) => down.has(s)));

    const nodes = {};
    svg.querySelectorAll('[data-node]').forEach((g) => { nodes[g.getAttribute('data-node')] = g; });
    const links = {}; // the arrows that belong to each service, so they can show it switched off
    svg.querySelectorAll('[data-for]').forEach((el) => { (links[el.dataset.for] ||= []).push(el); });

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

    function spawn(path, kind, onArrive, speed = SPEED, mine = false) {
      const small = kind === 'fan';
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `pk pk-${small ? 'md' : kind}${mine ? ' pk-me' : ''}`); // pk-me: the visitor's own order
      const halo = document.createElementNS(NS, 'circle');
      halo.setAttribute('class', 'pk-halo');
      halo.setAttribute('r', small ? '3.8' : mine ? '8.5' : '6');
      const core = document.createElementNS(NS, 'circle');
      core.setAttribute('r', small ? '1.8' : mine ? '3.6' : '2.6');
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
      drawBadge(id, true);
      refreshStatus();
      if (tipFor === id) showTip(id);
    }

    /** The "12 waiting" badge on a switched-off consumer's link; it bumps as each message joins. */
    function drawBadge(id, bump = false) {
      let badge = badges[id];
      if (!held[id]) { badge?.remove(); delete badges[id]; return; }
      if (!badge) {
        const [x, y] = INFO[id].badge;
        badge = document.createElementNS(NS, 'g');
        badge.setAttribute('class', 't-queue');
        badge.setAttribute('transform', `translate(${x} ${y})`);
        badge.setAttribute('aria-hidden', 'true');
        const inner = document.createElementNS(NS, 'g'); // scaled for the bump; the outer group holds the position
        inner.setAttribute('class', 't-queue-in');
        inner.append(document.createElementNS(NS, 'rect'), document.createElementNS(NS, 'text'));
        badge.append(inner);
        svg.insertBefore(badge, layer);
        badges[id] = badge;
      }
      if (bump && !reduceMotion.matches) {
        badge.firstChild.animate?.([{ transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
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
      raf = requestAnimationFrame(frame); // booked first, so an error in one step can't stop the diagram
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

    // With reduced motion nothing travels, but messages for a switched-off service still pile up.
    setInterval(() => {
      if (!reduceMotion.matches || !onScreen || document.hidden) return;
      let changed = false;
      down.forEach((id) => {
        if (!isConsumer(id) || starved(id)) return;
        held[id]++;
        drawBadge(id);
        changed = true;
      });
      if (changed) refreshStatus();
    }, 1200);

    /* Switching services off and back on. */

    const statusEl = figure.querySelector('[data-topo-status]');
    const hintEl = figure.querySelector('[data-topo-hint]');
    const resetBtn = figure.querySelector('[data-topo-reset]');
    const live = document.createElement('span');
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');
    figure.append(live);
    let quietUntil = 0;
    if (hintEl) hintEl.textContent = ` · ${verb()} a box to switch it off`;

    /** The status line: overall health, and a way back when anything is off. */
    function refreshStatus() {
      figure.classList.toggle('is-degraded', down.size > 0);
      if (hintEl) hintEl.hidden = down.size > 0;
      if (resetBtn) resetBtn.hidden = down.size === 0;
      if (!statusEl || Date.now() < quietUntil) return;
      const waiting = held.bc + held.nt + held.sr;
      statusEl.textContent = down.size
        ? `${down.size} switched off${waiting ? ` · ${waiting} waiting` : ''}`
        : 'all systems running';
    }

    /** A consumer whose sources are all off stays on, but shows that nothing new is coming. */
    function refreshIdle() {
      Object.keys(SOURCES).forEach((id) => {
        const idle = !down.has(id) && starved(id);
        nodes[id].classList.toggle('is-idle', idle);
        if (!down.has(id)) setSub(id, idle ? (id === 'nt' ? 'no new events' : 'no new prices') : null);
      });
    }

    function announce(text, hold = 3500) {
      live.textContent = text;
      if (statusEl) statusEl.textContent = text;
      quietUntil = Date.now() + hold;
      setTimeout(refreshStatus, hold + 100);
    }

    function setSub(id, text) {
      const sub = nodes[id].querySelector('.t-sub');
      if (!sub) return;
      if (!sub.dataset.text) sub.dataset.text = sub.textContent;
      sub.textContent = text ?? sub.dataset.text;
    }

    function label(id) {
      const state = down.has(id)
        ? 'switched off. Press to turn it back on'
        : `${starved(id) ? 'running, but nothing new is arriving' : 'running'}. Press to switch it off`;
      nodes[id].setAttribute('aria-label', `${INFO[id].name}, ${state}. ${INFO[id].what}`);
    }

    function takeDown(id) {
      down.add(id);
      nodes[id].classList.remove('is-hit', 'ev', 'is-idle');
      delete hitUntil[id];
      nodes[id].classList.add('is-down');
      links[id]?.forEach((l) => l.classList.add('is-off'));
      setSub(id, 'switched off');
      announce(isConsumer(id)
        ? `${INFO[id].name} is off. Its messages wait safely in JetStream.`
        : `${INFO[id].name} is off: ${INFO[id].stops}.`);
    }

    /** Turns a service back on and replays what waited for it. Returns how many messages that was. */
    function restore(id, { quiet = false } = {}) {
      down.delete(id);
      nodes[id].classList.remove('is-down');
      links[id]?.forEach((l) => l.classList.remove('is-off'));
      setSub(id, null);
      const n = held[id] || 0;
      if (n) {
        held[id] = 0;
        drawBadge(id);
        for (let i = 0; i < Math.min(n, 30); i++) after(i * 75, () => spawn(REPLAY[id], INFO[id].kind, () => arrive(id, i)));
      }
      const mine = id === 'nt' ? mineHeld : 0; // the visitor's own alerts were among them
      if (id === 'nt') mineHeld = 0;
      const others = n - mine;
      if (quiet) return n;
      if (mine) announce(`notify is back. Your alert arrived${others > 0 ? `, with ${others} other${others === 1 ? '' : 's'}` : ''}.`, 5000);
      else announce(n ? `${INFO[id].name} is back. ${n} waiting message${n === 1 ? '' : 's'} delivered.` : `${INFO[id].name} is back on.`);
      return n;
    }

    /* "Send an order": the visitor's own order, brighter than the rest, goes from the users to
       orders and on to notify, and the status line says what became of it. */

    let mineHeld = 0; // the visitor's alerts waiting in JetStream for notify
    let mineFlying = 0;

    function landMine() {
      if (down.has('nt')) {
        mineHeld++;
        held.nt++;
        drawBadge('nt', true);
        refreshStatus();
        announce('your order: done in about 250 µs. Its alert waits in JetStream until notify is back.', 6000);
        return;
      }
      arrive('nt');
      announce('your order: done in about 250 µs, alert sent.', 5000);
    }

    function sendMine() {
      figure.scrollIntoView({ behavior: smooth(), block: 'nearest' });
      Object.values(nodes).forEach((g) => g.classList.remove('is-suggested'));
      if (down.has('or')) {
        announce("orders is off, so your order can't go through. Turn it back on.", 5000);
        return;
      }
      if (reduceMotion.matches) { landMine(); return; } // nothing travels: only what became of it
      if (mineFlying >= 4) return;
      mineFlying++;
      spawn(ROUTES.order, 'ev', () => {
        if (down.has('or')) {
          mineFlying--;
          announce('orders went off before your order got there.', 5000);
          return;
        }
        hit('or', 'ev');
        after(70, () => spawn((down.has('nt') ? HELD : ROUTES).orderToNotify, 'ev', () => {
          mineFlying--;
          landMine();
        }, SPEED, true));
      }, SPEED, true);
    }
    document.querySelectorAll('[data-topo-send]').forEach((b) => b.addEventListener('click', sendMine));

    /** Scrolls to the diagram and pulses one part of it: a service's id, 'bus' or 'all'. */
    function spotlight(what) {
      figure.scrollIntoView({ behavior: smooth(), block: 'center' });
      const targets = what === 'all' ? Object.values(nodes) : [what === 'bus' ? svg.querySelector('.t-bus') : nodes[what]];
      targets.forEach((el) => {
        if (!el) return;
        el.classList.remove('is-spot');
        void el.getBoundingClientRect(); // restart the pulse
        el.classList.add('is-spot');
        setTimeout(() => el.classList.remove('is-spot'), 2800);
      });
    }
    document.querySelectorAll('[data-spot]').forEach((b) => b.addEventListener('click', () => spotlight(b.dataset.spot)));

    function settle(id) {
      Object.values(nodes).forEach((g) => g.classList.remove('is-suggested')); // they've found it
      refreshIdle();
      Object.keys(INFO).forEach(label);
      refreshStatus();
      if (id && tipFor === id) showTip(id);
    }

    function toggle(id) {
      if (down.has(id)) restore(id); else takeDown(id);
      settle(id);
    }

    resetBtn?.addEventListener('click', () => {
      const n = [...down].reduce((sum, id) => sum + restore(id, { quiet: true }), 0);
      settle(null);
      announce(n ? `everything is back on. ${n} waiting message${n === 1 ? '' : 's'} delivered.` : 'everything is back on.');
    });

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
      // Open on the side away from the bus, so the tip never hides the queue it describes.
      const lower = nr.top + nr.height / 2 > fr.top + fr.height / 2;
      let top = lower ? nr.bottom - fr.top + 8 : nr.top - fr.top - tip.offsetHeight - 8;
      if (!lower && top < 8) top = nr.bottom - fr.top + 8;
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
    nodes.nt?.classList.add('is-suggested'); // Notify is the fun one: its messages queue up
    refreshStatus();
    start();

    return {
      /** Sends the visitor's own order through, for the palette. */
      send() {
        figure.scrollIntoView({ behavior: smooth(), block: 'center' });
        setTimeout(sendMine, reduceMotion.matches ? 0 : 500);
      },
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

    /* The report: this visit's last five runs as thin columns from one baseline. The best run is
       the accent colour and the only one labelled; the others answer on hover or focus, and a
       hidden list repeats every value for screen readers. */
    const runsBox = dialog.querySelector('[data-race-runs]');
    const barsEl = dialog.querySelector('[data-race-bars]');
    const summaryEl = dialog.querySelector('[data-race-summary]');
    const listEl = dialog.querySelector('[data-race-list]');
    const runs = [];
    const tipEl = document.createElement('span');
    tipEl.className = 'race-tip';
    tipEl.hidden = true;
    tipEl.setAttribute('aria-hidden', 'true');
    runsBox?.append(tipEl);
    const strong = (text) => {
      const el = document.createElement('b');
      el.textContent = text;
      return el;
    };
    const hideTip = () => { tipEl.hidden = true; };
    function showTip(bar, i, value) {
      tipEl.replaceChildren(strong(ms(value)), ` run ${i + 1}`);
      tipEl.hidden = false;
      const box = runsBox.getBoundingClientRect();
      const r = bar.getBoundingClientRect();
      const half = tipEl.offsetWidth / 2; // keep the whole tip inside the box
      tipEl.style.left = `${clamp(r.left - box.left + r.width / 2, half, box.width - half)}px`;
      tipEl.style.top = `${r.top - box.top - 6}px`;
    }
    function renderRuns() {
      if (!runsBox || !runs.length) return;
      runsBox.hidden = false;
      hideTip();
      const slowest = Math.max(...runs);
      const quickest = Math.min(...runs);
      barsEl.replaceChildren(...runs.map((value, i) => {
        const bar = document.createElement('span');
        const isBest = value === quickest;
        bar.className = `race-bar${isBest ? ' is-best' : ''}`;
        bar.style.height = `${Math.max(6, (value / slowest) * 100)}%`;
        bar.tabIndex = 0;
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `Run ${i + 1}: ${ms(value)}${isBest ? ', the best' : ''}`);
        if (isBest) bar.append(strong(ms(value)));
        bar.addEventListener('pointerenter', () => showTip(bar, i, value));
        bar.addEventListener('focus', () => showTip(bar, i, value));
        bar.addEventListener('pointerleave', hideTip);
        bar.addEventListener('blur', hideTip);
        return bar;
      }));
      listEl.replaceChildren(...runs.map((value) => {
        const li = document.createElement('li');
        li.textContent = ms(value);
        return li;
      }));
      const average = runs.reduce((a, b) => a + b, 0) / runs.length;
      if (runs.length < 2) summaryEl.replaceChildren('One run so far. Race again to see how steady you are.');
      else summaryEl.replaceChildren(`Last ${runs.length} runs: average `, strong(ms(average)), ', best ', strong(ms(quickest)), ', spread ', strong(ms(slowest - quickest)), '.');
    }

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
        const laps = took / ((EARTH_ROUND_KM / LIGHT_KM_S) * 1000); // light needs 133.7 ms to go round the Earth
        verdict.textContent = `${opener} My order system is ${count(took / SERVICE_MS)}× faster, and handled at least ${count(Math.floor(took * ORDERS_PER_MS))} orders while you reacted. Light went round the Earth ${laps.toFixed(1)} times.`;
        runs.push(took);
        if (runs.length > 5) runs.shift();
        renderRuns();
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

  function initPalette({ openRace, topology, universe, earth, openPerf: showPerf }) {
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
      { group: 'Projects', label: 'Spacetime', hint: 'spacetime itself', keys: 'android phone storage backup photos', run: project('spacetime') },
      { group: 'Play', label: 'Can you beat 250µs?', hint: 'reaction race', keys: 'race game reaction latency', run: () => openRace?.() },
      { group: 'Play', label: 'Spin the Earth', keys: 'globe world earth pruthvi', run: () => earth?.spin() },
      { group: 'Play', label: 'Watch a day pass', hint: '24 hours in 10 seconds', keys: 'day night time lapse sun globe earth', run: () => earth?.day() },
      { group: 'Play', label: 'Send an order', hint: 'through the platform', keys: 'order diagram notify jetstream topology', run: () => topology?.send() },
      { group: 'Play', label: 'Switch off a service', hint: 'see how it works', keys: 'chaos fail jetstream topology', run: () => topology?.chaos() },
      ...['Mumbai', 'Singapore', 'London', 'New York', 'Tokyo', 'Dubai', 'Hong Kong', 'Frankfurt', 'Sydney', 'San Francisco'].map((city) => (
        { group: 'Send light to', label: city, hint: 'send light there', keys: 'light speed signal latency globe', run: () => earth?.sendTo(city) }
      )),
      { group: 'Do', label: 'This page, measured', hint: 'load, weight, frame rate', keys: 'performance speed perf numbers stats fps fast', run: () => showPerf?.() },
      { group: 'Do', label: 'Copy email address', hint: EMAIL, stay: true, run: async () => say((await copyText(EMAIL)) ? 'Email copied. Talk soon.' : `Could not copy. It's ${EMAIL}.`) },
      { group: 'Do', label: 'Email Pruthvi', keys: 'mail contact hire', run: () => { location.href = `mailto:${EMAIL}`; } },
      { group: 'Do', label: 'Download resume', keys: 'resume cv pdf', run: () => document.querySelector('a[download][href$=".pdf"]')?.click() },
      { group: 'Do', label: 'Switch theme', hint: 'day / night', keys: 'dark light mode', run: () => toggleTheme(themeBtn) },
      { group: 'Open', label: 'GitHub', hint: '@pruthvipanchal', run: visit('https://github.com/pruthvipanchal') },
      { group: 'Open', label: 'LinkedIn', hint: '/in/pruthvipanchal', run: visit('https://www.linkedin.com/in/pruthvipanchal/') },
      { group: 'Open', label: 'CodeNebula', hint: 'live site', keys: 'learn c++ galaxy', run: visit('https://codenebula-dev.vercel.app/') },
      { group: 'Open', label: 'CodeNebula reference', hint: 'docs', keys: 'docs reference', run: visit('https://pruthvip.tech/CodeNebula/') },
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
    // The header's button opens it too (on narrow phones, the entry in the menu), so touch screens can.
    document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', () => {
      setMenu(false);
      open();
    }));
    const mac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '');
    document.querySelectorAll('[data-kbd]').forEach((k) => { k.textContent = mac ? '⌘K' : 'Ctrl K'; });
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
  initPortraits();
  const earth = initHeroEarth(universe);
  const topology = initTopology();
  openPerf = initPerf();
  initPalette({ openRace: initRace(), topology, universe, earth, openPerf });
  queueScroll(); // give everything that follows the scroll position its starting value
})();
