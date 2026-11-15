/* WEBIT FX v1: אפקטי "וואו" שמגיעים מעל webit.js. נטען רק באתר שמשתמש בהם.
   canvas דו-ממדי ו-SVG, בלי ספריות, בלי תמונות חובה. כל אפקט:
   - רץ רק כשהוא על המסך, והלשונית פתוחה, והתנועה פעילה (כפתור עצירה / העדפת מערכת)
   - כשהתנועה כבויה מצייר מצב סופי סטטי אחד
   - דקורטיבי בלבד (aria-hidden). התוכן עצמו תמיד ב-HTML רגיל.

   data-fx="dust"      אבק חלקיקים שמרחף. על <canvas> בתוך סקשן
   data-fx="helix"     חלקיקים מפוזרים שמתאספים לסליל כפול לפי הגלילה. על <canvas> בתוך .scene
   data-fx="branches"  קו אחד שמתפצל לכמה יעדים, עם פעימות שזורמות בו. על div שמכיל <ul>
   data-fx="tunnel"    מנהרה של כרטיסים שעפים לעבר הצופה לפי הגלילה. על <canvas> בתוך .scene
   data-fx="ribbon"    סרט של פריימים שמתגלגל לאורך עקומה. על div עם .fx-ribbon__frame בפנים */
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

  /* ---------- 2. סליל חלקיקים ---------- */
  function helix(cv) {
    cv.setAttribute('aria-hidden', 'true');
    var g, pts = [], brand = rgb(css(cv, '--brand', '#fff')), text = rgb(css(cv, '--text', '#fff'));
    var build = function () {
      g = fitCanvas(cv);
      var n = g.w < 600 ? 260 : 460; pts = [];
      for (var i = 0; i < n; i++) pts.push({ u: i / n, strand: i % 2, sx: Math.random() * g.w, sy: Math.random() * g.h, j: (Math.random() - 0.5) * 6, r: Math.random() * 1.2 + 0.8 });
    };
    build();
    engine(cv, function (t, moving) {
      var c = g.ctx, p = moving ? sceneP(cv) : 1; c.clearRect(0, 0, g.w, g.h);
      var form = ease(clamp(p * 2.2, 0, 1));                // מתאסף בחצי הראשון של הסצנה
      var spin = t * 0.6 + p * 9;                             // מסתובב עם הזמן ועם הגלילה
      // ציר אלכסוני מהפינה התחתונה לעליונה
      var x0 = g.w * 0.08, y0 = g.h * 0.9, x1 = g.w * 0.92, y1 = g.h * 0.1, R = Math.min(g.w, g.h) * 0.11;
      var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      for (var i = 0; i < pts.length; i++) {
        var q = pts[i], ang = q.u * 6.283 * 3.2 + spin + q.strand * Math.PI, depth = Math.cos(ang);
        var hx = x0 + dx * q.u + nx * Math.sin(ang) * R + q.j, hy = y0 + dy * q.u + ny * Math.sin(ang) * R + q.j;
        var x = q.sx + (hx - q.sx) * form, y = q.sy + (hy - q.sy) * form;
        var a = (0.25 + 0.55 * (depth * 0.5 + 0.5)) * (0.35 + 0.65 * form);
        c.fillStyle = rgba(q.strand ? text : brand, a);
        c.beginPath(); c.arc(x, y, q.r * (0.8 + 0.5 * (depth * 0.5 + 0.5)), 0, 6.283); c.fill();
        // שלבים בין שני הגדילים
        if (form > 0.9 && q.strand === 0 && i % 14 === 0) {
          c.strokeStyle = rgba(brand, 0.18 * form); c.lineWidth = 1; c.beginPath();
          c.moveTo(hx, hy); c.lineTo(hx - nx * Math.sin(ang) * R * 2, hy - ny * Math.sin(ang) * R * 2); c.stroke();
        }
      }
    }, build);
  }

  /* ---------- 3. התפצלות ---------- */
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

  /* ---------- 4. מנהרת כרטיסים ---------- */
  function tunnel(cv) {
    cv.setAttribute('aria-hidden', 'true');
    var g, cards = [], surf = rgb(css(cv, '--surface-2', '#223')), line = rgb(css(cv, '--text', '#fff')), brand = rgb(css(cv, '--brand', '#fff')), bg = rgb(css(cv, '--bg', '#000'));
    var RINGS = 18, PER = 12, DEPTH = 18;
    var build = function () {
      g = fitCanvas(cv); cards = [];
      var per = g.w < 600 ? 9 : PER;
      for (var r = 0; r < RINGS; r++) for (var k = 0; k < per; k++)
        cards.push({ z: r * (DEPTH / RINGS), a: (k / per) * 6.283 + r * 0.22, tint: Math.random() < 0.06, tilt: (Math.random() - 0.5) * 0.5, shade: 0.55 + Math.random() * 0.45 });
    };
    build();
    engine(cv, function (t, moving) {
      var c = g.ctx, p = moving ? sceneP(cv) : 1, cx = g.w / 2, cy = g.h / 2;
      var cam = p * DEPTH * 1.4 + (moving ? t * 0.25 : 0);   // המצלמה טסה פנימה עם הגלילה
      var R = Math.max(g.w, g.h) * 0.55, f = 1.1, cw = Math.min(g.w, g.h) * 0.09;
      c.fillStyle = rgba(bg, 1); c.fillRect(0, 0, g.w, g.h);
      // מהרחוק לקרוב
      var list = cards.map(function (q) { var z = ((q.z - cam) % DEPTH + DEPTH) % DEPTH + 0.35; return { q: q, z: z }; }).sort(function (a, b) { return b.z - a.z; });
      for (var i = 0; i < list.length; i++) {
        var q = list[i].q, z = list[i].z, s = f / z, ang = q.a + z * 0.18 + p * 2;
        var x = cx + Math.cos(ang) * R * s, y = cy + Math.sin(ang) * R * s, w = cw * s * 1.6, h = w * 1.6;
        if (w < 1.2 || x < -w * 2 || x > g.w + w * 2 || y < -h * 2 || y > g.h + h * 2) continue;
        var fog = clamp(1 - z / DEPTH, 0, 1), near = clamp((z - 0.35) * 2.2, 0, 1);
        c.save(); c.translate(x, y); c.rotate(ang + Math.PI / 2 + q.tilt);
        c.globalAlpha = fog * near * (1 - p * 0.45);
        c.fillStyle = rgba(q.tint ? brand : surf, q.tint ? 0.85 : q.shade);
        c.fillRect(-w / 2, -h / 2, w, h);
        c.strokeStyle = rgba(line, 0.55); c.lineWidth = Math.max(0.5, w * 0.04); c.strokeRect(-w / 2, -h / 2, w, h);
        c.restore();
      }
      c.globalAlpha = 1;
      // מרכז כהה שממקד את העין
      var grd = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(g.w, g.h) * 0.35);
      grd.addColorStop(0, rgba(bg, 0.95)); grd.addColorStop(1, rgba(bg, 0)); c.fillStyle = grd; c.fillRect(0, 0, g.w, g.h);
    }, build);
  }

  /* ---------- 5. סרט מתגלגל ---------- */
  function ribbon(box) {
    box.setAttribute('aria-hidden', 'true');
    var frames = [].slice.call(box.querySelectorAll('.fx-ribbon__frame')), L = 1;
    // העקומה מוגדרת ביחס לגודל (0 עד 1), אפשר לדרוס ב-data-curve="x y, x y, ..." (נקודות שעוברים דרכן)
    // data-curve-narrow: עקומה אחרת לטלפון (מתחת ל-640px)
    var parse = function (v) { return v.split(',').map(function (s) { return s.trim().split(/\s+/).map(Number); }); };
    var wide = parse(box.getAttribute('data-curve') || '1.1 0.88, 0.78 1, 0.5 0.86, 0.22 0.99, -0.1 0.9');
    var narrowPts = parse(box.getAttribute('data-curve-narrow') || box.getAttribute('data-curve') || '1.15 0.9, 0.7 1, 0.3 0.9, -0.15 0.99');
    var pts = wide;
    var NS = 'http://www.w3.org/2000/svg', probe = document.createElementNS(NS, 'path'), ps = document.createElementNS(NS, 'svg');
    ps.setAttribute('width', '0'); ps.setAttribute('height', '0'); ps.classList.add('fx-probe'); ps.appendChild(probe); box.appendChild(ps);
    var build = function () {
      var w = box.clientWidth, h = box.clientHeight;
      pts = w < 640 ? narrowPts : wide;
      var P = pts.map(function (q) { return [q[0] * w, q[1] * h]; });
      // Catmull-Rom לעקומה חלקה שעוברת בכל הנקודות
      var d = 'M' + P[0][0] + ' ' + P[0][1];
      for (var i = 0; i < P.length - 1; i++) {
        var a = P[i - 1] || P[i], b = P[i], c2 = P[i + 1], e = P[i + 2] || c2;
        d += ' C ' + (b[0] + (c2[0] - a[0]) / 6) + ' ' + (b[1] + (c2[1] - a[1]) / 6) + ', ' + (c2[0] - (e[0] - b[0]) / 6) + ' ' + (c2[1] - (e[1] - b[1]) / 6) + ', ' + c2[0] + ' ' + c2[1];
      }
      probe.setAttribute('d', d); L = probe.getTotalLength();
      var fw = Math.max(44, L / frames.length);
      frames.forEach(function (f) { f.style.offsetPath = 'path("' + d + '")'; f.style.setProperty('--fw', fw + 'px'); });
    };
    build();
    engine(box, function (t, moving) {
      var shift = moving ? t * 0.012 + window.scrollY * 0.00025 : 0;
      for (var i = 0; i < frames.length; i++) {
        var k = ((i / frames.length + shift) % 1 + 1) % 1;
        frames[i].style.offsetDistance = (k * 100).toFixed(3) + '%';
      }
    }, build);
  }

  var map = { dust: dust, helix: helix, branches: branches, tunnel: tunnel, ribbon: ribbon };
  var go = function () { document.querySelectorAll('[data-fx]').forEach(function (el) { var f = map[el.getAttribute('data-fx')]; if (f) { try { f(el); } catch (e) { /* אפקט שנכשל לא שובר את העמוד */ } } }); };
  if (!('IntersectionObserver' in window)) return;
  document.fonts && document.fonts.ready ? document.fonts.ready.then(go) : go();
})();
