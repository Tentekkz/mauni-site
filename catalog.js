/**
 * MAUNI Exhibition Gallery Controller
 * Implements the art-gallery catalog style:
 * Halls navigation, red grid layout, exhibit cards (№, Name, Price, Brand, Logo mark),
 * sorting, instant search, and exhibit passport modal.
 */

(function () {
  'use strict';

  const PRODUCTS = window.MAUNI_PRODUCTS || [];
  const PAGE_SIZE = 48;
  const WHATSAPP_PHONE = '77766088813';

  // Available halls matching the mockup order
  const HALLS = [
    { id: 'all', name: 'Все' },
    { id: 'KAWS', name: 'KAWS' },
    { id: 'BE@RBRICK', name: 'BE@RBRICK' },
    { id: 'Goyard', name: 'Goyard' },
    { id: "Arc'teryx", name: "Arc'teryx" },
    { id: 'Одежда', name: 'Одежда' },
    { id: 'Головные уборы', name: 'Головные уборы' },
    { id: 'Сумки', name: 'Сумки' },
    { id: 'Автотовары', name: 'Автотовары' },
    { id: 'Декор & Арт', name: 'Декор & Арт' },
    { id: 'Разное', name: 'Разное' }
  ];

  // State
  const state = {
    hall: 'all',
    sort: 'default', // 'default' | 'price_asc' | 'price_desc'
    search: '',
    limit: PAGE_SIZE,
    selectedExhibit: null
  };

  // DOM Elements
  const el = {
    hallsNav: document.getElementById('halls-nav'),
    sortActions: document.querySelectorAll('.sort-action'),
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
    modalWaBtn: document.getElementById('modal-wa-btn')
  };

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

    el.hallsNav.innerHTML = HALLS.map(h => {
      const isActive = state.hall === h.id;
      return `
        <li>
          <button type="button" class="hall-action ${isActive ? 'active' : ''}" data-hall="${escapeHtml(h.id)}">
            ${escapeHtml(h.name)}
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
    const q = state.search.toLowerCase().trim();

    return PRODUCTS.filter(p => {
      // Hall filter
      if (state.hall !== 'all') {
        if (p.exhibitHall !== state.hall) {
          return false;
        }
      }

      // Search query
      if (q) {
        const inName = p.name.toLowerCase().includes(q);
        const inBrand = (p.exhibitBrand || '').toLowerCase().includes(q);
        const inHall = (p.exhibitHall || '').toLowerCase().includes(q);
        if (!inName && !inBrand && !inHall) return false;
      }

      return true;
    }).sort((a, b) => {
      if (state.sort === 'price_asc') return a.price - b.price;
      if (state.sort === 'price_desc') return b.price - a.price;
      return a.id - b.id; // default order
    });
  }

  // Render an individual card
  function renderCard(p, displayIndex) {
    const num = formatNum(displayIndex + 1);
    const brand = p.exhibitBrand || 'MAUNI';
    const price = p.priceStr || formatPrice(p.price);
    const waUrl = getWhatsAppUrl(p);

    return `
      <article class="exhibit-card" data-id="${p.id}">
        <div class="card-top">
          <span class="card-num">${num}</span>
          <h2 class="card-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h2>
          <span class="card-price">${escapeHtml(price)}</span>
        </div>

        <div class="card-photo-area">
          <img
            loading="lazy"
            src="${escapeHtml(p.img)}"
            alt="${escapeHtml(p.name)}"
            onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\' fill=\'%23f7f7f7\'><rect width=\'200\' height=\'200\'/><text x=\'50%\' y=\'50%\' fill=\'%23b0272d\' font-size=\'13\' text-anchor=\'middle\' dy=\'.3em\'>MAUNI</text></svg>';"
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

  // Open modal with product passport
  function openModal(productId) {
    const p = PRODUCTS.find(item => item.id === productId);
    if (!p) return;

    state.selectedExhibit = p;

    el.modalNum.textContent = formatNum(p.id);
    el.modalBrand.textContent = p.exhibitBrand || 'MAUNI';
    el.modalName.textContent = p.name;
    el.modalPrice.textContent = p.priceStr || formatPrice(p.price);
    el.modalImg.src = p.img;
    el.modalImg.alt = p.name;

    // Badges
    el.modalTags.innerHTML = (p.badges || []).map(b => {
      const isHit = b.toLowerCase().includes('хит');
      return `<span class="modal-badge ${isHit ? 'hit' : ''}">${escapeHtml(b)}</span>`;
    }).join('');

    // Actions
    el.modalKaspiBtn.href = p.url;
    el.modalWaBtn.href = getWhatsAppUrl(p);

    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // Close modal
  function closeModal() {
    el.modal.hidden = true;
    document.body.style.overflow = '';
  }

  // Update UI and re-render
  function updateUI() {
    const currentHall = HALLS.find(h => h.id === state.hall) || { name: 'Все' };
    if (el.currentHallLabel) {
      el.currentHallLabel.textContent = currentHall.name.toUpperCase();
    }

    // Active hall in sidebar
    if (el.hallsNav) {
      el.hallsNav.querySelectorAll('.hall-action').forEach(btn => {
        const id = btn.getAttribute('data-hall');
        btn.classList.toggle('active', id === state.hall);
      });
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
    el.grid.innerHTML = visible.map((p, idx) => renderCard(p, idx)).join('');

    // Card click listener (for opening passport modal or clicking quick actions)
    el.grid.querySelectorAll('.exhibit-card').forEach(card => {
      card.addEventListener('click', e => {
        // If clicking on quick button link, don't open modal
        if (e.target.closest('.quick-btn')) return;
        const id = parseInt(card.getAttribute('data-id'), 10);
        openModal(id);
      });
    });

    // Load more container
    if (el.loadMoreWrap) {
      const hasMore = visible.length < total;
      el.loadMoreWrap.hidden = !hasMore;
      if (el.loadMoreBtn) {
        const remaining = total - visible.length;
        const nextBatch = Math.min(PAGE_SIZE, remaining);
        el.loadMoreBtn.textContent = `Показать ещё ${nextBatch} из ${remaining}`;
      }
    }
  }

  // Reset filters
  function resetFilters() {
    state.hall = 'all';
    state.sort = 'default';
    state.search = '';
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

    // Modal close
    if (el.modalClose) el.modalClose.addEventListener('click', closeModal);
    if (el.modalOverlay) el.modalOverlay.addEventListener('click', closeModal);

    // Escape closes modal
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !el.modal.hidden) {
        closeModal();
      }
    });
  }

  // Init
  function init() {
    renderHalls();
    initEvents();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
