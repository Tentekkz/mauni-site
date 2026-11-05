/**
 * MAUNI — заставка «Тёмный зал».
 * Стена с экспонатами в темноте: курсор или палец работает как фонарик.
 * Найдены все рамки или нажата кнопка — загорается свет, стена остаётся, поверх неё меню.
 * Повторным посетителям заставка не показывается (можно включить кнопкой под меню).
 */
(function () {
  'use strict';

  const SEEN_KEY = 'mauni_intro_seen';
  const t = window.MauniI18n.t;
  const $ = id => document.getElementById(id);
  const wall = $('hall-wall');
  const dark = $('hall-dark');
  const hud = $('hall-hud');
  const hint = $('hall-hint');
  const foundEl = $('hall-found');
  const switchBtn = $('hall-switch');
  const relightBtn = $('hall-relight');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const allFrames = Array.from(wall.querySelectorAll('.hall-frame'));

  // Заставка показывается один раз за сессию: новая вкладка или новый заход снова открывают тёмный зал
  function store(fn, fallback) {
    try { return fn(window.sessionStorage); } catch (e) { return fallback; }
  }

  const frames = [];
  const beam = { x: 0, y: 0, tx: 0, ty: 0, r: 0 };
  let raf = 0;
  let inDark = false;
  let touched = false;
  let startedAt = 0;
  let foundCount = 0;

  function measure() {
    frames.length = 0;
    allFrames.forEach(el => {
      if (!el.getClientRects().length) return; // на телефоне часть рамок скрыта
      const r = el.getBoundingClientRect();
      frames.push({ el, x: r.left + r.width / 2, y: r.top + r.height / 2, found: el.classList.contains('found') });
    });
    beam.r = Math.max(130, Math.min(window.innerWidth, window.innerHeight) * 0.3);
    dark.style.setProperty('--r', beam.r + 'px');
  }

  function updateFound() {
    foundEl.textContent = t('intro.found', { n: foundCount, m: frames.length });
  }

  function tick(now) {
    if (!inDark) return;
    raf = requestAnimationFrame(tick);

    // пока человек не двигает, луч сам бродит по стене и показывает, что делать
    if (!touched && !reduced) {
      const s = (now - startedAt) / 1000;
      beam.tx = window.innerWidth * (0.5 + 0.34 * Math.sin(s * 0.55));
      beam.ty = window.innerHeight * (0.5 + 0.28 * Math.sin(s * 0.9 + 1));
    }
    const k = touched ? 0.22 : 0.05;
    beam.x += (beam.tx - beam.x) * k;
    beam.y += (beam.ty - beam.y) * k;
    dark.style.setProperty('--x', beam.x.toFixed(1) + 'px');
    dark.style.setProperty('--y', beam.y.toFixed(1) + 'px');

    if (!touched) return; // автоматический луч не засчитывает находки
    const near = beam.r * 0.55;
    frames.forEach(f => {
      if (!f.found && Math.hypot(f.x - beam.tx, f.y - beam.ty) < near) {
        f.found = true;
        f.el.classList.add('found');
        foundCount++;
        updateFound();
        if (foundCount === frames.length) {
          hint.textContent = t('intro.done');
          window.mauniTrack('intro_found_all');
          setTimeout(lightsOn, 500);
        } else if (foundCount === 1) {
          hint.textContent = t('intro.more');
        }
      }
    });
  }

  function onMove(e) {
    if (!inDark) return;
    touched = true;
    beam.tx = e.clientX;
    beam.ty = e.clientY;
  }

  function enterDark() {
    inDark = true;
    touched = false;
    foundCount = 0;
    allFrames.forEach(el => el.classList.remove('found'));
    document.body.classList.add('is-dark');
    document.body.classList.remove('is-lit');
    window.scrollTo(0, 0);
    dark.hidden = false;
    hud.hidden = false;
    relightBtn.hidden = true;
    dark.classList.remove('flicker');
    hint.textContent = t('intro.closed');
    measure();
    updateFound();
    beam.x = beam.tx = window.innerWidth / 2;
    beam.y = beam.ty = window.innerHeight / 2;
    startedAt = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function lightsOn() {
    if (!inDark) return;
    inDark = false;
    cancelAnimationFrame(raf);
    store(s => s.setItem(SEEN_KEY, '1'));
    hud.hidden = true;
    const finish = () => {
      dark.hidden = true;
      dark.classList.remove('flicker');
      document.body.classList.remove('is-dark');
      document.body.classList.add('is-lit');
      relightBtn.hidden = false;
    };
    if (reduced) { finish(); return; }
    // лампы загораются с мерцанием, и сквозь него уже видна светлая стена
    document.body.classList.add('is-lit');
    dark.classList.add('flicker');
    dark.addEventListener('animationend', finish, { once: true });
  }

  function init() {
    relightBtn.hidden = false;

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    window.addEventListener('resize', () => { if (inDark) measure(); });
    switchBtn.addEventListener('click', () => {
      window.mauniTrack('intro_switch_on', { found: foundCount });
      lightsOn();
    });
    relightBtn.addEventListener('click', enterDark);
    // клавиатура: человек с Tab сразу попадает в меню
    document.addEventListener('keydown', e => {
      if (inDark && (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        lightsOn();
      }
    });

    const params = new URLSearchParams(window.location.search);
    const seen = store(s => s.getItem(SEEN_KEY), null);
    // Заставка нужна всем. Если в системе отключены анимации, убираем только мерцание и блуждающий луч
    if (params.has('intro') || !seen) {
      enterDark();
    } else {
      document.body.classList.add('is-lit');
    }
  }

  init();
})();
