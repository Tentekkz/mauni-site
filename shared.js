/**
 * MAUNI — общая логика для сайта и для сборки страниц товаров (build-pages.js):
 * адрес страницы товара, разбор цвета и размера, группы цветов, похожие товары.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MauniShared = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLOURS = {
    'черно-белый': '#777777', 'темно-фиолетовый': '#3f2a6b', 'темно-зеленый': '#1f4a33',
    'темно-голубой': '#2f6f94', 'темно-синий': '#16264d', 'темно-серый': '#44474d',
    'светло-голубой': '#a9d4ea', 'светло-розовый': '#f6cfd8', 'светло-синий': '#7d9fd4',
    'пыльно-розовый': '#d3a2a6', 'черный': '#15181f', 'серый': '#8d9096', 'синий': '#2346a0',
    'коричневый': '#6a4428', 'зеленый': '#2f8a4e', 'мультиколор': 'conic-gradient(#d33,#ec3,#3a5,#36c,#d33)',
    'розовый': '#ee9db1', 'красный': '#c9242c', 'оранжевый': '#ee7a22', 'бежевый': '#d9c6a3',
    'голубой': '#7cb7e3', 'белый': '#ffffff', 'фиолетовый': '#7a4cb0', 'хаки': '#6f6f3a',
    'желтый': '#f2cc2e', 'персиковый': '#f7bc9a', 'оливковый': '#73773c', 'пурпурный': '#8e2a7a',
    'меланж': '#a7a7a7', 'бордовый': '#6d1a26', 'мятный': '#a7e3cb', 'графит': '#3a3d42',
    'малиновый': '#b6204f', 'кремовый': '#f3e7cd', 'молочный': '#f7f1e3', 'серебристый': '#c6c9cd',
    'кофейный': '#5b3f2c'
  };
  const COLOUR_NAMES = Object.keys(COLOURS).sort((a, b) => b.length - a.length);

  function fnv(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
  }

  // Имя файла страницы товара. Артикулы бывают с кириллицей и пробелами, такие заменяем кодом.
  function pageSlug(sku) {
    const value = String(sku);
    return /^[A-Za-z0-9_-]+$/.test(value) ? value.toLowerCase() : 'x' + fnv(value);
  }

  function nameTail(name) {
    const i = String(name).lastIndexOf(',');
    return i < 0 ? '' : String(name).slice(i + 1).trim().toLowerCase();
  }

  function colourOf(name) {
    const tail = nameTail(name);
    if (!tail) return '';
    return COLOUR_NAMES.find(c => tail === c || tail.endsWith(' ' + c)) || '';
  }

  function sizeOf(name) {
    const match = String(name).match(/размер\s+([^,\s]+)/i);
    return match ? match[1].toLowerCase() : '';
  }

  // Товары одной модели отличаются только цветом и размером в конце названия
  function groupKey(name) {
    let base = String(name).toLowerCase();
    if (colourOf(name)) base = base.slice(0, base.lastIndexOf(','));
    return base.replace(/размер\s+[^,\s]+/g, '').replace(/[\s,]+/g, ' ').trim();
  }

  function buildGroups(products) {
    const groups = new Map();
    products.forEach(p => {
      const key = groupKey(p.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    return groups;
  }

  // Похожие: тот же зал, другая модель; сначала тот же бренд и близкая цена
  function similarTo(product, products, limit) {
    const ownGroup = groupKey(product.name);
    const seen = new Set([ownGroup]);
    const scored = products
      .filter(p => p.exhibitHall === product.exhibitHall && p.img)
      .map(p => ({
        p,
        score: Math.abs(p.price - product.price) / Math.max(product.price, 1) +
          (p.exhibitBrand === product.exhibitBrand ? 0 : 0.6) +
          (p.isPreorder ? 0.15 : 0)
      }))
      .sort((a, b) => a.score - b.score || a.p.id - b.p.id);
    const result = [];
    for (const { p } of scored) {
      const key = groupKey(p.name);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
      if (result.length >= limit) break;
    }
    return result;
  }

  // ---------- Бренды ----------
  const GENERIC_BRANDS = ['ОДЕЖДА', 'ГОЛОВНЫЕ УБОРЫ', 'СУМКИ', 'АВТОТОВАРЫ', 'ДЕКОР & АРТ', 'MAUNI'];
  const BRAND_RULES = [
    [/carhartt/i, 'CARHARTT'], [/st[uü]ssy/i, 'STÜSSY'], [/\balo\b/i, 'ALO'], [/patagonia|pata\s*gonia/i, 'PATAGONIA'],
    [/\bemis\b/i, 'EMIS'], [/stone\s*island/i, 'STONE ISLAND'], [/nautica/i, 'NAUTICA'], [/canada[\s_]*goose/i, 'CANADA GOOSE'],
    [/trapstar/i, 'TRAPSTAR'], [/mizuno/i, 'MIZUNO'], [/dickies/i, 'DICKIES'], [/ben\s*davis/i, 'BEN DAVIS'],
    [/faure\s*le\s*page/i, 'FAURE LE PAGE'], [/\bon\s+running\b/i, 'ON'], [/palace/i, 'PALACE']
  ];

  // В каталоге у многих товаров вместо бренда стоит категория: достаём его из названия
  function brandOf(p) {
    const current = p.exhibitBrand || 'MAUNI';
    if (!GENERIC_BRANDS.includes(current)) return current;
    const rule = BRAND_RULES.find(([re]) => re.test(p.name));
    return rule ? rule[1] : current;
  }

  // ---------- Поиск ----------
  const SYNONYMS = [
    [/\b(кавс|каус|кавз|кавс|kavs|caws)\b/g, 'kaws'],
    [/\b(беарбрик|бербрик|бирбрик|беарбрикс|бербрикс|bearbrik|berbrick|bearbricks)\b/g, 'bearbrick'],
    [/\b(гоярд|гойард|гаярд|гоуярд|goard)\b/g, 'goyard'],
    [/\b(арктерикс|арктерикс|аркетерикс|артерикс|аркартерикс|арктерикс|арктерис|arcterix|arcteryks)\b/g, 'arcteryx'],
    [/\b(стусси|стюсси|стасси|стуси|стаси|stusy)\b/g, 'stussy'],
    [/\b(кархарт|кархартт|кархат|carhart)\b/g, 'carhartt'],
    [/\b(патагония|патагон|patagonya)\b/g, 'patagonia'],
    [/\bканада гус\b/g, 'canada goose'],
    [/\b(стон айленд|стоун айленд)\b/g, 'stone island'],
    [/\bфред перри\b/g, 'fred perry'],
    [/\b(вивьен вествуд|вивьен)\b/g, 'vivienne westwood'],
    [/\b(ало йога|ало)\b/g, 'alo'],
    [/\b(палас)\b/g, 'palace'],
    [/\b(траппстар|трапстар)\b/g, 'trapstar']
  ];
  const ALTERNATIVES = {
    'кепка': ['кепка', 'бейсболка'], 'кепки': ['кепка', 'бейсболка'], 'бейсболка': ['бейсболка', 'кепка'],
    'бини': ['бини', 'шапка'], 'панамка': ['панама'], 'портмоне': ['портмоне', 'кошелек'], 'кошелек': ['кошелек', 'портмоне'],
    'медведь': ['bearbrick'], 'мишка': ['bearbrick']
  };

  function normalizeText(text) {
    return String(text || '').toLowerCase()
      .replace(/ё/g, 'е').replace(/ü/g, 'u')
      .replace(/[@'’`]/g, '')
      .replace(/[^a-zа-я0-9]+/g, ' ')
      .trim();
  }

  function queryTokens(query) {
    let text = normalizeText(query);
    SYNONYMS.forEach(([re, value]) => { text = text.replace(cyrillicBoundary(re), value); });
    return text.split(' ').filter(Boolean);
  }

  // \b в JS работает только с латиницей, поэтому границы слова проверяем пробелами
  function cyrillicBoundary(re) {
    const body = re.source.replace(/^\\b/, '').replace(/\\b$/, '');
    return new RegExp('(^|\\s)(?:' + body + ')(?=\\s|$)', 'g');
  }

  function searchWords(p) {
    return normalizeText([p.name, p.exhibitBrand, p.exhibitHall, colourOf(p.name)].join(' ')).split(' ');
  }

  function distanceWithin(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return false;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        const value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        row.push(value);
        if (value < best) best = value;
      }
      if (best > limit) return false;
      prev = row;
    }
    return prev[b.length] <= limit;
  }

  function tokenMatches(token, words) {
    // «черная», «синяя», «белое» ищем так же, как «черный», «синий», «белый»
    const adjective = token.length > 4 ? token.replace(/(яя|ее|ие)$/, 'ий').replace(/(ая|ое|ые)$/, 'ый') : token;
    const options = ALTERNATIVES[token] || (adjective !== token ? [token, adjective] : [token]);
    return options.some(alt => {
      const limit = alt.length >= 8 ? 2 : (alt.length >= 5 ? 1 : 0);
      return words.some(word => {
        if (alt.length < 3) return word === alt || word.startsWith(alt);
        return word.includes(alt) || (limit > 0 && distanceWithin(alt, word, limit));
      });
    });
  }

  const matchesQuery = (tokens, words) => tokens.every(token => tokenMatches(token, words));

  // Текст, набранный не в той раскладке: rfdc -> кавс и наоборот
  const LATIN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
  const CYRILLIC = 'йцукенгшщзхъфывапролджэячсмитьбю';
  function swapLayout(text) {
    return String(text).toLowerCase().split('').map(ch => {
      let i = LATIN.indexOf(ch);
      if (i >= 0) return CYRILLIC[i];
      i = CYRILLIC.indexOf(ch);
      return i >= 0 ? LATIN[i] : ch;
    }).join('');
  }

  return {
    COLOURS, GENERIC_BRANDS, pageSlug, colourOf, sizeOf, groupKey, buildGroups, similarTo, brandOf,
    queryTokens, searchWords, matchesQuery, swapLayout
  };
});
