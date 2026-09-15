/* ============================================================
   app.js — Campus OS
   SPA · Deep-linking · Schedule engine · LocalStorage · PWA
   ============================================================ */
'use strict';

/* ---------- 1. أدوات مساعدة ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const pad = n => String(n).padStart(2, '0');
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const DAYS_SHORT = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const WORK_DAYS = [0, 1, 2, 3, 4];               // الأحد → الخميس
const GRID_START = 8 * 60, GRID_END = 18 * 60;   // 08:00 → 18:00
const PX_PER_MIN = 0.9;

const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const toHHMM = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const fmt12 = t => { const m = toMin(t); const h = Math.floor(m / 60); const s = h >= 12 ? 'م' : 'ص';
  return `${((h % 12) || 12)}:${pad(m % 60)} ${s}`; };
const todayISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n, base = new Date()) => { const d = new Date(base); d.setDate(d.getDate() + n); return todayISO(d); };
const examDate = e => new Date(`${e.date}T${e.start}:00`);
const fmtDateAr = iso => new Intl.DateTimeFormat('ar-BH-u-nu-latn', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date(`${iso}T12:00:00`));
const fmtDateShort = iso => new Intl.DateTimeFormat('ar-BH-u-nu-latn', { day:'numeric', month:'short' }).format(new Date(`${iso}T12:00:00`));
const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

const EXAM_LABEL = { quiz:'كويز', midterm:'منتصف الفصل', final:'نهائي' };
const SESSION_LABEL = { lecture:'محاضرة', lab:'مختبر', online:'عن بُعد', tutorial:'تمارين' };
const RES_ICON = { drive:'hard-drive', telegram:'send', slides:'presentation', book:'book-open', video:'play-circle', link:'link' };

/* ---------- 2. البيانات الافتراضية (جدول علي الفعلي) ---------- */
function defaultData() {
  const ch = (cid, list) => list.map((t, i) => ({ id: `${cid}-ch${i + 1}`, no: i + 1, title: t, done: false }));

  const courses = [
    {
      id:'ITCS106', name:'برمجة الحاسوب I', en:'Computer Programming I', instructor:'قسم علوم الحاسوب',
      credits:3, color:'#8b7bff', absences:0, maxAbsences:9, campus:'السخير',
      resources:[
        { id:uid('r'), label:'ملفات Drive', type:'drive', url:'https://drive.google.com/' },
        { id:uid('r'), label:'قروب تيليجرام', type:'telegram', url:'https://telegram.org/' },
        { id:uid('r'), label:'سلايدات المحاضرات', type:'slides', url:'https://drive.google.com/' },
        { id:uid('r'), label:'تمارين Java', type:'link', url:'https://dev.java/learn/' }
      ],
      chapters: ch('ITCS106', [
        'مقدمة إلى الحاسوب والبرمجة','أساسيات Java والمتغيرات','المدخلات والمخرجات',
        'العبارات الشرطية (if / switch)','الحلقات التكرارية (loops)','الدوال (Methods)',
        'المصفوفات (Arrays)','النصوص (Strings)','مقدمة إلى البرمجة الكائنية'
      ])
    },
    {
      id:'MATHS101', name:'التفاضل والتكامل I', en:'Calculus I', instructor:'قسم الرياضيات',
      credits:3, color:'#38e0c8', absences:0, maxAbsences:9, campus:'السخير',
      resources:[
        { id:uid('r'), label:'ملفات Drive', type:'drive', url:'https://drive.google.com/' },
        { id:uid('r'), label:'قروب تيليجرام', type:'telegram', url:'https://telegram.org/' },
        { id:uid('r'), label:'شروحات فيديو', type:'video', url:'https://www.khanacademy.org/math/calculus-1' }
      ],
      chapters: ch('MATHS101', [
        'الدوال والنماذج','النهايات والاتصال','تعريف المشتقة','قواعد الاشتقاق',
        'تطبيقات الاشتقاق','التكامل غير المحدد','التكامل المحدد وتطبيقاته'
      ])
    },
    {
      id:'PHYCS101', name:'الفيزياء العامة I', en:'General Physics I', instructor:'قسم الفيزياء',
      credits:3, color:'#f5a524', absences:0, maxAbsences:9, campus:'السخير',
      resources:[
        { id:uid('r'), label:'ملفات Drive', type:'drive', url:'https://drive.google.com/' },
        { id:uid('r'), label:'دليل المختبر', type:'book', url:'https://drive.google.com/' },
        { id:uid('r'), label:'قروب تيليجرام', type:'telegram', url:'https://telegram.org/' }
      ],
      chapters: ch('PHYCS101', [
        'القياس والوحدات','الحركة في بعد واحد','المتجهات','الحركة في بعدين',
        'قوانين نيوتن للحركة','الشغل والطاقة','الزخم والتصادمات','الحركة الدورانية'
      ])
    },
    {
      id:'HRLC107', name:'حقوق الإنسان', en:'Human Rights', instructor:'كلية الحقوق',
      credits:2, color:'#fb7185', absences:0, maxAbsences:6, campus:'عن بُعد',
      resources:[
        { id:uid('r'), label:'ملفات Drive', type:'drive', url:'https://drive.google.com/' },
        { id:uid('r'), label:'رابط المحاضرة', type:'video', url:'https://teams.microsoft.com/' }
      ],
      chapters: ch('HRLC107', [
        'مفهوم حقوق الإنسان','التطور التاريخي لحقوق الإنسان','المواثيق الدولية',
        'الحقوق المدنية والسياسية','الحقوق الاقتصادية والاجتماعية','آليات الحماية الدولية',
        'حقوق الإنسان في مملكة البحرين'
      ])
    }
  ];

  const S = (courseId, day, start, end, room, type) => ({ id: uid('s'), courseId, day, start, end, room, type });
  const sessions = [
    // ITCS106 — محاضرة أحد/ثلاثاء/خميس 10:00-10:50 + مختبر إثنين 11:00-12:40
    S('ITCS106', 0, '10:00', '10:50', 'S40-1023', 'lecture'),
    S('ITCS106', 2, '10:00', '10:50', 'S40-1023', 'lecture'),
    S('ITCS106', 4, '10:00', '10:50', 'S40-1023', 'lecture'),
    S('ITCS106', 1, '11:00', '12:40', 'S40-2011 (مختبر)', 'lab'),
    // PHYCS101 — محاضرة أحد/ثلاثاء/خميس 13:00-13:50 + مختبر أحد 14:00-15:40
    S('PHYCS101', 0, '13:00', '13:50', 'S21-1015', 'lecture'),
    S('PHYCS101', 2, '13:00', '13:50', 'S21-1015', 'lecture'),
    S('PHYCS101', 4, '13:00', '13:50', 'S21-1015', 'lecture'),
    S('PHYCS101', 0, '14:00', '15:40', 'S21-2004 (مختبر)', 'lab'),
    // MATHS101 — أحد/ثلاثاء/خميس 16:00-16:50
    S('MATHS101', 0, '16:00', '16:50', 'S21-1030', 'lecture'),
    S('MATHS101', 2, '16:00', '16:50', 'S21-1030', 'lecture'),
    S('MATHS101', 4, '16:00', '16:50', 'S21-1030', 'lecture'),
    // HRLC107 — ثلاثاء 08:00-09:40 عن بُعد
    S('HRLC107', 2, '08:00', '09:40', 'عن بُعد', 'online')
  ];

  const exams = [
    // اختبارات فصلية (ديناميكية نسبةً لليوم)
    { id:uid('x'), courseId:'ITCS106',  type:'quiz',    date:addDays(4),  start:'10:00', end:'10:50', room:'S40-1023',
      chapters:['ITCS106-ch1','ITCS106-ch2','ITCS106-ch3'] },
    { id:uid('x'), courseId:'PHYCS101', type:'quiz',    date:addDays(8),  start:'13:00', end:'13:50', room:'S21-1015',
      chapters:['PHYCS101-ch1','PHYCS101-ch2'] },
    { id:uid('x'), courseId:'MATHS101', type:'midterm', date:addDays(14), start:'16:00', end:'17:30', room:'S21-1030',
      chapters:['MATHS101-ch1','MATHS101-ch2','MATHS101-ch3','MATHS101-ch4'] },
    { id:uid('x'), courseId:'ITCS106',  type:'midterm', date:addDays(21), start:'10:00', end:'11:30', room:'S40-1023',
      chapters:['ITCS106-ch1','ITCS106-ch2','ITCS106-ch3','ITCS106-ch4','ITCS106-ch5'] },
    { id:uid('x'), courseId:'PHYCS101', type:'midterm', date:addDays(27), start:'13:00', end:'14:30', room:'S21-1015',
      chapters:['PHYCS101-ch1','PHYCS101-ch2','PHYCS101-ch3','PHYCS101-ch4'] },
    { id:uid('x'), courseId:'HRLC107',  type:'midterm', date:addDays(33), start:'08:00', end:'09:30', room:'عن بُعد',
      chapters:['HRLC107-ch1','HRLC107-ch2','HRLC107-ch3'] },
    // النهائيات الرسمية
    { id:uid('x'), courseId:'MATHS101', type:'final', date:'2027-01-03', start:'11:00', end:'13:00', room:'قاعة الامتحانات — السخير',
      chapters:['MATHS101-ch1','MATHS101-ch2','MATHS101-ch3','MATHS101-ch4','MATHS101-ch5','MATHS101-ch6','MATHS101-ch7'] },
    { id:uid('x'), courseId:'PHYCS101', type:'final', date:'2027-01-04', start:'11:00', end:'13:00', room:'قاعة الامتحانات — السخير',
      chapters:['PHYCS101-ch1','PHYCS101-ch2','PHYCS101-ch3','PHYCS101-ch4','PHYCS101-ch5','PHYCS101-ch6','PHYCS101-ch7','PHYCS101-ch8'] },
    { id:uid('x'), courseId:'ITCS106', type:'final', date:'2027-01-05', start:'11:00', end:'13:00', room:'قاعة الامتحانات — السخير',
      chapters:['ITCS106-ch1','ITCS106-ch2','ITCS106-ch3','ITCS106-ch4','ITCS106-ch5','ITCS106-ch6','ITCS106-ch7','ITCS106-ch8','ITCS106-ch9'] },
    { id:uid('x'), courseId:'HRLC107', type:'final', date:'2027-01-06', start:'11:00', end:'13:00', room:'عن بُعد',
      chapters:['HRLC107-ch1','HRLC107-ch2','HRLC107-ch3','HRLC107-ch4','HRLC107-ch5','HRLC107-ch6','HRLC107-ch7'] }
  ];

  return {
    version: 1,
    profile: {
      name: 'علي',
      university: 'جامعة البحرين',
      major: 'هندسة البرمجيات',
      level: 'السنة الأولى',
      semester: 'الفصل الأول 2026/2027',
      campus: 'السخير'
    },
    settings: { warnPercent: 60, dnPercent: 100, accent: 'violet', scheduleView: 'grid' },
    courses, sessions, exams,
    notes: [
      { id: uid('n'), courseId: 'ITCS106', title: 'أفكار سريعة', body: 'مراجعة الحلقات + حل تمارين الفصل الخامس قبل الكويز.', updatedAt: Date.now() }
    ]
  };
}

