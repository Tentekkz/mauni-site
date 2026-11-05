/**
 * MAUNI — подбор подарка: три вопроса, на выходе до пяти разных экспонатов.
 */
(function () {
  'use strict';

  const C = window.MauniCatalog;
  const S = window.MauniShared;
  if (!C) return;
  const t = window.MauniI18n.t;
  const E = C.escapeHtml;

  const root = document.getElementById('gift');
  const view = document.getElementById('gift-view');
  const RESULT_COUNT = 5;

  const STEPS = [
    {
      key: 'who', title: 'gift.who',
      options: [
        { label: 'gift.self', halls: null },
        { label: 'gift.her', halls: ['Головные уборы', 'Сумки', 'Goyard', "Arc'teryx", 'Одежда'] },
        { label: 'gift.him', halls: ['Головные уборы', "Arc'teryx", 'KAWS', 'BE@RBRICK', 'Одежда'] },
        { label: 'gift.collector', halls: ['KAWS', 'BE@RBRICK', 'Декор & Арт'] },
        { label: 'gift.driver', halls: ['Автотовары'] }
      ]
    },
    {
      key: 'budget', title: 'gift.budget',
      options: [
        { label: 'gift.b5', max: 5000 },
        { label: 'gift.b10', max: 10000 },
        { label: 'gift.b25', max: 25000 },
        { label: 'gift.bany', max: Infinity }
      ]
    },
    {
      key: 'when', title: 'gift.when',
      options: [
        { label: 'gift.now', noPreorder: true },
        { label: 'gift.wait', noPreorder: false }
      ]
    }
  ];

  let answers = {};
  let step = 0;

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function matches(p, relaxed) {
    const { who, budget, when } = answers;
    if (who.halls ? !who.halls.includes(p.exhibitHall) : p.exhibitHall === 'Разное') return false;
    if (p.price > budget.max) return false;
    if (!relaxed && when.noPreorder && p.isPreorder) return false;
    return true;
  }

  // По одному товару на модель и по очереди из разных залов, чтобы выбор был разнообразным
  function pickVaried(list) {
    const seen = new Set();
    const byHall = new Map();
    shuffle(list).sort((a, b) => Number(b.isHit) - Number(a.isHit)).forEach(p => {
      const key = S.groupKey(p.name);
      if (seen.has(key)) return;
      seen.add(key);
      if (!byHall.has(p.exhibitHall)) byHall.set(p.exhibitHall, []);
      byHall.get(p.exhibitHall).push(p);
    });
    const halls = [...byHall.values()];
    const result = [];
    while (result.length < RESULT_COUNT && halls.some(h => h.length)) {
      halls.forEach(h => {
        if (h.length && result.length < RESULT_COUNT) result.push(h.shift());
      });
    }
    return result;
  }

  function renderStep() {
    const current = STEPS[step];
    view.innerHTML = `
      <p class="gift-step">${E(t('gift.step', { n: step + 1, m: STEPS.length }))}</p>
      <h2 class="gift-q">${E(t(current.title))}</h2>
      <div class="gift-options">
        ${current.options.map((o, i) => `<button type="button" class="gift-option" data-i="${i}">${E(t(o.label))}</button>`).join('')}
      </div>
    `;
  }

  function renderResult() {
    const all = window.MAUNI_PRODUCTS || [];
    let found = pickVaried(all.filter(p => matches(p, false)));
    let relaxed = false;
    if (!found.length) {
      found = pickVaried(all.filter(p => matches(p, true)));
      relaxed = found.length > 0;
    }
    window.mauniTrack('gift_done', { found: found.length });

    view.innerHTML = `
      <h2 class="gift-q">${E(t(found.length ? (relaxed ? 'gift.near' : 'gift.result') : 'gift.none'))}</h2>
      <ul class="pick-list">
        ${found.map(p => `
          <li class="pick-item" data-id="${p.id}">
            <button type="button" class="pick-open">
              <img src="${E(C.cardImg(p))}" alt="">
              <span class="pick-info">
                <span class="pick-name">${E(p.name)}</span>
                <b>${E(p.priceStr || C.formatPrice(p.price))}</b>
              </span>
            </button>
            <button type="button" class="pick-remove gift-heart" aria-label="${E(t('swipe.yes'))}">${C.isPicked(p) ? '♥' : '♡'}</button>
          </li>
        `).join('')}
      </ul>
      <button type="button" class="pick-send gift-again" id="gift-again">${E(t('gift.again'))}</button>
    `;
    document.getElementById('gift-again').addEventListener('click', start);
  }

  function start() {
    answers = {};
    step = 0;
    renderStep();
  }

  function open() {
    if (root.hidden) C.nav.push(hideOverlay);
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    start();
  }

  function close() {
    C.nav.back();
  }

  function hideOverlay() {
    root.hidden = true;
    document.body.style.overflow = '';
  }

  document.getElementById('btn-gift').addEventListener('click', open);
  document.getElementById('gift-close').addEventListener('click', close);

  view.addEventListener('click', e => {
    const option = e.target.closest('.gift-option');
    if (option) {
      const current = STEPS[step];
      answers[current.key] = current.options[Number(option.getAttribute('data-i'))];
      step++;
      if (step < STEPS.length) renderStep();
      else renderResult();
      return;
    }
    const row = e.target.closest('.pick-item');
    if (!row) return;
    const id = parseInt(row.getAttribute('data-id'), 10);
    if (e.target.closest('.gift-heart')) {
      const p = (window.MAUNI_PRODUCTS || []).find(item => item.id === id);
      if (p) {
        C.togglePick(p);
        e.target.closest('.gift-heart').textContent = C.isPicked(p) ? '♥' : '♡';
      }
    } else if (e.target.closest('.pick-open')) {
      C.openModal(id);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !root.hidden && document.getElementById('exhibit-modal').hidden) close();
  });
})();
