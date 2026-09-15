/* ==========================================================================
   store.js — الحالة الكاملة للتطبيق + الحفظ في المتصفح
   لا يوجد سيرفر: كل بيانات الطالب تبقى على جهازه.
   ========================================================================== */
window.Store = (function () {
  const KEY = 'jadwali.uob.v2';
  const listeners = [];
  let data = null;

  /* ------------------------------ المخطط ------------------------------ */
  function blank() {
    return {
      v: 2,
      ready: false,
      profile: { name: '', university: 'جامعة البحرين', major: '', year: '', semester: '' },
      prefs: {
        theme: 'auto',
        accent: 'pearl',
        density: 'cozy',
        view: 'grid',
        days: [0, 1, 2, 3, 4],
        dayStart: '08:00',
        dayEnd: '18:00',
        warnAt: 60,
        dnAt: 100,
        defaultMaxAbs: 6
      },
      courses: [],
      adhkar: { date: '', morning: {}, evening: {} }
    };
  }

  function newCourse(patch = {}) {
    return Object.assign({
      id: U.uid('c'),
      code: '',
      title: '',
      section: '',
      instructor: '',
      credits: 3,
      color: U.pickColor((data ? data.courses.length : 0)),
      note: '',
      absences: 0,
      maxAbsences: data ? data.prefs.defaultMaxAbs : 6,
      sessions: [],
      exams: [],
      chapters: [],
      links: []
    }, patch);
  }

  function newSession(patch = {}) {
    return Object.assign({
      id: U.uid('s'), day: 0, start: '08:00', end: '08:50', room: '', kind: 'lecture', teacher: ''
    }, patch);
  }

  function newExam(patch = {}) {
    return Object.assign({
      id: U.uid('x'), kind: 'final', date: '', start: '11:00', end: '13:00', room: '', chapters: []
    }, patch);
  }

  /* ------------------------------ التخزين ------------------------------ */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.courses)) {
          data = Object.assign(blank(), parsed);
          data.profile = Object.assign(blank().profile, parsed.profile || {});
          data.prefs = Object.assign(blank().prefs, parsed.prefs || {});
          normalise();
          return data;
        }
      }
    } catch (err) {
      console.warn('تعذّرت قراءة البيانات المحفوظة:', err);
    }
    data = blank();
    return data;
  }

  /** يضمن أن كل حقل موجود حتى لو جاء من نسخة قديمة أو ملف مستورد */
  function normalise() {
    data.courses.forEach((c, i) => {
      c.id ||= U.uid('c');
      c.color ||= U.pickColor(i);
      c.sessions = (c.sessions || []).map(s => Object.assign(newSession(), s));
      c.exams = (c.exams || []).map(x => Object.assign(newExam(), x));
      c.chapters = (c.chapters || []).map(ch => ({ id: ch.id || U.uid('ch'), title: ch.title || '', done: !!ch.done }));
      c.links = (c.links || []).map(l => ({ id: l.id || U.uid('l'), label: l.label || 'رابط', url: l.url || '' }));
      if (typeof c.absences !== 'number') c.absences = 0;
      if (typeof c.maxAbsences !== 'number') c.maxAbsences = data.prefs.defaultMaxAbs;
    });
  }

  let saveTimer = null;
  function save(immediate) {
    clearTimeout(saveTimer);
    const write = () => {
      try { localStorage.setItem(KEY, JSON.stringify(data)); }
      catch (err) { console.error('فشل الحفظ:', err); }
    };
    immediate ? write() : (saveTimer = setTimeout(write, 120));
  }

  function on(fn) { listeners.push(fn); }
  function emit(reason) { listeners.forEach(fn => { try { fn(reason); } catch (e) { console.error(e); } }); }

  /** أي تعديل يمر من هنا: يحفظ ثم يبلّغ الواجهة */
  function commit(reason) { save(); emit(reason || 'change'); }

  /* ------------------------------ المقررات ------------------------------ */
  const courses = () => data.courses;
  const course = id => data.courses.find(c => c.id === id) || null;

  function addCourse(patch) {
    const c = newCourse(patch);
    if (!c.color) c.color = U.pickColor(data.courses.length);
    // أي حصص/اختبارات جاية من المُستورد لازم تاخذ معرّفات وحقول كاملة
    c.sessions = (c.sessions || []).map(s => newSession(s))
      .sort((a, b) => a.day - b.day || U.toMin(a.start) - U.toMin(b.start));
    c.exams = (c.exams || []).map(x => newExam(x));
    c.chapters = (c.chapters || []).map(ch => ({ id: ch.id || U.uid('ch'), title: ch.title || '', done: !!ch.done }));
    c.links = (c.links || []).map(l => ({ id: l.id || U.uid('l'), label: l.label || 'رابط', url: l.url || '' }));
    data.courses.push(c);
    commit('course:add');
    return c;
  }

  function updateCourse(id, patch) {
    const c = course(id); if (!c) return null;
    Object.assign(c, patch);
    commit('course:update');
    return c;
  }

  function removeCourse(id) {
    data.courses = data.courses.filter(c => c.id !== id);
    commit('course:remove');
  }

  /* ------------------------------ الحصص ------------------------------ */
  function addSession(courseId, patch) {
    const c = course(courseId); if (!c) return null;
    const s = newSession(patch);
    c.sessions.push(s);
    c.sessions.sort((a, b) => a.day - b.day || U.toMin(a.start) - U.toMin(b.start));
    commit('session:add');
    return s;
  }
  function updateSession(courseId, id, patch) {
    const c = course(courseId); if (!c) return;
    const s = c.sessions.find(x => x.id === id); if (!s) return;
    Object.assign(s, patch);
    c.sessions.sort((a, b) => a.day - b.day || U.toMin(a.start) - U.toMin(b.start));
    commit('session:update');
  }
  function removeSession(courseId, id) {
    const c = course(courseId); if (!c) return;
    c.sessions = c.sessions.filter(s => s.id !== id);
    commit('session:remove');
  }
  function replaceSessions(courseId, list) {
    const c = course(courseId); if (!c) return;
    c.sessions = list.map(s => newSession(s));
    c.sessions.sort((a, b) => a.day - b.day || U.toMin(a.start) - U.toMin(b.start));
    commit('session:replace');
  }

  /* ----------------------------- الاختبارات ----------------------------- */
  function addExam(courseId, patch) {
    const c = course(courseId); if (!c) return null;
    const x = newExam(patch);
    c.exams.push(x);
    commit('exam:add');
    return x;
  }
  function updateExam(courseId, id, patch) {
    const c = course(courseId); if (!c) return;
    const x = c.exams.find(e => e.id === id); if (!x) return;
    Object.assign(x, patch);
    commit('exam:update');
  }
  function removeExam(courseId, id) {
    const c = course(courseId); if (!c) return;
    c.exams = c.exams.filter(e => e.id !== id);
    commit('exam:remove');
  }

  /* ------------------------------ الفصول ------------------------------ */
  function addChapter(courseId, title) {
    const c = course(courseId); if (!c) return;
    c.chapters.push({ id: U.uid('ch'), title: title || `فصل ${c.chapters.length + 1}`, done: false });
    commit('chapter:add');
  }
  function toggleChapter(courseId, id) {
    const c = course(courseId); if (!c) return;
    const ch = c.chapters.find(x => x.id === id); if (!ch) return;
    ch.done = !ch.done;
    commit('chapter:toggle');
  }
  function removeChapter(courseId, id) {
    const c = course(courseId); if (!c) return;
    c.chapters = c.chapters.filter(x => x.id !== id);
    commit('chapter:remove');
  }

  /* ------------------------------ الروابط ------------------------------ */
  function addLink(courseId, label, url) {
    const c = course(courseId); if (!c) return;
    c.links.push({ id: U.uid('l'), label, url });
    commit('link:add');
  }
  function removeLink(courseId, id) {
    const c = course(courseId); if (!c) return;
    c.links = c.links.filter(l => l.id !== id);
    commit('link:remove');
  }

  /* ------------------------------ الغياب ------------------------------ */
  function bumpAbsence(courseId, delta) {
    const c = course(courseId); if (!c) return;
    c.absences = U.clamp(c.absences + delta, 0, 99);
    commit('absence');
  }

  /** حالة الحضور مقارنة بالحدّ */
  function absenceState(c) {
    const max = c.maxAbsences || 1;
    const pct = (c.absences / max) * 100;
    if (pct >= data.prefs.dnAt) return { level: 'bad', text: 'بلغ حد الحرمان', pct };
    if (pct >= data.prefs.warnAt) return { level: 'warn', text: 'اقترب من الحد', pct };
    return { level: 'ok', text: 'ضمن الحد', pct };
  }

  function coverage(c) {
    if (!c.chapters.length) return null;
    const done = c.chapters.filter(x => x.done).length;
    return { done, total: c.chapters.length, pct: Math.round((done / c.chapters.length) * 100) };
  }

  /* ---------------------------- اشتقاقات ---------------------------- */
  /** كل الحصص مع مقرراتها */
  function allSessions() {
    const out = [];
    data.courses.forEach(c => c.sessions.forEach(s => out.push({ s, c })));
    return out.sort((a, b) => a.s.day - b.s.day || U.toMin(a.s.start) - U.toMin(b.s.start));
  }

  const sessionsOn = day => allSessions().filter(x => x.s.day === day);

  function liveSession(now = new Date()) {
    const m = U.nowMin(now), d = now.getDay();
    return sessionsOn(d).find(x => U.toMin(x.s.start) <= m && m < U.toMin(x.s.end)) || null;
  }

  /** الحصة القادمة (اليوم أو أقرب يوم لاحق) */
  function nextSession(now = new Date()) {
    const m = U.nowMin(now), d = now.getDay();
    const later = sessionsOn(d).find(x => U.toMin(x.s.start) > m);
    if (later) return { ...later, offset: 0 };
    for (let i = 1; i <= 7; i++) {
      const list = sessionsOn((d + i) % 7);
      if (list.length) return { ...list[0], offset: i };
    }
    return null;
  }

  /** كل الاختبارات مع مقرراتها، مرتبة زمنياً */
  function allExams() {
    const out = [];
    data.courses.forEach(c => c.exams.forEach(x => { if (x.date) out.push({ x, c, at: U.stamp(x.date, x.start) }); }));
    return out.sort((a, b) => a.at - b.at);
  }
  const upcomingExams = () => allExams().filter(e => e.at > Date.now());
  const pastExams = () => allExams().filter(e => e.at <= Date.now()).reverse();
  const nextExam = () => upcomingExams()[0] || null;

  /** الأيام التي تظهر في الجدول: المختارة + أي يوم فيه حصة فعلية */
  function activeDays() {
    const set = new Set(data.prefs.days);
    allSessions().forEach(x => set.add(x.s.day));
    return Array.from(set).sort((a, b) => a - b);
  }

  /** حدود الشبكة الزمنية حسب أبكر وأمتع حصة */
  function gridBounds() {
    const list = allSessions();
    let lo = U.toMin(data.prefs.dayStart);
    let hi = U.toMin(data.prefs.dayEnd);
    if (list.length) {
      const starts = list.map(x => U.toMin(x.s.start));
      const ends = list.map(x => U.toMin(x.s.end));
      lo = Math.min(lo, Math.min(...starts));
      hi = Math.max(hi, Math.max(...ends));
    }
    lo = Math.floor(lo / 60) * 60;
    hi = Math.ceil(hi / 60) * 60;
    if (hi - lo < 240) hi = lo + 240;
    return { lo, hi };
  }

  function stats() {
    const cs = data.courses;
    const credits = cs.reduce((a, c) => a + (+c.credits || 0), 0);
    const weekly = allSessions().reduce((a, x) => a + U.lengthOf(x.s.start, x.s.end), 0);
    const absences = cs.reduce((a, c) => a + c.absences, 0);
    const atRisk = cs.filter(c => absenceState(c).level !== 'ok');
    const chapters = cs.flatMap(c => c.chapters);
    const covered = chapters.length ? Math.round(chapters.filter(c => c.done).length / chapters.length * 100) : null;
    return { count: cs.length, credits, weekly, absences, atRisk, covered };
  }

  /* ------------------------------ الأذكار ------------------------------ */
  /** يضمن أن العدّاد لليوم الحالي؛ وإلا يبدأ من جديد */
  function adhkarToday() {
    if (!data.adhkar) data.adhkar = { date: '', morning: {}, evening: {} };
    const today = U.isoOf();
    if (data.adhkar.date !== today) {
      data.adhkar = { date: today, morning: {}, evening: {} };
    }
    return data.adhkar;
  }

  const dhikrDone = (period, id) => (adhkarToday()[period] || {})[id] || 0;

  function bumpDhikr(period, id, total) {
    const box = adhkarToday();
    const now = (box[period][id] || 0) + 1;
    box[period][id] = now >= total ? total : now;
    commit('adhkar');
    return box[period][id];
  }

  function resetDhikr(period, id) {
    const box = adhkarToday();
    if (id) delete box[period][id];
    else box[period] = {};
    commit('adhkar');
  }

  /** كم ذكر اكتمل من أصل كم */
  function adhkarProgress(period) {
    const list = window.ADHKAR ? ADHKAR.list(period) : [];
    const box = adhkarToday()[period] || {};
    const done = list.filter(d => (box[d.id] || 0) >= d.count).length;
    return { done, total: list.length, pct: list.length ? Math.round(done / list.length * 100) : 0 };
  }

  /* --------------------------- استيراد وتصدير --------------------------- */
  function exportJSON() { return JSON.stringify(data, null, 2); }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.courses)) throw new Error('الملف لا يحتوي على مقررات');
    data = Object.assign(blank(), parsed);
    data.profile = Object.assign(blank().profile, parsed.profile || {});
    data.prefs = Object.assign(blank().prefs, parsed.prefs || {});
    normalise();
    save(true); emit('import');
  }

  function reset() { data = blank(); save(true); emit('reset'); }

  function setProfile(patch) { Object.assign(data.profile, patch); commit('profile'); }
  function setPrefs(patch) { Object.assign(data.prefs, patch); commit('prefs'); }

  return {
    get data() { return data; },
    get prefs() { return data.prefs; },
    get profile() { return data.profile; },
    load, save, on, emit, commit,
    blank, newCourse, newSession, newExam,
    courses, course, addCourse, updateCourse, removeCourse,
    addSession, updateSession, removeSession, replaceSessions,
    addExam, updateExam, removeExam,
    addChapter, toggleChapter, removeChapter,
    addLink, removeLink,
    bumpAbsence, absenceState, coverage,
    allSessions, sessionsOn, liveSession, nextSession,
    allExams, upcomingExams, pastExams, nextExam,
    activeDays, gridBounds, stats,
    adhkarToday, dhikrDone, bumpDhikr, resetDhikr, adhkarProgress,
    exportJSON, importJSON, reset, setProfile, setPrefs
  };
})();
