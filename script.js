// אתר דוגמה: שום דבר לא נשלח לשרת, ושום דבר לא נשמר בדפדפן.
const root = document.documentElement;
root.classList.add('js');

// חלון "כאן נפתח וואטסאפ" (באתר הדוגמה אין מספר אמיתי)
const dialog = document.getElementById('wa-dialog');
document.querySelectorAll('.js-whatsapp').forEach((button) => {
  button.addEventListener('click', () => dialog.showModal());
});

// ===== לוח שיעורים: לשוניות של ימים בטלפון =====
const tabs = [...document.querySelectorAll('[role="tab"]')];
const tablist = document.querySelector('.tabs');
tablist.hidden = false;

function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).classList.toggle('is-active', on);
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab, false));
  tab.addEventListener('keydown', (e) => {
    // ב-RTL החץ שמאלה מתקדם ליום הבא
    const step = { ArrowLeft: 1, ArrowRight: -1 }[e.key];
    if (step) { e.preventDefault(); selectTab(tabs[(i + step + tabs.length) % tabs.length], true); }
    if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
    if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
  });
});
// בטלפון נפתח היום של היום (שבת מציגה את ראשון)
const today = new Date().getDay();
if (today < 6) selectTab(tabs[today], false);

// ===== בחירת שיעור מהלוח ממלאת את הטופס =====
const form = document.getElementById('book-form');
const select = form.elements.slot;
document.querySelectorAll('.slot').forEach((slot) => {
  slot.addEventListener('click', () => {
    const label = slot.dataset.class + ', ' + slot.dataset.when;
    let option = [...select.options].find((o) => o.value === label);
    if (!option) {
      option = new Option(label, label);
      select.add(option, 1);
    }
    select.value = label;
  });
});

// ===== הטופס והדגמת האוטומציה =====
const error = document.getElementById('form-error');
const flow = document.getElementById('flow');
form.querySelector('[type=submit]').disabled = false;

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = form.elements;
  if (fields.company.value) return; // מלכודת לספאם
  const missing = [];
  if (!fields.name.value.trim()) missing.push('שם');
  if (!fields.phone.value.trim()) missing.push('טלפון');
  if (!fields.consent.checked) missing.push('הסכמה לשימוש בפרטים');

  if (missing.length) {
    error.textContent = 'חסר: ' + missing.join(', ') + '.';
    error.hidden = false;
    return;
  }

  error.hidden = true;
  flow.querySelector('.js-name').textContent = fields.name.value.trim().split(/\s+/)[0];
  flow.querySelector('.js-class').textContent = select.value ? ' (' + select.value + ')' : '';
  form.reset();
  form.hidden = true;
  flow.hidden = false;
  flow.focus();
});

document.getElementById('flow-reset').addEventListener('click', () => {
  flow.hidden = true;
  form.hidden = false;
  form.elements.slot.focus();
});

// ===== תנועה =====
// כבויה מראש למי שביקש "הפחתת תנועה" במכשיר, ואפשר לעצור אותה בכפתור.
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.getElementById('motion-toggle');
const toggleLabel = toggle.querySelector('.motion-label');

function setMotion(on) {
  root.classList.toggle('motion-off', !on);
  toggle.setAttribute('aria-pressed', String(!on));
  toggleLabel.textContent = on ? 'עצירת תנועה' : 'הפעלת תנועה';
}
toggle.hidden = false;
toggle.addEventListener('click', () => setMotion(root.classList.contains('motion-off')));
reduceQuery.addEventListener('change', (e) => setMotion(!e.matches));
setMotion(!reduceQuery.matches);

// חלקים נכנסים בדהייה איטית. מה שכבר על המסך בטעינה מוצג מיד.
const revealItems = [...document.querySelectorAll('[data-reveal]')];
revealItems.forEach((el) => {
  if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
});
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  revealItems.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
  root.classList.add('reveal-ready');
}
