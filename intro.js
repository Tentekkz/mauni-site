/**
 * MAUNI — заставка «Тёмный зал».
 * Стена с экспонатами в темноте: курсор или палец работает как фонарик.
 * Найдены все рамки или нажата кнопка — загорается свет, появляется меню.
 * Повторным посетителям заставка не показывается (можно выключить свет кнопкой).
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

  function store(fn, fallback) {
    try { return fn(window.localStorage); } catch (e) { return fallback; }
  }

  // ---------- Экспозиция: каждый раз немного новая, только из живого каталога ----------
  const SOURCE = [
    { hall: 'KAWS', take: 2 },
    { hall: 'BE@RBRICK', take: 2 },
    { hall: 'Goyard', take: 1 },
    { hall: "Arc'teryx", take: 1 },
    { hall: 'Сумки', take: 1 },
    { hall: 'Декор & Арт', take: 1 }
  ];

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickExhibits(limit) {
    const all = window.MAUNI_INTRO || [];
    const used = new Set();
    const picked = [];
    SOURCE.forEach(({ hall, take }) => {
      // самые дорогие в зале — самые эффектные; из них берём случайные
      const top = all
        .filter(p => p.exhibitHall === hall && p.img && p.sku)
        .sort((a, b) => b.price - a.price)
        .slice(0, 12);
      shuffle(top).forEach(p => {
        if (take > 0 && !used.has(p.img)) {
          used.add(p.img);
          picked.push(p);
          take--;
        }
      });
    });
    return shuffle(picked).slice(0, limit);
  }

  const bigImg = url => String(url).replace('format=gallery-small', 'format=preview-large');

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]
    ));
  }

  function buildWall() {
    const count = window.innerWidth < 700 ? 6 : 8;
    wall.innerHTML = pickExhibits(count).map(p => `
      <a class="hall-frame" href="catalog.html?exhibit=${encodeURIComponent(p.sku)}" tabindex="-1">
        <span class="hall-frame-box"><img src="${escapeHtml(bigImg(p.img))}" alt=""></span>
        <span class="hall-frame-label">
          <b>№${String(p.id).padStart(2, '0')}</b>
          <span>${escapeHtml(p.exhibitBrand || 'MAUNI')}</span>
          <span>${escapeHtml(p.priceStr || '')}</span>
        </span>
      </a>
    `).join('');
  }

  // ---------- Фонарик ----------
  const frames = [];
  const beam = { x: 0, y: 0, tx: 0, ty: 0, r: 0 };
  let raf = 0;
  let inDark = false;
  let touched = false;
  let startedAt = 0;
  let foundCount = 0;

  function measure() {
    frames.length = 0;
    wall.querySelectorAll('.hall-frame').forEach(el => {
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
    if (!touched) {
      const t = (now - startedAt) / 1000;
      beam.tx = window.innerWidth * (0.5 + 0.34 * Math.sin(t * 0.55));
      beam.ty = window.innerHeight * (0.5 + 0.28 * Math.sin(t * 0.9 + 1));
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
    wall.querySelectorAll('.found').forEach(el => el.classList.remove('found'));
    document.body.classList.add('is-dark');
    document.body.classList.remove('is-lit');
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
    // лампы загораются с мерцанием, как в настоящем зале
    dark.classList.add('flicker');
    dark.addEventListener('animationend', finish, { once: true });
  }

  // ---------- Запуск ----------
  function init() {
    buildWall();
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
    if (params.has('intro') || (!seen && !reduced)) {
      enterDark();
    } else {
      document.body.classList.add('is-lit');
    }
  }

  init();
})();