/* ---------- 3. الحالة والتخزين ---------- */
const KEY = 'campus_os_v1';
let state = load();
let route = { view: 'home', params: {} };
let ui = { sched: state.settings.scheduleView || 'grid', day: currentDayIndex(), examFilter: 'all', openCourses: new Set(), searchIdx: 0, searchHits: [] };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.courses)) return defaultData();
    const base = defaultData();
    return { ...base, ...parsed, profile: { ...base.profile, ...(parsed.profile || {}) }, settings: { ...base.settings, ...(parsed.settings || {}) } };
  } catch (err) { console.warn('تعذر تحميل البيانات، تم استخدام الافتراضي', err); return defaultData(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (err) { toast('تعذّر الحفظ محلياً', 'err'); console.error(err); }
}
function currentDayIndex() { const d = new Date().getDay(); return WORK_DAYS.includes(d) ? d : 0; }

/* ---------- 4. منطق أكاديمي ---------- */
const course = id => state.courses.find(c => c.id === id) || { id, name: 'غير معروف', color: '#8b7bff', chapters: [], resources: [] };
const chapterById = id => { for (const c of state.courses) { const ch = c.chapters.find(x => x.id === id); if (ch) return { ch, c }; } return null; };
const sessionsOf = day => state.sessions.filter(s => s.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));
const upcomingExams = () => state.exams.filter(e => examDate(e).getTime() > Date.now()).sort((a, b) => examDate(a) - examDate(b));
const pastExams = () => state.exams.filter(e => examDate(e).getTime() <= Date.now()).sort((a, b) => examDate(b) - examDate(a));
const nextExam = () => upcomingExams()[0] || null;

function coverage(c) {
  if (!c.chapters.length) return 0;
  return Math.round((c.chapters.filter(x => x.done).length / c.chapters.length) * 100);
}
function overallCoverage() {
  const all = state.courses.flatMap(c => c.chapters);
  if (!all.length) return 0;
  return Math.round((all.filter(x => x.done).length / all.length) * 100);
}
function absenceStatus(c) {
  const ratio = c.maxAbsences ? (c.absences / c.maxAbsences) * 100 : 0;
  if (ratio >= state.settings.dnPercent) return { level: 'danger', label: 'إنذار DN', ratio };
  if (ratio >= state.settings.warnPercent) return { level: 'warn', label: 'قريب من الحد', ratio };
  return { level: 'ok', label: 'ضمن الحد الآمن', ratio };
}
function liveSession(d = new Date()) {
  const m = nowMin(d), day = d.getDay();
  return state.sessions.find(s => s.day === day && toMin(s.start) <= m && m < toMin(s.end)) || null;
}
function nextSession(d = new Date()) {
  const m = nowMin(d), day = d.getDay();
  const rest = sessionsOf(day).find(s => toMin(s.start) > m);
  if (rest) return { s: rest, dayOffset: 0 };
  for (let i = 1; i <= 7; i++) {
    const nd = (day + i) % 7;
    const list = sessionsOf(nd);
    if (list.length) return { s: list[0], dayOffset: i };
  }
  return null;
}
function hoursToday() {
  return sessionsOf(new Date().getDay()).reduce((sum, s) => sum + (toMin(s.end) - toMin(s.start)), 0);
}
function diffParts(target) {
  let ms = Math.max(0, new Date(target).getTime() - Date.now());
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5); ms -= h * 36e5;
  const m = Math.floor(ms / 6e4); ms -= m * 6e4;
  return { d, h, m, s: Math.floor(ms / 1000), total: new Date(target).getTime() - Date.now() };
}

/* ---------- 5. التوجيه (Router) + محرك التمييز ---------- */
const VIEWS = { home: renderHome, schedule: renderSchedule, exams: renderExams, vault: renderVault, settings: renderSettings };

function parseHash() {
  const raw = (location.hash || '#/home').replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const view = (path || 'home').split('/')[0];
  const params = {};
  new URLSearchParams(qs || '').forEach((v, k) => { params[k] = v; });
  return { view: VIEWS[view] ? view : 'home', params };
}
function navigate(href) { if (location.hash === href) { render(); } else { location.hash = href; } }
function go(view, focus) { navigate(`#/${view}${focus ? `?focus=${encodeURIComponent(focus)}` : ''}`); }

function render() {
  route = parseHash();
  closeAllOverlays(true);
  const root = $('#view-root');
  root.innerHTML = VIEWS[route.view]();
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === route.view));
  document.title = ({ home:'الرئيسية', schedule:'الجدول', exams:'الاختبارات', vault:'خزنة المقررات', settings:'الإعدادات' })[route.view] + ' · Campus OS';
  icons();
  tick();
  applyFocus(route.params.focus);
  root.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}

