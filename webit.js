/* WEBIT Motion System v1: התנהגויות קטנות, בלי ספריות (בערך 2KB מכווץ).
   data-reveal        נכנס כשנראה במסך (מוסיף is-in). --i על הילד קובע השהיה.
   data-scene         סצנה נעוצה: כותב --p (0 עד 1) לפי הגלילה בתוך הסקשן.
   data-progress      אותו דבר לכל אלמנט (למשל החוט): --p לפי מעבר האלמנט במסך.
   data-cta-bar       פס הפעולה במובייל. מוסתר בפתיח ובאזור [data-cta-hide].
   data-video         כפתור שמחליף את עצמו בסרטון רק אחרי לחיצה (אפס משקל לפני כן).
   data-wa            קישור וואטסאפ: data-wa="9725XXXXXXXX" data-wa-text="שלום..."
   data-motion-toggle כפתור עצירת תנועה. שומר את הבחירה, ומודיע לאפקטים באירוע wm:motion */
(function () {
  var root = document.documentElement;
  root.classList.add('wm-js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0. מצב תנועה: כבוי אם המשתמש ביקש פחות תנועה במערכת, או עצר בכפתור
  var saved = null;
  try { saved = localStorage.getItem('wm-motion'); } catch (e) { /* אחסון חסום */ }
  var motion = saved ? saved === 'on' : !reduce;
  var toggles = document.querySelectorAll('[data-motion-toggle]');
  var setMotion = function (on, remember) {
    motion = on;
    root.classList.toggle('motion-off', !on);
    toggles.forEach(function (b) {
      b.setAttribute('aria-pressed', String(!on));
      b.textContent = on ? 'עצירת תנועה' : 'הפעלת תנועה';
    });
    if (remember) { try { localStorage.setItem('wm-motion', on ? 'on' : 'off'); } catch (e) { /* לא חובה */ } }
    document.dispatchEvent(new CustomEvent('wm:motion', { detail: { on: on } }));
  };
  toggles.forEach(function (b) { b.addEventListener('click', function () { setMotion(!motion, true); }); });
  setMotion(motion, false);
  window.WM = { motion: function () { return motion; } };
  reduce = !motion;

  // 1. כניסה בגלילה
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // 2. התקדמות גלילה: סצנות נעוצות וחוטים
  var tracked = [].slice.call(document.querySelectorAll('[data-scene],[data-progress]'));
  if (tracked.length && !reduce) {
    var visible = new Set();
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      tick();
    });
    tracked.forEach(function (el) { vio.observe(el); });
    var ticking = false;
    var update = function () {
      ticking = false;
      if (!motion) { tracked.forEach(function (el) { el.style.setProperty('--p', '1'); }); return; }
      var vh = window.innerHeight;
      visible.forEach(function (el) {
        var r = el.getBoundingClientRect(), p;
        if (el.hasAttribute('data-scene')) {
          p = -r.top / Math.max(1, r.height - vh);          // 0 כשהסצנה נכנסת, 1 כשהיא משתחררת
        } else {
          p = (vh * 0.75 - r.top) / Math.max(1, r.height);  // הקו "מגיע" לנקודה שברבע התחתון של המסך
        }
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
      });
    };
    var tick = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    document.addEventListener('wm:motion', function () { revealEls.forEach(function (el) { el.classList.add('is-in'); }); tick(); });
    tick();
  } else {
    tracked.forEach(function (el) { el.style.setProperty('--p', '1'); });
  }

  // 3. פס פעולה במובייל
  var bar = document.querySelector('[data-cta-bar]');
  if (bar && 'IntersectionObserver' in window) {
    var hideZones = document.querySelectorAll('[data-cta-hide]');
    var inZone = new Set();
    bar.setAttribute('data-hidden', 'true');
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? inZone.add(e.target) : inZone.delete(e.target); });
      var hidden = inZone.size > 0;
      bar.setAttribute('data-hidden', String(hidden));
      bar.inert = hidden;
    });
    hideZones.forEach(function (z) { bio.observe(z); });
  }

  // 4. סרטון רק אחרי לחיצה
  document.querySelectorAll('[data-video]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = document.createElement('video');
      v.src = btn.getAttribute('data-video');
      v.controls = true; v.playsInline = true; v.autoplay = true;
      v.setAttribute('aria-label', btn.getAttribute('aria-label') || '');
      btn.replaceWith(v);
      v.focus();
    });
  });

  // 5. קישורי וואטסאפ
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    var num = (a.getAttribute('data-wa') || '').replace(/\D/g, '');
    var text = a.getAttribute('data-wa-text') || '';
    a.href = 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : '');
    a.target = '_blank';
    a.rel = 'noopener';
  });
})();
