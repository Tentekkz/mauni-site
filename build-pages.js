/**
 * MAUNI — собирает отдельную страницу на каждый товар (e/<адрес>.html), sitemap.xml и robots.txt.
 * Так товары видны поисковикам, а ссылка в мессенджере показывает фото и цену этой вещи.
 * Запуск: node build-pages.js (после sync.js). Страницы исчезнувших товаров удаляются.
 */
const fs = require('fs');
const path = require('path');
const { storyOf } = require('./stories.js');
const { pageSlug, buildGroups, groupKey, colourOf, sizeOf, similarTo, brandOf, GENERIC_BRANDS } = require('./shared.js');

const SITE = 'https://mauni.kz';
const OUT_DIR = path.join(__dirname, 'e');
const WHATSAPP = '77766088813';
const HALL_DIR = path.join(__dirname, 'hall');
const MIN_BRAND_ITEMS = 5;

// Страницы залов. Текст о брендах совпадает с рассказом в каталоге (i18n.js).
const HALL_PAGES = [
  { slug: 'kaws', hall: 'KAWS', name: 'KAWS', text: 'KAWS — псевдоним американского художника Брайана Доннелли. Его персонаж Companion с крестиками вместо глаз стал одной из самых узнаваемых фигур современного искусства.' },
  { slug: 'bearbrick', hall: 'BE@RBRICK', name: 'BE@RBRICK', text: 'BE@RBRICK — коллекционный медведь японской компании Medicom Toy, который выходит с 2001 года. Художники и бренды превращают одну и ту же форму в новые работы.' },
  { slug: 'goyard', hall: 'Goyard', name: 'Goyard', text: 'Французский дом Goyard основан в Париже в 1853 году. Его рисунок из мелких шевронов узнают с первого взгляда.' },
  { slug: 'arcteryx', hall: "Arc'teryx", name: "Arc'teryx", text: 'Канадский бренд снаряжения для гор. На его логотипе — окаменелость археоптерикса, одной из первых известных птиц.' },
  { slug: 'golovnye-ubory', hall: 'Головные уборы', name: 'Головные уборы', text: 'Шапки, кепки, панамы и бейсболки в каталоге MAUNI.' },
  { slug: 'sumki', hall: 'Сумки', name: 'Сумки', text: 'Сумки, кошельки и картхолдеры в каталоге MAUNI.' },
  { slug: 'odezhda', hall: 'Одежда', name: 'Одежда', text: 'Одежда в каталоге MAUNI.' },
  { slug: 'dekor', hall: 'Декор & Арт', name: 'Декор & Арт', text: 'Фигурки, гобелены и предметы декора в каталоге MAUNI.' },
  { slug: 'avtotovary', hall: 'Автотовары', name: 'Автотовары', text: 'Органайзеры, коврики и другие автотовары в каталоге MAUNI.' },
  { slug: 'aksessuary', hall: 'Аксессуары', name: 'Аксессуары', text: 'Аксессуары в каталоге MAUNI.' }
];
const hallSlug = {};
HALL_PAGES.forEach(h => { hallSlug[h.hall] = h.slug; });

function loadProducts() {
  const win = {};
  new Function('window', fs.readFileSync(path.join(__dirname, 'products.js'), 'utf8'))(win);
  const products = win.MAUNI_PRODUCTS || [];
  products.forEach(p => { p.exhibitBrand = brandOf(p); });
  return products;
}

const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]
));
const bigImg = url => String(url).replace('format=gallery-small', 'format=gallery-medium');
const midImg = url => String(url).replace('format=gallery-small', 'format=preview-large');
const pageFile = p => pageSlug(p.sku) + '.html';

function variantLabel(p, showSize) {
  const parts = [];
  const colour = colourOf(p.name);
  const size = sizeOf(p.name);
  if (colour) parts.push(colour);
  if (showSize && size) parts.push(size);
  return parts.join(', ') || '№' + p.id;
}

