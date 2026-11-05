/**
 * MAUNI Exhibition Gallery Controller
 * Implements the art-gallery catalog style:
 * Halls navigation, red grid layout, exhibit cards (№, Name, Price, Brand, Logo mark),
 * sorting, instant search, exhibit passport modal, random exhibit, picks.
 */

(function () {
  'use strict';

  const PRODUCTS = window.MAUNI_PRODUCTS || [];
  const S = window.MauniShared;
  const t = window.MauniI18n.t;
  PRODUCTS.forEach(p => { p.exhibitBrand = S.brandOf(p); });
  const GROUPS = S.buildGroups(PRODUCTS);
  const SEARCH_WORDS = new Map(PRODUCTS.map(p => [p, S.searchWords(p)]));
  const PRICE_BANDS = {
    all: [0, Infinity], b5: [0, 5000], b10: [5000, 10000], b25: [10000, 25000], top: [25000, Infinity]
  };
  const RECENT_KEY = 'mauni_recent';
  const RECENT_MAX = 12;
  const NEW_DAYS = 30;
  const PAGE_SIZE = 48;
  const WHATSAPP_PHONE = '77766088813';

  // Available halls matching the mockup order
  const HALLS = [
    { id: 'all', name: 'Все' },
    { id: 'new', name: 'Новинки' },
    { id: 'last', name: 'Скоро уйдёт' },
    { id: 'KAWS', name: 'KAWS' },
    { id: 'BE@RBRICK', name: 'BE@RBRICK' },
    { id: 'Goyard', name: 'Goyard' },
    { id: "Arc'teryx", name: "Arc'teryx" },
    { id: 'Одежда', name: 'Одежда' },
    { id: 'Головные уборы', name: 'Головные уборы' },
    { id: 'Сумки', name: 'Сумки' },
    { id: 'Аксессуары', name: 'Аксессуары' },
    { id: 'Автотовары', name: 'Автотовары' },
    { id: 'Декор & Арт', name: 'Декор & Арт' },
    { id: 'Разное', name: 'Разное' }
  ];

  // State
  const state = {
    hall: 'all',
    sort: 'default', // 'default' | 'price_asc' | 'price_desc'
    search: '',
    brand: '',
    band: 'all',
    limit: PAGE_SIZE,
    selectedExhibit: null
  };

  // DOM Elements
  const el = {
    hallsNav: document.getElementById('halls-nav'),
    sortActions: document.querySelectorAll('#sort-nav .sort-action'),
    currentHallLabel: document.getElementById('current-hall-label'),
    galleryCount: document.getElementById('gallery-count'),
    grid: document.getElementById('exhibit-grid'),
    empty: document.getElementById('exhibit-empty'),
    resetBtn: document.getElementById('btn-exhibit-reset'),
    loadMoreWrap: document.getElementById('exhibit-load-more'),
    loadMoreBtn: document.getElementById('btn-more-exhibits'),
    search: document.getElementById('gallery-search'),
    searchClear: document.getElementById('sidebar-search-clear'),
    footerScrollTop: document.getElementById('footer-top-btn'),

    // Modal elements
    modal: document.getElementById('exhibit-modal'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalClose: document.getElementById('modal-close'),
    modalImg: document.getElementById('modal-img'),
    modalNum: document.getElementById('modal-num'),
    modalBrand: document.getElementById('modal-brand'),
    modalName: document.getElementById('modal-name'),
    modalPrice: document.getElementById('modal-price'),
    modalTags: document.getElementById('modal-tags'),
    modalKaspiBtn: document.getElementById('modal-kaspi-btn'),
    modalWaBtn: document.getElementById('modal-wa-btn'),
    modalWindow: document.querySelector('.modal-window'),
    modalFavBtn: document.getElementById('modal-fav-btn'),
    modalSpinBtn: document.getElementById('modal-spin-btn'),
    modalShareBtn: document.getElementById('modal-share-btn'),
    modalVariants: document.getElementById('modal-variants'),
    modalStory: document.getElementById('modal-story'),
    modalSimilar: document.getElementById('modal-similar'),
    hallIntro: document.getElementById('hall-intro'),
    randomBtn: document.getElementById('btn-random'),
    pickCount: document.getElementById('pick-count'),
    brandSelect: document.getElementById('brand-select'),
    priceActions: document.querySelectorAll('.price-action'),
    recentBlock: document.getElementById('recent-block'),
    sidebar: document.querySelector('.gallery-sidebar'),
    filtersToggle: document.getElementById('filters-toggle'),
    filtersCount: document.getElementById('filters-count')
  };

  // ---------- Кнопка «назад»: закрывает верхнее окно, а не уводит с сайта ----------
  const overlayStack = [];

  function pushOverlay(closeFn) {
    overlayStack.push(closeFn);
    window.history.pushState({ mauniOverlay: overlayStack.length }, '');
  }

  function requestClose() {
    if (overlayStack.length) window.history.back();
  }

  window.addEventListener('popstate', () => {
    const closeFn = overlayStack.pop();
    if (closeFn) closeFn();
  });

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PLACEHOLDER = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%23f7f7f7'><rect width='200' height='200'/><text x='50%' y='50%' fill='%23b0272d' font-size='13' text-anchor='middle' dy='.3em'>MAUNI</text></svg>";

  // Форматы картинок Kaspi: gallery-small совсем маленький, preview-large для карточек, gallery-medium для крупного показа
  const cardImg = p => String(p.img).replace('format=gallery-small', 'format=preview-large');
  const fullImg = p => String(p.img).replace('format=gallery-small', 'format=gallery-medium');

  // Настоящий остаток: один экземпляр и это не предзаказ
  const isLast = p => p.stockCount === 1 && !p.isPreorder;
  const isNew = p => {
    if (!p.firstSeen) return false;
    return (Date.now() - new Date(p.firstSeen).getTime()) / 86400000 <= NEW_DAYS;
  };
  const groupOf = p => GROUPS.get(S.groupKey(p.name)) || [p];
  const productKey = p => p.sku || p.url;

  // ---------- Подборка (хранится только в браузере покупателя) ----------
  const PICKS_KEY = 'mauni_picks';
  const pickListeners = [];
  let memoryPicks = [];

  function readPicks() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(PICKS_KEY));
      return Array.isArray(raw) ? raw : memoryPicks;
    } catch (e) {
      return memoryPicks;
    }
  }

  function writePicks(list) {
    memoryPicks = list;
    try { window.localStorage.setItem(PICKS_KEY, JSON.stringify(list)); } catch (e) { /* приватный режим */ }
    pickListeners.forEach(fn => fn());
  }

  const isPicked = p => readPicks().includes(productKey(p));

  function togglePick(p, force) {
    const key = productKey(p);
    const list = readPicks();
    const has = list.includes(key);
    const want = force === undefined ? !has : force;
    if (want === has) return;
    writePicks(want ? list.concat(key) : list.filter(k => k !== key));
  }

  function pickedProducts() {
    // товар, который исчез из каталога, просто не показываем
    return readPicks().map(k => PRODUCTS.find(p => productKey(p) === k)).filter(Boolean);
  }

  // Format price
  function formatPrice(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  }

  // Format number (№01, №02...)
  function formatNum(num) {
    return '№' + String(num).padStart(2, '0');
  }

  // Escape HTML
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Pluralization for exhibits
  function pluralizeExhibits(n) {
    const abs = Math.abs(n) % 100;
    const num = abs % 10;
    if (window.MauniI18n.lang === 'kk') return `${n} экспонат`;
    if (abs > 10 && abs < 20) return `${n} экспонатов`;
    if (num > 1 && num < 5) return `${n} экспоната`;
    if (num === 1) return `${n} экспонат`;
    return `${n} экспонатов`;
  }

  // WhatsApp checkout message generator
  function getWhatsAppUrl(product) {
    const text = `Здравствуйте! Хочу приобрести экспонат:\n\n*${product.name}*\nЦена: ${product.priceStr || formatPrice(product.price)}\n\nСсылка: ${product.url || 'https://mauni.kz/catalog.html'}`;
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
  }

  // Render Halls in Sidebar
  function renderHalls() {
    if (!el.hallsNav) return;

    const hasNew = PRODUCTS.some(isNew);
    el.hallsNav.innerHTML = HALLS.filter(h => h.id !== 'new' || hasNew).map(h => {
      const isActive = state.hall === h.id;
      return `
        <li>
          <button type="button" class="hall-action ${isActive ? 'active' : ''}" data-hall="${escapeHtml(h.id)}">
            ${escapeHtml(t('hall.' + h.id))}
          </button>
        </li>
      `;
    }).join('');

    el.hallsNav.querySelectorAll('.hall-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const hallId = btn.getAttribute('data-hall');
        if (state.hall === hallId) return;
        state.hall = hallId;
        state.limit = PAGE_SIZE;
        updateUI();
      });
    });
  }

  // Filter & sort exhibits
  function getFilteredExhibits() {
    const tokens = S.queryTokens(state.search);
    let found = filterExhibits(tokens);
    // Ничего не нашлось: возможно, запрос набран не в той раскладке
    if (!found.length && tokens.length) found = filterExhibits(S.queryTokens(S.swapLayout(state.search)));
    return found;
  }

  function filterExhibits(tokens) {
    const [minPrice, maxPrice] = PRICE_BANDS[state.band] || PRICE_BANDS.all;

    return PRODUCTS.filter(p => {
      // Hall filter
      if (state.hall === 'last') {
        if (!isLast(p)) return false;
      } else if (state.hall === 'new') {
        if (!isNew(p)) return false;
      } else if (state.hall !== 'all') {
        if (p.exhibitHall !== state.hall) {
          return false;
        }
      }

      if (state.brand && p.exhibitBrand !== state.brand) return false;
      if (p.price < minPrice || p.price > maxPrice) return false;

      // Search query
      if (tokens.length && !S.matchesQuery(tokens, SEARCH_WORDS.get(p))) return false;

      return true;
    }).sort((a, b) => {
      if (state.sort === 'price_asc') return a.price - b.price;
      if (state.sort === 'price_desc') return b.price - a.price;
      return a.id - b.id; // default order
    }).filter(((seen) => p => {
      // Одна карточка на модель: остальные цвета выбираются в паспорте
      const key = S.groupKey(p.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })(new Set()));
  }

  // Render an individual card
  function renderCard(p, index) {
    const num = formatNum(p.id);
    const brand = p.exhibitBrand || 'MAUNI';
    const group = groupOf(p);
    const prices = group.map(v => v.price);
    const minPrice = Math.min(...prices);
    const price = minPrice !== Math.max(...prices)
      ? t('price.from', { p: formatPrice(minPrice) })
      : (p.priceStr || formatPrice(p.price));
    const waUrl = getWhatsAppUrl(p);
    const colours = [...new Set(group.map(v => S.colourOf(v.name)).filter(Boolean))];
    const dots = colours.length > 1
      ? colours.slice(0, 5).map(c => `<i class="card-dot" style="background:${S.COLOURS[c]}" title="${escapeHtml(c)}"></i>`).join('') +
        (colours.length > 5 ? `<em>${escapeHtml(t('count.colours', { n: colours.length - 5 }))}</em>` : '')
      : '';
    const tag = isLast(p) ? t('tag.last') : (isNew(p) ? t('tag.new') : '');

    return `
      <article class="exhibit-card" data-id="${p.id}">
        <div class="card-top">
          <span class="card-num">${num}</span>
          <h2 class="card-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h2>
          <span class="card-price">${escapeHtml(price)}</span>
        </div>

        <div class="card-photo-area">
          ${tag ? `<span class="card-last">${escapeHtml(tag)}</span>` : ''}
          <img
            loading="${index < 4 ? 'eager' : 'lazy'}"${index < 2 ? ' fetchpriority="high"' : ''}
            src="${escapeHtml(cardImg(p))}"
            data-small="${escapeHtml(p.img)}"
            alt="${escapeHtml(p.name)}"
          >
          <div class="card-quick-actions">
            <a class="quick-btn kaspi" href="${escapeHtml(p.url)}" target="_blank" rel="noopener" title="Купить на Kaspi">
              KASPI ↗
            </a>
            <a class="quick-btn wa" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener" title="Заказать в WhatsApp">
              WHATSAPP ↗
            </a>
          </div>
        </div>

        <div class="card-bottom">
          <span class="card-brand">${escapeHtml(brand)}</span>
          ${dots ? `<span class="card-dots">${dots}</span>` : ''}
          <span class="card-mark" title="MAUNI">
            <svg width="12" height="12" viewBox="0 0 100 100" fill="#b0272d">
              <circle cx="50" cy="22" r="13"></circle>
              <circle cx="22" cy="78" r="13"></circle>
              <circle cx="78" cy="78" r="13"></circle>
            </svg>
          </span>
        </div>
      </article>
    `;
  }

  // Прямоугольник картинки внутри блока с object-fit: contain
  function containRect(box, naturalW, naturalH) {
    if (!naturalW || !naturalH) return box;
    const scale = Math.min(box.width / naturalW, box.height / naturalH);
    const width = naturalW * scale;
    const height = naturalH * scale;
    return {
      left: box.left + (box.width - width) / 2,
      top: box.top + (box.height - height) / 2,
      width,
      height
    };
  }

  // Заполнить паспорт данными товара
  function fillPassport(p) {
    el.modalNum.textContent = formatNum(p.id);
    el.modalBrand.textContent = p.exhibitBrand || 'MAUNI';
    el.modalName.textContent = p.name;
    el.modalPrice.textContent = p.priceStr || formatPrice(p.price);
    el.modalImg.src = cardImg(p);
    el.modalImg.alt = p.name;
  }

  function syncFavButton() {
    if (!el.modalFavBtn || !state.selectedExhibit) return;
    const on = isPicked(state.selectedExhibit);
    el.modalFavBtn.textContent = t(on ? 'modal.added' : 'modal.add');
    el.modalFavBtn.classList.toggle('on', on);
  }

  // Фото вылетает из карточки на своё место в паспорте
  function flyFromCard(sourceImg) {
    if (REDUCED_MOTION || !sourceImg || !sourceImg.naturalWidth || !sourceImg.animate) return;
    const from = containRect(sourceImg.getBoundingClientRect(), sourceImg.naturalWidth, sourceImg.naturalHeight);
    const to = containRect(el.modalImg.getBoundingClientRect(), sourceImg.naturalWidth, sourceImg.naturalHeight);
    if (!to.width || !from.width) return;

    const ghost = document.createElement('img');
    ghost.src = sourceImg.src;
    ghost.alt = '';
    ghost.className = 'fly-ghost';
    ghost.style.left = to.left + 'px';
    ghost.style.top = to.top + 'px';
    ghost.style.width = to.width + 'px';
    ghost.style.height = to.height + 'px';
    document.body.appendChild(ghost);
    el.modalImg.style.visibility = 'hidden';

    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const k = from.width / to.width;
    const anim = ghost.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${k})` },
      { transform: 'none' }
    ], { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    const done = () => {
      ghost.remove();
      el.modalImg.style.visibility = '';
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  // Выбор цвета и размера внутри паспорта
  function renderVariants(p) {
    if (!el.modalVariants) return;
    const group = groupOf(p);
    if (group.length < 2) {
      el.modalVariants.innerHTML = '';
      return;
    }
    const showSize = new Set(group.map(v => S.sizeOf(v.name))).size > 1;
    el.modalVariants.innerHTML = group.map(v => {
      const colour = S.colourOf(v.name);
      const parts = [colour, showSize ? S.sizeOf(v.name) : ''].filter(Boolean).join(', ') || formatNum(v.id);
      const dot = colour ? `<i class="card-dot" style="background:${S.COLOURS[colour]}"></i>` : '';
      return `<button type="button" class="variant-chip ${v === p ? 'on' : ''}" data-id="${v.id}">${dot}${escapeHtml(parts)}</button>`;
    }).join('');
  }

  function renderSimilar(p) {
    if (!el.modalSimilar) return;
    const items = S.similarTo(p, PRODUCTS, 6);
    el.modalSimilar.innerHTML = items.length ? `
      <h3 class="similar-title">${escapeHtml(t('modal.similar'))}</h3>
      <div class="similar-row">
        ${items.map(s => `
          <button type="button" class="similar-item" data-id="${s.id}">
            <img src="${escapeHtml(cardImg(s))}" alt="" loading="lazy">
            <span class="similar-name">${escapeHtml(s.name)}</span>
            <b>${escapeHtml(s.priceStr || formatPrice(s.price))}</b>
          </button>
        `).join('')}
      </div>
    ` : '';
  }

  const pageUrl = p => `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}e/${S.pageSlug(p.sku)}.html`;

  // Поделиться: системное меню на телефоне, иначе копирование ссылки
  async function shareLink(url, title, button) {
    const flash = text => {
      if (!button) return;
      const old = button.textContent;
      button.textContent = text;
      setTimeout(() => { button.textContent = old; }, 1800);
    };
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (e) { /* человек закрыл меню */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash(t('modal.copied'));
    } catch (e) {
      flash(t('modal.copyFail'));
    }
  }

  // Рассказы нужны только в паспорте: грузим их при первом открытии, а не вместе с каталогом
  let storiesPromise = null;
  function loadStories() {
    if (window.MauniStories) return Promise.resolve();
    if (!storiesPromise) {
      storiesPromise = new Promise(resolve => {
        const script = document.createElement('script');
        script.src = './stories.js';
        script.onload = resolve;
        script.onerror = () => {
          storiesPromise = null;
          resolve();
        };
        document.head.appendChild(script);
      });
    }
    return storiesPromise;
  }

  let spinToken = 0;

  // Open modal with product passport
  function openModal(productId, opts) {
    const options = opts || {};
    const p = PRODUCTS.find(item => item.id === productId);
    if (!p) return;

    spinToken++;
    state.selectedExhibit = p;
    fillPassport(p);

    // Чёткое фото подменяем, когда оно загрузится
    const hi = new Image();
    hi.onload = () => {
      if (state.selectedExhibit === p) el.modalImg.src = hi.src;
    };
    hi.src = fullImg(p);

    // Badges
    const tags = [];
    if (isLast(p)) tags.push(`<span class="modal-badge hit">${escapeHtml(t('tag.lastFull'))}</span>`);
    if (isNew(p)) tags.push(`<span class="modal-badge">${escapeHtml(t('tag.new'))}</span>`);
    (p.badges || []).forEach(b => {
      const isHit = b.toLowerCase().includes('хит');
      const days = b.match(/(\d+)\s*дн/);
      const label = isHit ? t('tag.hit') : (days ? t('tag.preorder', { n: days[1] }) : b);
      tags.push(`<span class="modal-badge ${isHit ? 'hit' : ''}">${escapeHtml(label)}</span>`);
    });
    el.modalTags.innerHTML = tags.join('');
    renderVariants(p);
    renderSimilar(p);
    if (el.modalStory) {
      el.modalStory.textContent = '';
      loadStories().then(() => {
        if (state.selectedExhibit === p && window.MauniStories) {
          el.modalStory.textContent = window.MauniStories.storyOf(p, { colourOf: S.colourOf, variants: groupOf(p) });
        }
      });
    }
    el.modalWindow.scrollTop = 0;

    // Actions
    el.modalKaspiBtn.href = p.url;
    el.modalWaBtn.href = getWhatsAppUrl(p);
    if (el.modalSpinBtn) el.modalSpinBtn.hidden = !options.spun;
    syncFavButton();

    rememberView(p);
    if (el.modal.hidden) pushOverlay(closeModal);
    el.modal.hidden = false;
    el.modalWindow.classList.remove('is-spinning');
    document.body.style.overflow = 'hidden';

    // Запускаем появление заново при каждом открытии
    if (!REDUCED_MOTION) {
      el.modalWindow.classList.remove('passport-in');
      void el.modalWindow.offsetWidth;
      el.modalWindow.classList.add('passport-in');
    }
    flyFromCard(options.fromImg);
  }

  // Close modal
  function closeModal() {
    spinToken++;
    state.selectedExhibit = null;
    el.modal.hidden = true;
    el.modalImg.style.visibility = '';
    const overlayOpen = document.querySelector('.swipe:not([hidden])');
    document.body.style.overflow = overlayOpen ? 'hidden' : '';
    renderRecent();
  }

  // ---------- Случайный экспонат: паспорт крутится как рулетка ----------
  function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function preload(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = url;
    });
  }

  async function spinRandom() {
    const filtered = getFilteredExhibits();
    const pool = filtered.length ? filtered : PRODUCTS;
    if (!pool.length) return;
    const winner = randomFrom(pool);
    if (REDUCED_MOTION) {
      openModal(winner.id, { spun: true });
      return;
    }

    window.mauniTrack('random_open');
    const token = ++spinToken;
    const reel = [];
    for (let i = 0; i < 16; i++) reel.push(randomFrom(pool));

    el.modalWindow.classList.remove('passport-in');
    el.modalWindow.classList.add('is-spinning');
    el.modalTags.innerHTML = '';
    if (el.modalVariants) el.modalVariants.innerHTML = '';
    if (el.modalSimilar) el.modalSimilar.innerHTML = '';
    if (el.modalStory) el.modalStory.textContent = '';
    if (el.modalSpinBtn) el.modalSpinBtn.hidden = true;
    state.selectedExhibit = null;
    fillPassport(reel[0]);
    if (el.modal.hidden) pushOverlay(closeModal);
    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Ждём картинки недолго: рулетка не должна зависать из-за медленной сети
    await Promise.race([
      Promise.all(reel.map(p => preload(cardImg(p)))),
      new Promise(resolve => setTimeout(resolve, 900))
    ]);

    for (let i = 0; i < reel.length; i++) {
      if (token !== spinToken) return;
      fillPassport(reel[i]);
      await new Promise(resolve => setTimeout(resolve, 55 + i * i * 1.3));
    }
    if (token !== spinToken) return;
    openModal(winner.id, { spun: true });
  }

  // ---------- Вы смотрели ----------
  function readRecent() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function rememberView(p) {
    const key = productKey(p);
    const list = [key].concat(readRecent().filter(k => k !== key)).slice(0, RECENT_MAX);
    try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) { /* приватный режим */ }
  }

  function renderRecent() {
    if (!el.recentBlock) return;
    const items = readRecent().map(k => PRODUCTS.find(p => productKey(p) === k)).filter(Boolean);
    el.recentBlock.hidden = items.length === 0;
    el.recentBlock.innerHTML = items.length ? `
      <h2 class="similar-title">${escapeHtml(t('recent.title'))}</h2>
      <div class="similar-row">
        ${items.map(p => `
          <button type="button" class="similar-item" data-id="${p.id}">
            <img src="${escapeHtml(cardImg(p))}" alt="" loading="lazy">
            <span class="similar-name">${escapeHtml(p.name)}</span>
            <b>${escapeHtml(p.priceStr || formatPrice(p.price))}</b>
          </button>
        `).join('')}
      </div>
    ` : '';
  }

  // Зал как выставка: короткий рассказ и самые заметные работы
  function renderHallIntro() {
    if (!el.hallIntro) return;
    const key = 'intro.' + state.hall;
    const text = t(key);
    if (text === key || state.search) {
      el.hallIntro.hidden = true;
      el.hallIntro.innerHTML = '';
      return;
    }
    const seen = new Set();
    const top = PRODUCTS.filter(p => p.exhibitHall === state.hall && p.img)
      .sort((a, b) => b.price - a.price)
      .filter(p => {
        const k = S.groupKey(p.name);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 3);
    el.hallIntro.hidden = false;
    el.hallIntro.innerHTML = `
      <div class="hall-intro-text">
        <h2>${escapeHtml(t('hall.' + state.hall))}</h2>
        <p>${escapeHtml(text)}</p>
      </div>
      <div class="hall-intro-works">
        ${top.map(p => `<button type="button" class="hall-intro-work" data-id="${p.id}" aria-label="${escapeHtml(p.name)}"><img src="${escapeHtml(fullImg(p))}" alt=""></button>`).join('')}
      </div>
    `;
  }

  // Update UI and re-render
  function updateUI() {
    if (el.currentHallLabel) {
      el.currentHallLabel.textContent = t('hall.' + state.hall).toUpperCase();
    }
    renderHallIntro();

    // Active hall in sidebar
    if (el.hallsNav) {
      el.hallsNav.querySelectorAll('.hall-action').forEach(btn => {
        const id = btn.getAttribute('data-hall');
        btn.classList.toggle('active', id === state.hall);
      });
    }

    if (el.priceActions) {
      el.priceActions.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-band') === state.band);
      });
    }
    if (el.brandSelect) el.brandSelect.value = state.brand;
    if (el.filtersCount) {
      const active = [state.sort !== 'default', state.band !== 'all', !!state.brand].filter(Boolean).length;
      el.filtersCount.textContent = active ? ` · ${active}` : '';
    }

    // Active sort in sidebar
    if (el.sortActions) {
      el.sortActions.forEach(btn => {
        const s = btn.getAttribute('data-sort');
        btn.classList.toggle('active', s === state.sort);
      });
    }

    const filtered = getFilteredExhibits();
    const total = filtered.length;
    const visible = filtered.slice(0, state.limit);

    if (el.galleryCount) {
      el.galleryCount.textContent = pluralizeExhibits(total);
    }

    if (el.searchClear) {
      el.searchClear.hidden = !state.search;
    }

    if (total === 0) {
      el.grid.innerHTML = '';
      if (el.empty) el.empty.hidden = false;
      if (el.loadMoreWrap) el.loadMoreWrap.hidden = true;
      return;
    }

    if (el.empty) el.empty.hidden = true;

    // Render cards
    el.grid.innerHTML = visible.map((p, i) => renderCard(p, state.limit > PAGE_SIZE ? 99 : i)).join('');

    // Card click listener (for opening passport modal or clicking quick actions)
    el.grid.querySelectorAll('.exhibit-card').forEach(card => {
      card.addEventListener('click', e => {
        // If clicking on quick button link, don't open modal
        if (e.target.closest('.quick-btn')) return;
        const id = parseInt(card.getAttribute('data-id'), 10);
        openModal(id, { fromImg: card.querySelector('.card-photo-area img') });
      });
    });

    // Load more container
    if (el.loadMoreWrap) {
      const hasMore = visible.length < total;
      el.loadMoreWrap.hidden = !hasMore;
      if (el.loadMoreBtn) {
        const remaining = total - visible.length;
        const nextBatch = Math.min(PAGE_SIZE, remaining);
        el.loadMoreBtn.textContent = t('more', { n: nextBatch, m: remaining });
      }
    }
  }

  // Reset filters
  function resetFilters() {
    state.hall = 'all';
    state.sort = 'default';
    state.search = '';
    state.brand = '';
    state.band = 'all';
    state.limit = PAGE_SIZE;

    if (el.search) el.search.value = '';
    updateUI();
  }

  // Events setup
  function initEvents() {
    // Sort buttons
    if (el.sortActions) {
      el.sortActions.forEach(btn => {
        btn.addEventListener('click', () => {
          const s = btn.getAttribute('data-sort');
          if (state.sort === s) return;
          state.sort = s;
          state.limit = PAGE_SIZE;
          updateUI();
        });
      });
    }

    // Search input
    let searchTimer;
    if (el.search) {
      el.search.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.search = e.target.value.trim();
          state.limit = PAGE_SIZE;
          updateUI();
        }, 120);
      });
    }

    // Clear search
    if (el.searchClear) {
      el.searchClear.addEventListener('click', () => {
        if (el.search) {
          el.search.value = '';
          el.search.focus();
        }
        state.search = '';
        state.limit = PAGE_SIZE;
        updateUI();
      });
    }

    // Reset button
    if (el.resetBtn) {
      el.resetBtn.addEventListener('click', resetFilters);
    }

    // Load more button
    if (el.loadMoreBtn) {
      el.loadMoreBtn.addEventListener('click', () => {
        state.limit += PAGE_SIZE;
        updateUI();
      });
    }

    // Scroll to top button in footer
    if (el.footerScrollTop) {
      el.footerScrollTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Если чёткой картинки нет, берём маленькую, а потом заглушку
    if (el.grid) {
      el.grid.addEventListener('error', e => {
        const img = e.target;
        if (!img || img.tagName !== 'IMG') return;
        if (img.dataset.small) {
          const small = img.dataset.small;
          img.removeAttribute('data-small');
          img.src = small;
        } else {
          img.src = PLACEHOLDER;
        }
      }, true);
    }

    // На телефоне порядок, цена и бренд спрятаны под кнопкой «Фильтры»
    if (el.filtersToggle && el.sidebar) {
      el.filtersToggle.addEventListener('click', () => {
        const open = el.sidebar.classList.toggle('filters-open');
        el.filtersToggle.setAttribute('aria-expanded', String(open));
      });
    }

    // Цена и бренд
    if (el.priceActions) {
      el.priceActions.forEach(btn => {
        btn.addEventListener('click', () => {
          state.band = btn.getAttribute('data-band');
          state.limit = PAGE_SIZE;
          updateUI();
        });
      });
    }
    if (el.brandSelect) {
      const counts = new Map();
      PRODUCTS.forEach(p => {
        if (!S.GENERIC_BRANDS.includes(p.exhibitBrand)) counts.set(p.exhibitBrand, (counts.get(p.exhibitBrand) || 0) + 1);
      });
      const brands = [...counts.keys()].sort((a, b) => a.localeCompare(b));
      el.brandSelect.innerHTML = `<option value="">${escapeHtml(t('brand.all'))}</option>` +
        brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
      el.brandSelect.addEventListener('change', () => {
        state.brand = el.brandSelect.value;
        state.limit = PAGE_SIZE;
        updateUI();
      });
    }
    if (el.recentBlock) {
      el.recentBlock.addEventListener('click', e => {
        const item = e.target.closest('.similar-item');
        if (item) openModal(parseInt(item.getAttribute('data-id'), 10), { fromImg: item.querySelector('img') });
      });
    }

    // Паспорт: выбор цвета, похожие, поделиться; выставка
    if (el.modalVariants) {
      el.modalVariants.addEventListener('click', e => {
        const chip = e.target.closest('.variant-chip');
        if (chip) openModal(parseInt(chip.getAttribute('data-id'), 10));
      });
    }
    if (el.modalSimilar) {
      el.modalSimilar.addEventListener('click', e => {
        const item = e.target.closest('.similar-item');
        if (item) {
          window.mauniTrack('similar_open');
          openModal(parseInt(item.getAttribute('data-id'), 10));
        }
      });
    }
    if (el.modalShareBtn) {
      el.modalShareBtn.addEventListener('click', () => {
        const p = state.selectedExhibit;
        if (!p) return;
        window.mauniTrack('share_exhibit');
        shareLink(pageUrl(p), p.name, el.modalShareBtn);
      });
    }
    if (el.hallIntro) {
      el.hallIntro.addEventListener('click', e => {
        const work = e.target.closest('.hall-intro-work');
        if (work) openModal(parseInt(work.getAttribute('data-id'), 10), { fromImg: work.querySelector('img') });
      });
    }

    // Случайный экспонат
    if (el.randomBtn) el.randomBtn.addEventListener('click', spinRandom);
    if (el.modalSpinBtn) el.modalSpinBtn.addEventListener('click', spinRandom);

    // Подборка
    if (el.modalFavBtn) {
      el.modalFavBtn.addEventListener('click', () => {
        if (state.selectedExhibit) togglePick(state.selectedExhibit);
      });
    }
    const syncPicks = () => {
      if (el.pickCount) el.pickCount.textContent = pickedProducts().length;
      syncFavButton();
    };
    pickListeners.push(syncPicks);
    syncPicks();

    // Modal close
    if (el.modalClose) el.modalClose.addEventListener('click', requestClose);
    if (el.modalOverlay) el.modalOverlay.addEventListener('click', requestClose);

    // Escape closes modal
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !el.modal.hidden) {
        requestClose();
      }
    });
  }

  // API для swipe.js
  window.MauniCatalog = {
    getFiltered: getFilteredExhibits,
    openModal,
    cardImg,
    fullImg,
    isLast,
    isNew,
    productKey,
    shareLink,
    products: PRODUCTS,
    isPicked,
    togglePick,
    pickedProducts,
    nav: { push: pushOverlay, back: requestClose },
    onPicksChange: fn => pickListeners.push(fn),
    formatNum,
    formatPrice,
    escapeHtml,
    whatsappPhone: WHATSAPP_PHONE
  };

  // Прямая ссылка на экспонат: catalog.html?exhibit=<sku>
  function openFromUrl() {
    const key = new URLSearchParams(window.location.search).get('exhibit');
    if (!key) return;
    const p = PRODUCTS.find(item => productKey(item) === key);
    if (p) openModal(p.id);
  }

  // Init
  function init() {
    const params = new URLSearchParams(window.location.search);
    const query = (params.get('q') || '').trim().slice(0, 80);
    if (query) {
      state.search = query;
      if (el.search) el.search.value = query;
    }
    const hallParam = params.get('hall');
    if (hallParam && HALLS.some(h => h.id === hallParam)) state.hall = hallParam;
    renderHalls();
    initEvents();
    updateUI();
    if (params.has('random')) spinRandom();
    renderRecent();
    openFromUrl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
