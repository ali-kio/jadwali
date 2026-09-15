/* ==========================================================================
   utils.js — أدوات صغيرة يستخدمها كل الملفات
   ========================================================================== */
window.U = (function () {

  /* ------------------------------- DOM ------------------------------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const attr = s => esc(s).replace(/`/g, '&#96;');

  const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const pad = n => String(n).padStart(2, '0');

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function debounce(fn, ms = 200) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ------------------------------- الأيام ------------------------------- */
  // 0 = الأحد … 6 = السبت (نفس ترقيم JS)
  const DAY_FULL  = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAY_SHORT = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  // رموز جامعة البحرين
  const DAY_CODE  = ['U', 'M', 'T', 'W', 'H', 'F', 'S'];

  /* ------------------------------- الوقت ------------------------------- */
  const toMin = t => {
    if (typeof t === 'number') return t;
    const m = String(t || '').match(/(\d{1,2}):(\d{2})/);
    return m ? (+m[1]) * 60 + (+m[2]) : 0;
  };
  const toHHMM = m => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m) % 60)}`;

  /** 13:00 → "1:00 م" */
  function time12(t) {
    const m = toMin(t), h = Math.floor(m / 60);
    const suffix = h >= 12 ? 'م' : 'ص';
    return `${(h % 12) || 12}:${pad(m % 60)} ${suffix}`;
  }
  const spanText = (a, b) => `${time12(a)} – ${time12(b)}`;
  const lengthOf  = (a, b) => toMin(b) - toMin(a);

  function durationText(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return `${h} ساعة و${m} دقيقة`;
    if (h) return h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : `${h} ساعات`;
    return `${m} دقيقة`;
  }

  const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

  /* ------------------------------ التواريخ ------------------------------ */
  const isoOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = iso => new Date(`${iso}T00:00:00`);
  const stamp = (iso, time) => new Date(`${iso}T${(time || '00:00')}:00`).getTime();

  const AR = 'ar-BH-u-nu-latn';
  const fmtLong  = iso => safeFmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = iso => safeFmt(iso, { day: 'numeric', month: 'short' });
  const fmtFull  = iso => safeFmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function safeFmt(iso, opts) {
    try { return new Intl.DateTimeFormat(AR, opts).format(dateOf(iso)); }
    catch (_) { return iso; }
  }

  function daysBetween(iso) {
    const a = dateOf(isoOf());
    const b = dateOf(iso);
    return Math.round((b - a) / 86400000);
  }

  /** فرق زمني مفصّل حتى لحظة معينة */
  function until(ms) {
    let left = Math.max(0, ms - Date.now());
    const d = Math.floor(left / 864e5); left -= d * 864e5;
    const h = Math.floor(left / 36e5); left -= h * 36e5;
    const m = Math.floor(left / 6e4);  left -= m * 6e4;
    return { d, h, m, s: Math.floor(left / 1000), over: ms - Date.now() <= 0 };
  }

  /** "بعد 3 أيام" / "بعد ساعتين" / "الآن" */
  function relative(ms) {
    const t = until(ms);
    if (t.over) return 'انتهى';
    if (t.d > 1) return `بعد ${t.d} أيام`;
    if (t.d === 1) return 'غداً';
    if (t.h > 2) return `بعد ${t.h} ساعات`;
    if (t.h >= 1) return t.h === 1 ? 'بعد ساعة' : 'بعد ساعتين';
    if (t.m > 1) return `بعد ${t.m} دقيقة`;
    return 'الآن';
  }

  /** الأرقام العربية الهندية → لاتينية (لتحليل النصوص الملصوقة) */
  function latinDigits(s) {
    return String(s || '')
      .replace(/[\u0660-\u0669]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48))
      .replace(/[\u06F0-\u06F9]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48));
  }

  /* ------------------------------ متنوعات ------------------------------ */
  function download(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  /** ألوان المقررات — متوازنة على الفاتح والداكن */
  const PALETTE = [
    '#2f7382', '#4d7a45', '#b07514', '#a2573a', '#77497c',
    '#39598f', '#a44d63', '#3f7d6a', '#8a6d2f', '#6b5ba8',
    '#9c4f4f', '#2c6b8f'
  ];
  const pickColor = i => PALETTE[i % PALETTE.length];

  return {
    $, $$, esc, attr, uid, pad, clamp, debounce,
    DAY_FULL, DAY_SHORT, DAY_CODE,
    toMin, toHHMM, time12, spanText, lengthOf, durationText, nowMin,
    isoOf, dateOf, stamp, fmtLong, fmtShort, fmtFull, daysBetween, until, relative,
    latinDigits, download, copy, PALETTE, pickColor
  };
})();