function renderPage(p, products, groups) {
  const url = `${SITE}/e/${pageFile(p)}`;
  const price = p.priceStr || `${p.price} ₸`;
  const title = `${p.name} — ${price} | MAUNI`;
  const group = groups.get(groupKey(p.name)) || [p];
  const story = storyOf(p, { colourOf, variants: group });
  const description = `${p.name}. Цена ${price}. ${story}`.slice(0, 300);
  const brand = GENERIC_BRANDS.includes(p.exhibitBrand) ? '' : p.exhibitBrand;

  const offer = {
    '@type': 'Offer',
    url,
    priceCurrency: 'KZT',
    price: p.price,
    availability: p.isPreorder ? 'https://schema.org/PreOrder' : (p.stockCount > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock')
  };
  const schema = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: String(p.sku), image: bigImg(p.img), description: story, offers: offer };
  if (brand) schema.brand = { '@type': 'Brand', name: brand };
  const schemaJson = JSON.stringify(schema).replace(/</g, '\\u003c');

  const waText = `Здравствуйте! Хочу приобрести экспонат:\n\n*${p.name}*\nЦена: ${price}\n\nСсылка: ${url}`;
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText)}`;

  const showSize = new Set(group.map(v => sizeOf(v.name))).size > 1;
  const variants = group.length > 1 ? `
      <div class="modal-variants">
        ${group.map(v => (v === p
          ? `<span class="variant-chip on">${esc(variantLabel(v, showSize))}</span>`
          : `<a class="variant-chip" href="${esc(encodeURI(pageFile(v)))}">${esc(variantLabel(v, showSize))}</a>`)).join('\n        ')}
      </div>` : '';

  const similar = similarTo(p, products, 6);
  const similarHtml = similar.length ? `
    <section class="modal-similar product-similar">
      <h2 class="similar-title">Похожие экспонаты</h2>
      <div class="similar-row">
        ${similar.map(s => `<a class="similar-item" href="${esc(encodeURI(pageFile(s)))}"><img src="${esc(midImg(s.img))}" alt="${esc(s.name)}" loading="lazy"><span class="similar-name">${esc(s.name)}</span><b>${esc(s.priceStr || '')}</b></a>`).join('\n        ')}
      </div>
    </section>` : '';

  const tags = [];
  if (p.stockCount === 1 && !p.isPreorder) tags.push('<span class="modal-badge hit">Последний экземпляр</span>');
  (p.badges || []).forEach(b => tags.push(`<span class="modal-badge${/хит/i.test(b) ? ' hit' : ''}">${esc(b)}</span>`));

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(p.name)} — ${esc(price)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(bigImg(p.img))}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="/fonts/montserrat-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preconnect" href="https://resources.cdn-kaspi.kz">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="../style.css">
  <script type="application/ld+json">${schemaJson}</script>
</head>
<body class="exhibition-page product-page">
  <header class="gallery-header">
    <div class="gallery-header-inner">
      <a href="../index.html" class="gallery-logo-link" title="MAUNI Главная"><img src="../assets/logo-dark.svg" alt="mauni" class="gallery-logo" width="130" height="37"></a>
      <nav class="gallery-nav">${hallSlug[p.exhibitHall] ? `<a href="../hall/${hallSlug[p.exhibitHall]}.html" class="nav-link">${esc(p.exhibitHall)}</a>` : ''}<a href="../catalog.html" class="nav-link active">Все экспонаты</a></nav>
    </div>
  </header>
  <main class="product-main">
    <div class="modal-window product-window">
      <div class="modal-content">
        <div class="modal-img-col"><img src="${esc(bigImg(p.img))}" alt="${esc(p.name)}" fetchpriority="high"></div>
        <div class="modal-info-col">
          <div class="modal-meta-row"><span class="modal-brand">${esc(p.exhibitBrand || 'MAUNI')}</span></div>
          <h1 class="modal-name">${esc(p.name)}</h1>
          <div class="modal-price">${esc(price)}</div>
          <div class="modal-tags">${tags.join('')}</div>${variants}
          <p class="modal-story">${esc(story)}</p>
          <div class="modal-actions-row">
            <a class="modal-btn-kaspi" href="${esc(p.url)}" target="_blank" rel="noopener"><span>Купить на Kaspi</span><span class="arrow-icon">↗</span></a>
            <a class="modal-btn-wa" href="${esc(waUrl)}" target="_blank" rel="noopener"><span>Заказать в WhatsApp</span></a>
          </div>
        </div>
      </div>${similarHtml}
    </div>
  </main>
  <script src="../analytics.js"></script>
</body>
</html>
`;
}

