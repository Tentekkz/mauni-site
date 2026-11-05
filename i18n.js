/**
 * MAUNI — переключение языка интерфейса (русский / казахский).
 * Названия товаров приходят из каталога на русском и не переводятся.
 * В HTML: data-i18n="ключ" для текста, data-i18n-ph="ключ" для подсказки в поле ввода.
 */
(function () {
  'use strict';

  const KEY = 'mauni_lang';

  const RU = {
    'nav.home': 'Главная', 'nav.exhibits': 'Экспонаты',
    'hall.title': 'Зал экспонатов', 'side.halls': 'Залы', 'side.order': 'Порядок', 'side.search': 'Поиск',
    'side.searchPh': 'Найти...', 'sort.new': 'Новые', 'sort.asc': 'Цена ↑', 'sort.desc': 'Цена ↓',
    'hall.all': 'Все', 'hall.new': 'Новинки', 'hall.last': 'Скоро уйдёт', 'hall.KAWS': 'KAWS', 'hall.BE@RBRICK': 'BE@RBRICK',
    'hall.Goyard': 'Goyard', "hall.Arc'teryx": "Arc'teryx", 'hall.Одежда': 'Одежда',
    'hall.Головные уборы': 'Головные уборы', 'hall.Аксессуары': 'Аксессуары', 'hall.Сумки': 'Сумки',
    'side.filters': 'Фильтры', 'side.brand': 'Бренд', 'brand.all': 'Все бренды', 'side.price': 'Цена', 'price.all': 'Любая', 'price.b5': 'До 5 000 ₸', 'price.b10': '5 000 – 10 000 ₸', 'price.b25': '10 000 – 25 000 ₸', 'price.top': 'От 25 000 ₸', 'recent.title': 'Вы смотрели', 'hall.Автотовары': 'Автотовары',
    'hall.Декор & Арт': 'Декор & Арт', 'hall.Разное': 'Разное',
    'tool.swipe': 'Листать свайпами', 'tool.random': 'Случайный экспонат', 'tool.gift': 'Подобрать подарок', 'tool.picks': 'Подборка',
    'empty.title': 'В данном зале нет экспонатов', 'empty.text': 'Попробуйте выбрать другой зал или сбросить поисковый запрос',
    'empty.reset': 'Вернуться ко всем экспонатам', 'more': 'Показать ещё {n} из {m}', 'count.colours': '+{n}',
    'price.from': 'от {p}', 'tag.last': 'Последний', 'tag.lastFull': 'Последний экземпляр', 'tag.new': 'Новинка', 'tag.hit': 'Хит',
    'tag.preorder': 'Предзаказ {n} дн.',
    'modal.spin': 'Крутить ещё раз', 'modal.add': '♡ В подборку', 'modal.added': '♥ В подборке', 'modal.kaspi': 'Купить на Kaspi',
    'modal.wa': 'Заказать в WhatsApp', 'modal.share': 'Поделиться', 'modal.similar': 'Похожие экспонаты', 'modal.copied': 'Ссылка скопирована',
    'modal.copyFail': 'Не получилось скопировать',
    'swipe.yes': 'В подборку', 'swipe.no': 'Дальше', 'swipe.tip': 'Вправо — в подборку, влево — дальше', 'swipe.of': '{n} из {m}',
    'swipe.done': 'Зал осмотрен', 'swipe.none': 'В этом зале не осталось новых экспонатов', 'swipe.seePicks': 'Посмотреть подборку', 'swipe.back': 'Вернуться в каталог',
    'pick.title': 'Ваша подборка', 'pick.sharedTitle': 'С вами поделились подборкой', 'pick.empty': 'Пока пусто. Отметьте экспонаты, которые понравились.',
    'pick.total': 'Итого', 'pick.note': 'В сообщение войдут первые {n} экспонатов.', 'pick.send': 'Отправить в WhatsApp ↗', 'pick.share': 'Поделиться ссылкой',
    'pick.addAll': 'Добавить всё в мою подборку', 'pick.clear': 'Очистить подборку', 'pick.back': '← К просмотру', 'pick.toCatalog': '← В каталог', 'pick.remove': 'Убрать из подборки',
    'gift.title': 'Подбор подарка', 'gift.step': 'Вопрос {n} из {m}', 'gift.who': 'Кому подарок?', 'gift.self': 'Себе', 'gift.her': 'Девушке', 'gift.him': 'Парню', 'gift.collector': 'Коллекционеру', 'gift.driver': 'Автолюбителю',
    'gift.budget': 'На какую сумму?', 'gift.b5': 'До 5 000 ₸', 'gift.b10': 'До 10 000 ₸', 'gift.b25': 'До 25 000 ₸', 'gift.bany': 'Без ограничений',
    'gift.when': 'Как быстро нужен подарок?', 'gift.now': 'Нужен скоро, без предзаказа', 'gift.wait': 'Могу подождать',
    'gift.result': 'Вот что мы подобрали', 'gift.near': 'Точных совпадений нет, вот самое близкое', 'gift.again': 'Подобрать заново', 'gift.none': 'Ничего не нашлось. Попробуйте другую сумму.',
    'intro.closed': 'Зал закрыт. Посветите на стену', 'intro.more': 'Ищите остальные экспонаты', 'intro.done': 'Весь зал осмотрен', 'intro.found': 'Найдено {n} из {m}',
    'intro.on': 'Включить свет', 'intro.off': 'Выключить свет', 'home.enter': 'Войти в зал', 'home.kaspi': 'Kaspi магазин', 'footer.top': '← Назад на вершину',
    'intro.KAWS': 'KAWS — псевдоним американского художника Брайана Доннелли. Его персонаж Companion с крестиками вместо глаз стал одной из самых узнаваемых фигур современного искусства.',
    'intro.BE@RBRICK': 'BE@RBRICK — коллекционный медведь японской компании Medicom Toy, который выходит с 2001 года. Художники и бренды превращают одну и ту же форму в новые работы.',
    'intro.Goyard': 'Французский дом Goyard основан в Париже в 1853 году. Его рисунок из мелких шевронов узнают с первого взгляда.',
    "intro.Arc'teryx": 'Канадский бренд снаряжения для гор. На его логотипе — окаменелость археоптерикса, одной из первых известных птиц.'
  };

  const KK = {
    'nav.home': 'Басты бет', 'nav.exhibits': 'Экспонаттар',
    'hall.title': 'Экспонаттар залы', 'side.halls': 'Залдар', 'side.order': 'Реті', 'side.search': 'Іздеу',
    'side.searchPh': 'Табу...', 'sort.new': 'Жаңалары', 'sort.asc': 'Баға ↑', 'sort.desc': 'Баға ↓',
    'hall.all': 'Барлығы', 'hall.new': 'Жаңа түсімдер', 'hall.last': 'Жақында таусылады',
    'hall.Одежда': 'Киім', 'hall.Аксессуары': 'Аксессуарлар', 'hall.Головные уборы': 'Бас киімдер',
    'side.filters': 'Сүзгілер', 'side.brand': 'Бренд', 'brand.all': 'Барлық брендтер', 'side.price': 'Баға', 'price.all': 'Кез келген', 'price.b5': '5 000 ₸ дейін', 'price.b10': '5 000 – 10 000 ₸', 'price.b25': '10 000 – 25 000 ₸', 'price.top': '25 000 ₸ бастап', 'recent.title': 'Сіз қарағандар', 'hall.Сумки': 'Сөмкелер', 'hall.Автотовары': 'Авто тауарлар',
    'hall.Разное': 'Әртүрлі',
    'tool.swipe': 'Свайппен қарау', 'tool.random': 'Кездейсоқ экспонат', 'tool.gift': 'Сыйлық таңдау', 'tool.picks': 'Таңдаулылар',
    'empty.title': 'Бұл залда экспонаттар жоқ', 'empty.text': 'Басқа залды таңдаңыз немесе іздеу сұрауын тазартыңыз',
    'empty.reset': 'Барлық экспонаттарға оралу', 'more': 'Тағы {n} көрсету ({m} қалды)',
    'price.from': '{p} бастап', 'tag.last': 'Соңғысы', 'tag.lastFull': 'Соңғы дана', 'tag.new': 'Жаңа',
    'tag.preorder': 'Алдын ала тапсырыс: {n} күн',
    'modal.spin': 'Қайта айналдыру', 'modal.add': '♡ Таңдаулыларға', 'modal.added': '♥ Таңдаулыларда', 'modal.kaspi': 'Kaspi-дан сатып алу',
    'modal.wa': 'WhatsApp арқылы тапсырыс беру', 'modal.share': 'Бөлісу', 'modal.similar': 'Ұқсас экспонаттар', 'modal.copied': 'Сілтеме көшірілді',
    'modal.copyFail': 'Көшіру мүмкін болмады',
    'swipe.yes': 'Таңдаулыларға', 'swipe.no': 'Келесі', 'swipe.tip': 'Оңға — таңдаулыларға, солға — келесі', 'swipe.of': '{m} ішінен {n}',
    'swipe.done': 'Зал қаралды', 'swipe.none': 'Бұл залда жаңа экспонаттар қалмады', 'swipe.seePicks': 'Таңдаулыларды көру', 'swipe.back': 'Каталогқа оралу',
    'pick.title': 'Сіздің таңдауыңыз', 'pick.sharedTitle': 'Сізбен таңдаумен бөлісті', 'pick.empty': 'Әзірге бос. Ұнаған экспонаттарды белгілеңіз.',
    'pick.total': 'Барлығы', 'pick.note': 'Хабарламаға алғашқы {n} экспонат кіреді.', 'pick.send': 'WhatsApp-қа жіберу ↗', 'pick.share': 'Сілтемемен бөлісу',
    'pick.addAll': 'Барлығын таңдауыма қосу', 'pick.clear': 'Таңдауды тазарту', 'pick.back': '← Қарауға оралу', 'pick.toCatalog': '← Каталогқа', 'pick.remove': 'Таңдаудан алып тастау',
    'gift.title': 'Сыйлық таңдау', 'gift.step': '{m} сұрақтың {n}-сі', 'gift.who': 'Сыйлық кімге?', 'gift.self': 'Өзіме', 'gift.her': 'Қызға', 'gift.him': 'Жігітке', 'gift.collector': 'Коллекционерге', 'gift.driver': 'Көлік әуесқойына',
    'gift.budget': 'Қанша сомаға?', 'gift.b5': '5 000 ₸ дейін', 'gift.b10': '10 000 ₸ дейін', 'gift.b25': '25 000 ₸ дейін', 'gift.bany': 'Шектеусіз',
    'gift.when': 'Сыйлық қаншалықты тез керек?', 'gift.now': 'Жақын арада, алдын ала тапсырыссыз', 'gift.wait': 'Күте аламын',
    'gift.result': 'Біз таңдағандар', 'gift.near': 'Дәл сәйкестік жоқ, ең жақындары осы', 'gift.again': 'Қайта таңдау', 'gift.none': 'Ештеңе табылмады. Басқа соманы байқап көріңіз.',
    'intro.closed': 'Зал жабық. Қабырғаға жарық түсіріңіз', 'intro.more': 'Қалған экспонаттарды іздеңіз', 'intro.done': 'Бүкіл зал қаралды', 'intro.found': '{m} ішінен {n} табылды',
    'intro.on': 'Жарықты қосу', 'intro.off': 'Жарықты өшіру', 'home.enter': 'Залға кіру', 'home.kaspi': 'Kaspi дүкені', 'footer.top': '← Жоғарыға оралу',
    'intro.KAWS': 'KAWS — америкалық суретші Брайан Доннеллидің бүркеншік аты. Оның көзінің орнында айқыштары бар Companion кейіпкері қазіргі өнердің ең танымал бейнелерінің біріне айналды.',
    'intro.BE@RBRICK': 'BE@RBRICK — жапондық Medicom Toy компаниясының 2001 жылдан бері шығарылып келе жатқан коллекциялық аюы. Суретшілер мен брендтер бір пішінді жаңа туындыларға айналдырады.',
    'intro.Goyard': 'Француздық Goyard үйі 1853 жылы Парижде құрылған. Оның ұсақ шеврондардан тұратын өрнегі бірден танылады.',
    "intro.Arc'teryx": 'Тауға арналған жабдық шығаратын канадалық бренд. Логотипінде алғашқы белгілі құстардың бірі — археоптерикстің қазбасы бейнеленген.'
  };

  function getLang() {
    try {
      return window.localStorage.getItem(KEY) === 'kk' ? 'kk' : 'ru';
    } catch (e) {
      return 'ru';
    }
  }

  const lang = getLang();

  function t(key, vars) {
    let text = (lang === 'kk' && KK[key]) || RU[key] || key;
    if (vars) Object.keys(vars).forEach(k => { text = text.split('{' + k + '}').join(vars[k]); });
    return text;
  }

  function apply() {
    document.documentElement.lang = lang === 'kk' ? 'kk' : 'ru';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.textContent = lang === 'kk' ? 'Рус' : 'Қаз';
      btn.setAttribute('aria-label', lang === 'kk' ? 'Рус — перейти на русский' : 'Қаз — қазақ тіліне ауысу');
      btn.addEventListener('click', () => {
        try { window.localStorage.setItem(KEY, lang === 'kk' ? 'ru' : 'kk'); } catch (e) { return; }
        window.location.reload();
      });
    });
  }

  window.MauniI18n = { t, lang, apply };
  apply();
})();
