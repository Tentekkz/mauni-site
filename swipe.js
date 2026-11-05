/**
 * MAUNI — просмотр свайпами и подборка с отправкой в WhatsApp.
 * Колода строится из текущего зала и поиска. Подборка хранится в браузере покупателя.
 */
(function () {
  'use strict';

  const C = window.MauniCatalog;
  if (!C) return;
  const t = window.MauniI18n.t;

  const SWIPE_THRESHOLD = 90;
  const MAX_ITEMS_IN_MESSAGE = 25; // иначе ссылка wa.me становится слишком длинной
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = id => document.getElementById(id);
  const root = $('swipe');
  const deckEl = $('swipe-deck');
  const swipeView = $('swipe-view');
  const pickView = $('pick-view');
  const progressEl = $('swipe-progress');
  const modal = $('exhibit-modal');

  let deck = [];
  let position = 0;
  let cameFromSwipe = false;
  let busy = false;
  let sharedItems = null; // подборка, которая пришла по ссылке

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Открытие и закрытие ----------
  function show(view) {
    if (root.hidden) C.nav.push(hideOverlay);
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    swipeView.hidden = view !== 'swipe';
    pickView.hidden = view !== 'pick';
    $('swipe-to-pick').hidden = view !== 'swipe';
    progressEl.hidden = view !== 'swipe';
  }

  function close() {
    C.nav.back();
  }

  function hideOverlay() {
    root.hidden = true;
    document.body.style.overflow = '';
    deckEl.innerHTML = '';
  }

  function openSwipe() {
    window.mauniTrack('swipe_open');
    sharedItems = null;
    deck = shuffle(C.getFiltered().filter(p => !C.isPicked(p)));
    position = 0;
    cameFromSwipe = true;
    show('swipe');
    renderDeck();
  }

  function openPicks() {
    show('pick');
    renderPicks();
  }

  // ---------- Колода ----------
  function cardHtml(p) {
    const E = C.escapeHtml;
    return `
      <article class="swipe-card" data-key="${E(p.sku || p.url)}">
        <span class="swipe-stamp yes">${E(t('swipe.yes'))}</span>
        <span class="swipe-stamp no">${E(t('swipe.no'))}</span>
        <div class="swipe-card-top">
          <span class="card-num">${E(C.formatNum(p.id))}</span>
          <span class="swipe-card-brand">${E(p.exhibitBrand || 'MAUNI')}</span>
        </div>
        <div class="swipe-card-photo">
          ${C.isLast(p) ? `<span class="card-last">${E(t('tag.last'))}</span>` : ''}
          <img src="${E(C.fullImg(p))}" alt="${E(p.name)}" draggable="false">
        </div>
        <h2 class="swipe-card-name">${E(p.name)}</h2>
        <div class="swipe-card-price">${E(p.priceStr || C.formatPrice(p.price))}</div>
      </article>
    `;
  }

  function renderDeck() {
    busy = false;
    const rest = deck.slice(position, position + 3);
    progressEl.textContent = deck.length ? t('swipe.of', { n: Math.min(position + 1, deck.length), m: deck.length }) : '';

    if (!rest.length) {
      deckEl.innerHTML = `
        <div class="swipe-end">
          <p>${t(deck.length ? 'swipe.done' : 'swipe.none')}</p>
          <button type="button" class="pick-send" id="swipe-end-pick">${t('swipe.seePicks')}</button>
          <button type="button" class="pick-clear" id="swipe-end-close">${t('swipe.back')}</button>
        </div>
      `;
      $('swipe-end-pick').addEventListener('click', openPicks);
      $('swipe-end-close').addEventListener('click', close);
      return;
    }

    // Последняя в разметке карточка лежит сверху
    deckEl.innerHTML = rest.slice().reverse().map(cardHtml).join('');
    const cards = deckEl.querySelectorAll('.swipe-card');
    cards.forEach((card, i) => {
      const depth = cards.length - 1 - i;
      card.style.setProperty('--depth', depth);
      card.classList.toggle('is-top', depth === 0);
    });
    bindDrag(cards[cards.length - 1]);
  }

  function decide(liked, card, startX) {
    if (busy) return;
    const p = deck[position];
    const top = card || deckEl.querySelector('.swipe-card.is-top');
    if (!p || !top) return;
    busy = true;
    if (liked) C.togglePick(p, true);
    window.mauniTrack(liked ? 'swipe_like' : 'swipe_pass');
    position++;

    if (reduced) {
      renderDeck();
      return;
    }
    const dir = liked ? 1 : -1;
    const distance = window.innerWidth;
    top.classList.add(liked ? 'show-yes' : 'show-no');
    const anim = top.animate([
      { transform: `translateX(${startX || 0}px) rotate(${(startX || 0) / 18}deg)`, opacity: 1 },
      { transform: `translateX(${dir * distance}px) rotate(${dir * 24}deg)`, opacity: 0.4 }
    ], { duration: 280, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
    anim.onfinish = renderDeck;
  }

  function bindDrag(card) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dragging = false;

    card.addEventListener('pointerdown', e => {
      if (busy) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      card.setPointerCapture(e.pointerId);
      card.classList.add('is-dragging');
    });

    card.addEventListener('pointermove', e => {
      if (!dragging) return;
      dx = e.clientX - startX;
      const dy = (e.clientY - startY) * 0.25;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      card.classList.toggle('show-yes', dx > 24);
      card.classList.toggle('show-no', dx < -24);
    });

    const end = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove('is-dragging');
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        card.style.transform = '';
        decide(dx > 0, card, dx);
      } else {
        card.style.transform = '';
        card.classList.remove('show-yes', 'show-no');
        // Простое касание открывает паспорт экспоната
        if (Math.abs(dx) < 6) {
          const p = deck[position];
          if (p) C.openModal(p.id);
        }
      }
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', () => {
      dragging = false;
      dx = 0;
      card.classList.remove('is-dragging', 'show-yes', 'show-no');
      card.style.transform = '';
    });
  }

  // ---------- Подборка ----------
  function buildMessage(items) {
    const included = items.slice(0, MAX_ITEMS_IN_MESSAGE);
    const lines = included.map((p, i) => {
      const name = p.name.length > 70 ? p.name.slice(0, 67) + '…' : p.name;
      const price = p.priceStr || C.formatPrice(p.price);
      return `${i + 1}. ${name} — ${price}${p.isPreorder ? ' (предзаказ)' : ''}`;
    });
    const total = included.reduce((sum, p) => sum + (p.price || 0), 0);
    return `Здравствуйте! Хочу заказать из каталога MAUNI:\n\n${lines.join('\n')}\n\nИтого: ${C.formatPrice(total)}`;
  }

  function renderPicks() {
    const E = C.escapeHtml;
    const shared = sharedItems !== null;
    const items = shared ? sharedItems : C.pickedProducts();
    $('pick-title').textContent = t(shared ? 'pick.sharedTitle' : 'pick.title');
    $('pick-empty').hidden = items.length > 0;
    $('pick-footer').hidden = items.length === 0;
    $('pick-add-all').hidden = !shared;
    $('pick-share').hidden = shared;
    $('pick-clear').hidden = shared;
    $('pick-back').textContent = t(cameFromSwipe ? 'pick.back' : 'pick.toCatalog');

    $('pick-list').innerHTML = items.map(p => `
      <li class="pick-item" data-id="${p.id}">
        <button type="button" class="pick-open" aria-label="Открыть: ${E(p.name)}">
          <img src="${E(C.cardImg(p))}" alt="" loading="lazy">
          <span class="pick-info">
            <span class="pick-name">${E(p.name)}</span>
            <b>${E(p.priceStr || C.formatPrice(p.price))}</b>
          </span>
        </button>
        ${shared ? '' : `<button type="button" class="pick-remove" aria-label="${E(t('pick.remove'))}">×</button>`}
      </li>
    `).join('');

    if (!items.length) return;
    $('pick-total').textContent = C.formatPrice(items.reduce((sum, p) => sum + (p.price || 0), 0));
    $('pick-send').href = `https://wa.me/${C.whatsappPhone}?text=${encodeURIComponent(buildMessage(items))}`;
    const note = $('pick-note');
    note.hidden = items.length <= MAX_ITEMS_IN_MESSAGE;
    note.textContent = t('pick.note', { n: MAX_ITEMS_IN_MESSAGE });
  }

  function syncCounters() {
    const n = C.pickedProducts().length;
    $('swipe-pick-count').textContent = n;
    if (!root.hidden && !pickView.hidden && sharedItems === null) renderPicks();
  }

  // Ссылка на подборку: catalog.html?picks=артикул|артикул
  function shareUrl() {
    const keys = C.pickedProducts().slice(0, MAX_ITEMS_IN_MESSAGE).map(C.productKey);
    return `${window.location.origin}${window.location.pathname}?picks=${encodeURIComponent(keys.join('|'))}`;
  }

  function openShared() {
    const raw = new URLSearchParams(window.location.search).get('picks');
    if (!raw) return;
    const keys = raw.split('|');
    sharedItems = keys.map(k => C.products.find(p => C.productKey(p) === k)).filter(Boolean);
    cameFromSwipe = false;
    openPicks();
  }

  // ---------- События ----------
  $('btn-swipe').addEventListener('click', openSwipe);
  $('btn-pick').addEventListener('click', () => {
    cameFromSwipe = false;
    sharedItems = null;
    openPicks();
  });
  $('pick-share').addEventListener('click', () => {
    window.mauniTrack('share_picks');
    C.shareLink(shareUrl(), 'MAUNI', $('pick-share'));
  });
  $('pick-add-all').addEventListener('click', () => {
    sharedItems.forEach(p => C.togglePick(p, true));
    sharedItems = null;
    renderPicks();
  });
  $('pick-send').addEventListener('click', () => window.mauniTrack('picks_sent'));
  $('swipe-close').addEventListener('click', close);
  $('swipe-yes').addEventListener('click', () => decide(true));
  $('swipe-no').addEventListener('click', () => decide(false));
  $('swipe-to-pick').addEventListener('click', openPicks);
  $('pick-back').addEventListener('click', () => {
    if (!cameFromSwipe) {
      close();
      return;
    }
    show('swipe');
    renderDeck();
  });
  $('pick-clear').addEventListener('click', () => {
    C.pickedProducts().forEach(p => C.togglePick(p, false));
  });
  $('pick-list').addEventListener('click', e => {
    const row = e.target.closest('.pick-item');
    if (!row) return;
    const id = parseInt(row.getAttribute('data-id'), 10);
    if (e.target.closest('.pick-remove')) {
      const p = C.pickedProducts().find(item => item.id === id);
      if (p) C.togglePick(p, false);
    } else if (e.target.closest('.pick-open')) {
      C.openModal(id);
    }
  });

  document.addEventListener('keydown', e => {
    if (root.hidden || !modal.hidden) return;
    if (e.key === 'Escape') close();
    if (swipeView.hidden) return;
    if (e.key === 'ArrowRight') decide(true);
    if (e.key === 'ArrowLeft') decide(false);
  });

  C.onPicksChange(syncCounters);
  syncCounters();
  openShared();
})();
