/*
 * Ürker — рисунки-макеты ежедневника (SVG), временно вместо фото.
 * Один и тот же код рисует картинки на сайте (живой конструктор перекрашивает обложку)
 * и файлы images/*.svg (node tools/build-images.js).
 * Когда будут фото: в config.js поставьте useRealPhotos: true.
 */
(function (root) {
  'use strict';

  var BRASS = '#B8975A';
  var BRASS_LIGHT = '#E2C98F';
  var BRASS_DARK = '#7C6236';

  // Знак: 7 звёзд Үркер (Плеяды). viewBox 0 0 64 40
  var STARS = [
    { x: 38, y: 22, r: 3.2 }, // Алькиона — самая яркая
    { x: 52, y: 24, r: 2.4 }, // Атлас
    { x: 55, y: 15, r: 1.7 }, // Плейона
    { x: 29, y: 30, r: 2.2 }, // Меропа
    { x: 16, y: 26, r: 2.4 }, // Электра
    { x: 24, y: 13, r: 2.1 }, // Майя
    { x: 12, y: 7, r: 1.8 },  // Тайгета
  ];
  var LINES = [[4, 3], [3, 0], [0, 1], [1, 2], [0, 5], [5, 6]];

  function starMark(color, opts) {
    opts = opts || {};
    var lw = opts.line == null ? 0.7 : opts.line;
    var s = '';
    if (lw > 0) {
      s += '<g class="u-lines" stroke="' + color + '" stroke-width="' + lw + '" stroke-linecap="round" opacity="' + (opts.lineOpacity || 0.55) + '">';
      LINES.forEach(function (l) {
        var a = STARS[l[0]], b = STARS[l[1]];
        s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>';
      });
      s += '</g>';
    }
    s += '<g class="u-dots" fill="' + color + '">';
    STARS.forEach(function (p, i) { s += '<circle data-i="' + i + '" cx="' + p.x + '" cy="' + p.y + '" r="' + p.r + '"/>'; });
    return s + '</g>';
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }

  var uid = 0;
  function id(p) { uid += 1; return p + uid; }

  // Общие фильтры: тень, фактура кожи, свечение LED
  function defs(ids) {
    return '<defs>' +
      '<filter id="' + ids.shadow + '" x="-20%" y="-20%" width="140%" height="150%">' +
        '<feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity=".55"/></filter>' +
      '<filter id="' + ids.grain + '" x="0" y="0" width="100%" height="100%">' +
        '<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>' +
        '<feColorMatrix in="n" type="saturate" values="0"/>' +
        '<feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer>' +
        '<feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<filter id="' + ids.glow + '" x="-150%" y="-150%" width="400%" height="400%">' +
        '<feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<linearGradient id="' + ids.sheen + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFF4DC" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + ids.light + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>' +
    '</defs>';
  }

  /*
   * Закрытая обложка. Координаты: обложка 300 × 424 (A5) в точке (x, y).
   * o: { color, text, font, led }  font — CSS font-family гравировки
   */
  function coverGroup(o, ids, x, y) {
    var w = 300, h = 424, c = o.color || '#1A1A1A';
    var g = '<g transform="translate(' + x + ' ' + y + ')">';
    // блок страниц справа
    g += '<rect x="6" y="4" width="' + w + '" height="' + h + '" rx="8" fill="#E9E2D4"/>';
    g += '<path d="M' + (w + 1) + ' 14 V' + (h - 4) + ' M' + (w + 3) + ' 14 V' + (h - 4) + '" stroke="#C9BFAE" stroke-width=".6"/>';
    // обложка
    g += '<rect width="' + w + '" height="' + h + '" rx="8" fill="' + c + '"/>';
    g += '<rect width="' + w + '" height="' + h + '" rx="8" fill="' + c + '" filter="url(#' + ids.grain + ')"/>';
    g += '<rect width="' + w + '" height="' + h + '" rx="8" fill="url(#' + ids.light + ')"/>';
    // блик: полоса света за краем обложки, на сайте проезжает по ней (motion.js / styles.css)
    g += '<clipPath id="' + ids.clip + '"><rect width="' + w + '" height="' + h + '" rx="8"/></clipPath>';
    g += '<g clip-path="url(#' + ids.clip + ')"><g class="u-sheen"><rect x="-200" y="-60" width="130" height="' + (h + 120) + '" fill="url(#' + ids.sheen + ')" transform="skewX(-16)"/></g></g>';
    // корешок и строчка
    g += '<rect width="22" height="' + h + '" rx="8" fill="#000" opacity=".22"/>';
    g += '<path d="M24 0 V' + h + '" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/>';
    g += '<rect x="9" y="9" width="' + (w - 18) + '" height="' + (h - 18) + '" rx="5" fill="none" stroke="' + shade(c, 0.28) + '" stroke-width="1" stroke-dasharray="4 3" opacity=".8"/>';
    // LED-знак
    var lx = w / 2 - 33, ly = 58;
    g += '<g class="u-led" data-glow="url(#' + ids.glow + ')" transform="translate(' + lx + ' ' + ly + ') scale(1.1)"' + (o.led ? ' filter="url(#' + ids.glow + ')"' : '') + '>' +
      starMark(o.led ? '#F6E3B0' : BRASS, { line: 0.8, lineOpacity: o.led ? 0.8 : 0.5 }) + '</g>';
    // гравировка
    if (o.text) {
      var fs = o.font && /Script/.test(o.font) ? 30 : 24;
      var ty = h * 0.72;
      var common = ' x="' + (w / 2 + 4) + '" text-anchor="middle" font-family="' + esc(o.font || 'Lora, Georgia, serif') + '" font-size="' + fs + '" letter-spacing="' + (/Script/.test(o.font || '') ? 0 : 1.5) + '"';
      g += '<text class="u-engr"' + common + ' y="' + (ty + 1) + '" fill="' + BRASS_DARK + '" opacity=".9">' + esc(o.text) + '</text>';
      g += '<text class="u-engr"' + common + ' y="' + ty + '" fill="' + BRASS + '">' + esc(o.text) + '</text>';
      g += '<text class="u-engr"' + common + ' y="' + (ty - 0.6) + '" fill="' + BRASS_LIGHT + '" opacity=".35">' + esc(o.text) + '</text>';
    }
    return g + '</g>';
  }

  function wrap(w, h, body, ids, title) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' +
      (title ? '<title>' + esc(title) + '</title>' : '') + defs(ids) + body + '</svg>';
  }

  function ids() { return { shadow: id('s'), grain: id('g'), glow: id('l'), light: id('d'), sheen: id('h'), clip: id('c') }; }

  // 1. Закрытый ежедневник спереди, с гравировкой
  function hero(o) {
    var i = ids();
    return wrap(420, 540, '<g filter="url(#' + i.shadow + ')">' + coverGroup(o, i, 56, 40) + '</g>', i, o.title);
  }

  // 2. Открытый: слева изнанка обложки с модулем и светящимся знаком, справа страница
  function openLed(o) {
    var i = ids(), c = o.color || '#1A1A1A', w = 600, h = 424;
    var b = '<g filter="url(#' + i.shadow + ')" transform="translate(40 60)">';
    b += '<rect x="-6" y="-4" width="' + (w + 12) + '" height="' + (h + 8) + '" rx="10" fill="' + c + '"/>';
    b += '<rect x="-6" y="-4" width="' + (w + 12) + '" height="' + (h + 8) + '" rx="10" fill="' + c + '" filter="url(#' + i.grain + ')"/>';
    b += '<rect x="300" width="300" height="' + h + '" rx="4" fill="#F4EFE6"/>';
    for (var k = 1; k < 22; k++) b += '<path d="M330 ' + (34 + k * 17) + ' H572" stroke="#1C1A17" stroke-opacity=".12" stroke-width=".8"/>';
    b += '<path d="M300 0 V' + h + '" stroke="#000" stroke-opacity=".3" stroke-width="2"/>';
    // модуль внутри обложки
    b += '<rect x="40" y="250" width="220" height="120" rx="10" fill="' + shade(c, -0.35) + '" stroke="' + shade(c, 0.2) + '" stroke-width="1"/>';
    b += '<rect x="132" y="356" width="36" height="8" rx="4" fill="#0B0B0B" stroke="' + BRASS + '" stroke-width=".8"/>';
    b += '<g transform="translate(108 90) scale(1.3)" filter="url(#' + i.glow + ')"><g class="u-led2">' + starMark('#F6E3B0', { line: 0.8, lineOpacity: 0.8 }) + '</g></g>';
    b += '</g>';
    return wrap(680, 560, b, i, o.title);
  }

  // 3. На обложке лежит телефон, значок зарядки
  function charging(o) {
    var i = ids();
    var b = '<g filter="url(#' + i.shadow + ')">' + coverGroup({ color: o.color, led: false }, i, 110, 70) + '</g>';
    b += '<g class="u-phone"><g transform="translate(190 150) rotate(-6)" filter="url(#' + i.shadow + ')">' +
      '<rect width="150" height="300" rx="24" fill="#0A0A0A" stroke="#2A2A2A" stroke-width="2"/>' +
      '<rect x="8" y="8" width="134" height="284" rx="18" fill="#161616"/>' +
      '<rect x="55" y="16" width="40" height="8" rx="4" fill="#0A0A0A"/>' +
      '<g transform="translate(75 150)">' +
      '<circle class="u-ring" r="30" fill="none" stroke="' + BRASS + '" stroke-width="1" opacity="0"/>' +
      '<circle class="u-ring" r="30" fill="none" stroke="' + BRASS + '" stroke-width="1" opacity="0"/>' +
      '<circle r="30" fill="none" stroke="' + BRASS + '" stroke-width="1.5" opacity=".7"/>' +
      '<path class="u-bolt" d="M4 -16 L-8 3 H0 L-4 16 L8 -3 H0 Z" fill="' + BRASS + '"/></g></g></g>';
    return wrap(520, 600, b, i, o.title);
  }

  // 4. Крупный план гравировки
  function engraving(o) {
    var i = ids(), c = o.color || '#1A1A1A';
    var t = esc(o.text || 'Ürker');
    var f = esc(o.font || 'Lora, Georgia, serif');
    var b = '<rect width="600" height="400" fill="' + c + '"/><rect width="600" height="400" fill="' + c + '" filter="url(#' + i.grain + ')"/>';
    b += '<rect width="600" height="400" fill="url(#' + i.light + ')"/>';
    b += '<rect x="24" y="24" width="552" height="352" rx="6" fill="none" stroke="' + shade(c, 0.28) + '" stroke-dasharray="6 4" opacity=".7"/>';
    var common = ' x="300" text-anchor="middle" font-family="' + f + '" font-size="72" letter-spacing="3"';
    b += '<g class="u-engr-big">';
    b += '<text' + common + ' y="232" fill="' + BRASS_DARK + '">' + t + '</text>';
    b += '<text' + common + ' y="229" fill="' + BRASS + '">' + t + '</text>';
    b += '<text' + common + ' y="228" fill="' + BRASS_LIGHT + '" opacity=".35">' + t + '</text>';
    b += '</g>';
    b += '<g transform="translate(268 290) scale(1)">' + starMark(BRASS, { line: 0.6 }) + '</g>';
    return wrap(600, 400, b, i, o.title);
  }

  // 5. Все цвета в ряд
  function colors(o) {
    var i = ids(), list = o.colors || [], b = '';
    var mid = 40 + (list.length - 1) * 75;
    list.forEach(function (c, k) {
      var x = 40 + k * 150;
      b += '<g class="u-cw" data-color="' + esc(c.id || '') + '" style="--k:' + k + ';--dx:' + (mid - x) + 'px">' +
        '<g filter="url(#' + i.shadow + ')" transform="translate(' + x + ' ' + (60 + (k % 2) * 18) + ') scale(.62)">' + coverGroup({ color: c.hex }, i, 0, 0) + '</g></g>';
    });
    return wrap(40 + list.length * 150 + 80, 420, b, i, o.title);
  }

  var api = { starMark: starMark, hero: hero, openLed: openLed, charging: charging, engraving: engraving, colors: colors, BRASS: BRASS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UrkerArt = api;
})(this);
