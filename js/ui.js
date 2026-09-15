/* ==========================================================================
   ui.js — القطع التفاعلية المشتركة: الأوراق، التنبيهات، المظهر، البحث
   ========================================================================== */
window.UI = (function () {
  const { $, $$, esc } = U;

  /* ------------------------------ التنبيهات ------------------------------ */
  function toast(message, kind = 'ok') {
    const host = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    const icon = kind === 'bad' ? 'alert' : kind === 'info' ? 'info' : 'check';
    el.innerHTML = `<i data-i="${icon}"></i><span>${esc(message)}</span>`;
    host.appendChild(el);
    Icons.paint(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }

  /* ------------------------------ قفل التمرير ------------------------------ */
  let scrollLock = 0;
  function lock() {
    if (scrollLock++ === 0) document.body.style.overflow = 'hidden';
  }
  function unlock() {
    scrollLock = Math.max(0, scrollLock - 1);
    if (scrollLock === 0) document.body.style.overflow = '';
  }

  /* ------------------------------ الورقة ------------------------------ */
  let sheetState = null;

  /**
   * يفتح ورقة منزلقة (bottom sheet على الهاتف، نافذة في المنتصف على الشاشات الكبيرة)
   * @param {{title:string, body:string, foot?:string, onMount?:Function, onClose?:Function}} opts
   */
  function sheet(opts) {
    const layer = $('#sheet-layer');
    $('#sheet-title').textContent = opts.title || '';
    const body = $('#sheet-body');
    body.innerHTML = opts.body || '';
    const foot = $('#sheet-foot');
    if (opts.foot) { foot.innerHTML = opts.foot; foot.hidden = false; }
    else { foot.innerHTML = ''; foot.hidden = true; }

    Icons.paint(layer);
    if (layer.hidden) { layer.hidden = false; lock(); }
    body.scrollTop = 0;
    sheetState = opts;
    if (typeof opts.onMount === 'function') opts.onMount(body, foot);

    const firstField = body.querySelector('input, select, textarea');
    if (firstField && window.matchMedia('(min-width: 720px)').matches) firstField.focus();
    return { body, foot, close: closeSheet };
  }

  function closeSheet() {
    const layer = $('#sheet-layer');
    if (layer.hidden) return;
    layer.hidden = true;
    unlock();
    const st = sheetState; sheetState = null;
    if (st && typeof st.onClose === 'function') st.onClose();
  }

  /** تأكيد بنعم/لا، يرجع Promise */
  function confirm(opts) {
    return new Promise(resolve => {
      let settled = false;
      const done = v => { if (!settled) { settled = true; resolve(v); } };

      sheet({
        title: opts.title || 'تأكيد',
        body: `<p class="muted">${esc(opts.body || '')}</p>`,
        foot: `
          <button class="btn btn-quiet" data-confirm="no">${esc(opts.cancelText || 'رجوع')}</button>
          <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-confirm="yes">${esc(opts.okText || 'تأكيد')}</button>`,
        onMount(body, foot) {
          foot.querySelector('[data-confirm="yes"]').addEventListener('click', () => { done(true); closeSheet(); });
          foot.querySelector('[data-confirm="no"]').addEventListener('click', () => { done(false); closeSheet(); });
        },
        onClose() { done(false); }
      });
    });
  }

  /* ------------------------------ المظهر ------------------------------ */
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const theme = {
    resolve(value) {
      const v = value || Store.prefs.theme || 'auto';
      return v === 'auto' ? (media.matches ? 'dark' : 'light') : v;
    },
    apply() {
      const root = document.documentElement;
      const resolved = theme.resolve();
      root.dataset.theme = resolved;
      root.dataset.accent = Store.prefs.accent || 'pearl';
      root.dataset.density = Store.prefs.density || 'cozy';

      $$('[data-act="theme"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.themeVal === (Store.prefs.theme || 'auto'))));

      const icon = $('[data-theme-icon]');
      if (icon) {
        const name = Store.prefs.theme === 'auto' ? 'monitor' : resolved === 'dark' ? 'moon' : 'sun';
        icon.dataset.i = name;
        delete icon.dataset.painted;
        Icons.paint(icon.parentElement);
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#141210' : '#faf5ea');
    },
    set(value) { Store.setPrefs({ theme: value }); theme.apply(); },
    cycle() {
      const now = Store.prefs.theme || 'auto';
      const resolved = theme.resolve();
      // من "تلقائي" ننتقل لعكس المظهر الحالي حتى يحس المستخدم بالتغيير
      const next = now === 'auto' ? (resolved === 'dark' ? 'light' : 'dark')
                 : now === 'light' ? 'dark' : 'auto';
      theme.set(next);
      toast(next === 'auto' ? 'حسب إعداد الجهاز' : next === 'dark' ? 'المظهر الداكن' : 'المظهر الفاتح', 'info');
    }
  };
  media.addEventListener('change', () => { if ((Store.prefs.theme || 'auto') === 'auto') theme.apply(); });

  /* ------------------------------ البحث ------------------------------ */
  let hits = [];
  let cursor = 0;

  function buildIndex() {
    const out = [];
    const KIND = { lecture: 'محاضرة', lab: 'مختبر', tutorial: 'تمارين', online: 'عن بُعد' };
    const EX = { final: 'نهائي', midterm: 'منتصف الفصل', quiz: 'كويز' };

    out.push(
      { icon: 'home', group: 'التنقل', title: 'الرئيسية', sub: 'نظرة اليوم', href: '#/home' },
      { icon: 'calendar', group: 'التنقل', title: 'الجدول', sub: 'الأسبوع واليوم', href: '#/schedule' },
      { icon: 'clipboard', group: 'التنقل', title: 'الاختبارات', sub: 'القادم والنهائيات', href: '#/exams' },
      { icon: 'library', group: 'التنقل', title: 'المقررات', sub: 'الفصول والغياب والروابط', href: '#/courses' },
      { icon: 'settings', group: 'التنقل', title: 'الإعدادات', sub: 'المظهر والنسخ الاحتياطي', href: '#/settings' }
    );

    Store.courses().forEach(c => {
      out.push({
        icon: 'book', group: 'المقررات', color: c.color,
        title: `${c.code}${c.section ? ' · شعبة ' + c.section : ''}`,
        sub: c.title || c.instructor || '',
        href: `#/courses?focus=course:${c.id}`
      });
      c.sessions.forEach(s => out.push({
        icon: s.kind === 'lab' ? 'flask' : 'clock', group: 'المحاضرات', color: c.color,
        title: `${c.code} — ${U.DAY_FULL[s.day]}`,
        sub: `${KIND[s.kind] || ''} ${U.spanText(s.start, s.end)}${s.room ? ' · ' + s.room : ''}`,
        href: `#/schedule?focus=session:${s.id}`
      }));
      c.exams.forEach(x => out.push({
        icon: 'clipboard', group: 'الاختبارات', color: c.color,
        title: `${EX[x.kind] || 'اختبار'} — ${c.code}`,
        sub: x.date ? `${U.fmtLong(x.date)} · ${U.time12(x.start)}` : 'بدون تاريخ',
        href: `#/exams?focus=exam:${x.id}`
      }));
      c.chapters.forEach(ch => out.push({
        icon: 'note', group: 'الفصول', color: c.color,
        title: ch.title, sub: c.code,
        href: `#/courses?focus=course:${c.id}`
      }));
      c.links.forEach(l => out.push({
        icon: 'link', group: 'الروابط', color: c.color,
        title: l.label, sub: c.code, url: l.url
      }));
    });
    return out;
  }

  function renderHits(query) {
    const box = $('#finder-results');
    const q = query.trim().toLowerCase();
    const index = buildIndex();
    hits = (q ? index.filter(h => (h.title + ' ' + h.sub + ' ' + h.group).toLowerCase().includes(q)) : index).slice(0, 40);
    cursor = 0;

    if (!hits.length) {
      box.innerHTML = `<div class="empty"><h3>ما فيه نتيجة</h3><p>جرّب رمز المقرر أو اسم القاعة.</p></div>`;
      return;
    }
    const groups = {};
    hits.forEach((h, i) => { (groups[h.group] ||= []).push({ h, i }); });

    box.innerHTML = Object.entries(groups).map(([name, items]) => `
      <div class="finder-group">${esc(name)}</div>
      ${items.map(({ h, i }) => `
        <button class="hit${i === 0 ? ' sel' : ''}" data-hit="${i}">
          <span class="hit-mark" ${h.color ? `style="color:${esc(h.color)};background:color-mix(in srgb, ${esc(h.color)} 14%, transparent)"` : ''}><i data-i="${h.icon}"></i></span>
          <span class="truncate"><b class="truncate">${esc(h.title)}</b><small class="truncate">${esc(h.sub)}</small></span>
        </button>`).join('')}
    `).join('');
    Icons.paint(box);
  }

  function openFinder() {
    const layer = $('#search-layer');
    if (!layer.hidden) return;
    layer.hidden = false; lock();
    const input = $('#finder-input');
    input.value = '';
    renderHits('');
    setTimeout(() => input.focus(), 60);
  }
  function closeFinder() {
    const layer = $('#search-layer');
    if (layer.hidden) return;
    layer.hidden = true; unlock();
  }
  function moveCursor(step) {
    const items = $$('#finder-results .hit');
    if (!items.length) return;
    let idx = items.findIndex(el => el.classList.contains('sel'));
    idx = U.clamp(idx + step, 0, items.length - 1);
    items.forEach(el => el.classList.remove('sel'));
    items[idx].classList.add('sel');
    items[idx].scrollIntoView({ block: 'nearest' });
    cursor = +items[idx].dataset.hit;
  }
  function openHit(i) {
    const h = hits[i];
    if (!h) return;
    closeFinder();
    if (h.url) window.open(h.url, '_blank', 'noopener');
    else if (h.href) location.hash = h.href;
  }

  /* ------------------------ تمييز العنصر بعد رابط عميق ------------------------ */
  function flash(selector) {
    const el = typeof selector === 'string' ? $(selector) : selector;
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 2400);
    return true;
  }

  function anyLayerOpen() {
    return !$('#sheet-layer').hidden || !$('#search-layer').hidden;
  }

  return {
    toast, sheet, closeSheet, confirm, theme,
    openFinder, closeFinder, renderHits, moveCursor, openHit,
    flash, anyLayerOpen, lock, unlock
  };
})();