/** محرك الروابط العميقة: يمرّر ويبرز العنصر المستهدف */
function applyFocus(focus) {
  if (!focus) return;
  const target = decodeURIComponent(focus);
  // فتح بطاقة المقرر تلقائياً إذا كان الهدف داخلها
  const courseId = target.startsWith('course:') ? target.slice(7)
    : target.startsWith('chapter:') ? target.slice(8).split('-ch')[0] : null;
  if (courseId && route.view === 'vault') {
    ui.openCourses.add(courseId);
    const card = $(`[data-course-card="${CSS.escape(courseId)}"]`);
    if (card) card.classList.add('open');
  }
  requestAnimationFrame(() => {
    const el = $(`[data-focus="${CSS.escape(target)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('focus-flash');
    void el.offsetWidth;
    el.classList.add('focus-flash');
    setTimeout(() => el.classList.remove('focus-flash'), 2600);
  });
}

/* ---------- 6. مكوّنات مشتركة ---------- */
function courseTag(c, extra = '') {
  return `<button class="chip" data-goto="vault" data-focus-id="course:${c.id}" style="border-color:${c.color}55;color:${c.color}">
    <i data-lucide="book-marked"></i>${esc(c.id)}${extra ? ` · ${esc(extra)}` : ''}</button>`;
}
function progressBar(pct, level = '') {
  return `<div class="progress ${level}"><i style="width:${clamp(pct, 0, 100)}%"></i></div>`;
}
function emptyState(icon, title, sub) {
  return `<div class="empty"><i data-lucide="${icon}"></i><b>${esc(title)}</b><span>${esc(sub)}</span></div>`;
}
function cdCells(target, big = true) {
  const p = diffParts(target);
  const cell = (v, l) => big
    ? `<div class="cd-cell"><b>${pad(v)}</b><span>${l}</span></div>`
    : `<div><b>${pad(v)}</b><span>${l}</span></div>`;
  return `<div class="${big ? 'countdown-big' : 'cd-strip'}" data-countdown="${new Date(target).toISOString()}" data-big="${big ? 1 : 0}">
    ${cell(p.d, 'يوم')}${cell(p.h, 'ساعة')}${cell(p.m, 'دقيقة')}${cell(p.s, 'ثانية')}</div>`;
}

/* ---------- 7. العرض: الرئيسية ---------- */
function renderHome() {
  const p = state.profile;
  const h = new Date().getHours();
  const greet = h < 5 ? 'ليلة موفقة' : h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء الخير';
  const live = liveSession();
  const nxt = nextSession();
  const ex = nextExam();
  const cov = overallCoverage();
  const risky = state.courses.filter(c => absenceStatus(c).level !== 'ok');
  const today = sessionsOf(new Date().getDay());
  const m = nowMin();

  /* بانر الحصة */
  let banner;
  if (live) {
    const c = course(live.courseId);
    const pct = ((m - toMin(live.start)) / (toMin(live.end) - toMin(live.start))) * 100;
    banner = `<div class="now-banner live" data-goto="schedule" data-focus-id="class:${live.id}" style="cursor:pointer">
      <span class="pulse-dot"></span>
      <div style="flex:1;min-width:0">
        <p style="font-size:11.5px;color:var(--ok);font-weight:700">جارية الآن · ${esc(SESSION_LABEL[live.type])}</p>
        <h3 style="font-size:18px">${esc(c.name)} <span style="color:${c.color};font-size:13px">${esc(c.id)}</span></h3>
        <p style="font-size:12.5px;color:var(--txt-3)">${esc(live.room)} · ${fmt12(live.start)} — ${fmt12(live.end)} · تبقّى ${toMin(live.end) - m} دقيقة</p>
      </div>
      <div class="now-progress"><i style="width:${pct.toFixed(1)}%"></i></div>
    </div>`;
  } else if (nxt) {
    const c = course(nxt.s.courseId);
    const when = nxt.dayOffset === 0 ? `بعد ${toMin(nxt.s.start) - m} دقيقة` : nxt.dayOffset === 1 ? 'غداً' : DAYS[nxt.s.day];
    banner = `<div class="now-banner" data-goto="schedule" data-focus-id="class:${nxt.s.id}" style="cursor:pointer">
      <i data-lucide="alarm-clock" style="width:22px;height:22px;color:var(--accent)"></i>
      <div style="flex:1;min-width:0">
        <p style="font-size:11.5px;color:var(--txt-3);font-weight:700">المحاضرة القادمة · ${esc(when)}</p>
        <h3 style="font-size:18px">${esc(c.name)} <span style="color:${c.color};font-size:13px">${esc(c.id)}</span></h3>
        <p style="font-size:12.5px;color:var(--txt-3)">${esc(nxt.s.room)} · ${fmt12(nxt.s.start)} — ${fmt12(nxt.s.end)}</p>
      </div>
      <i data-lucide="chevron-left" style="color:var(--txt-3)"></i>
    </div>`;
  } else {
    banner = `<div class="now-banner"><i data-lucide="coffee" style="width:22px;height:22px;color:var(--accent-2)"></i>
      <div><h3 style="font-size:17px">ما في محاضرات قادمة</h3><p style="font-size:12.5px;color:var(--txt-3)">استغل الوقت في المراجعة أو التدريب العملي</p></div></div>`;
  }

  const stat = (ico, color, val, unit, lbl, goto, focus) => `
    <div class="stat" ${goto ? `data-goto="${goto}" ${focus ? `data-focus-id="${focus}"` : ''} style="cursor:pointer"` : ''}>
      <div class="stat-ico" style="background:${color}22;color:${color}"><i data-lucide="${ico}"></i></div>
      <div class="stat-val">${val}${unit ? `<small> ${unit}</small>` : ''}</div>
      <div class="stat-lbl">${lbl}</div>
    </div>`;

  const examBlock = ex ? (() => {
    const c = course(ex.courseId);
    const done = ex.chapters.filter(id => chapterById(id)?.ch.done).length;
    return `<div class="card" style="--c:${c.color}" data-focus="exam:${ex.id}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <span class="exam-type t-${ex.type}">${esc(EXAM_LABEL[ex.type])}</span>
        <h3 style="font-size:17px">${esc(c.name)}</h3>
        <button class="chip" style="margin-inline-start:auto" data-goto="exams" data-focus-id="exam:${ex.id}">التفاصيل <i data-lucide="arrow-left"></i></button>
      </div>
      ${cdCells(examDate(ex))}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;font-size:12.5px;color:var(--txt-3)">
        <span><i data-lucide="calendar" style="width:13px;height:13px;vertical-align:-2px"></i> ${fmtDateAr(ex.date)}</span>
        <span><i data-lucide="clock" style="width:13px;height:13px;vertical-align:-2px"></i> ${fmt12(ex.start)} — ${fmt12(ex.end)}</span>
        <span><i data-lucide="map-pin" style="width:13px;height:13px;vertical-align:-2px"></i> ${esc(ex.room)}</span>
      </div>
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--txt-3);margin-bottom:5px">
          <span>تغطية مقرر الاختبار</span><span class="mono">${done}/${ex.chapters.length}</span></div>
        ${progressBar(ex.chapters.length ? (done / ex.chapters.length) * 100 : 0, done === ex.chapters.length ? 'ok' : 'warn')}
      </div>
    </div>`;
  })() : `<div class="card">${emptyState('party-popper', 'ما في اختبارات قادمة', 'استمتع بالهدوء 👌')}</div>`;

  return `<section class="view">
    <div class="hero">
      <h1>${greet}، <em>${esc(p.name)}</em> 👋</h1>
      <p class="sub">${esc(p.major)} · ${esc(p.level)} · ${esc(p.university)}</p>
      <div class="hero-meta">
        <span class="chip"><i data-lucide="calendar-days"></i>${fmtDateAr(todayISO())}</span>
        <span class="chip"><i data-lucide="graduation-cap"></i>${esc(p.semester)}</span>
        <span class="chip"><i data-lucide="hash"></i>${state.courses.reduce((s, c) => s + c.credits, 0)} ساعة معتمدة</span>
      </div>
    </div>

    <div class="grid g-stats" style="margin-top:16px">
      ${stat('book-marked', '#8b7bff', state.courses.length, 'مقرر', 'المقررات المسجلة', 'vault')}
      ${stat('timer', '#38e0c8', (hoursToday() / 60).toFixed(1), 'ساعة', 'حصص اليوم', 'schedule')}
      ${stat('target', '#34d399', cov, '%', 'تغطية الفصول الكلية', 'vault')}
      ${stat('user-x', risky.length ? '#fb7185' : '#60a5fa', state.courses.reduce((s, c) => s + c.absences, 0), 'غياب', risky.length ? `${risky.length} مقرر بحاجة انتباه` : 'كل الغيابات آمنة', 'vault')}
      ${stat('clipboard-check', '#f5a524', upcomingExams().length, 'اختبار', 'اختبارات قادمة', 'exams')}
    </div>

    <div style="margin-top:16px">${banner}</div>

    ${risky.length ? `<div class="section-title"><i data-lucide="shield-alert"></i> تنبيهات الحضور <span class="count">${risky.length}</span></div>
      <div class="grid" style="gap:9px">${risky.map(c => {
        const st = absenceStatus(c);
        return `<div class="alert alert-${st.level === 'danger' ? 'danger' : 'warn'}" data-goto="vault" data-focus-id="course:${c.id}" style="cursor:pointer">
          <i data-lucide="${st.level === 'danger' ? 'octagon-alert' : 'triangle-alert'}"></i>
          <div style="flex:1"><b>${esc(c.name)} (${esc(c.id)})</b>
            <p style="font-size:12.5px;opacity:.85">${esc(st.label)} — ${c.absences} من ${c.maxAbsences} غياب مسموح (${Math.round(st.ratio)}%)</p></div>
          <i data-lucide="arrow-left" style="opacity:.6"></i></div>`;
      }).join('')}</div>` : ''}

    <div class="grid g-2" style="margin-top:22px">
      <div>
        <div class="section-title"><i data-lucide="list-checks"></i> جدول اليوم — ${DAYS[new Date().getDay()]} <span class="count">${today.length}</span></div>
        ${today.length ? `<div class="today-list">${today.map(s => {
          const c = course(s.courseId);
          const isNow = toMin(s.start) <= m && m < toMin(s.end);
          const isPast = toMin(s.end) <= m;
          return `<div class="today-row ${isNow ? 'now' : ''} ${isPast ? 'past' : ''}" data-goto="schedule" data-focus-id="class:${s.id}">
            <span class="bar" style="background:${c.color}"></span>
            <div style="min-width:0">
              <b style="font-size:13.5px;display:block">${esc(c.name)}</b>
              <span style="font-size:11.5px;color:var(--txt-3)">${esc(SESSION_LABEL[s.type])} · ${esc(s.room)}</span>
            </div>
            <div class="t"><span class="mono">${fmt12(s.start)}</span><br><span style="opacity:.6" class="mono">${fmt12(s.end)}</span></div>
          </div>`;
        }).join('')}</div>` : `<div class="card">${emptyState('sun', 'يوم بدون محاضرات', 'وقت ممتاز للمذاكرة أو مسار هواوي')}</div>`}
      </div>
      <div>
        <div class="section-title"><i data-lucide="hourglass"></i> أقرب اختبار</div>
        ${examBlock}
      </div>
    </div>

    <div class="section-title"><i data-lucide="gauge"></i> تقدّم المقررات</div>
    <div class="grid g-cards">
      ${state.courses.map(c => {
        const cov2 = coverage(c), st = absenceStatus(c);
        return `<div class="card" style="--c:${c.color}" data-goto="vault" data-focus-id="course:${c.id}">
          <div style="display:flex;align-items:center;gap:11px;margin-bottom:13px">
            <span style="width:9px;height:32px;border-radius:99px;background:${c.color}"></span>
            <div style="min-width:0;flex:1"><b style="font-size:14.5px;display:block">${esc(c.name)}</b>
              <small style="color:var(--txt-3);font-size:11.5px" class="mono">${esc(c.id)} · ${c.credits} ساعات</small></div>
            <b class="mono" style="font-size:19px;color:${c.color}">${cov2}%</b>
          </div>
          ${progressBar(cov2)}
          <div style="display:flex;justify-content:space-between;margin-top:11px;font-size:11.5px;color:var(--txt-3)">
            <span>${c.chapters.filter(x => x.done).length} من ${c.chapters.length} فصل</span>
            <span style="color:${st.level === 'danger' ? 'var(--danger)' : st.level === 'warn' ? 'var(--warn)' : 'var(--txt-3)'}">
              الغياب: ${c.absences}/${c.maxAbsences}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

/* ---------- 8. العرض: الجدول ---------- */
function renderSchedule() {
  return `<section class="view">
    <div class="page-head">
      <div><h1>الجدول الدراسي</h1><p>${esc(state.profile.semester)} · ${state.sessions.length} حصة أسبوعياً · الأربعاء يوم حر</p></div>
      <div class="spacer"></div>
      <div class="seg" role="tablist">
        <button class="${ui.sched === 'grid' ? 'active' : ''}" data-action="sched-view" data-v="grid"><i data-lucide="layout-grid" style="width:14px;height:14px;vertical-align:-2px"></i> شبكة أسبوعية</button>
        <button class="${ui.sched === 'day' ? 'active' : ''}" data-action="sched-view" data-v="day"><i data-lucide="align-left" style="width:14px;height:14px;vertical-align:-2px"></i> خط زمني يومي</button>
      </div>
      <button class="btn btn-ghost" data-action="print"><i data-lucide="printer"></i> طباعة</button>
    </div>
    ${ui.sched === 'grid' ? weeklyGrid() : dailyTimeline()}
    <div class="grid g-stats" style="margin-top:18px">
      ${WORK_DAYS.map(d => {
        const list = sessionsOf(d);
        const mins = list.reduce((s, x) => s + toMin(x.end) - toMin(x.start), 0);
        const isToday = d === new Date().getDay();
        return `<div class="stat" data-action="sched-day" data-d="${d}" style="cursor:pointer;${isToday ? 'border-color:var(--accent)' : ''}">
          <div class="stat-lbl">${DAYS[d]}${isToday ? ' · اليوم' : ''}</div>
          <div class="stat-val" style="font-size:20px">${list.length}<small> حصة</small></div>
          <div class="stat-lbl mono">${(mins / 60).toFixed(1)} ساعة</div>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function weeklyGrid() {
  const today = new Date().getDay();
  const rows = Math.round((GRID_END - GRID_START) / 10);
  let cells = '';

  // خلفيات الأعمدة
  WORK_DAYS.forEach((d, i) => {
    cells += `<div class="day-col-bg ${d === today ? 'today' : ''}" style="grid-column:${i + 2}"></div>`;
  });
  // خطوط الساعات
  for (let h = GRID_START; h < GRID_END; h += 60) {
    const r = Math.round((h - GRID_START) / 10) + 1;
    cells += `<div class="hour-lbl" style="grid-row:${r} / span 6">${toHHMM(h)}</div>`;
    cells += `<div class="hour-line" style="grid-row:${r}"></div>`;
  }
  // الحصص
  WORK_DAYS.forEach((d, i) => {
    sessionsOf(d).forEach(s => {
      const c = course(s.courseId);
      const st = clamp(Math.round((toMin(s.start) - GRID_START) / 10), 0, rows - 1) + 1;
      const en = clamp(Math.round((toMin(s.end) - GRID_START) / 10), 1, rows) + 1;
      const isNow = d === today && toMin(s.start) <= nowMin() && nowMin() < toMin(s.end);
      const isPast = d < today || (d === today && toMin(s.end) <= nowMin());
      cells += `<div class="sess ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''}" data-class-id="${s.id}" data-focus="class:${s.id}"
        data-goto="vault" data-focus-id="course:${c.id}"
        style="--c:${c.color};grid-column:${i + 2};grid-row:${st} / ${en}">
        <span class="tag">${esc(SESSION_LABEL[s.type])}</span>
        <b>${esc(c.id)}</b>
        <span>${esc(c.name)}</span>
        <span class="mono" style="margin-top:3px">${s.start}–${s.end}</span>
        <span>${esc(s.room)}</span>
      </div>`;
    });
  });

  const showLine = WORK_DAYS.includes(today) && nowMin() >= GRID_START && nowMin() <= GRID_END;
  const lineTop = ((nowMin() - GRID_START) * PX_PER_MIN).toFixed(1);

  return `<div class="sched-wrap"><div class="sched-scroll"><div class="sched-inner">
    <div class="grid-head">
      <div></div>
      ${WORK_DAYS.map(d => `<div class="${d === today ? 'today' : ''}">${DAYS[d]}${d === today ? '<small>اليوم</small>' : ''}</div>`).join('')}
    </div>
    <div class="grid-body">
      ${cells}
      ${showLine ? `<div class="now-line" id="now-line" style="top:${lineTop}px"></div>` : ''}
    </div>
  </div></div></div>`;
}

function dailyTimeline() {
  const d = ui.day;
  const list = sessionsOf(d);
  const isToday = d === new Date().getDay();
  const m = nowMin();

  const body = list.length ? list.map((s, i) => {
    const c = course(s.courseId);
    const isNow = isToday && toMin(s.start) <= m && m < toMin(s.end);
    const isPast = isToday && toMin(s.end) <= m;
    const prev = list[i - 1];
    const gap = prev ? toMin(s.start) - toMin(prev.end) : 0;
    return `${gap >= 30 ? `<div class="tl-item"><div></div><div class="tl-rail"></div>
        <div class="tl-gap">فراغ ${Math.floor(gap / 60) ? `${Math.floor(gap / 60)} ساعة ` : ''}${gap % 60 ? `${gap % 60} دقيقة` : ''} — فرصة مذاكرة داخل الحرم</div></div>` : ''}
      <div class="tl-item">
        <div class="tl-time"><span class="mono">${fmt12(s.start)}</span><br><span style="opacity:.55" class="mono">${fmt12(s.end)}</span></div>
        <div class="tl-rail"><span class="tl-dot" style="background:${c.color};box-shadow:0 0 12px ${c.color}"></span></div>
        <div class="tl-card ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''}" style="--c:${c.color}" data-class-id="${s.id}" data-focus="class:${s.id}"
             data-goto="vault" data-focus-id="course:${c.id}">
          <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
            <b style="font-size:15px">${esc(c.name)}</b>
            <span class="chip" style="border-color:${c.color}55;color:${c.color}">${esc(c.id)}</span>
            ${isNow ? '<span class="chip" style="border-color:var(--ok);color:var(--ok)">جارية الآن</span>' : ''}
          </div>
          <p style="font-size:12.5px;color:var(--txt-3);margin-top:5px">
            <i data-lucide="map-pin" style="width:13px;height:13px;vertical-align:-2px"></i> ${esc(s.room)}
            · ${esc(SESSION_LABEL[s.type])} · ${esc(c.instructor)}
          </p>
        </div>
      </div>`;
  }).join('') : `<div class="card">${emptyState('moon-star', `ما في محاضرات يوم ${DAYS[d]}`, 'يوم مثالي للمذاكرة العميقة')}</div>`;

  return `<div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px">
      ${WORK_DAYS.map(x => `<button class="chip ${x === d ? 'active' : ''}" data-action="sched-day" data-d="${x}">
        ${DAYS_SHORT[x]}${x === new Date().getDay() ? ' •' : ''}</button>`).join('')}
    </div>
    <div class="card" style="padding:14px"><div class="timeline">${body}</div></div>
  </div>`;
}

/* ---------- 9. العرض: الاختبارات ---------- */
function renderExams() {
  const f = ui.examFilter;
  const up = upcomingExams().filter(e => f === 'all' || e.type === f);
  const done = pastExams();
  const filters = [['all','الكل'],['quiz','كويزات'],['midterm','منتصف الفصل'],['final','النهائي']];

  return `<section class="view">
    <div class="page-head">
      <div><h1>الاختبارات والتغطية</h1><p>${upcomingExams().length} اختبار قادم · العدّاد يتحدّث كل ثانية</p></div>
      <div class="spacer"></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${filters.map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-action="exam-filter" data-f="${k}">${l}</button>`).join('')}
      </div>
    </div>
    ${up.length ? `<div class="grid g-cards">${up.map(examCard).join('')}</div>`
      : `<div class="card">${emptyState('calendar-check', 'ما في اختبارات بهالتصنيف', 'جرّب تصنيف ثاني')}</div>`}
    ${done.length ? `<div class="section-title"><i data-lucide="history"></i> اختبارات منتهية <span class="count">${done.length}</span></div>
      <div class="grid g-cards">${done.map(e => examCard(e, true)).join('')}</div>` : ''}
  </section>`;
}

function examCard(e, isDone = false) {
  const c = course(e.courseId);
  const p = diffParts(examDate(e));
  const soon = !isDone && p.d < 7;
  const doneCh = e.chapters.filter(id => chapterById(id)?.ch.done).length;
  const pct = e.chapters.length ? (doneCh / e.chapters.length) * 100 : 0;

  return `<article class="card exam-card ${soon ? 'soon' : ''} ${isDone ? 'done-exam' : ''}" style="--c:${c.color}" data-focus="exam:${e.id}">
    <div class="exam-top">
      <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px">
        <span class="exam-type t-${e.type}">${esc(EXAM_LABEL[e.type])}</span>
        ${soon ? '<span class="exam-type" style="background:rgba(251,113,133,.2);color:#fda4af">قريب جداً ⚡</span>' : ''}
        ${isDone ? '<span class="exam-type" style="background:rgba(255,255,255,.08);color:var(--txt-3)">منتهي</span>' : ''}
        ${courseTag(c)}
      </div>
      <h3 style="font-size:17px">${esc(c.name)}</h3>
      <p style="font-size:12.5px;color:var(--txt-3)">${esc(c.en)}</p>
    </div>
    <div class="exam-body">
      <div class="exam-meta">
        <div class="meta-cell"><small>التاريخ</small><b>${fmtDateShort(e.date)}</b></div>
        <div class="meta-cell"><small>اليوم</small><b>${new Intl.DateTimeFormat('ar-BH', { weekday:'long' }).format(new Date(`${e.date}T12:00:00`))}</b></div>
        <div class="meta-cell"><small>الوقت</small><b class="mono">${e.start} — ${e.end}</b></div>
        <div class="meta-cell"><small>المكان</small><b style="font-size:12px">${esc(e.room)}</b></div>
      </div>
      ${isDone ? '' : cdCells(examDate(e), false)}
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
          <span style="font-size:12.5px;color:var(--txt-2);font-weight:700"><i data-lucide="list-tree" style="width:14px;height:14px;vertical-align:-3px"></i> الفصول المقررة</span>
          <span class="mono" style="font-size:12px;color:var(--txt-3)">${doneCh}/${e.chapters.length}</span>
        </div>
        ${progressBar(pct, pct === 100 ? 'ok' : pct >= 50 ? 'warn' : 'danger')}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          ${e.chapters.map(id => {
            const hit = chapterById(id);
            if (!hit) return '';
            return `<button class="chip ${hit.ch.done ? 'done' : ''}" data-goto="vault" data-focus-id="chapter:${id}" title="${esc(hit.ch.title)}">
              ${hit.ch.done ? '<i data-lucide="check"></i>' : ''}ف${hit.ch.no} · ${esc(hit.ch.title.length > 22 ? hit.ch.title.slice(0, 22) + '…' : hit.ch.title)}</button>`;
          }).join('')}
        </div>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ghost" data-goto="vault" data-focus-id="course:${c.id}"><i data-lucide="library"></i> فتح المقرر</button>
        <button class="btn btn-sm btn-ghost" data-action="note-for" data-c="${c.id}"><i data-lucide="notebook-pen"></i> مذكرة</button>
        <button class="btn btn-sm btn-ghost" data-action="ics" data-e="${e.id}"><i data-lucide="calendar-plus"></i> تصدير للتقويم</button>
      </div>
    </div>
  </article>`;
}

/* ---------- 10. العرض: خزنة المقررات ---------- */
function renderVault() {
  return `<section class="view">
    <div class="page-head">
      <div><h1>خزنة المقررات</h1><p>الروابط، الفصول، والغيابات — كل شيء في مكان واحد</p></div>
      <div class="spacer"></div>
      <button class="btn btn-ghost" data-action="toggle-all-courses"><i data-lucide="chevrons-up-down"></i> فتح / طي الكل</button>
    </div>
    <div class="grid" style="gap:14px">${state.courses.map(courseCard).join('')}</div>
  </section>`;
}

function courseCard(c) {
  const cov = coverage(c);
  const st = absenceStatus(c);
  const open = ui.openCourses.has(c.id);
  const sess = state.sessions.filter(s => s.courseId === c.id);

  return `<article class="card course-card ${open ? 'open' : ''}" style="--c:${c.color}" data-course-card="${c.id}" data-focus="course:${c.id}">
    <header class="cc-head" data-action="toggle-course" data-c="${c.id}">
      <span class="cc-badge">${esc(c.id.replace(/[0-9]/g, ''))}<br>${esc(c.id.replace(/\D/g, ''))}</span>
      <div style="min-width:0;flex:1">
        <h3 style="font-size:16px">${esc(c.name)}</h3>
        <p style="font-size:11.5px;color:var(--txt-3)">${esc(c.en)} · ${esc(c.instructor)} · ${c.credits} ساعات</p>
        <div style="display:flex;gap:7px;margin-top:8px;flex-wrap:wrap">
          <span class="chip"><i data-lucide="target"></i>${cov}% تغطية</span>
          <span class="chip" style="${st.level !== 'ok' ? `border-color:${st.level === 'danger' ? 'var(--danger)' : 'var(--warn)'};color:${st.level === 'danger' ? '#fda4af' : '#fcd34d'}` : ''}">
            <i data-lucide="user-x"></i>${c.absences}/${c.maxAbsences}</span>
          <span class="chip"><i data-lucide="calendar"></i>${sess.length} حصة</span>
        </div>
      </div>
      <i data-lucide="chevron-down" class="caret"></i>
    </header>

    <div class="cc-body">
      ${st.level !== 'ok' ? `<div class="alert alert-${st.level === 'danger' ? 'danger' : 'warn'}">
        <i data-lucide="${st.level === 'danger' ? 'octagon-alert' : 'triangle-alert'}"></i>
        <div><b>${st.level === 'danger' ? 'إنذار حرمان (DN)' : 'تحذير حضور'}</b>
        <p style="font-size:12.5px;opacity:.85">${st.level === 'danger'
          ? 'وصلت الحد الأقصى للغياب — راجع مدرّس المقرر فوراً.'
          : `تبقّى لك ${Math.max(0, c.maxAbsences - c.absences)} غياب قبل الحرمان.`}</p></div></div>` : ''}

      <div>
        <div class="section-title" style="margin:0 0 9px"><i data-lucide="link-2"></i> الروابط والمصادر</div>
        <div class="res-grid">
          ${c.resources.map(r => `<a class="res-link" href="${esc(r.url)}" target="_blank" rel="noopener">
            <i data-lucide="${RES_ICON[r.type] || 'link'}"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.label)}</span>
            <i data-lucide="x" class="del" data-action="del-res" data-c="${c.id}" data-r="${r.id}"></i></a>`).join('')}
          <button class="res-link" data-action="add-res" data-c="${c.id}" style="border-style:dashed;justify-content:center;color:var(--txt-3)">
            <i data-lucide="plus"></i> إضافة رابط</button>
        </div>
      </div>

      <div>
        <div class="section-title" style="margin:0 0 9px"><i data-lucide="list-tree"></i> الفصول
          <span class="count">${c.chapters.filter(x => x.done).length}/${c.chapters.length}</span>
          <button class="chip" style="margin-inline-start:auto" data-action="toggle-all-ch" data-c="${c.id}">تحديد الكل</button>
        </div>
        ${progressBar(cov, cov === 100 ? 'ok' : '')}
        <div style="margin-top:9px">
          ${c.chapters.map(ch => `<div class="ch-row ${ch.done ? 'done' : ''}" data-action="toggle-ch" data-c="${c.id}" data-ch="${ch.id}" data-focus="chapter:${ch.id}">
            <span class="ch-box"><i data-lucide="check"></i></span>
            <span class="ch-num">ف${ch.no}</span>
            <span class="ch-txt" style="font-size:13.5px">${esc(ch.title)}</span>
          </div>`).join('')}
        </div>
      </div>

      <div>
        <div class="section-title" style="margin:0 0 9px"><i data-lucide="user-x"></i> متابعة الغياب والحرمان</div>
        <div class="absence-box">
          <div class="counter">
            <button data-action="abs" data-c="${c.id}" data-d="-1" aria-label="إنقاص"><i data-lucide="minus"></i></button>
            <span class="val" style="color:${st.level === 'danger' ? 'var(--danger)' : st.level === 'warn' ? 'var(--warn)' : 'var(--txt-1)'}">${c.absences}</span>
            <button data-action="abs" data-c="${c.id}" data-d="1" aria-label="زيادة"><i data-lucide="plus"></i></button>
          </div>
          <div style="flex:1;min-width:180px">
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--txt-3);margin-bottom:5px">
              <span>${esc(st.label)}</span><span class="mono">${Math.round(st.ratio)}% من الحد</span></div>
            ${progressBar(st.ratio, st.level)}
          </div>
          <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--txt-3)">
            الحد الأقصى
            <input class="input" style="width:72px;padding:6px 9px;text-align:center" type="number" min="1" max="30"
              value="${c.maxAbsences}" data-action="max-abs" data-c="${c.id}">
          </label>
        </div>
      </div>

      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ghost" data-goto="schedule" data-focus-id="class:${sess[0]?.id || ''}"><i data-lucide="calendar-days"></i> في الجدول</button>
        ${state.exams.filter(e => e.courseId === c.id && examDate(e) > Date.now()).slice(0, 3).map(e =>
          `<button class="btn btn-sm btn-ghost" data-goto="exams" data-focus-id="exam:${e.id}">
            <i data-lucide="clipboard-check"></i> ${esc(EXAM_LABEL[e.type])} ${fmtDateShort(e.date)}</button>`).join('')}
        <button class="btn btn-sm btn-ghost" data-action="note-for" data-c="${c.id}"><i data-lucide="notebook-pen"></i> مذكرة</button>
      </div>
    </div>
  </article>`;
}

/* ---------- 11. العرض: الإعدادات ---------- */
function renderSettings() {
  const p = state.profile, s = state.settings;
  const accents = [['violet','#8b7bff'],['teal','#2dd4bf'],['blue','#5b8dff'],['amber','#f5a524'],['rose','#fb7185']];

  return `<section class="view">
    <div class="page-head"><div><h1>الإعدادات</h1><p>ملفك، حدود الإنذار، والنسخ الاحتياطي</p></div></div>

    <div class="grid g-2">
      <div class="card">
        <div class="section-title" style="margin:0 0 14px"><i data-lucide="user-round"></i> الملف الشخصي</div>
        <div class="field"><label>الاسم</label><input class="input" id="p-name" value="${esc(p.name)}"></div>
        <div class="field"><label>الجامعة</label><input class="input" id="p-uni" value="${esc(p.university)}"></div>
        <div class="field"><label>التخصص</label><input class="input" id="p-major" value="${esc(p.major)}"></div>
        <div class="field"><label>المستوى</label><input class="input" id="p-level" value="${esc(p.level)}"></div>
        <div class="field"><label>الفصل الدراسي</label><input class="input" id="p-sem" value="${esc(p.semester)}"></div>
        <button class="btn btn-primary btn-block" data-action="save-profile"><i data-lucide="save"></i> حفظ الملف</button>
      </div>

      <div>
        <div class="card">
          <div class="section-title" style="margin:0 0 14px"><i data-lucide="shield-alert"></i> حدود إنذار الحضور</div>
          <div class="field">
            <label>تحذير مبكر عند <b class="mono" id="warn-val">${s.warnPercent}%</b> من الحد المسموح</label>
            <input type="range" min="20" max="95" step="5" value="${s.warnPercent}" id="warn-range" style="width:100%;accent-color:var(--warn)">
          </div>
          <div class="field">
            <label>إنذار حرمان DN عند <b class="mono" id="dn-val">${s.dnPercent}%</b></label>
            <input type="range" min="50" max="100" step="5" value="${s.dnPercent}" id="dn-range" style="width:100%;accent-color:var(--danger)">
          </div>
          <div class="alert alert-info" style="margin-top:6px"><i data-lucide="info"></i>
            <p style="font-size:12.5px">النِّسب تُحسب من الحد الأقصى لكل مقرر (قابل للتعديل من الخزنة). نظام جامعة البحرين عادةً يعتمد حدّ حضور مرتبط بعدد ساعات المقرر — عدّل الأرقام حسب ما يذكره مدرّس كل مقرر.</p>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:12px" data-action="save-thresholds"><i data-lucide="save"></i> حفظ الحدود</button>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="section-title" style="margin:0 0 14px"><i data-lucide="palette"></i> اللون الأساسي</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${accents.map(([k, col]) => `<button data-action="accent" data-a="${k}" title="${k}"
              style="width:42px;height:42px;border-radius:14px;background:${col};border:3px solid ${s.accent === k ? '#fff' : 'transparent'};box-shadow:0 8px 20px -10px ${col}"></button>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="section-title"><i data-lucide="database"></i> البيانات والنسخ الاحتياطي</div>
    <div class="card">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
        <button class="btn btn-ghost" data-action="export"><i data-lucide="download"></i> تصدير نسخة JSON</button>
        <button class="btn btn-ghost" data-action="import"><i data-lucide="upload"></i> استيراد نسخة</button>
        <button class="btn btn-ghost" data-action="print"><i data-lucide="printer"></i> طباعة الجدول</button>
        <button class="btn btn-danger" data-action="reset"><i data-lucide="rotate-ccw"></i> استعادة البيانات الافتراضية</button>
      </div>
      <input type="file" id="import-file" accept="application/json" hidden>
      <p style="font-size:12px;color:var(--txt-3);margin-top:13px">
        كل شيء محفوظ محلياً على جهازك (localStorage) — ما في سيرفر ولا حساب. حجم البيانات الحالي:
        <b class="mono">${(new Blob([JSON.stringify(state)]).size / 1024).toFixed(1)} KB</b>
      </p>
    </div>

    <div class="section-title"><i data-lucide="smartphone"></i> التطبيق</div>
    <div class="card">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <b>تثبيت كتطبيق (PWA)</b>
          <p style="font-size:12.5px;color:var(--txt-3)">ثبّته على شاشة هاتفك ليعمل بدون إنترنت — من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية».</p>
        </div>
        <button class="btn btn-primary" id="install-btn" data-action="install"><i data-lucide="download-cloud"></i> تثبيت</button>
      </div>
      <div style="display:flex;gap:9px;margin-top:14px;flex-wrap:wrap">
        <span class="chip"><i data-lucide="wifi-off"></i> يعمل أوفلاين</span>
        <span class="chip"><i data-lucide="lock"></i> بيانات محلية 100%</span>
        <span class="chip" id="sw-status"><i data-lucide="loader"></i> جارٍ فحص الـ Service Worker</span>
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:14px" data-action="open-help"><i data-lucide="keyboard"></i> عرض اختصارات الكيبورد</button>
    </div>
  </section>`;
}

/* ---------- 12. البحث الشامل ---------- */
function buildIndex() {
  const idx = [];
  idx.push(
    { kind:'عرض', icon:'layout-dashboard', title:'الرئيسية', sub:'لوحة التحكم', href:'#/home' },
    { kind:'عرض', icon:'calendar-days', title:'الجدول', sub:'شبكة أسبوعية وخط زمني', href:'#/schedule' },
    { kind:'عرض', icon:'clipboard-check', title:'الاختبارات', sub:'العد التنازلي والفصول', href:'#/exams' },
    { kind:'عرض', icon:'library', title:'خزنة المقررات', sub:'روابط، فصول، غيابات', href:'#/vault' },
    { kind:'عرض', icon:'settings-2', title:'الإعدادات', sub:'الملف والحدود والنسخ', href:'#/settings' }
  );
  state.courses.forEach(c => {
    idx.push({ kind:'مقرر', icon:'book-marked', color:c.color, title:`${c.name} (${c.id})`, sub:`${c.en} · ${c.instructor}`, href:`#/vault?focus=course:${c.id}` });
    c.chapters.forEach(ch => idx.push({ kind:'فصل', icon:'file-text', color:c.color, title:`ف${ch.no} — ${ch.title}`, sub:c.id, href:`#/vault?focus=chapter:${ch.id}` }));
    c.resources.forEach(r => idx.push({ kind:'رابط', icon:RES_ICON[r.type] || 'link', color:c.color, title:r.label, sub:c.id, url:r.url }));
  });
  state.exams.forEach(e => {
    const c = course(e.courseId);
    idx.push({ kind:'اختبار', icon:'clipboard-check', color:c.color, title:`${EXAM_LABEL[e.type]} — ${c.name}`, sub:`${fmtDateShort(e.date)} · ${e.start} · ${e.room}`, href:`#/exams?focus=exam:${e.id}` });
  });
  state.sessions.forEach(s => {
    const c = course(s.courseId);
    idx.push({ kind:'حصة', icon:'clock', color:c.color, title:`${c.id} — ${DAYS[s.day]}`, sub:`${s.start}–${s.end} · ${s.room}`, href:`#/schedule?focus=class:${s.id}` });
  });
  state.notes.forEach(n => idx.push({ kind:'مذكرة', icon:'notebook-pen', title:n.title || 'مذكرة', sub:(n.body || '').slice(0, 60), note:n.id }));
  return idx;
}
function runSearch(q) {
  const box = $('#search-results');
  const idx = buildIndex();
  const query = q.trim().toLowerCase();
  const hits = (query ? idx.filter(i => `${i.title} ${i.sub} ${i.kind}`.toLowerCase().includes(query)) : idx).slice(0, 40);
  ui.searchHits = hits; ui.searchIdx = 0;
  if (!hits.length) { box.innerHTML = `<div class="empty"><b>ما في نتائج</b><span>جرّب كلمة ثانية</span></div>`; return; }
  const groups = {};
  hits.forEach((h, i) => { (groups[h.kind] ||= []).push({ ...h, i }); });
  box.innerHTML = Object.entries(groups).map(([k, arr]) => `<div class="p-group">${k}</div>` + arr.map(h => `
    <div class="p-item ${h.i === 0 ? 'sel' : ''}" data-hit="${h.i}">
      <span class="p-ico" style="${h.color ? `color:${h.color};background:${h.color}1f` : ''}"><i data-lucide="${h.icon}"></i></span>
      <div style="min-width:0"><b>${esc(h.title)}</b><small>${esc(h.sub)}</small></div>
      <span class="p-kind">${esc(h.kind)}</span>
    </div>`).join('')).join('');
  icons();
}
function openHit(i) {
  const h = ui.searchHits[i]; if (!h) return;
  closeAllOverlays();
  if (h.url) { window.open(h.url, '_blank', 'noopener'); return; }
  if (h.note) { openNotes(); setTimeout(() => { const el = $(`[data-note="${h.note}"]`); if (el) { el.scrollIntoView({ block:'center' }); el.classList.add('focus-flash'); } }, 260); return; }
  navigate(h.href);
}
function moveSel(delta) {
  const items = $$('#search-results .p-item'); if (!items.length) return;
  ui.searchIdx = clamp(ui.searchIdx + delta, 0, items.length - 1);
  items.forEach(el => el.classList.remove('sel'));
  const sel = items[ui.searchIdx]; sel.classList.add('sel'); sel.scrollIntoView({ block:'nearest' });
  ui.searchIdx = Number(sel.dataset.hit);
}

/* ---------- 13. المفكرة + بومودورو ---------- */
function renderNotes() {
  const list = $('#notes-list');
  if (!state.notes.length) { list.innerHTML = `<div class="empty"><i data-lucide="sticky-note"></i><b>ما في مذكرات</b><span>ابدأ وحدة جديدة</span></div>`; icons(); return; }
  list.innerHTML = state.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt).map(n => `
    <div class="note" data-note="${n.id}">
      <div class="note-head">
        <input value="${esc(n.title)}" placeholder="العنوان" data-note-field="title" data-id="${n.id}">
        <button class="icon-btn" style="width:30px;height:30px" data-action="del-note" data-id="${n.id}" aria-label="حذف"><i data-lucide="trash-2"></i></button>
      </div>
      <textarea placeholder="اكتب هنا…" data-note-field="body" data-id="${n.id}">${esc(n.body)}</textarea>
      <div class="note-foot">
        <select data-note-field="courseId" data-id="${n.id}">
          <option value="">بدون مقرر</option>
          ${state.courses.map(c => `<option value="${c.id}" ${n.courseId === c.id ? 'selected' : ''}>${esc(c.id)}</option>`).join('')}
        </select>
        <span class="mono" style="margin-inline-start:auto">${new Date(n.updatedAt).toLocaleString('ar-BH-u-nu-latn', { dateStyle:'short', timeStyle:'short' })}</span>
      </div>
    </div>`).join('');
  icons();
}
const pomo = { total: 25 * 60, left: 25 * 60, running: false, timer: null };
function pomoPaint() {
  const C = 2 * Math.PI * 52;
  const arc = $('#pomo-arc');
  if (arc) arc.style.strokeDashoffset = String(C * (1 - pomo.left / pomo.total));
  const t = $('#pomo-time'); if (t) t.textContent = `${pad(Math.floor(pomo.left / 60))}:${pad(pomo.left % 60)}`;
  const b = $('#pomo-toggle'); if (b) b.textContent = pomo.running ? 'إيقاف' : 'ابدأ';
}
function pomoToggle() {
  pomo.running = !pomo.running;
  clearInterval(pomo.timer);
  if (pomo.running) {
    pomo.timer = setInterval(() => {
      pomo.left--;
      if (pomo.left <= 0) {
        clearInterval(pomo.timer); pomo.running = false; pomo.left = 0;
        toast('خلصت جلسة التركيز — خذ بريك ☕', 'ok');
        try { navigator.vibrate?.([120, 60, 120]); } catch (_) {}
      }
      pomoPaint();
    }, 1000);
  }
  pomoPaint();
}

/* ---------- 14. الطبقات العائمة ---------- */
function openOverlay(id) {
  closeAllOverlays();
  const el = $(id); if (!el) return;
  el.hidden = false; document.body.style.overflow = 'hidden'; icons();
}
function closeAllOverlays(silent = false) {
  ['#search-overlay', '#notes-overlay', '#modal-overlay', '#help-overlay'].forEach(id => { const e = $(id); if (e) e.hidden = true; });
  document.body.style.overflow = '';
  if (!silent) $('#view-root')?.focus({ preventScroll: true });
  $('.sidebar')?.classList.remove('open');
}
function openSearch() { openOverlay('#search-overlay'); const i = $('#search-input'); i.value = ''; runSearch(''); setTimeout(() => i.focus(), 40); }
function openNotes() { openOverlay('#notes-overlay'); renderNotes(); pomoPaint(); }
function openModal({ title, fields, submit = 'حفظ', onSubmit }) {
  $('#modal-title').innerHTML = `<i data-lucide="pencil"></i> ${esc(title)}`;
  $('#modal-body').innerHTML = fields.map(f => `<div class="field"><label>${esc(f.label)}</label>
    ${f.type === 'select'
      ? `<select class="input" id="f-${f.key}">${f.options.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>`
      : `<input class="input" id="f-${f.key}" type="${f.type || 'text'}" value="${esc(f.value || '')}" placeholder="${esc(f.ph || '')}">`}</div>`).join('');
  $('#modal-submit').textContent = submit;
  $('#modal-submit').onclick = () => {
    const out = {}; fields.forEach(f => { out[f.key] = $(`#f-${f.key}`).value.trim(); });
    if (onSubmit(out) !== false) closeAllOverlays();
  };
  openOverlay('#modal-overlay');
  setTimeout(() => $('#modal-body input, #modal-body select')?.focus(), 50);
}
function toast(msg, kind = 'ok') {
  const ico = kind === 'ok' ? 'check-circle-2' : kind === 'err' ? 'alert-circle' : 'info';
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<i data-lucide="${ico}"></i><span>${esc(msg)}</span>`;
  $('#toast-stack').appendChild(el); icons();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2800);
}

/* ---------- 15. الإجراءات ---------- */
const ACTIONS = {
  'toggle-sidebar': () => $('.sidebar').classList.toggle('open'),
  'open-search': openSearch,
  'open-notes': openNotes,
  'open-help': () => openOverlay('#help-overlay'),
  'close-overlay': () => closeAllOverlays(),
  'print': () => window.print(),

  'sched-view': el => { ui.sched = el.dataset.v; state.settings.scheduleView = ui.sched; save(); render(); },
  'sched-day': el => { ui.day = Number(el.dataset.d); ui.sched = 'day'; state.settings.scheduleView = 'day'; save(); go('schedule'); render(); },
  'exam-filter': el => { ui.examFilter = el.dataset.f; render(); },

  'toggle-course': el => {
    const id = el.dataset.c;
    ui.openCourses.has(id) ? ui.openCourses.delete(id) : ui.openCourses.add(id);
    $(`[data-course-card="${CSS.escape(id)}"]`).classList.toggle('open');
  },
  'toggle-all-courses': () => {
    const allOpen = state.courses.every(c => ui.openCourses.has(c.id));
    ui.openCourses = new Set(allOpen ? [] : state.courses.map(c => c.id));
    render();
  },
  'toggle-ch': el => {
    const c = course(el.dataset.c);
    const ch = c.chapters.find(x => x.id === el.dataset.ch);
    if (!ch) return;
    ch.done = !ch.done; save();
    el.classList.toggle('done', ch.done);
    const card = el.closest('.course-card');
    const cov = coverage(c);
    card.querySelectorAll('.progress i')[0].style.width = `${cov}%`;
    card.querySelector('.cc-head .chip i[data-lucide="target"]')?.parentElement
      && (card.querySelector('.cc-head .chip').innerHTML = `<i data-lucide="target"></i>${cov}% تغطية`);
    card.querySelector('.count').textContent = `${c.chapters.filter(x => x.done).length}/${c.chapters.length}`;
    icons();
  },
  'toggle-all-ch': el => {
    const c = course(el.dataset.c);
    const all = c.chapters.every(x => x.done);
    c.chapters.forEach(x => { x.done = !all; });
    save(); render(); applyFocus(`course:${c.id}`);
    toast(all ? 'تم إلغاء تحديد كل الفصول' : 'تم تحديد كل الفصول ✅');
  },
  'abs': el => {
    const c = course(el.dataset.c);
    const before = absenceStatus(c).level;
    c.absences = clamp(c.absences + Number(el.dataset.d), 0, 99);
    save();
    const after = absenceStatus(c);
    render(); applyFocus(`course:${c.id}`);
    if (after.level === 'danger' && before !== 'danger') toast(`⚠️ ${c.id}: وصلت حد الحرمان DN`, 'err');
    else if (after.level === 'warn' && before === 'ok') toast(`${c.id}: اقتربت من حد الغياب`, 'info');
  },
  'max-abs': el => { const c = course(el.dataset.c); c.maxAbsences = clamp(Number(el.value) || 1, 1, 30); save(); render(); applyFocus(`course:${c.id}`); },

  'add-res': el => {
    const c = course(el.dataset.c);
    openModal({
      title: `إضافة رابط — ${c.id}`,
      fields: [
        { key:'label', label:'اسم الرابط', ph:'مثال: ملخصات الفصل الثالث' },
        { key:'url', label:'الرابط (URL)', ph:'https://…' },
        { key:'type', label:'النوع', type:'select', options:[['drive','Google Drive'],['telegram','تيليجرام'],['slides','سلايدات'],['book','كتاب / PDF'],['video','فيديو'],['link','رابط عام']] }
      ],
      onSubmit: v => {
        if (!v.label || !v.url) { toast('لازم اسم ورابط', 'err'); return false; }
        c.resources.push({ id: uid('r'), label: v.label, url: v.url, type: v.type });
        save(); render(); applyFocus(`course:${c.id}`); toast('تمت إضافة الرابط');
      }
    });
  },
  'del-res': (el, ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const c = course(el.dataset.c);
    c.resources = c.resources.filter(r => r.id !== el.dataset.r);
    save(); render(); applyFocus(`course:${c.id}`); toast('تم حذف الرابط');
  },

  'new-note': () => { state.notes.unshift({ id: uid('n'), courseId:'', title:'مذكرة جديدة', body:'', updatedAt: Date.now() }); save(); renderNotes(); },
  'note-for': el => {
    state.notes.unshift({ id: uid('n'), courseId: el.dataset.c, title: `${el.dataset.c} — ملاحظات`, body:'', updatedAt: Date.now() });
    save(); openNotes();
  },
  'del-note': el => { state.notes = state.notes.filter(n => n.id !== el.dataset.id); save(); renderNotes(); toast('تم حذف المذكرة'); },

  'pomo-toggle': pomoToggle,
  'pomo-reset': () => { clearInterval(pomo.timer); pomo.running = false; pomo.left = pomo.total; pomoPaint(); },
  'pomo-set': el => { clearInterval(pomo.timer); pomo.running = false; pomo.total = Number(el.dataset.min) * 60; pomo.left = pomo.total; pomoPaint(); },

  'save-profile': () => {
    Object.assign(state.profile, {
      name: $('#p-name').value.trim() || 'طالب',
      university: $('#p-uni').value.trim(),
      major: $('#p-major').value.trim(),
      level: $('#p-level').value.trim(),
      semester: $('#p-sem').value.trim()
    });
    save(); paintIdentity(); toast('تم حفظ الملف الشخصي ✅');
  },
  'save-thresholds': () => {
    state.settings.warnPercent = Number($('#warn-range').value);
    state.settings.dnPercent = Number($('#dn-range').value);
    save(); toast('تم حفظ حدود الإنذار');
  },
  'accent': el => { state.settings.accent = el.dataset.a; save(); document.documentElement.dataset.accent = el.dataset.a; render(); },

  'export': () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `campus-os-backup-${todayISO()}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('تم تصدير نسخة احتياطية');
  },
  'import': () => $('#import-file').click(),
  'reset': () => {
    openModal({
      title: 'استعادة البيانات الافتراضية',
      fields: [{ key:'confirm', label:'اكتب "تأكيد" للمتابعة — بتضيع كل تعديلاتك', ph:'تأكيد' }],
      submit: 'استعادة',
      onSubmit: v => {
        if (v.confirm !== 'تأكيد') { toast('لم يتم التأكيد', 'err'); return false; }
        state = defaultData(); save(); ui.openCourses = new Set();
        document.documentElement.dataset.accent = state.settings.accent;
        paintIdentity(); render(); toast('تمت الاستعادة');
      }
    });
  },
  'install': async () => {
    if (!window.__deferredPrompt) { toast('استخدم قائمة المتصفح › إضافة إلى الشاشة الرئيسية', 'info'); return; }
    window.__deferredPrompt.prompt();
    const { outcome } = await window.__deferredPrompt.userChoice;
    if (outcome === 'accepted') toast('تم التثبيت 🎉');
    window.__deferredPrompt = null;
  },
  'ics': el => {
    const e = state.exams.find(x => x.id === el.dataset.e); if (!e) return;
    const c = course(e.courseId);
    const dt = s => `${e.date.replace(/-/g, '')}T${s.replace(':', '')}00`;
    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CampusOS//AR//','BEGIN:VEVENT',
      `UID:${e.id}@campusos`, `DTSTAMP:${dt(e.start)}`, `DTSTART:${dt(e.start)}`, `DTEND:${dt(e.end)}`,
      `SUMMARY:${EXAM_LABEL[e.type]} — ${c.name} (${c.id})`, `LOCATION:${e.room}`,
      `DESCRIPTION:الفصول: ${e.chapters.map(id => chapterById(id)?.ch.title).filter(Boolean).join(' / ')}`,
      'BEGIN:VALARM','TRIGGER:-P7D','ACTION:DISPLAY','DESCRIPTION:تذكير قبل أسبوع','END:VALARM',
      'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:تذكير قبل يوم','END:VALARM',
      'BEGIN:VALARM','TRIGGER:-PT3H','ACTION:DISPLAY','DESCRIPTION:تذكير قبل 3 ساعات','END:VALARM',
      'END:VEVENT','END:VCALENDAR'].join('\r\n');
    const blob = new Blob([ics], { type:'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${c.id}-${e.type}.ics`; a.click(); URL.revokeObjectURL(a.href);
    toast('تم تجهيز ملف التقويم (مع تذكيرات مسبقة)');
  }
};

/* ---------- 16. الأحداث ---------- */
document.addEventListener('click', ev => {
  const actEl = ev.target.closest('[data-action]');
  if (actEl && ACTIONS[actEl.dataset.action]) {
    ACTIONS[actEl.dataset.action](actEl, ev);
    if (actEl.tagName !== 'INPUT') return;
  }
  const hit = ev.target.closest('[data-hit]');
  if (hit) { openHit(Number(hit.dataset.hit)); return; }

  const link = ev.target.closest('[data-link]');
  if (link) { ev.preventDefault(); navigate(link.dataset.link); return; }

  const goto = ev.target.closest('[data-goto]');
  if (goto) { ev.preventDefault(); go(goto.dataset.goto, goto.dataset.focusId || ''); return; }

  if (ev.target.classList.contains('overlay')) closeAllOverlays();
});

document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'search-input') { runSearch(t.value); return; }
  if (t.id === 'warn-range') { $('#warn-val').textContent = `${t.value}%`; return; }
  if (t.id === 'dn-range') { $('#dn-val').textContent = `${t.value}%`; return; }
  if (t.dataset.noteField) {
    const n = state.notes.find(x => x.id === t.dataset.id); if (!n) return;
    n[t.dataset.noteField] = t.value; n.updatedAt = Date.now();
    clearTimeout(window.__noteSave);
    window.__noteSave = setTimeout(save, 400);
  }
});
document.addEventListener('change', ev => {
  if (ev.target.id === 'import-file') {
    const file = ev.target.files[0]; if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        if (!data || !Array.isArray(data.courses)) throw new Error('ملف غير صالح');
        state = { ...defaultData(), ...data };
        save(); document.documentElement.dataset.accent = state.settings.accent || 'violet';
        paintIdentity(); render(); toast('تم استيراد النسخة بنجاح ✅');
      } catch (err) { toast('الملف غير صالح', 'err'); console.error(err); }
    };
    fr.readAsText(file);
    ev.target.value = '';
  }
  if (ev.target.dataset.action === 'max-abs') ACTIONS['max-abs'](ev.target);
});

