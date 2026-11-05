/**
 * MAUNI — аналитика через Umami Cloud.
 * Чтобы включить: создайте сайт на umami.is и вставьте его Website ID в UMAMI_WEBSITE_ID.
 * Пока значение пустое, ничего не загружается и никуда не отправляется.
 */
(function () {
  'use strict';

  const UMAMI_WEBSITE_ID = '';

  if (UMAMI_WEBSITE_ID) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://cloud.umami.is/script.js';
    script.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
    document.head.appendChild(script);
  }

  window.mauniTrack = function (name, data) {
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track(name, data);
    }
  };

  // Переходы к покупке считаем автоматически
  document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;
    const href = link.href;
    if (href.includes('wa.me')) window.mauniTrack('click_whatsapp');
    else if (href.includes('kaspi.kz')) window.mauniTrack('click_kaspi');
    else if (href.includes('instagram.com')) window.mauniTrack('click_instagram');
  }, true);
})();
