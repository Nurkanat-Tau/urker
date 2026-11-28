/* Ürker — логика страницы: языки, макеты, конструктор заказа, отправка в таблицу и WhatsApp. */
(function () {
  'use strict';

  var C = window.URKER_CONTENT;
  var CFG = window.URKER_CONFIG || {};
  var ART = window.UrkerArt;
  var LANGS = ['kk', 'ru'];
  var STORAGE_KEY = 'urker-lang';

  var params = new URLSearchParams(location.search);
  var isDraft = params.get('draft') === '1';
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var source = (params.get('utm_source') || '').replace(/[^\w.\-]/g, '').slice(0, 60);

  // Две языковые страницы для Google: «/» — казахская, «/ru/» — русская.
  // На страницах с data-page-lang язык задаёт сама страница; кнопки ҚАЗ/РУС переходят между ними.
  var PAGE_LANG = document.documentElement.getAttribute('data-page-lang');
  var ROOT = document.documentElement.getAttribute('data-root') || '';
  function pageUrl(code) {
    var q = new URLSearchParams(location.search); q.delete('lang');
    var qs = q.toString();
    return (code === 'ru' ? ROOT + 'ru/' : (ROOT || './')) + (qs ? '?' + qs : '') + location.hash;
  }
  if (PAGE_LANG) {
    var asked = params.get('lang');
    var remembered = (function () { try { return localStorage.getItem('urker-lang'); } catch (e) { return null; } })();
    if (asked === 'kk' || asked === 'ru') { try { localStorage.setItem('urker-lang', asked); } catch (e) { /* ничего */ } }
    var target = (asked === 'kk' || asked === 'ru') ? asked : (PAGE_LANG === 'kk' && remembered === 'ru' ? 'ru' : PAGE_LANG);
    if (target !== PAGE_LANG) { location.replace(pageUrl(target)); return; }
  }
  var lang = 'kk';
  var t = C.kk;

  // Состояние конструктора
  var state = { color: C.colors[0].id, engraving: '', font: C.engravingFonts[0].id, qty: 1 };
  var MAX_QTY = CFG.maxQty || 9;
  var MAX_LEN = CFG.maxEngraving || 20;
  var ENGRAVING_OK = /^[\p{L}\p{N} .,\-&'’]*$/u;

  document.documentElement.classList.add('js');

  // Выбор в конструкторе помним на время визита (случайная перезагрузка не сбрасывает)
  var ORDER_KEY = 'urker-order';
  try {
    var savedOrder = JSON.parse(sessionStorage.getItem(ORDER_KEY) || 'null');
    if (savedOrder) {
      if (C.colors.some(function (c) { return c.id === savedOrder.color; })) state.color = savedOrder.color;
      if (C.engravingFonts.some(function (f) { return f.id === savedOrder.font; })) state.font = savedOrder.font;
      if (typeof savedOrder.engraving === 'string' && ENGRAVING_OK.test(savedOrder.engraving)) state.engraving = Array.from(savedOrder.engraving).slice(0, MAX_LEN).join('');
      var q = parseInt(savedOrder.qty, 10); if (q >= 1 && q <= MAX_QTY) state.qty = q;
    }
  } catch (e) { /* нет доступа к sessionStorage — не страшно */ }
  function saveOrderState() { try { sessionStorage.setItem(ORDER_KEY, JSON.stringify(state)); } catch (e) { /* ничего */ } }

  /* ---------- Вспомогательное ---------- */

  function $(id) { return document.getElementById(id); }
  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function storageGet() { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } }
  function storageSet(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* Instagram может запрещать */ } }

  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸'; }
  function fill(s) { return String(s == null ? '' : s).replace(/\{price\}/g, money(CFG.price)).replace(/\{delivery\}/g, t.delivery); }

  // Незаполненные заглушки [ ... ]: в обычном режиме такие строки прячем целиком,
  // в режиме ?draft=1 — показываем и подсвечиваем.
  function hasGap(s) { return !isDraft && /\[[^\]]*\]/.test(fill(s)); }

  function setText(node, text) {
    text = fill(text);
    if (node.toggleAttribute) node.toggleAttribute('data-gap', hasGap(text));
    if (!isDraft || text.indexOf('[') === -1) { node.textContent = text; return; }
    node.textContent = '';
    text.split(/(\[[^\]]*\])/).forEach(function (part) {
      if (!part) return;
      if (part.charAt(0) === '[') { var m = document.createElement('mark'); m.className = 'draft'; m.textContent = part; node.appendChild(m); }
      else node.appendChild(document.createTextNode(part));
    });
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) setText(n, text); return n; }
  function waLink(text) { return 'https://wa.me/' + String(CFG.whatsapp || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text); }
  function colorById(id) { return C.colors.filter(function (c) { return c.id === id; })[0] || C.colors[0]; }
  function fontById(id) { return C.engravingFonts.filter(function (f) { return f.id === id; })[0] || C.engravingFonts[0]; }

  /* ---------- Картинки: макеты или настоящие фото ---------- */

  var ART_SIZE = { hero: [420, 540], openLed: [680, 560], charging: [520, 600], engraving: [600, 400], colors: [870, 420] };
  function artFor(key) {
    var black = C.colors[0].hex, serif = C.engravingFonts[0].css;
    switch (key) {
      case 'hero': return ART.hero({ color: black, text: 'Айгерім', font: serif });
      case 'openLed': return ART.openLed({ color: black });
      case 'charging': return ART.charging({ color: black });
      case 'engraving': return ART.engraving({ color: black, text: 'Ә. Қасым', font: serif });
      case 'colors': return ART.colors({ colors: C.colors });
    }
    return '';
  }
  function renderArt(box, key) {
    if (CFG.useRealPhotos && CFG.photos && CFG.photos[key]) {
      var img = document.createElement('img');
      img.src = ROOT + CFG.photos[key]; // на русской странице (/ru/) путь на уровень выше img.width = ART_SIZE[key][0]; img.height = ART_SIZE[key][1];
      img.alt = box.getAttribute('aria-label') || ''; img.decoding = 'async';
      if (key !== 'hero') img.loading = 'lazy';
      box.removeAttribute('role'); box.textContent = ''; box.appendChild(img);
    } else {
      box.innerHTML = artFor(key);
    }
  }

  /* ---------- Списки из content.js ---------- */

  var openFaq = {};
  var renderers = {
    'hero.facts': function (box, items) { items.forEach(function (f) { box.appendChild(el('li', null, f)); }); },
    'features.items': function (box, items) {
      items.forEach(function (it) {
        var card = el('article', 'feature');
        var art = el('div', 'art'); art.setAttribute('role', 'img'); art.setAttribute('aria-label', it.imageAlt);
        renderArt(art, it.id);
        card.appendChild(art);
        card.appendChild(el('h3', null, it.title));
        card.appendChild(el('p', null, it.text));
        box.appendChild(card);
      });
    },
    'specs.items': function (box, items) {
      items.forEach(function (it) { if (hasGap(it.v)) return; var row = el('div'); row.appendChild(el('dt', null, it.k)); row.appendChild(el('dd', null, it.v)); box.appendChild(row); });
    },
    'steps.items': function (box, items) { items.forEach(function (s) { var li = el('li'); li.appendChild(el('p', null, s)); box.appendChild(li); }); },
    'faq.items': function (box, items) {
      items.forEach(function (it, i) {
        if (hasGap(it.a) || hasGap(it.q)) return;
        var d = document.createElement('details');
        d.appendChild(el('summary', null, it.q));
        var a = el('div', 'answer'); a.appendChild(el('p', null, it.a)); d.appendChild(a);
        if (openFaq[i]) d.open = true;
        d.addEventListener('toggle', function () { openFaq[i] = d.open; });
        box.appendChild(d);
      });
    },
    'privacy.sections': function (box, items) { items.forEach(function (s) { if (hasGap(s.p)) return; box.appendChild(el('h2', null, s.h)); box.appendChild(el('p', null, s.p)); }); },
  };

  /* ---------- Язык ---------- */

  function applyLang(next) {
    lang = LANGS.indexOf(next) === -1 ? 'kk' : next;
    t = C[lang];
    document.documentElement.lang = lang;
    document.title = document.body.getAttribute('data-page') === 'privacy' ? t.privacy.title + ' — Ürker' : t.meta.title;
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', t.meta.description);

    document.querySelectorAll('[data-t]').forEach(function (n) { setText(n, get(t, n.getAttribute('data-t'))); });
    document.querySelectorAll('[data-t-attr]').forEach(function (n) {
      n.getAttribute('data-t-attr').split(';').forEach(function (pair) { var b = pair.split(':'); n.setAttribute(b[0].trim(), fill(get(t, b[1].trim()) || '')); });
    });
    document.querySelectorAll('[data-list]').forEach(function (box) {
      var key = box.getAttribute('data-list'); box.textContent = ''; renderers[key](box, get(t, key) || []);
      // Если в списке не осталось ни одной заполненной строки — прячем список и его заголовок
      var empty = box.children.length === 0;
      box.toggleAttribute('data-gap', empty);
      var h = box.parentNode && box.parentNode.querySelector('h2');
      if (h && box.parentNode.contains(box)) h.toggleAttribute('data-gap', empty);
    });
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      var code = b.getAttribute('data-lang'); b.textContent = C.langButtons[code]; b.setAttribute('aria-pressed', code === lang ? 'true' : 'false');
    });

    document.querySelectorAll('.js-price').forEach(function (n) { n.textContent = money(CFG.price); });
    var colorList = $('color-list');
    if (colorList && t.specs && t.specs.colorsLabel) {
      colorList.textContent = '';
      colorList.appendChild(el('span', 'color-list-label', t.specs.colorsLabel.replace('{n}', C.colors.length)));
      C.colors.forEach(function (c) {
        var item = el('span', 'color-item'); var dot = el('i'); dot.style.background = c.hex;
        item.appendChild(dot); item.appendChild(document.createTextNode(c[lang])); colorList.appendChild(item);
      });
    }
    document.querySelectorAll('.js-wa').forEach(function (a) { a.href = waLink(t.whatsappText); });
    document.querySelectorAll('.js-wa-business').forEach(function (a) { a.href = waLink(t.business.whatsappText); });
    var ig = 'https://instagram.com/' + (CFG.instagram || '');
    document.querySelectorAll('.js-ig').forEach(function (a) { a.href = ig; });
    document.querySelectorAll('.js-ig-text').forEach(function (a) { a.textContent = '@' + (CFG.instagram || ''); });

    if (form) { renderBuilder(); refreshMessages(); }
    observeReveal();
  }

  function setLang(next) {
    applyLang(next);
    storageSet(lang);
    if (params.has('lang')) { params.set('lang', lang); try { history.replaceState(null, '', location.pathname + '?' + params.toString() + location.hash); } catch (e) { /* ничего */ } }
  }
  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () {
      var code = b.getAttribute('data-lang');
      if (!PAGE_LANG) { setLang(code); return; }
      storageSet(code);
      if (code !== PAGE_LANG) location.href = pageUrl(code);
    });
  });

  document.querySelectorAll('[data-art]').forEach(function (box) { renderArt(box, box.getAttribute('data-art')); });

  /* ---------- Первый экран: звёзды загораются, имя «гравируется» ---------- */
  // Работает только на рисованном макете (не на фото). Нажатие на обложку — повтор.
  (function animateHero() {
    var box = document.querySelector('[data-art="hero"]');
    if (!box || CFG.useRealPhotos) return;
    var svg = box.querySelector('svg');
    var led = svg && svg.querySelector('.u-led');
    if (!led) return;
    var dots = Array.prototype.slice.call(led.querySelectorAll('.u-dots circle'));
    var texts = Array.prototype.slice.call(svg.querySelectorAll('.u-engr'));
    var word = texts.length ? texts[0].textContent : '';
    var ORDER = [6, 5, 0, 3, 4, 1, 2]; // от Тайгеты к Плейоне — по линии созвездия
    // Анимация только меняет свет и цвет (ничего не двигается), поэтому её можно показывать и при «уменьшить движение».
    var reduce = false;
    var timers = [];

    function light(on) {
      led.classList.toggle('lit', on);
      if (on) led.setAttribute('filter', led.getAttribute('data-glow')); else led.removeAttribute('filter');
    }
    function writeText(s) { texts.forEach(function (t) { t.textContent = s; }); }

    svg.classList.add('u-anim');
    if (reduce) { dots.forEach(function (d) { d.classList.add('on'); }); light(true); return; }

    function play() {
      timers.forEach(clearTimeout); timers = [];
      dots.forEach(function (d) { d.classList.remove('on'); });
      light(false);
      writeText('');
      var start = 350, step = 170;
      ORDER.forEach(function (i, k) {
        timers.push(setTimeout(function () {
          var d = led.querySelector('circle[data-i="' + i + '"]'); if (d) d.classList.add('on');
        }, start + k * step));
      });
      var lit = start + ORDER.length * step;
      timers.push(setTimeout(function () { light(true); }, lit));
      var chars = Array.from(word);
      chars.forEach(function (_, k) {
        timers.push(setTimeout(function () { writeText(chars.slice(0, k + 1).join('')); }, lit + 350 + k * 120));
      });
    }

    box.classList.add('is-playable');
    box.addEventListener('click', play);
    play();
  })();

  /* ---------- Конструктор ---------- */

  var form = $('order-form');
  var engravingInput, nameInput, phoneInput, citySelect, consentInput, honeypot, submitBtn, summary, okBox, failBox;
  var errors = {};
  var sending = false;
  var lastOrder = null;
  var samplesOn = false;

  function renderBuilder() {
    // Цвета
    var sw = $('swatches'); sw.textContent = '';
    C.colors.forEach(function (c) {
      var label = el('label', 'swatch'); label.title = c[lang];
      var input = document.createElement('input'); input.type = 'radio'; input.name = 'color'; input.value = c.id;
      input.setAttribute('aria-label', c[lang]); input.checked = c.id === state.color;
      input.addEventListener('change', function () { state.color = c.id; updatePreview(); });
      var dot = el('span'); dot.style.background = c.hex;
      label.appendChild(input); label.appendChild(dot); sw.appendChild(label);
    });
    // Шрифты
    var fc = $('font-choices'); fc.textContent = '';
    C.engravingFonts.forEach(function (f) {
      var label = el('label', 'choice');
      var input = document.createElement('input'); input.type = 'radio'; input.name = 'font'; input.value = f.id; input.checked = f.id === state.font;
      input.addEventListener('change', function () { state.font = f.id; updatePreview(); });
      var sample = el('span', 'sample', f[lang]);
      if (samplesOn) sample.style.fontFamily = f.css;
      label.appendChild(input); label.appendChild(sample); fc.appendChild(label);
    });
    // Города: значение — русское название, одинаковое в таблице
    var selected = citySelect.selectedIndex;
    citySelect.textContent = '';
    var ph = document.createElement('option'); ph.value = ''; ph.textContent = t.builder.cityPlaceholder; citySelect.appendChild(ph);
    t.cities.forEach(function (label, i) { var o = document.createElement('option'); o.value = C.ru.cities[i]; o.textContent = label; citySelect.appendChild(o); });
    if (selected > 0) citySelect.selectedIndex = selected;
    updatePreview();
  }

  function updatePreview() {
    var c = colorById(state.color), f = fontById(state.font);
    $('preview').innerHTML = ART.hero({ color: c.hex, text: state.engraving, font: f.css });
    $('color-name').textContent = c[lang];
    $('preview-color').textContent = c[lang];
    $('preview-font').textContent = f[lang];
    var n = Array.from(state.engraving).length;
    var counter = $('engraving-counter');
    counter.textContent = t.builder.counter.replace('{n}', n).replace('{max}', MAX_LEN);
    counter.classList.toggle('is-full', n >= MAX_LEN);
    $('qty-value').textContent = state.qty;
    $('qty-minus').disabled = state.qty <= 1;
    $('qty-plus').disabled = state.qty >= MAX_QTY;
    $('qty-more').hidden = state.qty < MAX_QTY;
    $('total').textContent = money(CFG.price * state.qty);
    var note = $('total-note'); if (note) note.textContent = fill(t.builder.readyNote || '');
    if (submitBtn) submitBtn.textContent = submitLabel();
    saveOrderState();
  }
  function submitLabel() { return sending ? t.builder.sending : t.builder.submit + ' — ' + money(CFG.price * state.qty); }

  // Маска номера +7 7XX XXX XX XX
  function phoneDigits(value) {
    var d = String(value).replace(/\D/g, '');
    if (/^\s*\+\s*7/.test(value)) d = d.slice(1);
    while (d.length > 10 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    return d.slice(0, 10);
  }
  function formatPhone(d) {
    if (!d) return '';
    var out = '+7 ' + d.slice(0, 3);
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += ' ' + d.slice(6, 8);
    if (d.length > 8) out += ' ' + d.slice(8, 10);
    return out;
  }

  function validate(fields) {
    fields = fields || ['engraving', 'name', 'phone', 'city', 'consent'];
    fields.forEach(function (f) { delete errors[f]; });
    if (fields.indexOf('engraving') > -1 && !ENGRAVING_OK.test(state.engraving)) errors.engraving = 'engraving';
    if (fields.indexOf('name') > -1 && !nameInput.value.trim()) errors.name = 'name';
    if (fields.indexOf('phone') > -1) {
      var d = phoneDigits(phoneInput.value);
      if (!d) errors.phone = 'phoneEmpty'; else if (!/^7\d{9}$/.test(d)) errors.phone = 'phoneInvalid';
    }
    if (fields.indexOf('city') > -1 && !citySelect.value) errors.city = 'city';
    if (fields.indexOf('consent') > -1 && !consentInput.checked) errors.consent = 'consent';
    refreshMessages();
    return Object.keys(errors).length === 0;
  }

  function refreshMessages() {
    [['engraving', engravingInput], ['name', nameInput], ['phone', phoneInput], ['city', citySelect], ['consent', consentInput]].forEach(function (p) {
      var key = errors[p[0]], box = $('err-' + p[0]);
      if (key) { box.textContent = t.builder.errors[key]; box.hidden = false; p[1].setAttribute('aria-invalid', 'true'); }
      else { box.hidden = true; box.textContent = ''; p[1].removeAttribute('aria-invalid'); }
    });
    if (!summary.hidden) summary.textContent = t.builder.errors.summary;
    submitBtn.textContent = submitLabel();
    if (lastOrder) {
      var msg = orderMessage(lastOrder);
      document.querySelectorAll('.js-order-wa').forEach(function (a) { a.href = waLink(msg); });
      $('result-order').textContent = lastOrder.id ? t.builder.orderLabel + ' ' + lastOrder.id : '';
    }
  }

  function orderMessage(o) {
    var c = colorById(o.color), f = fontById(o.font);
    var cityLabel = o.cityIndex > 0 ? t.cities[o.cityIndex - 1] : o.city;
    return t.builder.waOrder
      .replace('{order}', o.id ? t.builder.orderLabel + ' ' + o.id : t.builder.noId)
      .replace('{color}', c[lang])
      .replace('{engraving}', o.engraving ? '«' + o.engraving + '»' : t.builder.noEngraving)
      .replace('{font}', f[lang])
      .replace('{qty}', o.qty)
      .replace('{sum}', money(o.sum))
      .replace('{name}', o.name)
      .replace('{city}', cityLabel);
  }

  function scriptUrl() {
    var test = params.get('testScript');
    if (isLocal && test && test.charAt(0) === '/') return test;
    return CFG.appsScriptUrl;
  }

  function openWhatsApp() {
    var msg = orderMessage(lastOrder);
    // Небольшая пауза, чтобы человек увидел «Спасибо», затем открываем WhatsApp
    setTimeout(function () { location.href = waLink(msg); }, 700);
  }

  if (form) {
    engravingInput = $('f-engraving'); nameInput = $('f-name'); phoneInput = $('f-phone'); citySelect = $('f-city');
    consentInput = $('f-consent'); honeypot = $('f-website'); submitBtn = $('f-submit');
    summary = $('form-summary'); okBox = $('result-ok'); failBox = $('result-fail');
    engravingInput.value = state.engraving;

    engravingInput.addEventListener('input', function () {
      var chars = Array.from(engravingInput.value);
      if (chars.length > MAX_LEN) { engravingInput.value = chars.slice(0, MAX_LEN).join(''); }
      state.engraving = engravingInput.value;
      validate(['engraving']);
      updatePreview();
    });
    $('qty-minus').addEventListener('click', function () { if (state.qty > 1) { state.qty -= 1; updatePreview(); } });
    $('qty-plus').addEventListener('click', function () { if (state.qty < MAX_QTY) { state.qty += 1; updatePreview(); } });

    phoneInput.addEventListener('input', function () {
      // Сохраняем позицию курсора: считаем, сколько цифр было до него
      var pos = phoneInput.selectionStart || 0;
      var digitsBefore = phoneInput.value.slice(0, pos).replace(/\D/g, '').length;
      var formatted = formatPhone(phoneDigits(phoneInput.value));
      phoneInput.value = formatted;
      var p = 0, seen = 0;
      while (p < formatted.length && seen < digitsBefore) { if (/\d/.test(formatted[p])) seen++; p++; }
      try { phoneInput.setSelectionRange(p, p); } catch (e) { /* ничего */ }
      if (errors.phone) validate(['phone']);
    });
    phoneInput.addEventListener('focus', function () { if (!phoneInput.value) phoneInput.value = '+7 '; });
    phoneInput.addEventListener('blur', function () { if (phoneInput.value.trim() === '+7') phoneInput.value = ''; });
    nameInput.addEventListener('input', function () { if (errors.name) validate(['name']); });
    citySelect.addEventListener('change', function () { if (errors.city) validate(['city']); });
    consentInput.addEventListener('change', function () { if (errors.consent) validate(['consent']); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      failBox.hidden = true;
      if (!validate()) {
        summary.hidden = false; summary.textContent = t.builder.errors.summary;
        (errors.engraving ? engravingInput : errors.name ? nameInput : errors.phone ? phoneInput : errors.city ? citySelect : consentInput).focus();
        return;
      }
      summary.hidden = true;

      var c = colorById(state.color);
      lastOrder = {
        id: '', color: state.color, engraving: state.engraving.trim(), font: state.font, qty: state.qty,
        sum: CFG.price * state.qty, name: nameInput.value.trim().slice(0, 80), city: citySelect.value, cityIndex: citySelect.selectedIndex,
      };
      if (honeypot.value) { showOk(); return; } // бот — ничего не отправляем

      var payload = {
        name: lastOrder.name, phone: '+7' + phoneDigits(phoneInput.value), city: lastOrder.city,
        color: C.ru && c.ru, colorId: c.id, engraving: lastOrder.engraving, font: fontById(state.font).ru,
        qty: lastOrder.qty, sum: lastOrder.sum, lang: lang, source: source, website: honeypot.value,
      };

      sending = true; submitBtn.disabled = true; refreshMessages();
      var controller = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, 15000);
      var url = scriptUrl();
      var request = url
        ? fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: controller ? controller.signal : undefined })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        : Promise.reject(new Error('appsScriptUrl не указан в config.js'));

      request.then(function (data) {
        if (!data || data.ok !== true) throw new Error((data && data.error) || 'bad response');
        lastOrder.id = data.id || '';
        showOk();
      }).catch(function (err) {
        if (window.console) console.warn('Заказ не записан в таблицу:', err);
        showFail();
      }).then(function () { clearTimeout(timer); sending = false; submitBtn.disabled = false; refreshMessages(); });
    });
  }

  function showOk() {
    form.hidden = true; failBox.hidden = true; okBox.hidden = false;
    refreshMessages(); okBox.focus(); openWhatsApp();
  }
  function showFail() {
    failBox.hidden = false; refreshMessages(); failBox.focus(); openWhatsApp();
  }

  /* ---------- Шапка, плавающая кнопка, появление блоков ---------- */

  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var revealObserver = null;
  if ('IntersectionObserver' in window) {
    // Нижняя панель заказа: прячется на первом экране (там своя кнопка), в конструкторе и подвале
    var buybar = $('buybar');
    if (buybar) {
      buybar.hidden = false;
      var hideFor = { top: true };
      var fo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { hideFor[en.target.id || 'footer'] = en.isIntersecting; });
        var hide = Object.keys(hideFor).some(function (k) { return hideFor[k]; });
        buybar.classList.toggle('is-hidden', hide);
        if (hide) buybar.setAttribute('inert', ''); else buybar.removeAttribute('inert');
      }, { threshold: 0 });
      ['top', 'order', 'business'].map($).concat([document.querySelector('.site-footer')]).filter(Boolean).forEach(function (n) { fo.observe(n); });
    }

    // Образцы шрифтов гравировки подгружаем, только когда конструктор рядом
    var orderSection = $('order');
    if (orderSection) {
      var so = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { samplesOn = true; so.disconnect(); if (form) renderBuilder(); }
      }, { rootMargin: '400px 0px' });
      so.observe(orderSection);
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); revealObserver.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  } else {
    samplesOn = true;
  }
  function observeReveal() {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach(function (n) { if (revealObserver) revealObserver.observe(n); else n.classList.add('is-visible'); });
  }

  var year = $('year'); if (year) year.textContent = new Date().getFullYear();

  /* ---------- Старт ---------- */
  if (PAGE_LANG) {
    applyLang(PAGE_LANG);
    addStructuredData();
  } else {
    var fromUrl = params.get('lang'), saved = storageGet();
    var initial = LANGS.indexOf(fromUrl) > -1 ? fromUrl : (LANGS.indexOf(saved) > -1 ? saved : 'kk');
    if (LANGS.indexOf(fromUrl) > -1) storageSet(fromUrl);
    applyLang(initial);
  }

  /* ---------- Структурированные данные для Google (цена берётся из config.js) ---------- */
  // Только правда: без рейтингов и отзывов. Картинку товара добавим, когда будут настоящие фото.
  function addStructuredData() {
    var site = 'https://urkerstore.kz/';
    var url = PAGE_LANG === 'ru' ? site + 'ru/' : site;
    var data = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization', '@id': site + '#org', name: 'Ürker', url: site,
          logo: site + 'apple-touch-icon.png',
          sameAs: CFG.instagram ? ['https://instagram.com/' + CFG.instagram] : [],
          contactPoint: { '@type': 'ContactPoint', telephone: '+' + String(CFG.whatsapp || '').replace(/\D/g, ''), contactType: 'customer service', availableLanguage: ['kk', 'ru'] },
        },
        { '@type': 'WebSite', '@id': site + '#site', url: site, name: 'Ürker', inLanguage: ['kk', 'ru'], publisher: { '@id': site + '#org' } },
        {
          '@type': 'Product', name: 'Ürker Executive', description: t.meta.description,
          brand: { '@type': 'Brand', name: 'Ürker' },
          offers: {
            '@type': 'Offer', url: url, price: String(CFG.price), priceCurrency: 'KZT',
            availability: 'https://schema.org/PreOrder', seller: { '@id': site + '#org' },
          },
        },
      ],
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }
})();
