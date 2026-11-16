/* WEBIT FX v1: אפקטי "וואו" שמגיעים מעל webit.js. נטען רק באתר שמשתמש בהם.
   canvas דו-ממדי ו-SVG, בלי ספריות, בלי תמונות חובה. כל אפקט:
   - רץ רק כשהוא על המסך, והלשונית פתוחה, והתנועה פעילה (כפתור עצירה / העדפת מערכת)
   - כשהתנועה כבויה מצייר מצב סופי סטטי אחד
   - דקורטיבי בלבד (aria-hidden). התוכן עצמו תמיד ב-HTML רגיל.

   data-fx="dust"      אבק חלקיקים שמרחף. על <canvas> בתוך סקשן
   data-fx="branches"  קו אחד שמתפצל לכמה יעדים, עם פעימות שזורמות בו. על div שמכיל <ul> */
(function () {
  var root = document.documentElement;
  var motionOn = function () { return !root.classList.contains('motion-off') && !(window.WM && !window.WM.motion()); };
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var css = function (el, name, fallback) { var v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fallback; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  // צבע hex או rgb לרכיבים, כדי לשלב שקיפות
  var rgb = function (c) {
    var m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) { var n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    m = c.match(/(\d+)\D+(\d+)\D+(\d+)/); return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  };
  var rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  // התקדמות הסצנה (--p שכותב webit.js)
  var sceneP = function (el) { var s = el.closest('[data-scene]'); return s ? parseFloat(s.style.getPropertyValue('--p')) || 0 : 1; };
  // התקדמות של אלמנט שעובר במסך: 0 כשהוא נכנס מלמטה, 1 כשהחלק העליון שלו מגיע לשליש העליון
  var passP = function (el) { var r = el.getBoundingClientRect(), vh = innerHeight; return clamp((vh - r.top) / (vh * 0.66 + r.height * 0.35), 0, 1); };

  // מנוע משותף: מריץ frame(t) רק כשצריך
  function engine(el, frame, onResize) {
    var visible = false, raf = 0, t0 = performance.now();
    var loop = function (now) { raf = 0; frame((now - t0) / 1000, true); if (visible && motionOn() && !document.hidden) raf = requestAnimationFrame(loop); };
    var start = function () { if (!raf && visible && motionOn() && !document.hidden) raf = requestAnimationFrame(loop); };
    var still = function () { if (!motionOn()) frame(0, false); };
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? (start(), still()) : 0; }, { rootMargin: '100px' }).observe(el);
    if (onResize && 'ResizeObserver' in window) new ResizeObserver(function () { onResize(); frame(0, motionOn()); }).observe(el);
    document.addEventListener('visibilitychange', start);
    document.addEventListener('wm:motion', function () { start(); still(); });
    return start;
  }
  function fitCanvas(cv) {
    var r = cv.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
    var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /* ---------- 1. אבק ---------- */
  function dust(cv) {
    cv.setAttribute('aria-hidden', 'true');
    var g, pts = [], col = rgb(css(cv, '--text', '#fff')), brand = rgb(css(cv, '--brand', '#fff'));
    var build = function () {
      g = fitCanvas(cv);
      var n = Math.min(170, Math.round(g.w * g.h / 8000)); pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * g.w, y: Math.random() * g.h, r: Math.random() * 1.3 + 0.3, s: Math.random() * 0.25 + 0.05, ph: Math.random() * 6.3, b: Math.random() < 0.08 });
    };
    build();
    engine(cv, function (t) {
      var c = g.ctx; c.clearRect(0, 0, g.w, g.h);
      var drift = window.scrollY * 0.05;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], y = (p.y - t * p.s * 12 - drift * p.s * 4) % g.h; if (y < 0) y += g.h;
        var a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.4 + p.ph));
        c.fillStyle = rgba(p.b ? brand : col, a); c.beginPath(); c.arc(p.x, y, p.r, 0, 6.283); c.fill();
      }
    }, build);
  }

  /* ---------- 2. התפצלות ---------- */
  function branches(box) {
    var list = box.querySelector('ul,ol'); if (!list) return;
    var items = [].slice.call(list.children), NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('fx-branches__svg');
    box.insertBefore(svg, list); box.classList.add('is-built');
    var paths = [], trunk, pulses = [];
    var mk = function (cls) { var p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); svg.appendChild(p); return p; };
    var build = function () {
      var w = box.clientWidth, h = box.clientHeight, n = items.length, narrow = w < 640;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.textContent = ''; paths = []; pulses = [];
      var sx = w / 2, sy = 0, split = h * 0.32;
      trunk = mk('fx-branches__trunk'); trunk.setAttribute('d', 'M' + sx + ' ' + sy + ' C ' + (sx + w * 0.06) + ' ' + split * 0.4 + ', ' + (sx - w * 0.06) + ' ' + split * 0.7 + ', ' + sx + ' ' + split);
      // בטלפון: שתי עמודות, וכל שורה יורדת לפי הגובה האמיתי של התוויות שמעליה, כדי שלא יעלו זו על זו
      var rowY = [], y = h * 0.55, gap = 14;
      if (narrow) {
        for (var r = 0; r < Math.ceil(n / 2); r++) {
          rowY.push(y);
          var rh = Math.max(items[r * 2].offsetHeight, items[r * 2 + 1] ? items[r * 2 + 1].offsetHeight : 0);
          y += rh + gap + 10;
        }
        var need = Math.ceil(y + 8);
        if (need > h) { box.style.setProperty('height', need + 'px'); h = need; svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); }
      }
      items.forEach(function (li, i) {
        var tx = narrow ? w * (n % 2 && i === n - 1 ? 0.5 : 0.27 + 0.46 * (i % 2)) : w * ((i + 0.5) / n);
        // התווית לא יוצאת מהמסך: מצמידים את המרכז כך שכל הרוחב שלה בפנים
        var lw = li.offsetWidth || 0, pad = 8;
        tx = Math.max(lw / 2 + pad, Math.min(w - lw / 2 - pad, tx));
        var ty = narrow ? rowY[Math.floor(i / 2)] : h * (i % 2 ? 0.74 : 0.9);
        var d = 'M' + sx + ' ' + split + ' C ' + sx + ' ' + (split + (ty - split) * 0.55) + ', ' + tx + ' ' + (split + (ty - split) * 0.35) + ', ' + tx + ' ' + (ty - 18);
        var p = mk('fx-branches__path'); p.setAttribute('d', d); p.setAttribute('pathLength', '1'); paths.push(p);
        li.style.setProperty('--x', tx + 'px'); li.style.setProperty('--y', ty + 'px');
        var dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '3.5'); dot.setAttribute('class', 'fx-branches__pulse'); svg.appendChild(dot);
        pulses.push({ el: dot, path: p, len: 0, off: Math.random() });
      });
      trunk.setAttribute('pathLength', '1');
      pulses.forEach(function (q) { q.len = q.path.getTotalLength(); q.tl = trunk.getTotalLength(); });
    };
    build();
    engine(box, function (t, moving) {
      var p = moving ? passP(box) : 1;
      var pt = ease(clamp(p / 0.35, 0, 1)), pb = ease(clamp((p - 0.3) / 0.5, 0, 1));
      trunk.style.strokeDashoffset = 1 - pt;
      paths.forEach(function (path, i) {
        var own = clamp(pb * 1.15 - i * 0.03, 0, 1);
        path.style.strokeDashoffset = 1 - own;
        items[i].classList.toggle('is-on', own > 0.96);
      });
      pulses.forEach(function (q) {
        var on = moving && pb > 0.98; q.el.style.opacity = on ? 1 : 0; if (!on) return;
        var k = (t * 0.35 + q.off) % 1, pos;
        pos = k < 0.3 ? trunk.getPointAtLength(q.tl * k / 0.3) : q.path.getPointAtLength(q.len * (k - 0.3) / 0.7);
        q.el.setAttribute('cx', pos.x.toFixed(1)); q.el.setAttribute('cy', pos.y.toFixed(1));
      });
    }, build);
  }

  var map = { dust: dust, branches: branches };
  var go = function () { document.querySelectorAll('[data-fx]').forEach(function (el) { var f = map[el.getAttribute('data-fx')]; if (f) { try { f(el); } catch (e) { /* אפקט שנכשל לא שובר את העמוד */ } } }); };
  if (!('IntersectionObserver' in window)) return;
  document.fonts && document.fonts.ready ? document.fonts.ready.then(go) : go();
})();
