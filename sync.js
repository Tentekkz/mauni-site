/**
 * MAUNI KitSeller Synchronizer
 * Fetches latest catalog data from https://app.kitseller.kz/store/mauni,
 * enriches it with exhibitBrand and exhibitHall, and writes products.js.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const KITSELLER_URL = 'https://app.kitseller.kz/store/mauni';
const OUTPUT_FILE = path.join(__dirname, 'products.js');

function categorize(name) {
  const n = name.toLowerCase();
  
  if (/kaws/.test(n)) return { brand: 'KAWS', hall: 'KAWS' };
  if (/bearbrick/.test(n)) return { brand: 'BE@RBRICK', hall: 'BE@RBRICK' };
  if (/goyard|matignon/.test(n)) return { brand: 'GOYARD', hall: 'Goyard' };
  if (/arcteryx|arc'teryx/.test(n)) return { brand: "ARC'TERYX", hall: "Arc'teryx" };
  if (/футболк|толстовк|худи|куртк|ветровк|шорт|штаны|леггинсы|рашгард/.test(n)) return { brand: 'ОДЕЖДА', hall: 'Одежда' };
  if (/on performance/.test(n)) return { brand: 'ON', hall: 'Головные уборы' };
  if (/fred perry/.test(n)) return { brand: 'FRED PERRY', hall: 'Сумки' };
  if (/vivienne westwood/.test(n)) return { brand: 'VIVIENNE WESTWOOD', hall: 'Сумки' };
  if (/chrome hearts/.test(n)) return { brand: 'CHROME HEARTS', hall: 'Аксессуары' };
  if (/toyota|camry|elantra|valeo|подлокот|плафон освещения/.test(n)) return { brand: 'АВТОТОВАРЫ', hall: 'Автотовары' };
  if (/шапк|бейсболк|кепк|панам|козырек|бини|balaclava|балаклав/.test(n)) return { brand: 'ГОЛОВНЫЕ УБОРЫ', hall: 'Головные уборы' };
  if (/сумк|картхолдер|кошелек|портмоне|клатч|рюкзак|барсетк|чехол|паспорт|купюр/.test(n)) return { brand: 'СУМКИ', hall: 'Сумки' };
  if (/фигурк|гобелен|декоративн|статуэтк|игрушк|мистер бист|mr\.beast|самолет|hajime sorayama/.test(n)) return { brand: 'ДЕКОР & АРТ', hall: 'Декор & Арт' };
  
  return { brand: 'MAUNI', hall: 'Разное' };
}

function fetchCatalog() {
  console.log(`[Sync] Fetching latest products from ${KITSELLER_URL}...`);
  
  https.get(KITSELLER_URL, (res) => {
    if (res.statusCode !== 200) {
      console.error(`[Sync] Error: status code ${res.statusCode}`);
      return;
    }

    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
      const match = html.match(/const products\s*=\s*(\[[\s\S]*?\]);/);
      if (!match) {
        console.error('[Sync] Could not find products array in KitSeller HTML response');
        return;
      }

      try {
        const rawProducts = JSON.parse(match[1]);
        console.log(`[Sync] Found ${rawProducts.length} products from KitSeller`);

        const enriched = rawProducts.map((p, index) => {
          const { brand, hall } = categorize(p.name);
          const isPreorder = (p.preorder_days && p.preorder_days > 0) || false;
          const badges = [];
          if (p.hit) badges.push('Хит');
          if (isPreorder) badges.push(`Предзаказ ${p.preorder_days} дн.`);

          return {
            id: index + 1,
            sku: p.sku || '',
            name: p.name || '',
            price: p.price || 0,
            priceStr: p.price_formatted || `${p.price} ₸`,
            img: p.image_url || '',
            url: p.buy_url || '',
            category: hall,
            exhibitBrand: brand,
            exhibitHall: hall,
            isHit: !!p.hit,
            isPreorder: isPreorder,
            stockCount: p.stock_count || 0,
            badges: badges
          };
        });

        const jsCode = 'window.MAUNI_PRODUCTS = ' + JSON.stringify(enriched) + ';\n';
        fs.writeFileSync(OUTPUT_FILE, jsCode, 'utf8');
        console.log(`[Sync] Successfully updated ${OUTPUT_FILE} with ${enriched.length} items!`);
      } catch (err) {
        console.error('[Sync] JSON Parse error:', err);
      }
    });
  }).on('error', (err) => {
    console.error('[Sync] Network error:', err.message);
  });
}

fetchCatalog();