// Страница зала или бренда: список моделей обычными ссылками, понятными поисковику
function renderHallPage(page, items, allPages) {
  const url = `${SITE}/hall/${page.slug}.html`;
  const title = `${page.name} — каталог с ценами | MAUNI`;
  const description = `${page.text} Цены, заказ на Kaspi и в WhatsApp, доставка по Казахстану.`;
  const seen = new Set();
  const models = items.filter(p => {
    const key = groupKey(p.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: page.name, url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: models.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/e/${encodeURI(pageFile(p))}` }))
    }
  };
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(page.name)} — MAUNI">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(models[0] ? bigImg(models[0].img) : SITE + '/assets/og.jpg')}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="/fonts/montserrat-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preconnect" href="https://resources.cdn-kaspi.kz">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="../style.css">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head>
<body class="exhibition-page product-page">
  <header class="gallery-header">
    <div class="gallery-header-inner">
      <a href="../index.html" class="gallery-logo-link" title="MAUNI Главная"><img src="../assets/logo-dark.svg" alt="mauni" class="gallery-logo" width="130" height="37"></a>
      <nav class="gallery-nav"><a href="../catalog.html" class="nav-link active">Все экспонаты</a></nav>
    </div>
  </header>
  <main class="hall-page-main">
    <section class="hall-intro">
      <div class="hall-intro-text">
        <h1>${esc(page.name)}</h1>
        <p>${esc(page.text)}</p>
      </div>
    </section>
    <div class="exhibit-grid">
      ${models.map(p => `<a class="exhibit-card" href="../e/${esc(encodeURI(pageFile(p)))}">
        <div class="card-top"><h2 class="card-title">${esc(p.name)}</h2><span class="card-price">${esc(p.priceStr || '')}</span></div>
        <div class="card-photo-area"><img loading="lazy" src="${esc(midImg(p.img))}" alt="${esc(p.name)}"></div>
        <div class="card-bottom"><span class="card-brand">${esc(p.exhibitBrand || 'MAUNI')}</span></div>
      </a>`).join('\n      ')}
    </div>
    <nav class="hall-page-links">
      ${allPages.filter(h => h.slug !== page.slug).map(h => `<a href="${h.slug}.html">${esc(h.name)}</a>`).join('\n      ')}
    </nav>
  </main>
  <script src="../analytics.js"></script>
</body>
</html>
`;
}

// ---------- Главная: рамки для заставки ----------
const FEATURED_FILE = path.join(__dirname, 'data', 'featured.json');
const WALL_SIZE = 8;
const WALL_HALLS = ['KAWS', 'Goyard', "Arc'teryx", 'BE@RBRICK', 'Сумки', 'Головные уборы'];

function loadFeatured() {
  try {
    const data = JSON.parse(fs.readFileSync(FEATURED_FILE, 'utf8'));
    return { hero: data.hero || [], hide: data.hide || [] };
  } catch (e) {
    return { hero: [], hide: [] };
  }
}

function homeFrame(p) {
  return `<a class="hall-frame" href="e/${esc(encodeURI(pageFile(p)))}" tabindex="-1">
      <span class="hall-frame-box"><img src="${esc(midImg(p.img))}" alt="" width="300" height="375"></span>
      <span class="hall-frame-label"><b>№${String(p.id).padStart(2, '0')}</b><span>${esc(p.exhibitBrand || 'MAUNI')}</span><span>${esc(p.priceStr || '')}</span></span>
    </a>`;
}

function writeHome(products) {
  const file = path.join(__dirname, 'index.html');
  const original = fs.readFileSync(file, 'utf8');
  const crlf = original.includes('\r\n');
  let html = original.replace(/\r\n/g, '\n');

  const featured = loadFeatured();
  const hide = new Set(featured.hide.map(String));
  const usable = products.filter(p => p.img && !hide.has(String(p.sku)));
  const bySku = new Map(products.map(p => [String(p.sku), p]));

  // Сначала выбранные вручную, остальное добирается по кругу из разных залов, чтобы не было одних фигурок
  const wall = [];
  const addToWall = p => {
    if (!p || !p.img || wall.length >= WALL_SIZE) return;
    if (wall.includes(p) || wall.some(w => groupKey(w.name) === groupKey(p.name))) return;
    wall.push(p);
  };
  featured.hero.forEach(sku => addToWall(bySku.get(String(sku))));
  const queues = WALL_HALLS.map(hall => usable.filter(p => p.exhibitHall === hall).sort((a, b) => b.price - a.price));
  for (let i = 0; wall.length < WALL_SIZE && i < 12; i++) queues.forEach(q => addToWall(q[i]));

  const re = /<!--WALL-->[\s\S]*?<!--\/WALL-->/;
  if (!re.test(html)) throw new Error('index.html: нет маркера WALL');
  html = html.replace(re, () => `<!--WALL-->${wall.map(homeFrame).join('\n    ')}<!--/WALL-->`);

  if (crlf) html = html.replace(/\n/g, '\r\n');
  if (html !== original) fs.writeFileSync(file, html);
  console.log(`[Home] Рамок для заставки: ${wall.length}`);
}


// Первая картинка каталога: браузер начинает её грузить, не дожидаясь скриптов
function writeCatalogPreload(products) {
  const file = path.join(__dirname, 'catalog.html');
  const html = fs.readFileSync(file, 'utf8');
  const first = products.slice().sort((a, b) => a.id - b.id).find(p => p.img);
  const tag = first ? `<link rel="preload" as="image" href="${esc(midImg(first.img))}" fetchpriority="high">` : '';
  const next = html.replace(/<!--LCP-PRELOAD-->[\s\S]*?<!--\/LCP-PRELOAD-->/, `<!--LCP-PRELOAD-->${tag}<!--/LCP-PRELOAD-->`);
  if (next !== html) fs.writeFileSync(file, next);
}

function writeIfChanged(file, content) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) fs.writeFileSync(file, content);
}

function main() {
  const products = loadProducts().filter(p => p.sku && p.name);
  const groups = buildGroups(products);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const expected = new Set();
  products.forEach(p => {
    const file = pageFile(p);
    if (expected.has(file)) {
      console.warn('[Pages] Совпал адрес страницы, товар пропущен:', p.sku);
      return;
    }
    expected.add(file);
    const target = path.join(OUT_DIR, file);
    const html = renderPage(p, products, groups);
    // Не трогаем файл без изменений, чтобы синхронизация не создавала лишних коммитов
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) fs.writeFileSync(target, html);
  });

  let removed = 0;
  fs.readdirSync(OUT_DIR).forEach(file => {
    if (file.endsWith('.html') && !expected.has(file)) {
      fs.unlinkSync(path.join(OUT_DIR, file));
      removed++;
    }
  });

  // Залы и крупные бренды
  fs.mkdirSync(HALL_DIR, { recursive: true });
  const brandCounts = new Map();
  products.forEach(p => {
    if (!GENERIC_BRANDS.includes(p.exhibitBrand)) brandCounts.set(p.exhibitBrand, (brandCounts.get(p.exhibitBrand) || 0) + 1);
  });
  const hallBrands = new Set(['KAWS', 'BE@RBRICK', 'GOYARD', "ARC'TERYX"]);
  const brandPages = [...brandCounts.entries()]
    .filter(([brand, count]) => count >= MIN_BRAND_ITEMS && !hallBrands.has(brand))
    .map(([brand]) => {
      const slug = brand.toLowerCase().replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return { slug, brand, name: brand, text: `Товары ${brand} в каталоге MAUNI.` };
    });
  const pages = HALL_PAGES.filter(h => products.some(p => p.exhibitHall === h.hall)).concat(brandPages);
  const hallFiles = new Set();
  pages.forEach(page => {
    const items = products.filter(p => (page.brand ? p.exhibitBrand === page.brand : p.exhibitHall === page.hall));
    hallFiles.add(page.slug + '.html');
    writeIfChanged(path.join(HALL_DIR, page.slug + '.html'), renderHallPage(page, items, pages));
  });
  fs.readdirSync(HALL_DIR).forEach(file => {
    if (file.endsWith('.html') && !hallFiles.has(file)) fs.unlinkSync(path.join(HALL_DIR, file));
  });
  writeHome(products);
  writeCatalogPreload(products);

  const urls = [`${SITE}/`, `${SITE}/catalog.html`, ...[...hallFiles].map(f => `${SITE}/hall/${f}`), ...[...expected].map(f => `${SITE}/e/${encodeURI(f)}`)];
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

  console.log(`[Pages] Страниц товаров: ${expected.size}, залов и брендов: ${hallFiles.size}, удалено старых: ${removed}`);
}

main();