document.addEventListener('keydown', ev => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName);
  const searchOpen = !$('#search-overlay').hidden;

  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); openSearch(); return; }
  if (ev.key === 'Escape') { closeAllOverlays(); return; }

  if (searchOpen) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); moveSel(1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveSel(-1); }
    else if (ev.key === 'Enter') { ev.preventDefault(); openHit(ui.searchIdx); }
    return;
  }
  if (typing) return;

  const map = { '1':'home', '2':'schedule', '3':'exams', '4':'vault', '5':'settings' };
  if (map[ev.key]) { go(map[ev.key]); return; }
  const k = ev.key.toLowerCase();
  if (k === '/') { ev.preventDefault(); openSearch(); }
  else if (k === 'n') openNotes();
  else if (k === '?') openOverlay('#help-overlay');
  else if (k === 'g' && route.view === 'schedule') { ui.sched = ui.sched === 'grid' ? 'day' : 'grid'; state.settings.scheduleView = ui.sched; save(); render(); }
  else if (k === 'e') { const e = nextExam(); if (e) go('exams', `exam:${e.id}`); }
});

window.addEventListener('hashchange', render);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__deferredPrompt = e; });

/* ---------- 17. النبض (كل ثانية) ---------- */
function tick() {
  const now = new Date();
  const clock = $('#live-clock');
  if (clock) clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // العدّادات
  $$('[data-countdown]').forEach(el => {
    const p = diffParts(el.dataset.countdown);
    const big = el.dataset.big === '1';
    const vals = [p.d, p.h, p.m, p.s];
    el.querySelectorAll(big ? '.cd-cell b' : 'div b').forEach((b, i) => { b.textContent = pad(vals[i]); });
    if (p.total <= 0) el.closest('.card')?.classList.add('done-exam');
  });

  // تمييز الحصة الجارية
  const live = liveSession(now);
  $$('[data-class-id]').forEach(el => {
    el.classList.toggle('is-now', !!live && el.dataset.classId === live.id);
  });

  // خط الوقت في الشبكة
  const line = $('#now-line');
  if (line) line.style.top = `${((nowMin(now) - GRID_START) * PX_PER_MIN).toFixed(1)}px`;

  // شريط تقدّم الحصة في الرئيسية
  const prog = $('.now-progress i');
  if (prog && live) {
    const pct = ((nowMin(now) - toMin(live.start)) / (toMin(live.end) - toMin(live.start))) * 100;
    prog.style.width = `${clamp(pct, 0, 100).toFixed(1)}%`;
  }
}

