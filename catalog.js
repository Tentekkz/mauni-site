/**
 * MAUNI Catalog Controller
 * Handles instant search, category filtering, badge filtering, sorting,
 * progressive loading, URL state synchronization and WhatsApp checkout.
 */

(function () {
  'use strict';

  const PRODUCTS = window.MAUNI_PRODUCTS || [];
  const PAGE_SIZE = 36;
  const WHATSAPP_PHONE = '77766088813';

  // Category definitions with clean labels
  const CATEGORIES = [
    { id: 'all', name: 'Все товары' },
    { id: 'Головные уборы', name: 'Головные уборы' },
    { id: 'Фигурки и декор', name: 'Фигурки и декор' },
    { id: 'Сумки и кошельки', name: 'Сумки и кошельки' },
    { id: 'Автотовары', name: 'Автотовары' },
    { id: 'Одежда и аксессуары', name: 'Одежда и аксессуары' },
    { id: 'Гаджеты и другое', name: 'Гаджеты и другое' }
  ];

  // State
  const state = {
    search: '',
    category: 'all',
    badge: 'all', // 'all' | 'hit' | 'in_stock' | 'preorder'
    sort: 'default', // 'default' | 'price_asc' | 'price_desc' | 'name_asc'
    limit: PAGE_SIZE
  };

  // DOM Elements
  const el = {
    search: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    categoriesContainer: document.getElementById('categories-tabs'),
    badgeChips: document.querySelectorAll('.chip[data-badge]'),
    sortSelect: document.getElementById('sort-select'),
    grid: document.getElementById('products-grid'),
    countBadge: document.getElementById('products-count'),
    activeFilterNote: document.getElementById('active-filter-note'),
    loadMoreContainer: document.getElementById('load-more-container'),
    loadMoreBtn: document.getElementById('load-more-btn'),
    emptyState: document.getElementById('empty-state'),
    resetBtn: document.getElementById('reset-filters-btn'),
    scrollTopBtn: document.getElementById('scroll-top-btn')
  };

  // Format price helper
  function formatPrice(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  }

  // Escape HTML helper
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Highlight matching search query in product name
  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapedText.replace(regex, '<mark>$1</mark>');
  }

  // WhatsApp checkout message generator
  function getWhatsAppUrl(product) {
    const text = `Здравствуйте! Хочу уточнить наличие и заказать:\n\n*${product.name}*\nЦена: ${product.priceStr || formatPrice(product.price)}\n\nСсылка: ${product.url || 'https://mauni.kz/catalog.html'}`;
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
  }

  // Read URL query params on initial load
  function readUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('q')) state.search = params.get('q').trim();
      if (params.has('cat')) state.category = params.get('cat');
      if (params.has('badge')) state.badge = params.get('badge');
      if (params.has('sort')) state.sort = params.get('sort');
    } catch (e) {
      console.warn('URL params error:', e);
    }
  }

  // Update URL query params without reloading
  function syncUrlParams() {
    try {
      const params = new URLSearchParams();
      if (state.search) params.set('q', state.search);
      if (state.category && state.category !== 'all') params.set('cat', state.category);
      if (state.badge && state.badge !== 'all') params.set('badge', state.badge);
      if (state.sort && state.sort !== 'default') params.set('sort', state.sort);

      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
      window.history.replaceState({}, '', newUrl);
    } catch (e) {
      // Ignore in environments where pushState fails
    }
  }

  // Calculate product counts per category
  function getCategoryCounts() {
    const counts = { all: PRODUCTS.length };
    CATEGORIES.forEach(c => {
      if (c.id !== 'all') counts[c.id] = 0;
    });

    PRODUCTS.forEach(p => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });

    return counts;
  }

  // Render category tabs
  function renderCategoryTabs() {
    if (!el.categoriesContainer) return;
    const counts = getCategoryCounts();

    el.categoriesContainer.innerHTML = CATEGORIES.map(cat => {
      const isActive = state.category === cat.id;
      const count = counts[cat.id] || 0;
      return `
        <button type="button" class="tab-btn ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat.id)}">
          <span class="tab-label">${escapeHtml(cat.name)}</span>
          <span class="tab-count">${count}</span>
        </button>
      `;
    }).join('');

    // Attach listeners
    el.categoriesContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-category');
        if (state.category === catId) return;
        state.category = catId;
        state.limit = PAGE_SIZE;
        updateUI();
        syncUrlParams();

        // Scroll category button into view smoothly on mobile
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });
  }

  // Filter & sort products
  function getFilteredProducts() {
    const query = state.search.toLowerCase().trim();

    return PRODUCTS.filter(p => {
      // Category filter
      if (state.category !== 'all' && p.category !== state.category) {
        return false;
      }

      // Badge filter
      if (state.badge === 'hit' && !p.isHit) return false;
      if (state.badge === 'in_stock' && p.isPreorder) return false;
      if (state.badge === 'preorder' && !p.isPreorder) return false;

      // Search query filter (matches name, category, or badges)
      if (query) {
        const inName = p.name.toLowerCase().includes(query);
        const inCat = p.category.toLowerCase().includes(query);
        const inBadge = p.badges && p.badges.some(b => b.toLowerCase().includes(query));
        if (!inName && !inCat && !inBadge) return false;
      }

      return true;
    }).sort((a, b) => {
      if (state.sort === 'price_asc') return a.price - b.price;
      if (state.sort === 'price_desc') return b.price - a.price;
      if (state.sort === 'name_asc') return a.name.localeCompare(b.name, 'ru');
      return a.id - b.id; // default catalog order
    });
  }

  // Render product card HTML
  function renderCard(p) {
    const waUrl = getWhatsAppUrl(p);
    const highlightedName = highlightText(p.name, state.search);
    const badgesHtml = (p.badges || []).map(b => {
      const isHit = b.toLowerCase().includes('хит');
      return `<span class="badge ${isHit ? 'hit' : ''}">${escapeHtml(b)}</span>`;
    }).join('');

    return `
      <article class="card" data-id="${p.id}">
        <div class="card-img-wrap">
          <img
            loading="lazy"
            src="${escapeHtml(p.img)}"
            alt="${escapeHtml(p.name)}"
            onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\' fill=\'%232a2f39\'><rect width=\'200\' height=\'200\'/><text x=\'50%\' y=\'50%\' fill=\'%23c9c5bc\' font-size=\'14\' text-anchor=\'middle\' dy=\'.3em\'>MAUNI</text></svg>';"
          >
          <div class="card-badges">${badgesHtml}</div>
        </div>
        <div class="card-body">
          <div class="card-category">${escapeHtml(p.category)}</div>
          <h2 class="card-name" title="${escapeHtml(p.name)}">${highlightedName}</h2>
          <div class="card-price">${escapeHtml(p.priceStr || formatPrice(p.price))}</div>
          <div class="card-actions">
            <a class="btn-buy" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">
              <span>Купить на Kaspi</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7.8H7.8"/></svg>
            </a>
            <a class="btn-wa" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener" title="Спросить или заказать в WhatsApp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.668-.699c.969.587 1.961.948 3.01.948h.005c3.18 0 5.767-2.586 5.768-5.766 0-1.543-.601-2.993-1.692-4.084a5.72 5.72 0 0 0-4.299-2.05zm0 10.375h-.004c-.93 0-1.844-.25-2.642-.724l-.19-.112-1.963.515.524-1.913-.123-.196a4.617 4.617 0 0 1-.708-2.479c.001-2.553 2.079-4.63 4.635-4.63 1.238 0 2.402.483 3.277 1.358a4.61 4.61 0 0 1 1.356 3.277c-.001 2.553-2.079 4.63-4.633 4.63zm2.541-3.468c-.139-.07-0.824-.407-.952-.454-.128-.046-.221-.07-.315.07-.093.139-.361.454-.442.547-.082.093-.163.105-.303.035-.139-.07-.588-.217-1.12-.691-.414-.369-.693-.825-.774-.964-.082-.139-.009-.214.061-.284.063-.062.139-.163.209-.244.07-.082.093-.139.139-.232.046-.093.023-.174-.012-.244-.035-.07-.315-.758-.431-1.039-.114-.273-.23-.236-.315-.24l-.269-.004c-.093 0-.244.035-.372.174-.128.139-.488.477-.488 1.163 0 .686.499 1.35.569 1.443.07.093.983 1.5 2.381 2.105.333.144.593.23.796.294.334.106.638.091.879.055.268-.04.824-.337.94-.662.116-.326.116-.605.081-.663-.035-.058-.128-.093-.267-.163z"/></svg>
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  // Update UI and render cards
  function updateUI() {
    const filtered = getFilteredProducts();
    const totalFiltered = filtered.length;
    const visible = filtered.slice(0, state.limit);

    // Update counts and notes
    if (el.countBadge) {
      el.countBadge.textContent = `${totalFiltered} ${pluralize(totalFiltered, ['товар', 'товара', 'товаров'])}`;
    }

    // Active filter description helper
    if (el.activeFilterNote) {
      const parts = [];
      if (state.category !== 'all') parts.push(state.category);
      if (state.badge === 'hit') parts.push('🔥 Хиты');
      if (state.badge === 'in_stock') parts.push('В наличии');
      if (state.badge === 'preorder') parts.push('Под заказ');
      if (state.search) parts.push(`«${state.search}»`);

      if (parts.length > 0) {
        el.activeFilterNote.textContent = `Фильтр: ${parts.join(' • ')}`;
        el.activeFilterNote.hidden = false;
      } else {
        el.activeFilterNote.hidden = true;
      }
    }

    // Toggle search clear button
    if (el.searchClear) {
      el.searchClear.hidden = !state.search;
    }

    // Update active category tabs visually
    if (el.categoriesContainer) {
      el.categoriesContainer.querySelectorAll('.tab-btn').forEach(btn => {
        const cat = btn.getAttribute('data-category');
        btn.classList.toggle('active', cat === state.category);
      });
    }

    // Update badge chips visually
    if (el.badgeChips) {
      el.badgeChips.forEach(chip => {
        const b = chip.getAttribute('data-badge');
        chip.classList.toggle('active', b === state.badge);
      });
    }

    // Empty state
    if (totalFiltered === 0) {
      el.grid.innerHTML = '';
      if (el.emptyState) el.emptyState.hidden = false;
      if (el.loadMoreContainer) el.loadMoreContainer.hidden = true;
      return;
    }

    if (el.emptyState) el.emptyState.hidden = true;

    // Render cards
    el.grid.innerHTML = visible.map(renderCard).join('');

    // Load more button & infinite trigger
    if (el.loadMoreContainer) {
      const hasMore = visible.length < totalFiltered;
      el.loadMoreContainer.hidden = !hasMore;
      if (el.loadMoreBtn) {
        const remaining = totalFiltered - visible.length;
        const nextBatch = Math.min(PAGE_SIZE, remaining);
        el.loadMoreBtn.textContent = `Показать ещё ${nextBatch} из ${remaining}`;
      }
    }
  }

  // Russian pluralization helper
  function pluralize(n, forms) {
    const abs = Math.abs(n) % 100;
    const num = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (num > 1 && num < 5) return forms[1];
    if (num === 1) return forms[0];
    return forms[2];
  }

  // Reset all filters
  function resetAll() {
    state.search = '';
    state.category = 'all';
    state.badge = 'all';
    state.sort = 'default';
    state.limit = PAGE_SIZE;

    if (el.search) el.search.value = '';
    if (el.sortSelect) el.sortSelect.value = 'default';

    updateUI();
    syncUrlParams();
  }

  // Set up event listeners
  function initEvents() {
    // Search input (debounced)
    let searchTimeout;
    if (el.search) {
      el.search.value = state.search;
      el.search.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          state.search = e.target.value.trim();
          state.limit = PAGE_SIZE;
          updateUI();
          syncUrlParams();
        }, 120);
      });

      // Clear on Esc
      el.search.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          el.search.value = '';
          state.search = '';
          state.limit = PAGE_SIZE;
          updateUI();
          syncUrlParams();
        }
      });
    }

    // Search clear button
    if (el.searchClear) {
      el.searchClear.addEventListener('click', () => {
        if (el.search) {
          el.search.value = '';
          el.search.focus();
        }
        state.search = '';
        state.limit = PAGE_SIZE;
        updateUI();
        syncUrlParams();
      });
    }

    // Badge chips
    if (el.badgeChips) {
      el.badgeChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const badgeVal = chip.getAttribute('data-badge');
          state.badge = (state.badge === badgeVal && badgeVal !== 'all') ? 'all' : badgeVal;
          state.limit = PAGE_SIZE;
          updateUI();
          syncUrlParams();
        });
      });
    }

    // Sort select
    if (el.sortSelect) {
      el.sortSelect.value = state.sort;
      el.sortSelect.addEventListener('change', e => {
        state.sort = e.target.value;
        state.limit = PAGE_SIZE;
        updateUI();
        syncUrlParams();
      });
    }

    // Load more button
    if (el.loadMoreBtn) {
      el.loadMoreBtn.addEventListener('click', () => {
        state.limit += PAGE_SIZE;
        updateUI();
      });
    }

    // Reset button in empty state
    if (el.resetBtn) {
      el.resetBtn.addEventListener('click', resetAll);
    }

    // Scroll to top button
    if (el.scrollTopBtn) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
          el.scrollTopBtn.classList.add('visible');
        } else {
          el.scrollTopBtn.classList.remove('visible');
        }
      }, { passive: true });

      el.scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Keyboard shortcut '/' to search
    window.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== el.search) {
        e.preventDefault();
        el.search?.focus();
        el.search?.select();
      }
    });
  }

  // Initialize
  function init() {
    readUrlParams();
    renderCategoryTabs();
    initEvents();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
