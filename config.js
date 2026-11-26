// Настройки сайта Ürker. Меняйте только значения.
window.URKER_CONFIG = {
  price: 24900,                 // цена за 1 шт., ₸ [уточнить]
  whatsapp: '77085501378',      // номер WhatsApp, только цифры
  instagram: 'urker_store_kz',  // Instagram без @
  appsScriptUrl: '',            // ссылка на Google Apps Script (см. README)

  maxQty: 9,                    // больше — через блок «Для компаний»
  maxEngraving: 20,             // символов гравировки

  // Пока фото нет — на сайте рисованные макеты (art.js), обложка перекрашивается.
  // Когда будут фото: положите файлы в images/ и поставьте true.
  useRealPhotos: false,
  photos: {
    hero: 'images/hero.webp',
    openLed: 'images/open-led.webp',
    charging: 'images/charging.webp',
    engraving: 'images/engraving.webp',
    colors: 'images/colors.webp',
  },
};