/* ---------- 18. الإقلاع ---------- */
function icons() { try { window.lucide?.createIcons(); } catch (_) {} }
function paintIdentity() {
  const n = (state.profile.name || 'ط').trim();
  $('#avatar-initials').textContent = n[0] || 'ط';
}
function boot() {
  document.documentElement.dataset.accent = state.settings.accent || 'violet';
  if (!location.hash) location.hash = '#/home';
  paintIdentity();
  render();
  setInterval(tick, 1000);
  setInterval(() => { if (route.view === 'home' || route.view === 'schedule') { const y = window.scrollY; render(); window.scrollTo(0, y); } }, 60000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => { const s = $('#sw-status'); if (s) s.innerHTML = '<i data-lucide="check-circle-2"></i> جاهز للعمل بدون إنترنت'; icons(); })
      .catch(err => { console.warn('SW فشل التسجيل:', err); const s = $('#sw-status'); if (s) s.innerHTML = '<i data-lucide="alert-circle"></i> الوضع الأوفلاين غير مفعّل'; icons(); });
  }
  window.addEventListener('online', () => toast('رجع الاتصال 🌐', 'info'));
  window.addEventListener('offline', () => toast('أنت أوفلاين — التطبيق يشتغل عادي', 'info'));
}
document.addEventListener('DOMContentLoaded', boot);