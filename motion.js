/*
 * Ürker — движение. Подключается после main.js (тексты уже на месте).
 * Идея: ночное небо и 7 звёзд Үркер. Звёзды загораются, линии созвездия прорисовываются,
 * имя гравируется лазером, блоки мягко поднимаются при прокрутке.
 * Всё — только transform/opacity и маленький canvas; на паузе, когда не видно.
 * «Уменьшить движение» в системе: свет и появление остаются, наклон, парение и падающие звёзды выключаются.
 */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement, ART = window.UrkerArt;
  if (!ART || !('IntersectionObserver' in window) || !window.requestAnimationFrame || !doc.querySelector('.hero')) return;

  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var ORDER = [6, 5, 0, 3, 4, 1, 2]; // порядок, в котором загораются звёзды (как на обложке)
  var uid = 0;

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function restart(node, cls) { node.classList.remove(cls); void node.getBoundingClientRect(); node.classList.add(cls); }

  function setup() {
    constellations();
    sky();
    heroIntro();
    heroDepth();
    heroLaserSpark();
    headings();
    storyInk();
    reveals();
    scenes();
    colorsPick();
    builder();
    faq();
    progress();
  }

  /* ---------- Созвездия: <use href="#stars"> → живые звёзды ---------- */
  function makeConstellation(svg) {
    svg.innerHTML = ART.starMark('currentColor', { line: 0.8, lineOpacity: 0.55 });
    prepStars(svg);
    svg.classList.add('cn');
  }
  function prepStars(scope) {
    $$('circle[data-i]', scope).forEach(function (c) { c.style.setProperty('--s', ORDER.indexOf(+c.getAttribute('data-i'))); });
    $$('line', scope).forEach(function (l, k) { l.setAttribute('pathLength', '1'); l.style.setProperty('--l', k); });
  }
  var starObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('on'); starObserver.unobserve(en.target); } });
  }, { threshold: 0.4 });

  function constellations() {
    $$('svg > use').forEach(function (u) {
      var href = u.getAttribute('href') || u.getAttribute('xlink:href');
      if (href !== '#stars') return;
      var svg = u.parentNode;
      makeConstellation(svg);
      if (svg.closest('.result')) return; // загорается при успешном заказе
      if (svg.closest('.site-header')) { setTimeout(function () { svg.classList.add('on'); }, 150); return; }
      starObserver.observe(svg);
    });
  }

  /* ---------- Ночное небо на первом экране ---------- */
  function sky() {
    var hero = doc.querySelector('.hero');
    var c = doc.createElement('canvas');
    c.className = 'sky'; c.setAttribute('aria-hidden', 'true');
    hero.insertBefore(c, hero.firstChild);
    var ctx = c.getContext('2d'); if (!ctx) return;
    var stars = [], W = 0, H = 0, raf = 0, visible = true, last = 0, shoot = null;
    var nextShoot = performance.now() + 3200;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      c.style.width = W + 'px'; c.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(170, Math.round(W * H / 6500));
      stars = [];
      for (var i = 0; i < n; i++) {
        var big = Math.random() < 0.07;
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: big ? 1.1 + Math.random() * 0.5 : 0.3 + Math.random() * 0.65,
          a: big ? 0.65 + Math.random() * 0.3 : 0.18 + Math.random() * 0.45,
          s: (calm ? 0.25 : 0.5) + Math.random() * (calm ? 0.5 : 1.6),
          p: Math.random() * 6.283, warm: Math.random() < 0.2,
        });
      }
    }

    function frame(t) {
      raf = 0;
      if (!visible || doc.hidden) return;
      raf = requestAnimationFrame(frame);
      if (t - last < 32) return; // ~30 кадров в секунду достаточно
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var al = st.a * (0.55 + 0.45 * Math.sin(t / 1000 * st.s + st.p)) * (1 - (st.y / H) * 0.55);
        ctx.globalAlpha = al;
        ctx.fillStyle = st.warm ? '#E2C98F' : '#EDE8DF';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.283); ctx.fill();
      }
      // Падающая звезда раз в 6–13 секунд
      if (!calm) {
        if (!shoot && t > nextShoot) shoot = { x: W * (0.25 + Math.random() * 0.6), y: H * (0.04 + Math.random() * 0.25), t0: t, len: 90 + Math.random() * 90 };
        if (shoot) {
          var k = (t - shoot.t0) / 1100;
          if (k >= 1) { shoot = null; nextShoot = t + 6000 + Math.random() * 7000; }
          else {
            var e = easeOut(k), ang = 2.6, dist = 260;
            var hx = shoot.x + Math.cos(ang) * dist * e, hy = shoot.y + Math.sin(ang) * dist * e;
            var tx = hx - Math.cos(ang) * shoot.len, ty = hy - Math.sin(ang) * shoot.len;
            var gr = ctx.createLinearGradient(hx, hy, tx, ty);
            gr.addColorStop(0, 'rgba(246,227,176,.9)'); gr.addColorStop(1, 'rgba(246,227,176,0)');
            ctx.globalAlpha = Math.sin(k * Math.PI);
            ctx.strokeStyle = gr; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    function start() { if (!raf && visible && !doc.hidden) raf = requestAnimationFrame(frame); }

    size(); start();
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); start(); }, 150); });
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(hero);
    doc.addEventListener('visibilitychange', start);
  }

  /* ---------- Первый экран: заголовок по словам, цена считается ---------- */
  function splitWords(node, cls) {
    if (!node || node.getAttribute('data-split') || node.children.length || !node.textContent.trim()) return false;
    var text = node.textContent.trim(), words = text.split(/\s+/);
    node.setAttribute('aria-label', text);
    node.textContent = '';
    words.forEach(function (w, i) {
      var outer = doc.createElement('span'); outer.className = 'w'; outer.setAttribute('aria-hidden', 'true');
      var inner = doc.createElement('span'); inner.textContent = w; inner.style.setProperty('--w', i);
      outer.appendChild(inner); node.appendChild(outer);
      if (i < words.length - 1) node.appendChild(doc.createTextNode(' '));
    });
    node.setAttribute('data-split', '1');
    node.classList.add(cls || 'split');
    return true;
  }

  function heroIntro() {
    var hero = doc.querySelector('.hero');
    var slogan = hero.querySelector('.slogan');
    splitWords(slogan);
    $$('.facts li', hero).forEach(function (li, i) { li.style.setProperty('--i', i); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        hero.classList.add('hero-in');
        setTimeout(function () { if (slogan) slogan.classList.add('in'); }, 120);
      });
    });
    // Цена «набирается» от нуля
    var price = hero.querySelector('.price');
    if (price) {
      var target = parseInt(price.textContent.replace(/\D/g, ''), 10);
      var tail = price.textContent.replace(/^[\s\S]*\d/, '');
      if (target > 0) {
        var t0 = 0, dur = 1300, delay = 650, done = false;
        price.setAttribute('aria-label', price.textContent);
        var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + tail; };
        // Настоящая цена стоит, пока не пошёл первый кадр анимации; при любой заминке — возвращается
        var finish = function () { if (!done) { done = true; price.textContent = fmt(target); } };
        setTimeout(function () {
          if (doc.hidden) { finish(); return; }
          requestAnimationFrame(function step(t) {
            if (done) return;
            if (!t0) t0 = t;
            var k = clamp((t - t0) / dur, 0, 1);
            price.textContent = fmt(Math.round(target * easeOut(k) / 100) * 100);
            if (k < 1) requestAnimationFrame(step); else finish();
          });
          setTimeout(finish, dur + 200);
        }, delay);
        doc.addEventListener('visibilitychange', finish);
      }
    }
    // Блик по кнопке после появления
    var cta = hero.querySelector('.hero-text .btn');
    if (cta) setTimeout(function () { restart(cta, 'shine'); }, 1900);
  }

  /* ---------- Обложка: наклон за курсором и уход вглубь при прокрутке ---------- */
  function heroDepth() {
    var media = doc.querySelector('.hero-media'), art = media && media.querySelector('.art');
    if (!art || calm) return;
    if (finePointer) {
      media.addEventListener('pointermove', function (e) {
        var r = media.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        art.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
        art.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
      });
      media.addEventListener('pointerleave', function () { art.style.setProperty('--ry', '0deg'); art.style.setProperty('--rx', '0deg'); });
    }
    var ticking = false, hero = doc.querySelector('.hero');
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var h = hero.offsetHeight, y = Math.min(window.scrollY, h);
        media.style.setProperty('--py', (y * 0.18).toFixed(1) + 'px');
        media.style.setProperty('--po', (1 - y / h * 0.6).toFixed(3));
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Искра лазера, пока «гравируется» имя на обложке ---------- */
  function heroLaserSpark() {
    var svg = doc.querySelector('[data-art="hero"] svg');
    var texts = svg ? svg.querySelectorAll('.u-engr') : [];
    if (!texts.length) return;
    var main = texts[1] || texts[0];
    var glowFilter = svg.querySelector('.u-led') && svg.querySelector('.u-led').getAttribute('data-glow');
    var spark = doc.createElementNS(NS, 'g');
    spark.setAttribute('class', 'u-spark');
    spark.innerHTML = '<circle r="9" fill="#F6E3B0" opacity=".22"/><circle r="2.6" fill="#FFF8E8"/>';
    if (glowFilter) spark.setAttribute('filter', glowFilter);
    main.parentNode.appendChild(spark);
    var hideT = 0, lastLen = 0;
    var mo = new MutationObserver(function () {
      var len = Array.from(main.textContent).length;
      if (!len || len === lastLen) { lastLen = len; if (!len) spark.classList.remove('is-on'); return; }
      lastLen = len;
      var x = parseFloat(main.getAttribute('x')) || 0, y = parseFloat(main.getAttribute('y')) || 0;
      var w = 0; try { w = main.getComputedTextLength(); } catch (e) { /* ничего */ }
      spark.setAttribute('transform', 'translate(' + (x + w / 2 + 3).toFixed(1) + ' ' + (y - 8).toFixed(1) + ')');
      spark.classList.add('is-on');
      clearTimeout(hideT); hideT = setTimeout(function () { spark.classList.remove('is-on'); }, 420);
    });
    mo.observe(main, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- Заголовки разделов поднимаются по словам ---------- */
  var headObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); headObserver.unobserve(en.target); } });
  }, { threshold: 0.3, rootMargin: '0px 0px -6% 0px' });
  function headings() {
    $$('main h2, #result-ok .result-title').forEach(function (h) {
      if (h.hasAttribute('data-gap')) return;
      if (splitWords(h) && !h.closest('.result')) headObserver.observe(h);
    });
  }

  /* ---------- «Почему Үркер»: слова проявляются, как чернила, по мере прокрутки ---------- */
  function storyInk() {
    var p = doc.querySelector('.story-text');
    if (!p || p.children.length || !p.textContent.trim()) return;
    var text = p.textContent.trim(), words = text.split(/\s+/), spans = [];
    p.setAttribute('aria-label', text); p.textContent = '';
    words.forEach(function (w, i) {
      var s = doc.createElement('span'); s.className = 'iw'; s.textContent = w; s.setAttribute('aria-hidden', 'true');
      p.appendChild(s); spans.push(s);
      if (i < words.length - 1) p.appendChild(doc.createTextNode(' '));
    });
    p.classList.add('ink');
    var lit = 0, ticking = false, active = false;
    function update() {
      ticking = false;
      var r = p.getBoundingClientRect(), vh = window.innerHeight;
      // от «текст появился снизу» до «текст в верхней трети»
      var k = clamp((vh * 0.92 - r.top) / (vh * 0.92 - vh * 0.3 + r.height * 0.5), 0, 1);
      var n = Math.round(k * spans.length);
      if (n === lit) return;
      for (var i = Math.min(n, lit); i < Math.max(n, lit); i++) spans[i].classList.toggle('lit', i < n);
      lit = n;
    }
    function onScroll() { if (active && !ticking) { ticking = true; requestAnimationFrame(update); } }
    new IntersectionObserver(function (en) { active = en[0].isIntersecting; if (active) onScroll(); }).observe(p);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Плавное появление блоков ---------- */
  function reveals() {
    var groups = [
      ['.feature-list', '.feature'], ['.specs-grid', '.colors-figure'], ['.spec', '.spec > div'],
      ['.step-list', 'li'], ['.faq-list', 'details'], ['.business-inner', '.business-inner > *'],
      ['.footer-inner', '.footer-inner > *'], ['.builder-col', '.builder-intro'],
    ];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target; io.unobserve(n);
        n.classList.add('in');
        var d = (parseFloat(getComputedStyle(n).getPropertyValue('--i')) || 0) * 110 + 1300;
        setTimeout(function () { n.removeAttribute('data-r'); }, d); // убираем «технические» переходы, чтобы не мешали наведению
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    groups.forEach(function (g) {
      $$(g[0]).forEach(function (box) {
        $$(g[1], box.parentNode).filter(function (n) { return box.contains(n) || n === box; }).forEach(function (n, i) {
          if (n.hasAttribute('data-gap') || n.hidden) return;
          n.setAttribute('data-r', ''); n.style.setProperty('--i', i % 4);
          io.observe(n);
        });
      });
    });
    // Линии шагов и разделитель — отдельно, у них своё движение
    var lineIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); lineIo.unobserve(en.target); } });
    }, { threshold: 0.25 });
    $$('.step-list, .divider').forEach(function (n) { lineIo.observe(n); });
  }

  /* ---------- Сцены в карточках «Три отличия» ---------- */
  function scenes() {
    $$('.feature .art svg').forEach(function (svg) {
      prepStars(svg.querySelector('.u-led2') || doc.createElement('i'));
      var art = svg.parentNode, laserRun = null, loop = 0;
      if (svg.querySelector('.u-engr-big')) laserRun = laser(svg);
      new IntersectionObserver(function (en) {
        var on = en[0].isIntersecting;
        art.classList.toggle('play', on); // за кадром — пауза (бережём батарею)
        if (laserRun) {
          clearInterval(loop);
          if (on) { laserRun(); loop = setInterval(laserRun, 9000); }
        }
      }, { threshold: 0.35 }).observe(art);
      if (laserRun) art.addEventListener('click', laserRun);
    });
  }

  // Лазер проводит по тексту гравировки: текст открывается вслед за искрой
  function laser(svg) {
    var g = svg.querySelector('.u-engr-big');
    var cp = doc.createElementNS(NS, 'clipPath'); cp.id = 'ulz' + (++uid);
    var rect = doc.createElementNS(NS, 'rect');
    rect.setAttribute('y', '0'); rect.setAttribute('height', '400'); rect.setAttribute('width', '0');
    cp.appendChild(rect); svg.appendChild(cp);
    var spark = doc.createElementNS(NS, 'g');
    spark.setAttribute('class', 'u-spark');
    spark.innerHTML = '<circle r="16" fill="#F6E3B0" opacity=".18"/><circle r="6" fill="#F6E3B0" opacity=".45"/><circle r="2.6" fill="#FFFDF6"/>';
    svg.appendChild(spark);
    var running = false, bb = null;
    g.setAttribute('clip-path', 'url(#' + cp.id + ')');
    return function run() {
      if (running) return;
      try { bb = g.getBBox(); } catch (e) { bb = null; }
      if (!bb || !bb.width) { g.removeAttribute('clip-path'); return; }
      running = true;
      var x0 = bb.x - 12, total = bb.width + 24, t0 = 0, dur = 2100;
      rect.setAttribute('x', x0);
      spark.classList.add('is-on');
      requestAnimationFrame(function step(t) {
        if (!t0) t0 = t;
        var k = clamp((t - t0) / dur, 0, 1), w = total * easeInOut(k);
        rect.setAttribute('width', w.toFixed(1));
        var y = bb.y + bb.height * 0.58 + Math.sin(k * 46) * bb.height * 0.2;
        spark.setAttribute('transform', 'translate(' + (x0 + w).toFixed(1) + ' ' + y.toFixed(1) + ')');
        if (k < 1) requestAnimationFrame(step);
        else { spark.classList.remove('is-on'); running = false; }
      });
    };
  }

  /* ---------- Пять цветов: веер из стопки; нажатие выбирает цвет в конструкторе ---------- */
  function colorsPick() {
    $$('.color-list > *').forEach(function (n, i) { n.style.setProperty('--k', i); });
    $$('.art-colors .u-cw').forEach(function (g) {
      g.addEventListener('click', function () {
        var input = doc.querySelector('input[name="color"][value="' + g.getAttribute('data-color') + '"]');
        if (!input) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        var order = doc.getElementById('order');
        if (order) order.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- Конструктор: обложка «переворачивается» при смене цвета, числа оживают ---------- */
  function builder() {
    var preview = doc.getElementById('preview');
    if (!preview) return;
    preview.addEventListener('animationend', function (e) { if (e.target.tagName === 'svg') preview.classList.remove('swap'); });
    var form = doc.getElementById('order-form');
    form.addEventListener('change', function (e) {
      var n = e.target && e.target.name;
      if (n === 'color' || n === 'font') restart(preview, 'swap');
    });
    var qv = doc.getElementById('qty-value');
    $$('#qty-minus, #qty-plus').forEach(function (b) { b.addEventListener('click', function () { if (qv) restart(qv, 'tick'); }); });

    // Сумма плавно перетекает к новому значению
    var total = doc.getElementById('total'), shown = null, anim = 0, fin = 0, mo = null;
    if (total) {
      shown = parseInt(total.textContent.replace(/\D/g, ''), 10) || 0;
      // свои изменения сразу «забираем» из наблюдателя, чтобы он не реагировал на них
      var setOwn = function (s) { total.textContent = s; mo.takeRecords(); };
      mo = new MutationObserver(function () {
        var target = parseInt(total.textContent.replace(/\D/g, ''), 10) || 0;
        if (target === shown) return;
        var from = shown, t0 = 0; shown = target;
        var tail = total.textContent.replace(/^[\s\S]*\d/, '');
        var fmt = function (v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + tail; };
        cancelAnimationFrame(anim); clearTimeout(fin);
        setOwn(fmt(from));
        anim = requestAnimationFrame(function step(t) {
          if (!t0) t0 = t;
          var k = clamp((t - t0) / 450, 0, 1);
          setOwn(fmt(Math.round(from + (target - from) * easeOut(k))));
          if (k < 1) anim = requestAnimationFrame(step);
        });
        fin = setTimeout(function () { cancelAnimationFrame(anim); setOwn(fmt(target)); }, 520);
        restart(total, 'tick');
      });
      mo.observe(total, { childList: true, characterData: true, subtree: true });
    }

    // Спасибо: созвездие собирается
    var ok = doc.getElementById('result-ok');
    if (ok) {
      new MutationObserver(function () {
        if (ok.hidden) return;
        var stars = ok.querySelector('.result-stars'), title = ok.querySelector('.result-title');
        if (stars) restart(stars, 'on');
        if (title) restart(title, 'in');
      }).observe(ok, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  /* ---------- Вопросы: ответ мягко раскрывается ---------- */
  function faq() {
    var list = doc.querySelector('.faq-list');
    if (!list || !list.animate) return;
    list.addEventListener('toggle', function (e) {
      var d = e.target;
      if (!d.open) return;
      var a = d.querySelector('.answer'); if (!a) return;
      a.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
    }, true);
  }

  /* ---------- Тонкая латунная линия прогресса под шапкой ---------- */
  function progress() {
    var header = doc.querySelector('.site-header');
    if (!header) return;
    var bar = doc.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
    header.appendChild(bar);
    var ticking = false;
    function update() {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0).toFixed(4) + ')';
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Старт (в конце: все наблюдатели выше уже созданы) ---------- */
  try {
    root.classList.add('m');
    if (calm) root.classList.add('m-calm');
    setup();
  } catch (e) {
    // Если что-то пошло не так — показываем страницу как есть, без анимации
    root.classList.remove('m', 'm-calm');
    if (window.console) console.warn('Ürker motion off:', e);
  }
})();
