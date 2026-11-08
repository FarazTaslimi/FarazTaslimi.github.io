/* ============================================================
   FARAZ TASLIMI — PORTFOLIO · script.js
   Storm canvas (rain · lightning) · accessible tabs · reveals · glow
   Everything vanilla. The storm is the flex.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- footer year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     STORM CANVAS — rain + occasional lightning bolts
     - DPR capped at 1.5, drop count scales with viewport area
     - rain drawn faint & behind content; thunder fires every ~6.5–16s
     - paused when the tab is hidden, off when reduced-motion
     - toggle button persists preference in localStorage
     ============================================================ */
  const canvas = $('#rain');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const rainBtn = $('#rainToggle');
  const RAIN_KEY = 'ft-rain';
  let rainOn = true;
  try { rainOn = localStorage.getItem(RAIN_KEY) !== 'off'; } catch (_) {}

  let W = 0, H = 0, drops = [], ripples = [], rafId = null, last = 0;
  const WIND = 0.5;

  let bolt = null, thunderTimer = null;

  window.__rainFrames = 0; // verification counter (also handy in DevTools)

  const spawnDrop = (fromTop) => ({
    x: Math.random() * (W + 60) - 30,
    y: fromTop ? -30 : Math.random() * H,
    len: 9 + Math.random() * 14,
    spd: 6 + Math.random() * 7,
    a: 0.07 + Math.random() * 0.09
  });

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    const n = Math.min(110, Math.round((W * H) / 13000));
    drops = Array.from({ length: n }, () => spawnDrop(false));
    ripples = [];
  }

  function paintDrop(d, alpha) {
    ctx.strokeStyle = `rgba(152, 186, 234, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.len * 0.28, d.y - d.len);
    ctx.stroke();
  }

  /* one calm static frame — used for prefers-reduced-motion */
  function drawStatic() {
    sizeCanvas(); seed();
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (const d of drops) paintDrop(d, d.a * 0.7);
  }

  /* ---------- lightning bolt ---------- */
  function makeBolt() {
    const x0 = W * (0.18 + Math.random() * 0.64);
    const endY = H * (0.42 + Math.random() * 0.22);
    const pts = [[x0, -24]];
    let x = x0, y = -24;
    while (y < endY) {
      y += 14 + Math.random() * 26;
      x += (Math.random() - 0.5) * 34;
      pts.push([x, y]);
    }
    const branches = [];
    for (let i = 1; i < pts.length - 2 && branches.length < 2; i++) {
      if (Math.random() < 0.32) {
        const bp = [[pts[i][0], pts[i][1]]];
        let bx = pts[i][0], by = pts[i][1];
        const dir = Math.random() < 0.5 ? -1 : 1;
        for (let k = 0, n = 3 + Math.floor(Math.random() * 3); k < n; k++) {
          bx += dir * (8 + Math.random() * 18);
          by += 10 + Math.random() * 22;
          bp.push([bx, by]);
        }
        branches.push(bp);
      }
    }
    return { pts, branches, life: 1 };
  }

  function strokePts(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  /* wide dim pass = glow, thin bright pass = core — no shadowBlur, cheap */
  function drawBolt(b, alpha) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(160, 196, 255, ${alpha * 0.35})`;
    ctx.lineWidth = 5;
    strokePts(b.pts);
    for (const br of b.branches) strokePts(br);
    ctx.strokeStyle = `rgba(235, 244, 255, ${alpha})`;
    ctx.lineWidth = 1.8;
    strokePts(b.pts);
    ctx.lineWidth = 1.1;
    for (const br of b.branches) strokePts(br);
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y += d.spd * dt * 60;
      d.x += WIND * dt * 60;
      if (d.y - d.len > H) {
        if (Math.random() < 0.22 && ripples.length < 16) {
          ripples.push({ x: d.x, r: 1, a: 0.15 });
        }
        drops[i] = spawnDrop(true);
        continue;
      }
      paintDrop(d, d.a);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 20 * dt;
      rp.a -= 0.38 * dt;
      if (rp.a <= 0.01) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(152, 186, 234, ${rp.a})`;
      ctx.beginPath();
      ctx.ellipse(rp.x, H - 2, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (bolt) {
      const flick = Math.random() < 0.8 ? 1 : 0.35;
      const alpha = Math.max(0, bolt.life) * flick;
      if (alpha > 0.02) drawBolt(bolt, alpha);
      bolt.life -= dt * 1.6;
      if (bolt.life <= 0) bolt = null;
    }

    window.__rainFrames++;
    rafId = requestAnimationFrame(frame);
  }

  function startRain() {
    if (rafId !== null) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stopRain(clear) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (clear && ctx) ctx.clearRect(0, 0, W, H);
  }

  /* ---------- thunder scheduler ---------- */
  function clearThunder() {
    clearTimeout(thunderTimer);
    thunderTimer = null;
    bolt = null;
    document.body.classList.remove('is-flash');
  }
  function scheduleThunder() {
    clearTimeout(thunderTimer);
    if (!rainOn || reduced) return;
    thunderTimer = setTimeout(strike, 6500 + Math.random() * 9500);
  }
  function strike() {
    if (!rainOn || reduced || !ctx) return;
    if (document.hidden) { scheduleThunder(); return; }
    bolt = makeBolt();
    document.body.classList.add('is-flash');
    setTimeout(() => document.body.classList.remove('is-flash'), 720);
    scheduleThunder();
  }
  window.__thunderNow = strike; // verification / DevTools hook

  function applyRain() {
    if (!ctx) return;
    if (rainBtn) rainBtn.setAttribute('aria-pressed', String(rainOn));
    if (reduced) { drawStatic(); return; }
    if (rainOn) { sizeCanvas(); seed(); startRain(); scheduleThunder(); }
    else { stopRain(true); clearThunder(); }
  }

  if (canvas && ctx) {
    let resizeT;
    addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        if (reduced) { drawStatic(); return; }
        sizeCanvas(); seed();
        if (!rainOn) ctx.clearRect(0, 0, W, H);
      }, 150);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { stopRain(false); clearTimeout(thunderTimer); }
      else if (rainOn && !reduced) { startRain(); scheduleThunder(); }
    });

    if (rainBtn) {
      rainBtn.addEventListener('click', () => {
        rainOn = !rainOn;
        try { localStorage.setItem(RAIN_KEY, rainOn ? 'on' : 'off'); } catch (_) {}
        applyRain();
      });
    }

    applyRain();
  }

  /* ============================================================
     WORK TABS — Projects / CodePens (ARIA, arrow-key support)
     ============================================================ */
  const tabs = $$('.tab');
  const panels = { projects: $('#panel-projects'), pens: $('#panel-pens') };

  function selectTab(key, moveFocus = false) {
    tabs.forEach(t => {
      const is = t.id === `tab-${key}`;
      t.setAttribute('aria-selected', String(is));
      t.tabIndex = is ? 0 : -1;
      if (is && moveFocus) t.focus();
    });
    Object.entries(panels).forEach(([k, p]) => { if (p) p.hidden = k !== key; });
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t.id.replace('tab-', '')));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : tabs.length - 1;
      const next = tabs[(i + dir) % tabs.length];
      selectTab(next.id.replace('tab-', ''), true);
    });
  });

  /* ============================================================
     SCROLL REVEALS
     ============================================================ */
  const revealEls = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  }

  /* ============================================================
     CURSOR GLOW — a streetlamp that follows the pointer
     ============================================================ */
  const glow = $('#glow');
  if (glow && !reduced && matchMedia('(hover: hover)').matches) {
    let tx = innerWidth / 2, ty = innerHeight / 3, pending = false;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => {
          glow.style.transform = `translate(${tx}px, ${ty}px)`;
          pending = false;
        });
      }
    }, { passive: true });
  }
})();
