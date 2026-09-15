/* ==========================================================================
   app.js — التوجيه والأحداث وتشغيل التطبيق
   ========================================================================== */
(function () {
  const { $, $$ } = U;

  const TITLES = {
    home:     ['الرئيسية', ''],
    schedule: ['الجدول', 'أسبوعك كامل'],
    exams:    ['الاختبارات', 'العد التنازلي والمواعيد'],
    courses:  ['المقررات', 'الحصص والفصول والغياب'],
    adhkar:   ['الأذكار', 'الصباح والمساء'],
    settings: ['الإعدادات', 'المظهر والبيانات']
  };

  const state = {
    view: 'home',
    params: {},
    day: new Date().getDay(),
    period: '',
    open: new Set(),
    installPrompt: null
  };

  /* ============================== التوجيه ============================== */
  function parseHash() {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const view = (path || 'home').split('/')[0];
    const params = {};
    new URLSearchParams(query || '').forEach((v, k) => { params[k] = v; });
    return { view: TITLES[view] ? view : 'home', params };
  }

  function render(opts = {}) {
    const y = window.scrollY;
    const route = parseHash();
    state.view = route.view;
    state.params = route.params;

    // فتح بطاقة المقرر تلقائياً عند الوصول عبر رابط عميق
    const focus = state.params.focus || '';
    if (focus.startsWith('course:')) state.open.add(focus.slice(7));

    const host = $('#view');
    if (!Store.data.ready) {
      host.innerHTML = Views.welcome();
      setChrome('welcome');
    } else {
      host.innerHTML = (Views[state.view] || Views.home)(state);
      setChrome(state.view);
    }

    Icons.paint(host);
    markNav();
    tick();

    if (opts.keepScroll) window.scrollTo(0, y);
    else window.scrollTo(0, 0);

    if (focus) applyFocus(focus);
  }

  function setChrome(view) {
    const [title, sub] = TITLES[view] || ['جدولي', ''];
    const p = Store.profile;
    $('#page-title').textContent = Store.data.ready ? title : 'أهلاً';
    $('#page-sub').textContent = Store.data.ready
      ? (view === 'home' ? [p.major, p.semester].filter(Boolean).join(' — ') : sub)
      : 'إعداد أولي';
    document.title = (Store.data.ready ? title : 'أهلاً') + ' — جدولي';
  }

  function markNav() {
    $$('[data-nav]').forEach(a => {
      if (a.dataset.nav === state.view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function applyFocus(focus) {
    const [kind, id] = focus.split(':');
    const sel = kind === 'course' ? `[data-course="${CSS.escape(id)}"]`
              : kind === 'session' ? `[data-session="${CSS.escape(id)}"]`
              : kind === 'exam' ? `[data-exam="${CSS.escape(id)}"]`
              : null;
    if (sel) requestAnimationFrame(() => UI.flash(sel));
  }

  const go = (view, focus) =>
    location.hash = `#/${view}${focus ? `?focus=${encodeURIComponent(focus)}` : ''}`;

  /* ============================== الإجراءات ============================== */
  const ACT = {

    /* --- الترحيب --- */
    'finish-welcome': () => {
      const name = $('#w-name').value.trim();
      if (!name) { UI.toast('اكتب اسمك أولاً', 'info'); $('#w-name').focus(); return; }
      Store.setProfile({
        name,
        major: $('#w-major').value.trim(),
        university: $('#w-uni').value.trim(),
        year: $('#w-year').value,
        semester: $('#w-sem').value
      });
      Store.data.ready = true;
      Store.commit('ready');
      UI.toast(`أهلاً ${name}`);
      go('home');
    },

    /* --- تنقل وأوراق --- */
    'close-sheet': () => UI.closeSheet(),
    'close-search': () => UI.closeFinder(),
    'search': () => UI.openFinder(),
    'print': () => window.print(),
    'goto-course': el => { UI.closeSheet(); go('courses', 'course:' + el.dataset.c); },

    /* --- المقررات --- */
    'add-course': () => Views.openCourseSheet(null),
    'edit-course': el => Views.openCourseSheet(el.dataset.c),
    'toggle-course': el => {
      const id = el.dataset.c;
      state.open.has(id) ? state.open.delete(id) : state.open.add(id);
      const card = $(`[data-course="${CSS.escape(id)}"]`);
      if (card) {
        card.classList.toggle('open', state.open.has(id));
        el.setAttribute('aria-expanded', String(state.open.has(id)));
      }
    },
    'del-course': async el => {
      const c = Store.course(el.dataset.c);
      if (!c) return;
      const ok = await UI.confirm({
        title: 'حذف المقرر', danger: true, okText: 'احذف',
        body: `بينحذف ${c.code} وكل حصصه واختباراته وفصوله. ما فيه تراجع.`
      });
      if (ok) { Store.removeCourse(c.id); UI.toast('انحذف المقرر'); }
    },

    /* --- الحصص --- */
    'open-session': el => Views.sessionDetail(el.dataset.c, el.dataset.s),
    'add-session': el => Views.sessionForm(el.dataset.c, null),
    'edit-session': el => Views.sessionForm(el.dataset.c, el.dataset.s),
    'save-session': el => {
      const form = $('#session-form');
      const c = form.dataset.c, id = form.dataset.s;
      const patch = {};
      $$('[data-f]', form).forEach(f => { patch[f.dataset.f] = f.value; });
      patch.day = +patch.day;
      if (U.toMin(patch.end) <= U.toMin(patch.start)) { UI.toast('وقت النهاية لازم بعد البداية', 'bad'); return; }
      if (el.dataset.new === '1') Store.addSession(c, patch);
      else Store.updateSession(c, id, patch);
      UI.closeSheet(); UI.toast('تم الحفظ');
    },
    'del-session': async el => {
      const ok = await UI.confirm({ title: 'حذف الحصة', body: 'بتنشال من الجدول.', okText: 'احذف', danger: true });
      if (ok) { Store.removeSession(el.dataset.c, el.dataset.s); UI.closeSheet(); UI.toast('انحذفت الحصة'); }
    },

    /* --- الاختبارات --- */
    'add-exam': el => Views.examForm(el.dataset.c || null, null),
    'edit-exam': el => Views.examForm(el.dataset.c, el.dataset.x),
    'save-exam': el => {
      const form = $('#exam-form');
      const patch = {};
      $$('[data-f]', form).forEach(f => { patch[f.dataset.f] = f.value; });
      const courseId = patch.courseId || form.dataset.c;
      delete patch.courseId;
      if (!patch.date) { UI.toast('حدد التاريخ', 'bad'); return; }
      if (el.dataset.new === '1') Store.addExam(courseId, patch);
      else Store.updateExam(form.dataset.c, form.dataset.x, patch);
      UI.closeSheet(); UI.toast('تم الحفظ');
    },
    'del-exam': async el => {
      const ok = await UI.confirm({ title: 'حذف الاختبار', body: 'بينشال من القائمة.', okText: 'احذف', danger: true });
      if (ok) { Store.removeExam(el.dataset.c, el.dataset.x); UI.closeSheet(); UI.toast('انحذف'); }
    },
    'ics': el => exportICS(el.dataset.c, el.dataset.x),

    /* --- الفصول والروابط --- */
    'toggle-chapter': el => Store.toggleChapter(el.dataset.c, el.dataset.ch),
    'del-chapter': el => Store.removeChapter(el.dataset.c, el.dataset.ch),
    'add-chapter': el => Views.chapterForm(el.dataset.c),
    'save-chapter': () => {
      const form = $('#chapter-form');
      const id = form.dataset.c;
      const one = $('#cf-title').value.trim();
      const bulk = $('#cf-bulk').value.trim();
      const items = bulk ? bulk.split('\n').map(s => s.trim()).filter(Boolean) : (one ? [one] : []);
      if (!items.length) { UI.toast('اكتب عنوان الفصل', 'info'); return; }
      items.forEach(t => Store.addChapter(id, t));
      UI.closeSheet(); UI.toast(`أُضيف ${items.length} فصل`);
    },
    'add-link': el => Views.linkForm(el.dataset.c),
    'save-link': () => {
      const form = $('#link-form');
      const label = $('#lf-label').value.trim();
      let url = $('#lf-url').value.trim();
      if (!label || !url) { UI.toast('الاسم والرابط مطلوبين', 'info'); return; }
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      Store.addLink(form.dataset.c, label, url);
      UI.closeSheet(); UI.toast('انضاف الرابط');
    },
    'del-link': el => Store.removeLink(el.dataset.c, el.dataset.l),

    /* --- الغياب --- */
    'abs': el => {
      const c = Store.course(el.dataset.c);
      const before = Store.absenceState(c).level;
      Store.bumpAbsence(el.dataset.c, +el.dataset.d);
      const after = Store.absenceState(c);
      if (after.level === 'bad' && before !== 'bad') UI.toast(`${c.code}: وصلت حد الحرمان`, 'bad');
      else if (after.level === 'warn' && before === 'ok') UI.toast(`${c.code}: قربت من الحد`, 'info');
    },

    /* --- الأذكار --- */
    'adhkar-period': el => { state.period = el.dataset.p; render({ keepScroll: true }); },
    'dhikr': el => {
      const total = +el.dataset.total, period = el.dataset.p, id = el.dataset.id;
      const box = Store.adhkarToday();
      const count = Math.min(total, (box[period][id] || 0) + 1);
      box[period][id] = count;
      Store.save();

      const left = total - count;
      if (left > 0) {
        // تحديث الرقم فقط — أخف بكثير من إعادة رسم الصفحة مع كل ضغطة
        const num = el.querySelector('.num');
        if (num) num.textContent = left;
        return;
      }
      render({ keepScroll: true });
      const prog = Store.adhkarProgress(period);
      UI.toast(prog.done === prog.total ? 'تمّت أذكارك، تقبّل الله' : 'تمّ الذكر', 'ok');
    },
    'dhikr-reset': el => Store.resetDhikr(el.dataset.p, el.dataset.id),
    'dhikr-reset-all': async el => {
      const ok = await UI.confirm({ title: 'إعادة العدّ', body: 'بيرجع عدّاد كل الأذكار لهالفترة من الصفر.', okText: 'أعِد' });
      if (ok) Store.resetDhikr(el.dataset.p, null);
    },

    /* --- الجدول --- */
    'sched-view': el => { Store.setPrefs({ view: el.dataset.v }); },
    'sched-day': el => { state.day = +el.dataset.d; render({ keepScroll: true }); },

    /* --- المظهر --- */
    'theme': el => UI.theme.set(el.dataset.themeVal),
    'cycle-theme': () => UI.theme.cycle(),
    'accent': el => { Store.setPrefs({ accent: el.dataset.a }); UI.theme.apply(); },
    'toggle-day': el => {
      const d = +el.dataset.d;
      const days = new Set(Store.prefs.days);
      days.has(d) ? days.delete(d) : days.add(d);
      Store.setPrefs({ days: Array.from(days).sort((a, b) => a - b) });
    },

    /* --- البيانات --- */
    'export': () => {
      U.download(`jadwali-${U.isoOf()}.json`, Store.exportJSON());
      UI.toast('نزّلنا النسخة الاحتياطية');
    },
    'import': () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/json,.json';
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try { Store.importJSON(reader.result); UI.toast('تمت الاستعادة'); }
          catch (err) { UI.toast('الملف غير صالح', 'bad'); console.error(err); }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    'reset': async () => {
      const ok = await UI.confirm({
        title: 'مسح كل البيانات', danger: true, okText: 'امسح',
        body: 'بتروح كل المقررات والحصص والاختبارات. خذ نسخة احتياطية قبل لو تبي ترجع لها.'
      });
      if (ok) { Store.reset(); state.open.clear(); UI.toast('انمسح كل شي'); go('home'); }
    },
    'install': async () => {
      if (!state.installPrompt) {
        UI.toast('من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية»', 'info');
        return;
      }
      state.installPrompt.prompt();
      const { outcome } = await state.installPrompt.userChoice;
      if (outcome === 'accepted') UI.toast('تم التثبيت');
      state.installPrompt = null;
    },

    /* --- المعالج --- */
    'wiz-tab': el => {
      if (Views.wizard.tab === 'manual') Views.syncDraft();
      Views.wizard.tab = el.dataset.t;
      Views.wizard.course = null; Views.wizard.chosen = -1; Views.wizard.src = '';
      Views.refreshWizard();
    },
    'copy-tool': async () => {
      const ok = await U.copy(UCS.BOOKMARKLET);
      UI.toast(ok ? 'الصقها في شريط العناوين داخل صفحة UCS ثم Enter' : 'ما قدرت أنسخ', ok ? 'ok' : 'bad');
    },

    /* --- اختيار من الكتالوج المدمج --- */
    'pick-course': el => {
      const c = Catalog.get(el.dataset.code);
      if (!c) return;
      Views.wizard.course = c;
      Views.wizard.src = 'catalog';
      Views.wizard.chosen = c.sections.length === 1 ? 0 : -1;
      Views.refreshWizard();
    },

    /* --- اختيار من نص ملصوق --- */
    'parse-ucs': () => {
      const raw = ($('#ucs-paste') || {}).value || '';
      Views.wizard.raw = raw;
      if (!raw.trim()) { UI.toast('الصق الصفحة أولاً', 'info'); return; }
      const result = UCS.parse(raw);
      Views.wizard.parsed = result;
      Views.wizard.course = null;
      Views.wizard.chosen = -1;
      Views.refreshWizard();
      UI.toast(result.courses.length ? `لقيت ${result.courses.length} مقرر` : 'ما لقيت مقررات',
        result.courses.length ? 'ok' : 'bad');
    },
    'pick-parsed': el => {
      const c = Views.wizard.parsed && Views.wizard.parsed.courses[+el.dataset.i];
      if (!c) return;
      Views.wizard.course = c;
      Views.wizard.src = 'paste';
      Views.wizard.chosen = c.sections.length === 1 ? 0 : -1;
      Views.refreshWizard();
    },
    'back-courses': () => {
      Views.wizard.course = null;
      Views.wizard.chosen = -1;
      Views.wizard.src = '';
      Views.refreshWizard();
    },
    'pick-section': el => { Views.wizard.chosen = +el.dataset.i; Views.refreshWizard(); },
    'pick-color': el => {
      if (Views.wizard.tab === 'manual' || Views.wizard.editing) Views.syncDraft();
      Views.wizard.draft.color = el.dataset.col;
      Views.refreshWizard();
    },
    'draft-add-session': () => {
      Views.syncDraft();
      Views.wizard.draft.sessions.push({ days: [], start: '08:00', end: '08:50', room: '', kind: 'lecture' });
      Views.refreshWizard();
    },
    'draft-del-session': el => {
      Views.syncDraft();
      Views.wizard.draft.sessions.splice(+el.dataset.i, 1);
      if (!Views.wizard.draft.sessions.length)
        Views.wizard.draft.sessions.push({ days: [], start: '08:00', end: '08:50', room: '', kind: 'lecture' });
      Views.refreshWizard();
    },
    'draft-day': el => {
      Views.syncDraft();
      const row = Views.wizard.draft.sessions[+el.dataset.i];
      const d = +el.dataset.d;
      const i = row.days.indexOf(d);
      i === -1 ? row.days.push(d) : row.days.splice(i, 1);
      row.days.sort((a, b) => a - b);
      Views.refreshWizard();
    },
    'add-selected': () => {
      const w = Views.wizard;
      const section = w.course && w.course.sections[w.chosen];
      if (!section) { UI.toast('اختر شعبة', 'info'); return; }
      const maker = w.src === 'catalog' ? Catalog.toCourse : UCS.toCourse;
      const patch = maker(w.course, section, {
        color: w.draft.color,
        maxAbsences: Store.prefs.defaultMaxAbs
      });
      const clash = firstClash(patch.sessions);
      const c = Store.addCourse(patch);
      UI.closeSheet();
      UI.toast(clash ? `انضاف ${c.code} — لكن فيه تعارض مع ${clash}` : `انضاف ${c.code}`, clash ? 'info' : 'ok');
      go('courses', 'course:' + c.id);
    },

    'save-manual': () => {
      Views.syncDraft();
      const d = Views.wizard.draft;
      if (!d.code.trim()) { UI.toast('رمز المقرر مطلوب', 'info'); return; }

      const sessions = [];
      d.sessions.forEach(row => {
        if (U.toMin(row.end) <= U.toMin(row.start)) return;
        row.days.forEach(day => sessions.push({
          day, start: row.start, end: row.end, room: row.room.trim(), kind: row.kind
        }));
      });

      const base = {
        code: d.code.trim().toUpperCase(),
        title: d.title.trim(),
        section: String(d.section).trim(),
        instructor: d.instructor.trim(),
        credits: +d.credits || 0,
        color: d.color,
        maxAbsences: +d.maxAbsences || Store.prefs.defaultMaxAbs
      };

      if (Views.wizard.editing) {
        const id = Views.wizard.editing;
        Store.updateCourse(id, base);
        Store.replaceSessions(id, sessions);
        const course = Store.course(id);
        const final = course.exams.find(x => x.kind === 'final');
        if (d.final.date) {
          if (final) Store.updateExam(id, final.id, d.final);
          else Store.addExam(id, Object.assign({ kind: 'final' }, d.final));
        } else if (final) {
          Store.removeExam(id, final.id);
        }
        UI.closeSheet(); UI.toast('تم حفظ التعديلات');
      } else {
        const exams = d.final.date ? [Object.assign({ kind: 'final' }, d.final)] : [];
        const c = Store.addCourse(Object.assign({}, base, { sessions, exams }));
        UI.closeSheet();
        UI.toast(`انضاف ${c.code}`);
        go('courses', 'course:' + c.id);
      }
    }
  };

  /* ============================== الأحداث ============================== */
  document.addEventListener('click', ev => {
    const hit = ev.target.closest('[data-hit]');
    if (hit) { UI.openHit(+hit.dataset.hit); return; }

    const actEl = ev.target.closest('[data-act]');
    if (actEl && ACT[actEl.dataset.act]) {
      if (actEl.tagName !== 'INPUT' && actEl.tagName !== 'TEXTAREA') {
        ev.preventDefault();
        ACT[actEl.dataset.act](actEl, ev);
        return;
      }
    }

    const link = ev.target.closest('[data-link]');
    if (link) {
      const href = link.getAttribute('href');
      if (href) { ev.preventDefault(); location.hash = href; }
    }
  });

  /* إدخال مباشر: لا نعيد الرسم حتى لا يضيع مؤشر الكتابة */
  document.addEventListener('input', ev => {
    const t = ev.target;

    if (t.id === 'finder-input') { UI.renderHits(t.value); return; }

    if (t.dataset.act === 'course-note') {
      const c = Store.course(t.dataset.c);
      if (c) { c.note = t.value; Store.save(); }
      return;
    }
    if (t.dataset.act === 'max-abs') {
      const c = Store.course(t.dataset.c);
      if (c) { c.maxAbsences = U.clamp(+t.value || 1, 1, 30); Store.save(); }
      return;
    }
    if (t.id === 'cat-q') {
      Views.wizard.query = t.value;
      Views.refreshCatalogResults();
      return;
    }
    if (t.dataset.pref && t.type === 'range') {
      const echo = document.querySelector(`[data-echo="${t.dataset.pref}"]`);
      if (echo) echo.textContent = t.value + '%';
      return;
    }
  });

  document.addEventListener('change', ev => {
    const t = ev.target;

    if (t.dataset.profile) { Store.setProfile({ [t.dataset.profile]: t.value }); return; }

    if (t.dataset.pref) {
      const key = t.dataset.pref;
      let value;
      if (key === 'density') value = t.checked ? 'compact' : 'cozy';
      else if (t.type === 'range' || t.type === 'number') value = +t.value;
      else value = t.value;
      Store.setPrefs({ [key]: value });
      if (key === 'density') UI.theme.apply();
      return;
    }
    if (t.dataset.act === 'max-abs') { Store.commit('absence'); return; }
  });

  /* لوحة المفاتيح */
  document.addEventListener('keydown', ev => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName);
    const finderOpen = !$('#search-layer').hidden;

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); UI.openFinder(); return; }

    if (ev.key === 'Escape') {
      if (finderOpen) UI.closeFinder();
      else UI.closeSheet();
      return;
    }
    if (finderOpen) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); UI.moveCursor(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); UI.moveCursor(-1); }
      else if (ev.key === 'Enter') {
        ev.preventDefault();
        const sel = $('#finder-results .hit.sel');
        if (sel) UI.openHit(+sel.dataset.hit);
      }
      return;
    }
    if (typing || UI.anyLayerOpen() || !Store.data.ready) return;

    const map = { '1': 'home', '2': 'schedule', '3': 'exams', '4': 'courses', '5': 'adhkar', '6': 'settings' };
    if (map[ev.key]) { go(map[ev.key]); return; }

    const k = ev.key.toLowerCase();
    if (k === '/') { ev.preventDefault(); UI.openFinder(); }
    else if (k === 'a') Views.openCourseSheet(null);
    else if (k === 'g' && state.view === 'schedule') {
      Store.setPrefs({ view: Store.prefs.view === 'grid' ? 'day' : 'grid' });
    }
  });

  window.addEventListener('hashchange', () => render());
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.installPrompt = e; });
  window.addEventListener('scroll', () => {
    $('.topbar').classList.toggle('stuck', window.scrollY > 6);
  }, { passive: true });

  /* ============================== النبض ============================== */
  function tick() {
    $$('[data-countdown]').forEach(el => {
      const t = U.until(+el.dataset.countdown);
      const cells = el.querySelectorAll('b');
      const vals = [t.d, t.h, t.m, t.s];
      cells.forEach((b, i) => { b.textContent = U.pad(vals[i]); });
    });

    const line = $('#now-line');
    if (line) {
      const { lo } = Store.gridBounds();
      line.style.top = `calc(var(--min-per-px) * ${U.nowMin() - lo}px)`;
    }

    const prog = document.querySelector('.ribbon-now.live .prog > i');
    const live = Store.liveSession();
    if (prog && live) {
      const pct = ((U.nowMin() - U.toMin(live.s.start)) / U.lengthOf(live.s.start, live.s.end)) * 100;
      prog.style.width = U.clamp(pct, 0, 100).toFixed(1) + '%';
    }
  }

  /** يرجع رمز أول مقرر يتعارض وقته مع الحصص الجديدة */
  function firstClash(sessions) {
    const existing = Store.allSessions();
    for (const s of sessions) {
      const a1 = U.toMin(s.start), a2 = U.toMin(s.end);
      const hit = existing.find(x =>
        x.s.day === s.day && a1 < U.toMin(x.s.end) && U.toMin(x.s.start) < a2);
      if (hit) return hit.c.code;
    }
    return '';
  }

  /* ============================== تصدير ICS ============================== */
  function exportICS(courseId, examId) {
    const c = Store.course(courseId);
    const x = c && c.exams.find(e => e.id === examId);
    if (!x || !x.date) { UI.toast('ما فيه تاريخ للاختبار', 'bad'); return; }

    const stamp = (date, time) => date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
    const label = { final: 'الامتحان النهائي', midterm: 'اختبار منتصف الفصل', quiz: 'كويز' }[x.kind] || 'اختبار';

    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jadwali//AR//', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${x.id}@jadwali`,
      `DTSTAMP:${stamp(U.isoOf(), '000000'.slice(0, 5) || '00:00')}`,
      `DTSTART:${stamp(x.date, x.start)}`,
      `DTEND:${stamp(x.date, x.end)}`,
      `SUMMARY:${label} — ${c.code}${c.title ? ' ' + c.title : ''}`,
      x.room ? `LOCATION:${x.room}` : '',
      `DESCRIPTION:${c.title || ''}${c.section ? ' — شعبة ' + c.section : ''}`,
      'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:باقي أسبوع', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:باقي يوم', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', 'DESCRIPTION:باقي ٣ ساعات', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].filter(Boolean);

    U.download(`${c.code}-${x.kind}.ics`, lines.join('\r\n'), 'text/calendar');
    UI.toast('نزّلنا ملف التقويم');
  }

  /* ============================== الإقلاع ============================== */
  function boot() {
    Store.load();
    UI.theme.apply();

    Store.on(reason => {
      UI.theme.apply();
      render({ keepScroll: true });
      if (reason === 'prefs' || reason === 'import' || reason === 'reset') { /* لا شيء إضافي */ }
    });

    if (!location.hash) location.hash = '#/home';
    render();
    Icons.paint(document);

    setInterval(tick, 1000);
    // تحديث الحالات الحية (الحصة الجارية، الماضية) كل دقيقة
    setInterval(() => {
      if (!UI.anyLayerOpen() && (state.view === 'home' || state.view === 'schedule')) render({ keepScroll: true });
    }, 60000);

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
    }
    window.addEventListener('offline', () => UI.toast('أنت أوفلاين — التطبيق يشتغل عادي', 'info'));
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
