/* ==========================================================================
   views.js — رسم الشاشات والنماذج
   كل دالة ترجع HTML كنص؛ التفاعل يُدار في app.js عبر data-act
   ========================================================================== */
window.Views = (function () {
  const { esc, attr } = U;

  const KIND = { lecture: 'محاضرة', lab: 'مختبر', tutorial: 'تمارين', online: 'عن بُعد' };
  const KIND_ICON = { lecture: 'cap', lab: 'flask', tutorial: 'users', online: 'monitor' };
  const EXAM = { final: 'نهائي', midterm: 'منتصف الفصل', quiz: 'كويز' };

  /* =========================== قطع صغيرة =========================== */

  function courseLine(c) {
    return `${esc(c.code)}${c.section ? ` <span class="dim">شعبة ${esc(c.section)}</span>` : ''}`;
  }

  function countdown(ms) {
    const t = U.until(ms);
    return `<div class="countdown" data-countdown="${ms}">
      <div><b>${U.pad(t.d)}</b><span>يوم</span></div>
      <div><b>${U.pad(t.h)}</b><span>ساعة</span></div>
      <div><b>${U.pad(t.m)}</b><span>دقيقة</span></div>
      <div><b>${U.pad(t.s)}</b><span>ثانية</span></div>
    </div>`;
  }

  function emptyBlock(icon, title, text, action) {
    return `<div class="empty card">
      <span class="empty-mark"><i data-i="${icon}"></i></span>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${action || ''}
    </div>`;
  }

  function academicYears() {
    const now = new Date();
    const base = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return [base - 1, base, base + 1].map(y => `${y}/${y + 1}`);
  }

  /* ============================== الترحيب ============================== */
  function welcome() {
    const years = academicYears();
    const p = Store.profile;
    return `<section class="welcome">
      <div class="welcome-mark"></div>
      <h1>جدولك، مرتّب من أول يوم</h1>
      <p class="muted">أدخل بياناتك مرة وحدة، وبعدها أضف مقرراتك من موقع UCS أو يدوياً. كل شي ينحفظ على جهازك فقط.</p>

      <div class="field">
        <label for="w-name">الاسم</label>
        <input class="input" id="w-name" placeholder="اسمك كما تحب أن يظهر" value="${attr(p.name)}" autocomplete="given-name">
      </div>
      <div class="field">
        <label for="w-major">التخصص</label>
        <input class="input" id="w-major" placeholder="هندسة برمجيات، محاسبة، طب…" value="${attr(p.major)}">
      </div>
      <div class="field">
        <label for="w-uni">الجامعة</label>
        <input class="input" id="w-uni" value="${attr(p.university || 'جامعة البحرين')}">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="w-year">السنة الدراسية</label>
          <select class="select" id="w-year">
            ${years.map(y => `<option value="${y}"${p.year === y ? ' selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="w-sem">الفصل</label>
          <select class="select" id="w-sem">
            ${['الفصل الأول', 'الفصل الثاني', 'الفصل الصيفي']
              .map(s => `<option${p.semester === s ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <button class="btn btn-primary btn-lg btn-block" data-act="finish-welcome">ابدأ</button>
    </section>`;
  }

  /* ============================== الرئيسية ============================== */
  function home() {
    const p = Store.profile;
    const now = new Date();
    const hour = now.getHours();
    const greet = hour < 5 ? 'ليلة هادئة' : hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء الخير';
    const st = Store.stats();

    if (!Store.courses().length) {
      return `<section>
        ${ribbonShell(greet, p, '')}
        ${emptyBlock('library', 'ما فيه مقررات بعد',
          'أضف مقرراتك من موقع UCS بنسخ جدول السكاشن، أو أدخلها يدوياً — وبيترتب الجدول والامتحانات تلقائياً.',
          `<button class="btn btn-primary" data-act="add-course"><i data-i="plus"></i><span>أضف أول مقرر</span></button>`)}
      </section>`;
    }

    const today = Store.sessionsOn(now.getDay());
    const live = Store.liveSession(now);
    const next = Store.nextSession(now);
    const exam = Store.nextExam();

    /* ---- الشريط ---- */
    let nowBlock;
    if (live) {
      const pct = ((U.nowMin(now) - U.toMin(live.s.start)) / U.lengthOf(live.s.start, live.s.end)) * 100;
      nowBlock = `<button class="ribbon-now live" data-act="open-session" data-c="${live.c.id}" data-s="${live.s.id}">
        <span class="dot"></span>
        <span class="truncate" style="flex:1">
          <span class="label">جارية الآن · تنتهي ${U.time12(live.s.end)}</span>
          <span class="title truncate">${esc(live.c.code)} — ${esc(KIND[live.s.kind])}</span>
          <span class="sub truncate">${esc(live.s.room || 'بدون قاعة محددة')}</span>
        </span>
        <span class="prog"><i style="width:${U.clamp(pct, 0, 100).toFixed(1)}%"></i></span>
      </button>`;
    } else if (next) {
      const when = next.offset === 0 ? U.relative(dayStamp(now, next.s.start))
        : next.offset === 1 ? `غداً ${U.time12(next.s.start)}`
        : `${U.DAY_FULL[next.s.day]} ${U.time12(next.s.start)}`;
      nowBlock = `<button class="ribbon-now" data-act="open-session" data-c="${next.c.id}" data-s="${next.s.id}">
        <i data-i="clock" style="color:var(--ink-3)"></i>
        <span class="truncate" style="flex:1">
          <span class="label">القادمة ${esc(when)}</span>
          <span class="title truncate">${esc(next.c.code)} — ${esc(KIND[next.s.kind])}</span>
          <span class="sub truncate">${esc(next.s.room || 'بدون قاعة محددة')}</span>
        </span>
        <i data-i="back" style="color:var(--ink-3)"></i>
      </button>`;
    } else {
      nowBlock = `<div class="ribbon-now"><i data-i="sparkle" style="color:var(--ink-3)"></i>
        <span><span class="title">ما فيه محاضرات قادمة</span>
        <span class="sub">أضف حصصك من صفحة المقررات</span></span></div>`;
    }

    const track = today.length ? `<div class="track">${today.map((x, i) => {
      const prev = today[i - 1];
      const gap = prev ? U.toMin(x.s.start) - U.toMin(prev.s.end) : 0;
      const m = U.nowMin(now);
      const isNow = U.toMin(x.s.start) <= m && m < U.toMin(x.s.end);
      const isPast = U.toMin(x.s.end) <= m;
      return `${gap >= 30 ? `<div class="track-item"><div></div><div class="track-rail"></div>
          <div class="track-gap">فراغ ${U.durationText(gap)}</div></div>` : ''}
        <button class="track-item ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''}"
                style="--c:${esc(x.c.color)}" data-act="open-session" data-c="${x.c.id}" data-s="${x.s.id}">
          <span class="track-time"><b>${U.time12(x.s.start).replace(' ', '')}</b><span>${U.time12(x.s.end).replace(' ', '')}</span></span>
          <span class="track-rail"><span class="track-dot"></span></span>
          <span class="track-card">
            <span class="t truncate">${esc(x.c.code)} <span class="dim small">${esc(KIND[x.s.kind])}</span></span>
            <span class="s truncate">${esc(x.s.room || 'بدون قاعة')}${x.c.title ? ' — ' + esc(x.c.title) : ''}</span>
          </span>
        </button>`;
    }).join('')}</div>` : `<div class="track"><p class="muted small" style="padding:0 0 var(--s4)">ما عندك محاضرات اليوم.</p></div>`;

    /* ---- الأرقام ---- */
    const figures = `<div class="figures">
      <button class="figure" data-link href="#/courses"><b class="num">${st.count}</b><span>مقرر</span></button>
      <button class="figure" data-link href="#/schedule"><b class="num">${(st.weekly / 60).toFixed(1)}</b><span>ساعة أسبوعياً</span></button>
      <button class="figure" data-link href="#/exams"><b class="num">${exam ? U.daysBetween(exam.x.date) : '—'}</b><span>${exam ? 'يوم للاختبار القادم' : 'لا اختبارات'}</span></button>
      <button class="figure ${st.atRisk.length ? 'alarm' : ''}" data-link href="#/courses"><b class="num">${st.absences}</b><span>${st.atRisk.length ? st.atRisk.length + ' مقرر بحاجة انتباه' : 'غياب مسجّل'}</span></button>
    </div>`;

    /* ---- تنبيه الحرمان ---- */
    const risk = st.atRisk.length ? `<div class="stack-sm" style="margin-top:var(--s4)">
      ${st.atRisk.map(c => {
        const s = Store.absenceState(c);
        return `<button class="note ${s.level}" style="width:100%;text-align:start" data-act="goto-course" data-c="${c.id}">
          <i data-i="alert"></i>
          <span><b>${esc(c.code)}</b> ${esc(s.text)} — ${c.absences} من ${c.maxAbsences} غياب.</span>
        </button>`;
      }).join('')}</div>` : '';

    const examBlock = exam ? `
      <div class="sec"><h2>الاختبار القادم</h2><a class="sec-act small" href="#/exams" data-link>كل الاختبارات</a></div>
      <article class="exam" style="--c:${esc(exam.c.color)}">
        <div class="exam-top">
          <span class="tag ${exam.x.kind === 'final' ? 'bad' : 'warn'}">${esc(EXAM[exam.x.kind])}</span>
          <b class="truncate">${courseLine(exam.c)}</b>
        </div>
        <div class="exam-when">
          <div><small>التاريخ</small><b>${esc(U.fmtShort(exam.x.date))}</b></div>
          <div><small>الوقت</small><b class="num">${esc(U.time12(exam.x.start))}</b></div>
          <div><small>المكان</small><b class="truncate">${esc(exam.x.room || '—')}</b></div>
        </div>
        <div class="exam-body">${countdown(exam.at)}</div>
      </article>` : '';

    const period = ADHKAR.suggested(now);
    const dh = Store.adhkarProgress(period);
    const adhkarStrip = `<button class="card card-pad adhkar-strip" data-link href="#/adhkar">
      <span class="adhkar-mark"><i data-i="${period === 'morning' ? 'sun' : 'moon'}"></i></span>
      <span style="flex:1;min-width:0;text-align:start">
        <b>${esc(ADHKAR.title(period))}</b>
        <span class="bar" style="margin-top:8px"><i style="width:${dh.pct}%"></i></span>
      </span>
      <span class="num dim">${dh.done}/${dh.total}</span>
    </button>`;

    return `<section>
      ${ribbonShell(greet, p, nowBlock + track)}
      <div style="margin-top:var(--s4)">${figures}</div>
      <div style="margin-top:var(--s3)">${adhkarStrip}</div>
      ${risk}
      ${examBlock}
      <div class="sec"><h2>مقرراتك</h2><a class="sec-act small" href="#/courses" data-link>إدارة</a></div>
      <div class="grid-auto">${Store.courses().map(courseGlance).join('')}</div>
    </section>`;
  }

  function ribbonShell(greet, p, inner) {
    const today = U.isoOf();
    return `<div class="ribbon">
      <div class="ribbon-head">
        <div style="min-width:0">
          <div class="greet">${esc(greet)}${p.name ? '، ' + esc(p.name) : ''}</div>
          <div class="date">${esc(U.fmtFull(today))}</div>
        </div>
      </div>
      ${inner}
    </div>`;
  }

  function dayStamp(now, time) {
    const d = new Date(now);
    const m = U.toMin(time);
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    return d.getTime();
  }

  function courseGlance(c) {
    const cov = Store.coverage(c);
    const abs = Store.absenceState(c);
    return `<button class="card card-pad" style="text-align:start;width:100%" data-act="goto-course" data-c="${c.id}">
      <div class="row">
        <span class="course-code" style="--c:${esc(c.color)}">${esc(c.code)}</span>
        <span class="truncate strong">${esc(c.title || '')}</span>
        <span class="push tag ${abs.level === 'ok' ? '' : abs.level}">${c.absences}/${c.maxAbsences}</span>
      </div>
      <p class="small dim truncate" style="margin-top:6px">
        ${c.sessions.length} حصة أسبوعياً${c.instructor ? ' — ' + esc(c.instructor) : ''}
      </p>
      ${cov ? `<div class="bar" style="margin-top:10px"><i style="width:${cov.pct}%;background:${esc(c.color)}"></i></div>
        <p class="tiny dim" style="margin-top:5px">${cov.done} من ${cov.total} فصل</p>` : ''}
    </button>`;
  }

  /* ============================== الجدول ============================== */
  function schedule(state) {
    if (!Store.courses().length) {
      return emptyBlock('calendar', 'الجدول فاضي',
        'أضف مقرراتك وبتشوف أسبوعك كامل هنا.',
        `<button class="btn btn-primary" data-act="add-course"><i data-i="plus"></i><span>أضف مقرر</span></button>`);
    }
    const view = Store.prefs.view || 'grid';
    return `<section>
      <div class="sched-tools">
        <div class="segmented" role="group" aria-label="طريقة العرض">
          <button data-act="sched-view" data-v="grid" aria-pressed="${view === 'grid'}"><i data-i="grid"></i>الأسبوع</button>
          <button data-act="sched-view" data-v="day" aria-pressed="${view === 'day'}"><i data-i="rows"></i>اليوم</button>
        </div>
        <button class="btn btn-quiet btn-sm push no-print" data-act="print"><i data-i="print"></i><span>طباعة</span></button>
      </div>
      ${view === 'grid' ? weekGrid() : dayView(state)}
    </section>`;
  }

  function weekGrid() {
    const days = Store.activeDays();
    const { lo, hi } = Store.gridBounds();
    const rows = Math.round((hi - lo) / 10);
    const today = new Date().getDay();
    const cols = `46px repeat(${days.length}, minmax(94px, 1fr))`;

    let cells = '';
    days.forEach((d, i) => {
      cells += `<div class="day-col ${d === today ? 'today' : ''}" style="grid-column:${i + 2}"></div>`;
    });
    for (let m = lo; m < hi; m += 60) {
      const r = Math.round((m - lo) / 10) + 1;
      cells += `<div class="hour-mark" style="grid-row:${r} / span 6">${U.toHHMM(m)}</div>`;
      cells += `<div class="hour-line" style="grid-row:${r}"></div>`;
    }

    days.forEach((d, i) => {
      Store.sessionsOn(d).forEach(({ s, c }) => {
        const a = U.clamp(Math.round((U.toMin(s.start) - lo) / 10), 0, rows - 1) + 1;
        const b = U.clamp(Math.round((U.toMin(s.end) - lo) / 10), 1, rows) + 1;
        const len = U.lengthOf(s.start, s.end);
        const isNow = d === today && U.toMin(s.start) <= U.nowMin() && U.nowMin() < U.toMin(s.end);
        cells += `<button class="tape ${len < 45 ? 'tiny' : ''} ${isNow ? 'is-now' : ''}"
            data-session="${s.id}"
            style="--c:${esc(c.color)};grid-column:${i + 2};grid-row:${a} / ${b}"
            data-act="open-session" data-c="${c.id}" data-s="${s.id}">
          <b>${esc(c.code)}</b>
          <span class="truncate">${esc(KIND[s.kind])}</span>
          <span class="num">${s.start}–${s.end}</span>
          <span class="tape-room truncate">${esc(s.room || '')}</span>
        </button>`;
      });
    });

    const showLine = days.includes(today) && U.nowMin() >= lo && U.nowMin() <= hi;

    return `<div class="week"><div class="week-scroll"><div class="week-inner">
      <div class="week-head" style="grid-template-columns:${cols}">
        <div></div>
        ${days.map(d => `<div class="${d === today ? 'today' : ''}">${U.DAY_SHORT[d]}${d === today ? '<small>اليوم</small>' : ''}</div>`).join('')}
      </div>
      <div class="week-body" style="grid-template-columns:${cols}">
        ${cells}
        ${showLine ? `<div class="now-line" id="now-line" style="top:calc(var(--min-per-px) * ${U.nowMin() - lo}px)"></div>` : ''}
      </div>
    </div></div></div>`;
  }

  function dayView(state) {
    const days = Store.activeDays();
    const sel = days.includes(state.day) ? state.day : (days[0] ?? 0);
    const list = Store.sessionsOn(sel);
    const isToday = sel === new Date().getDay();
    const m = U.nowMin();

    const picker = `<div class="daypick">${days.map(d => {
      const n = Store.sessionsOn(d).length;
      return `<button data-act="sched-day" data-d="${d}" aria-pressed="${d === sel}">
        <b>${U.DAY_SHORT[d]}</b><span>${n || '—'}</span></button>`;
    }).join('')}</div>`;

    const body = list.length ? `<div class="track" style="padding:var(--s3) var(--s4) var(--s4)">
      ${list.map((x, i) => {
        const prev = list[i - 1];
        const gap = prev ? U.toMin(x.s.start) - U.toMin(prev.s.end) : 0;
        const isNow = isToday && U.toMin(x.s.start) <= m && m < U.toMin(x.s.end);
        const isPast = isToday && U.toMin(x.s.end) <= m;
        return `${gap >= 30 ? `<div class="track-item"><div></div><div class="track-rail"></div>
            <div class="track-gap">فراغ ${U.durationText(gap)}</div></div>` : ''}
          <button class="track-item ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''}"
                  style="--c:${esc(x.c.color)}" data-act="open-session" data-c="${x.c.id}" data-s="${x.s.id}"
                  data-session="${x.s.id}">
            <span class="track-time"><b>${U.time12(x.s.start).replace(' ', '')}</b><span>${U.time12(x.s.end).replace(' ', '')}</span></span>
            <span class="track-rail"><span class="track-dot"></span></span>
            <span class="track-card">
              <span class="t truncate">${esc(x.c.code)} <span class="dim small">${esc(KIND[x.s.kind])}</span></span>
              <span class="s truncate">${esc(x.s.room || 'بدون قاعة')}${x.c.title ? ' — ' + esc(x.c.title) : ''}</span>
            </span>
          </button>`;
      }).join('')}
    </div>` : `<div class="empty"><h3>يوم بدون محاضرات</h3><p>وقت ممتاز للمذاكرة.</p></div>`;

    return `<div>${picker}<div class="panel">${body}</div></div>`;
  }

  /* ============================== الاختبارات ============================== */
  function exams() {
    const up = Store.upcomingExams();
    const past = Store.pastExams();

    if (!Store.courses().length) {
      return emptyBlock('clipboard', 'ما فيه اختبارات',
        'أضف مقرراتك أولاً — وإذا استوردتها من UCS بيجي موعد الامتحان النهائي معها.',
        `<button class="btn btn-primary" data-act="add-course"><i data-i="plus"></i><span>أضف مقرر</span></button>`);
    }

    return `<section>
      <div class="row-wrap" style="margin-bottom:var(--s3)">
        <button class="btn btn-soft btn-sm" data-act="add-exam"><i data-i="plus"></i><span>أضف اختبار</span></button>
      </div>
      ${up.length
        ? `<div class="grid-auto">${up.map(e => examCard(e)).join('')}</div>`
        : emptyBlock('sparkle', 'ما فيه اختبار قادم', 'أضف مواعيد الكويزات ومنتصف الفصل حتى تتابعها من هنا.')}
      ${past.length ? `<div class="sec"><h2>انتهت</h2><span class="count">${past.length}</span></div>
        <div class="grid-auto">${past.slice(0, 6).map(e => examCard(e, true)).join('')}</div>` : ''}
    </section>`;
  }

  function examCard(entry, gone = false) {
    const { x, c, at } = entry;
    const days = U.daysBetween(x.date);
    const near = !gone && days <= 7;
    return `<article class="exam ${near ? 'near' : ''} ${gone ? 'gone' : ''}" style="--c:${esc(c.color)}" data-exam="${x.id}">
      <div class="exam-top">
        <span class="tag ${x.kind === 'final' ? 'bad' : x.kind === 'midterm' ? 'warn' : 'info'}">${esc(EXAM[x.kind] || 'اختبار')}</span>
        <b class="truncate">${courseLine(c)}</b>
        <button class="icon-btn push" data-act="edit-exam" data-c="${c.id}" data-x="${x.id}" aria-label="تعديل"><i data-i="pencil"></i></button>
      </div>
      <div class="exam-when">
        <div><small>التاريخ</small><b>${esc(U.fmtShort(x.date))}</b></div>
        <div><small>الوقت</small><b class="num">${esc(U.time12(x.start))}</b></div>
        <div><small>المكان</small><b class="truncate">${esc(x.room || '—')}</b></div>
      </div>
      <div class="exam-body">
        ${gone ? `<p class="small dim">${esc(U.fmtFull(x.date))}</p>` : countdown(at)}
        <div class="row-wrap" style="margin-top:var(--s3)">
          <button class="btn btn-quiet btn-sm" data-act="goto-course" data-c="${c.id}"><i data-i="book"></i><span>المقرر</span></button>
          ${gone ? '' : `<button class="btn btn-quiet btn-sm" data-act="ics" data-c="${c.id}" data-x="${x.id}"><i data-i="calendar"></i><span>أضفه للتقويم</span></button>`}
        </div>
      </div>
    </article>`;
  }

  /* ============================== المقررات ============================== */
  function courses(state) {
    const list = Store.courses();
    if (!list.length) {
      return emptyBlock('library', 'ابدأ بإضافة مقرر',
        'استورد من UCS بنسخ جدول السكاشن، أو أدخل المقرر يدوياً.',
        `<button class="btn btn-primary" data-act="add-course"><i data-i="plus"></i><span>أضف مقرر</span></button>`);
    }
    return `<section class="stack-sm">
      <div class="row-wrap" style="margin-bottom:var(--s2)">
        <button class="btn btn-soft btn-sm" data-act="add-course"><i data-i="plus"></i><span>أضف مقرر</span></button>
        <span class="dim small push">${list.length} مقرر · ${Store.stats().credits} ساعة معتمدة</span>
      </div>
      ${list.map(c => courseCard(c, state)).join('')}
    </section>`;
  }

  function courseCard(c, state) {
    const open = state.open.has(c.id);
    const abs = Store.absenceState(c);
    const cov = Store.coverage(c);

    return `<article class="course ${open ? 'open' : ''}" style="--c:${esc(c.color)}" data-course="${c.id}">
      <button class="course-head" data-act="toggle-course" data-c="${c.id}" aria-expanded="${open}">
        <span class="course-code">${esc(c.code || '—')}</span>
        <span class="truncate" style="flex:1">
          <span class="name truncate">${esc(c.title || 'بدون اسم')}</span>
          <span class="meta truncate">${c.section ? 'شعبة ' + esc(c.section) + ' · ' : ''}${esc(c.instructor || 'بدون مدرس')}</span>
        </span>
        ${abs.level !== 'ok' ? `<span class="tag ${abs.level}">${c.absences}/${c.maxAbsences}</span>` : ''}
        <i data-i="down" class="caret"></i>
      </button>

      <div class="course-body">
        <div class="row-wrap" style="margin-bottom:var(--s3)">
          <span class="chip chip-static"><i data-i="hash"></i>${+c.credits || 0} ساعات</span>
          <span class="chip chip-static"><i data-i="clock"></i>${c.sessions.length} حصة</span>
          ${cov ? `<span class="chip chip-static"><i data-i="target"></i>${cov.pct}% من الفصول</span>` : ''}
          <button class="btn btn-quiet btn-sm push" data-act="edit-course" data-c="${c.id}"><i data-i="pencil"></i><span>تعديل</span></button>
        </div>

        <h3 class="small muted" style="margin-bottom:6px">الحصص</h3>
        ${c.sessions.length ? c.sessions.map(s => `
          <button class="mini" data-act="edit-session" data-c="${c.id}" data-s="${s.id}">
            <i data-i="${KIND_ICON[s.kind]}" style="color:${esc(c.color)}"></i>
            <span class="when num">${U.DAY_SHORT[s.day]} ${s.start}</span>
            <span class="truncate" style="flex:1">
              <span class="truncate">${esc(KIND[s.kind])} · ${U.spanText(s.start, s.end)}</span>
              <span class="where truncate">${esc(s.room || 'بدون قاعة')}</span>
            </span>
            <i data-i="pencil" style="color:var(--ink-3)"></i>
          </button>`).join('')
          : `<p class="small dim">ما فيه حصص. أضف وحدة.</p>`}
        <button class="btn btn-plain btn-sm" style="margin-top:6px" data-act="add-session" data-c="${c.id}"><i data-i="plus"></i><span>أضف حصة</span></button>

        <h3 class="small muted" style="margin:var(--s4) 0 6px">الاختبارات</h3>
        ${c.exams.length ? c.exams.map(x => `
          <button class="mini" data-act="edit-exam" data-c="${c.id}" data-x="${x.id}">
            <i data-i="clipboard" style="color:${esc(c.color)}"></i>
            <span class="when">${esc(EXAM[x.kind] || 'اختبار')}</span>
            <span class="truncate" style="flex:1">
              <span class="truncate">${x.date ? esc(U.fmtLong(x.date)) : 'بدون تاريخ'}</span>
              <span class="where truncate">${U.time12(x.start)} · ${esc(x.room || 'بدون قاعة')}</span>
            </span>
            <i data-i="pencil" style="color:var(--ink-3)"></i>
          </button>`).join('')
          : `<p class="small dim">ما فيه اختبارات مسجّلة.</p>`}
        <button class="btn btn-plain btn-sm" style="margin-top:6px" data-act="add-exam" data-c="${c.id}"><i data-i="plus"></i><span>أضف اختبار</span></button>

        <h3 class="small muted" style="margin:var(--s4) 0 6px">الغياب</h3>
        <div class="card card-pad">
          <div class="row">
            <div class="counter">
              <button data-act="abs" data-c="${c.id}" data-d="-1" aria-label="إنقاص"><i data-i="minus"></i></button>
              <span class="value">${c.absences}</span>
              <button data-act="abs" data-c="${c.id}" data-d="1" aria-label="زيادة"><i data-i="plus"></i></button>
            </div>
            <div style="flex:1;min-width:0">
              <div class="row small" style="justify-content:space-between">
                <span class="${abs.level === 'ok' ? 'dim' : ''}" style="${abs.level !== 'ok' ? `color:var(--${abs.level === 'bad' ? 'bad' : 'warn'})` : ''}">${esc(abs.text)}</span>
                <span class="dim num">${Math.round(abs.pct)}%</span>
              </div>
              <div class="bar ${abs.level}"><i style="width:${U.clamp(abs.pct, 0, 100)}%"></i></div>
            </div>
          </div>
          <label class="row small" style="margin-top:var(--s3);gap:var(--s2)">
            <span class="dim">الحد المسموح</span>
            <input class="input" type="number" min="1" max="30" style="width:84px;min-height:38px;text-align:center"
                   value="${c.maxAbsences}" data-act="max-abs" data-c="${c.id}">
            <span class="dim tiny">غياب</span>
          </label>
        </div>

        <h3 class="small muted" style="margin:var(--s4) 0 6px">الفصول</h3>
        ${c.chapters.length ? `<ul class="chapters">${c.chapters.map(ch => `
          <li class="${ch.done ? 'done' : ''}">
            <button class="check" data-act="toggle-chapter" data-c="${c.id}" data-ch="${ch.id}" aria-label="تبديل"><i data-i="check"></i></button>
            <span class="ch-title truncate" style="flex:1">${esc(ch.title)}</span>
            <button class="icon-btn" data-act="del-chapter" data-c="${c.id}" data-ch="${ch.id}" aria-label="حذف"><i data-i="x"></i></button>
          </li>`).join('')}</ul>` : `<p class="small dim">أضف فصول المقرر لتتابع تغطيتك قبل الاختبار.</p>`}
        <button class="btn btn-plain btn-sm" style="margin-top:6px" data-act="add-chapter" data-c="${c.id}"><i data-i="plus"></i><span>أضف فصل</span></button>

        <h3 class="small muted" style="margin:var(--s4) 0 6px">روابط</h3>
        <div class="links">
          ${c.links.map(l => `<div class="link-row">
            <i data-i="link" style="color:${esc(c.color)}"></i>
            <a class="truncate" href="${attr(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>
            <button class="icon-btn kill" data-act="del-link" data-c="${c.id}" data-l="${l.id}" aria-label="حذف"><i data-i="x"></i></button>
          </div>`).join('')}
        </div>
        <button class="btn btn-plain btn-sm" style="margin-top:6px" data-act="add-link" data-c="${c.id}"><i data-i="plus"></i><span>أضف رابط</span></button>

        <h3 class="small muted" style="margin:var(--s4) 0 6px">ملاحظات</h3>
        <textarea class="textarea" data-act="course-note" data-c="${c.id}" placeholder="أي شي تبي تتذكره عن هالمقرر…">${esc(c.note || '')}</textarea>

        <button class="btn btn-danger btn-sm" style="margin-top:var(--s4)" data-act="del-course" data-c="${c.id}">
          <i data-i="trash"></i><span>حذف المقرر</span>
        </button>
      </div>
    </article>`;
  }

  /* ============================== الإعدادات ============================== */
  function settings() {
    const p = Store.profile, f = Store.prefs;
    const years = academicYears();
    const size = (new Blob([Store.exportJSON()]).size / 1024).toFixed(1);
    const accents = [
      ['pearl', 'لؤلؤي'], ['palm', 'نخيلي'], ['saffron', 'زعفراني'], ['clay', 'طيني'],
      ['plum', 'برقوقي'], ['sea', 'بحري'], ['rose', 'وردي']
    ];

    return `<section class="stack">
      <div class="panel">
        <div class="setting stackable">
          <div class="label"><b>بياناتك</b><span>تظهر في الترحيب وفي ملف النسخة الاحتياطية</span></div>
          <div class="field"><label for="s-name">الاسم</label>
            <input class="input" id="s-name" data-profile="name" value="${attr(p.name)}"></div>
          <div class="field"><label for="s-major">التخصص</label>
            <input class="input" id="s-major" data-profile="major" value="${attr(p.major)}"></div>
          <div class="field"><label for="s-uni">الجامعة</label>
            <input class="input" id="s-uni" data-profile="university" value="${attr(p.university)}"></div>
          <div class="field-row">
            <div class="field"><label for="s-year">السنة الدراسية</label>
              <select class="select" id="s-year" data-profile="year">
                ${years.map(y => `<option${p.year === y ? ' selected' : ''}>${y}</option>`).join('')}
              </select></div>
            <div class="field"><label for="s-sem">الفصل</label>
              <select class="select" id="s-sem" data-profile="semester">
                ${['الفصل الأول', 'الفصل الثاني', 'الفصل الصيفي'].map(s => `<option${p.semester === s ? ' selected' : ''}>${s}</option>`).join('')}
              </select></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="setting stackable">
          <div class="label"><b>المظهر</b><span>الفاتح كريمي، والداكن دافئ</span></div>
          <div class="segmented wide" role="group">
            <button data-act="theme" data-theme-val="light" aria-pressed="${f.theme === 'light'}"><i data-i="sun"></i>فاتح</button>
            <button data-act="theme" data-theme-val="dark" aria-pressed="${f.theme === 'dark'}"><i data-i="moon"></i>داكن</button>
            <button data-act="theme" data-theme-val="auto" aria-pressed="${f.theme === 'auto'}"><i data-i="monitor"></i>تلقائي</button>
          </div>
          <div class="swatches" role="group" aria-label="اللون الأساسي">
            ${accents.map(([k, name]) => `<button class="swatch" data-act="accent" data-a="${k}"
              aria-pressed="${f.accent === k}" title="${name}"
              style="background:var(--tone-${k}, ${k === 'pearl' ? '#2f7382' : k === 'palm' ? '#4d7a45' : k === 'saffron' ? '#b07514' : k === 'clay' ? '#a2573a' : k === 'plum' ? '#77497c' : k === 'sea' ? '#39598f' : '#a44d63'})"></button>`).join('')}
          </div>
        </div>
        <label class="setting">
          <span class="label"><b>عرض مضغوط</b><span>مسافات أقل، معلومات أكثر في الشاشة</span></span>
          <span class="control switch">
            <input type="checkbox" data-pref="density" ${f.density === 'compact' ? 'checked' : ''}>
            <span class="track"></span>
          </span>
        </label>
      </div>

      <div class="panel">
        <div class="setting stackable">
          <div class="label"><b>أيام الدراسة</b><span>أي يوم فيه حصة يظهر تلقائياً حتى لو ما اخترته</span></div>
          <div class="row-wrap">
            ${U.DAY_SHORT.map((d, i) => `<button class="chip" data-act="toggle-day" data-d="${i}"
              aria-pressed="${f.days.includes(i)}">${d}</button>`).join('')}
          </div>
        </div>
        <div class="setting">
          <span class="label"><b>بداية الجدول</b><span>أول ساعة تظهر في شبكة الأسبوع</span></span>
          <span class="control"><input class="input" type="time" data-pref="dayStart" value="${attr(f.dayStart)}" style="width:132px"></span>
        </div>
        <div class="setting">
          <span class="label"><b>نهاية الجدول</b></span>
          <span class="control"><input class="input" type="time" data-pref="dayEnd" value="${attr(f.dayEnd)}" style="width:132px"></span>
        </div>
      </div>

      <div class="panel">
        <div class="setting stackable">
          <div class="label"><b>تنبيه الغياب</b><span>النسبة تُحسب من الحد المسموح لكل مقرر</span></div>
          <div class="range-row">
            <span class="small dim" style="width:104px">تحذير مبكر</span>
            <input type="range" min="20" max="95" step="5" data-pref="warnAt" value="${f.warnAt}">
            <b class="num" data-echo="warnAt">${f.warnAt}%</b>
          </div>
          <div class="range-row">
            <span class="small dim" style="width:104px">حد الحرمان</span>
            <input type="range" min="50" max="100" step="5" data-pref="dnAt" value="${f.dnAt}">
            <b class="num" data-echo="dnAt">${f.dnAt}%</b>
          </div>
        </div>
        <div class="setting">
          <span class="label"><b>الحد الافتراضي للغياب</b><span>يُستخدم لكل مقرر جديد</span></span>
          <span class="control"><input class="input" type="number" min="1" max="30" data-pref="defaultMaxAbs" value="${f.defaultMaxAbs}" style="width:84px;text-align:center"></span>
        </div>
      </div>

      <div class="panel">
        <div class="setting">
          <span class="label"><b>نسخة احتياطية</b><span>ملف JSON فيه كل بياناتك · ${size} كيلوبايت</span></span>
          <span class="control"><button class="btn btn-quiet btn-sm" data-act="export"><i data-i="download"></i><span>تنزيل</span></button></span>
        </div>
        <div class="setting">
          <span class="label"><b>استعادة نسخة</b><span>يستبدل كل البيانات الحالية</span></span>
          <span class="control"><button class="btn btn-quiet btn-sm" data-act="import"><i data-i="upload"></i><span>اختيار ملف</span></button></span>
        </div>
        <div class="setting">
          <span class="label"><b>تثبيت التطبيق</b><span>يشتغل بدون إنترنت بعد أول فتح</span></span>
          <span class="control"><button class="btn btn-quiet btn-sm" data-act="install"><i data-i="download"></i><span>تثبيت</span></button></span>
        </div>
        <div class="setting">
          <span class="label"><b>مسح كل شي</b><span>يرجع التطبيق كأنه جديد</span></span>
          <span class="control"><button class="btn btn-danger btn-sm" data-act="reset"><i data-i="trash"></i><span>مسح</span></button></span>
        </div>
      </div>

      <div class="note">
        <i data-i="cap"></i>
        <span>كتالوج المقررات المدمج: ${esc(Catalog.META.college)} — ${esc(Catalog.META.year)} ${esc(Catalog.META.semester)}
        · ${Catalog.count()} مقرر، مصدره ${esc(Catalog.META.source)}. لو تغيّر الفصل، استعمل تبويب «لصق من UCS».</span>
      </div>

      <div class="note info">
        <i data-i="lock"></i>
        <span>بياناتك محفوظة في متصفحك فقط — ما فيه حساب ولا سيرفر. لو مسحت بيانات المتصفح بتروح، فخذ نسخة احتياطية بين فترة وفترة.</span>
      </div>

      <div class="panel">
        <div class="setting stackable">
          <div class="label"><b>اختصارات الكيبورد</b></div>
          <div class="row-wrap small dim">
            <span><span class="kbd">1</span>–<span class="kbd">5</span> تنقّل</span>
            <span><span class="kbd">/</span> بحث</span>
            <span><span class="kbd">A</span> إضافة مقرر</span>
            <span><span class="kbd">G</span> تبديل عرض الجدول</span>
            <span><span class="kbd">Esc</span> إغلاق</span>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ======================================================================
     معالج إضافة مقرر
     ====================================================================== */
  const wizard = {
    tab: 'find',        // find | paste | manual
    editing: null,
    query: '',
    raw: '',
    parsed: null,       // نتيجة تحليل اللصق
    src: '',            // catalog | paste
    course: null,       // المقرر المختار
    chosen: -1,         // فهرس الشعبة
    draft: null
  };

  function freshDraft() {
    return {
      code: '', title: '', section: '', instructor: '', credits: 3,
      color: U.pickColor(Store.courses().length),
      maxAbsences: Store.prefs.defaultMaxAbs,
      sessions: [{ days: [], start: '08:00', end: '08:50', room: '', kind: 'lecture' }],
      final: { date: '', start: '11:00', end: '13:00', room: '' }
    };
  }

  function openCourseSheet(courseId) {
    wizard.editing = courseId || null;
    wizard.raw = ''; wizard.parsed = null; wizard.chosen = -1;
    wizard.query = ''; wizard.src = ''; wizard.course = null;

    if (courseId) {
      const c = Store.course(courseId);
      const final = c.exams.find(x => x.kind === 'final');
      wizard.tab = 'manual';
      wizard.draft = {
        code: c.code, title: c.title, section: c.section, instructor: c.instructor,
        credits: c.credits, color: c.color, maxAbsences: c.maxAbsences,
        sessions: c.sessions.length
          ? c.sessions.map(s => ({ days: [s.day], start: s.start, end: s.end, room: s.room, kind: s.kind, id: s.id }))
          : [{ days: [], start: '08:00', end: '08:50', room: '', kind: 'lecture' }],
        final: final ? { date: final.date, start: final.start, end: final.end, room: final.room, id: final.id }
                     : { date: '', start: '11:00', end: '13:00', room: '' }
      };
    } else {
      wizard.tab = 'find';
      wizard.draft = freshDraft();
    }

    UI.sheet({
      title: courseId ? 'تعديل المقرر' : 'إضافة مقرر',
      body: wizardBody(),
      foot: wizardFoot(),
      onMount: () => { }
    });
  }

  function wizardFoot() {
    if (wizard.editing) {
      return `<button class="btn btn-quiet" data-act="close-sheet">إلغاء</button>
              <button class="btn btn-primary" data-act="save-manual">حفظ التعديلات</button>`;
    }
    if (wizard.tab === 'manual') {
      return `<button class="btn btn-quiet" data-act="close-sheet">إلغاء</button>
              <button class="btn btn-primary" data-act="save-manual">أضف المقرر</button>`;
    }
    const ready = wizard.course && wizard.chosen >= 0;
    return `<button class="btn btn-quiet" data-act="close-sheet">إلغاء</button>
            <button class="btn btn-primary" data-act="add-selected" ${ready ? '' : 'disabled style="opacity:.5"'}>أضف لمقرراتي</button>`;
  }

  /** يحدّث نتائج البحث فقط حتى لا يضيع مؤشر الكتابة */
  function refreshCatalogResults() {
    const box = U.$('#cat-results');
    if (!box) return;
    const list = wizard.query.trim() ? Catalog.search(wizard.query, 14) : [];
    box.innerHTML = catalogResults(list);
    Icons.paint(box);
  }

  function refreshWizard() {
    const body = U.$('#sheet-body');
    const foot = U.$('#sheet-foot');
    if (!body) return;
    body.innerHTML = wizardBody();
    foot.innerHTML = wizardFoot();
    foot.hidden = false;
    Icons.paint(U.$('#sheet-layer'));
  }

  function wizardBody() {
    if (wizard.editing) return manualForm();
    const tab = wizard.tab;
    return `
      <div class="tabs" role="group">
        <button data-act="wiz-tab" data-t="find" aria-pressed="${tab === 'find'}">بحث في المقررات</button>
        <button data-act="wiz-tab" data-t="paste" aria-pressed="${tab === 'paste'}">لصق من UCS</button>
        <button data-act="wiz-tab" data-t="manual" aria-pressed="${tab === 'manual'}">يدوي</button>
      </div>
      ${tab === 'find' ? findTab() : tab === 'paste' ? pasteTab() : manualForm()}`;
  }

  /* ------------------ تبويب البحث في الكتالوج المدمج ------------------ */
  function findTab() {
    if (wizard.course && wizard.src === 'catalog') return sectionPicker();

    const meta = Catalog.META;
    const results = wizard.query.trim() ? Catalog.search(wizard.query, 14) : [];

    return `<div>
      <div class="row-wrap" style="margin-bottom:var(--s3)">
        <span class="chip chip-static"><i data-i="cap"></i>${esc(meta.college)}</span>
        <span class="chip chip-static"><i data-i="calendar"></i>${esc(meta.year)} · ${esc(meta.semester)}</span>
      </div>

      <div class="field">
        <label for="cat-q">رمز المقرر أو اسمه أو اسم الدكتور</label>
        <input class="input" id="cat-q" placeholder="مثال: ITCS106 أو Data Structures"
               value="${attr(wizard.query)}" autocomplete="off" inputmode="search">
      </div>

      <div id="cat-results" style="margin-top:var(--s3)">${catalogResults(results)}</div>

      <div class="note info" style="margin-top:var(--s4)">
        <i data-i="info"></i>
        <span>هذي مقررات ${esc(meta.college)} كما هي في UCS لـ${esc(meta.year)} ${esc(meta.semester)}.
        مقررك من كلية ثانية؟ افتح تبويب «لصق من UCS» والصق صفحة السكاشن.</span>
      </div>
    </div>`;
  }

  /** نتائج البحث — تُحدَّث لحالها بدون إعادة رسم الورقة */
  function catalogResults(list) {
    if (!wizard.query.trim()) {
      return `<p class="small dim center" style="padding:var(--s5) 0">
        اكتب أول حروف الرمز… ${Catalog.count()} مقرر جاهز للإضافة.</p>`;
    }
    if (!list.length) {
      return `<div class="note warn"><i data-i="alert"></i>
        <span>ما لقيت مقرر بهالاسم. جرّب الرمز كامل، أو الصق صفحة UCS من التبويب الثاني.</span></div>`;
    }
    return list.map(c => `
      <button class="pick" data-act="pick-course" data-code="${attr(c.code)}">
        <span class="pick-title">
          <span class="course-code" style="--c:var(--accent-base)">${esc(c.code)}</span>
          <span class="truncate">${esc(c.title)}</span>
        </span>
        <span class="pick-rows">
          <span>${c.sections.length} شعبة · ${esc(c.deptName)}</span>
          ${c.exam ? `<span>النهائي: ${esc(U.fmtLong(c.exam.date))} · ${U.time12(c.exam.start)}</span>`
                   : `<span class="dim">بدون امتحان نهائي</span>`}
        </span>
      </button>`).join('');
  }

  /* --------------------------- تبويب اللصق --------------------------- */
  function pasteTab() {
    if (wizard.course && wizard.src === 'paste') return sectionPicker();

    const found = wizard.parsed ? wizard.parsed.courses : null;

    return `<div class="steps">
      <div class="step"><div>
        <h3>افتح UCS واعرض السكاشن</h3>
        <p>اختر السنة والفصل ورمز المقرر (أو الكلية والقسم) واضغط بحث.</p>
        <div class="step-body row-wrap">
          <a class="btn btn-soft btn-sm" href="${UCS.SITE}" target="_blank" rel="noopener"><i data-i="external"></i><span>افتح UCS</span></a>
          <button class="btn btn-quiet btn-sm" data-act="copy-tool"><i data-i="copy"></i><span>انسخ أداة الاستخراج</span></button>
        </div>
      </div></div>

      <div class="step"><div>
        <h3>الصق الصفحة هنا</h3>
        <p>حدّد صفحة النتائج كاملة وانسخها (Ctrl+A ثم Ctrl+C) والصقها بالأسفل.</p>
        <div class="step-body">
          <textarea class="textarea" id="ucs-paste" placeholder="الصق هنا…">${esc(wizard.raw)}</textarea>
          <button class="btn btn-primary btn-sm btn-block" style="margin-top:var(--s2)" data-act="parse-ucs">
            <i data-i="swap"></i><span>حلّل الصفحة</span>
          </button>
        </div>
      </div></div>

      ${found ? `<div class="step"><div>
        <h3>اختر المقرر</h3>
        <p>لقيت ${found.length} مقرر في اللي لصقته.</p>
        <div class="step-body">
          ${found.length ? found.map((c, i) => `
            <button class="pick" data-act="pick-parsed" data-i="${i}">
              <span class="pick-title">
                <span class="course-code" style="--c:var(--accent-base)">${esc(c.code)}</span>
                <span class="truncate">${esc(c.title)}</span>
              </span>
              <span class="pick-rows">
                <span>${c.sections.length} شعبة</span>
                ${c.exam ? `<span>النهائي: ${esc(U.fmtLong(c.exam.date))} · ${U.time12(c.exam.start)}</span>`
                         : `<span class="dim">بدون امتحان نهائي</span>`}
              </span>
            </button>`).join('')
            : `<div class="note warn"><i data-i="alert"></i><span>ما قدرت أقرأ الصفحة. تأكد أنك نسخت نتائج السكاشن.</span></div>`}
        </div>
      </div></div>` : ''}

      <div class="note info">
        <i data-i="info"></i>
        <span>ليش لصق؟ UCS ما يسمح لأي موقع ثاني يقرأ منه مباشرة (حماية المتصفح)، فاللصق هو الطريق المضمون. وكل شي بعدها يترتب تلقائياً.</span>
      </div>
    </div>`;
  }

  /* ------------------------- اختيار الشعبة واللون ------------------------- */
  function sectionPicker() {
    const c = wizard.course;
    const secs = c.sections;

    const rows = secs.map((s, i) => `
      <button class="pick" data-act="pick-section" data-i="${i}" aria-pressed="${wizard.chosen === i}">
        <span class="pick-title">
          <span>شعبة ${esc(s.section)}</span>
          <span class="truncate dim small">${esc(s.instructor || 'بدون مدرّس')}</span>
        </span>
        <span class="pick-rows">
          ${UCS.describeSection(s).map(line => `<span>${esc(line)}</span>`).join('') ||
            '<span class="dim">بدون أوقات محددة</span>'}
          ${s.examRoom ? `<span>قاعة الامتحان: ${esc(s.examRoom)}</span>` : ''}
        </span>
      </button>`).join('');

    return `<div>
      <button class="btn btn-plain btn-sm" data-act="back-courses" style="margin-bottom:var(--s3)">
        <i data-i="forward"></i><span>رجوع للبحث</span>
      </button>

      <div class="detail-hero" style="--c:${esc(wizard.draft.color)}">
        <div class="row-wrap">
          <span class="course-code" style="--c:${esc(wizard.draft.color)}">${esc(c.code)}</span>
          <span class="truncate strong">${esc(c.title || '')}</span>
        </div>
        ${c.exam ? `<p class="small muted" style="margin-top:6px">
          الامتحان النهائي: ${esc(U.fmtFull(c.exam.date))} · ${U.spanText(c.exam.start, c.exam.end)}</p>`
          : `<p class="small dim" style="margin-top:6px">ما فيه امتحان نهائي مسجّل</p>`}
        ${c.prereqs ? `<p class="tiny dim" style="margin-top:4px">المتطلب السابق: ${esc(c.prereqs)}</p>` : ''}
      </div>

      <h3 class="small muted" style="margin:var(--s4) 0 var(--s2)">اختر شعبتك (${secs.length})</h3>
      ${rows}

      <div class="field" style="margin-top:var(--s4)">
        <label>لون المقرر في الجدول</label>
        <div class="swatches">
          ${U.PALETTE.map(col => `<button class="swatch" data-act="pick-color" data-col="${col}"
            aria-pressed="${wizard.draft.color === col}" style="background:${col}" aria-label="لون"></button>`).join('')}
        </div>
      </div>
    </div>`;
  }


  /* --------------------------- النموذج اليدوي --------------------------- */
  function manualForm() {
    const d = wizard.draft;
    return `<div id="manual-form">
      <div class="field-row">
        <div class="field"><label for="m-code">رمز المقرر</label>
          <input class="input" id="m-code" data-draft="code" value="${attr(d.code)}" placeholder="ITCS106"></div>
        <div class="field"><label for="m-sec">الشعبة</label>
          <input class="input" id="m-sec" data-draft="section" value="${attr(d.section)}" placeholder="01"></div>
      </div>
      <div class="field" style="margin-top:var(--s3)"><label for="m-title">اسم المقرر</label>
        <input class="input" id="m-title" data-draft="title" value="${attr(d.title)}" placeholder="Computer Programming I"></div>
      <div class="field" style="margin-top:var(--s3)"><label for="m-teacher">المدرّس</label>
        <input class="input" id="m-teacher" data-draft="instructor" value="${attr(d.instructor)}"></div>
      <div class="field-row" style="margin-top:var(--s3)">
        <div class="field"><label for="m-credits">الساعات المعتمدة</label>
          <input class="input" id="m-credits" type="number" min="0" max="8" data-draft="credits" value="${attr(d.credits)}"></div>
        <div class="field"><label for="m-abs">حد الغياب</label>
          <input class="input" id="m-abs" type="number" min="1" max="30" data-draft="maxAbsences" value="${attr(d.maxAbsences)}"></div>
      </div>

      <div class="field" style="margin-top:var(--s3)">
        <label>اللون</label>
        <div class="swatches">
          ${U.PALETTE.map(col => `<button class="swatch" data-act="pick-color" data-col="${col}"
            aria-pressed="${d.color === col}" style="background:${col}" aria-label="لون"></button>`).join('')}
        </div>
      </div>

      <h3 class="small muted" style="margin:var(--s5) 0 var(--s2)">الحصص</h3>
      <div class="sessions-edit">
        ${d.sessions.map((s, i) => sessionRow(s, i)).join('')}
      </div>
      <button class="btn btn-plain btn-sm" style="margin-top:var(--s2)" data-act="draft-add-session"><i data-i="plus"></i><span>حصة ثانية</span></button>

      <h3 class="small muted" style="margin:var(--s5) 0 var(--s2)">الامتحان النهائي</h3>
      <div class="field-row">
        <div class="field"><label for="m-fdate">التاريخ</label>
          <input class="input" id="m-fdate" type="date" data-draft-final="date" value="${attr(d.final.date)}"></div>
        <div class="field"><label for="m-froom">القاعة</label>
          <input class="input" id="m-froom" data-draft-final="room" value="${attr(d.final.room)}"></div>
      </div>
      <div class="field-row" style="margin-top:var(--s3)">
        <div class="field"><label for="m-fstart">من</label>
          <input class="input" id="m-fstart" type="time" data-draft-final="start" value="${attr(d.final.start)}"></div>
        <div class="field"><label for="m-fend">إلى</label>
          <input class="input" id="m-fend" type="time" data-draft-final="end" value="${attr(d.final.end)}"></div>
      </div>
    </div>`;
  }

  function sessionRow(s, i) {
    return `<div class="srow" data-row="${i}">
      <div class="row">
        <select class="select" data-row-field="kind" data-i="${i}" style="min-height:40px;flex:1">
          ${Object.entries(KIND).map(([k, v]) => `<option value="${k}"${s.kind === k ? ' selected' : ''}>${v}</option>`).join('')}
        </select>
        <button class="icon-btn" data-act="draft-del-session" data-i="${i}" aria-label="حذف الحصة"><i data-i="trash"></i></button>
      </div>
      <div class="daybtns">
        ${U.DAY_SHORT.map((d, di) => `<button data-act="draft-day" data-i="${i}" data-d="${di}"
          aria-pressed="${s.days.includes(di)}">${d.slice(0, 3)}</button>`).join('')}
      </div>
      <div class="field-row">
        <div class="field"><label>من</label>
          <input class="input" type="time" data-row-field="start" data-i="${i}" value="${attr(s.start)}"></div>
        <div class="field"><label>إلى</label>
          <input class="input" type="time" data-row-field="end" data-i="${i}" value="${attr(s.end)}"></div>
      </div>
      <div class="field"><label>القاعة</label>
        <input class="input" data-row-field="room" data-i="${i}" value="${attr(s.room)}" placeholder="S40-1023"></div>
    </div>`;
  }

  /** يقرأ ما كتبه المستخدم قبل إعادة الرسم */
  function syncDraft() {
    const form = U.$('#manual-form');
    if (!form) return;
    const d = wizard.draft;
    U.$$('[data-draft]', form).forEach(el => { d[el.dataset.draft] = el.value; });
    U.$$('[data-draft-final]', form).forEach(el => { d.final[el.dataset.draftFinal] = el.value; });
    U.$$('[data-row-field]', form).forEach(el => {
      const row = d.sessions[+el.dataset.i];
      if (row) row[el.dataset.rowField] = el.value;
    });
  }

  /* -------------------------- ورقة تفاصيل الحصة -------------------------- */
  function sessionDetail(courseId, sessionId) {
    const c = Store.course(courseId);
    if (!c) return;
    const s = c.sessions.find(x => x.id === sessionId);
    if (!s) return;
    const len = U.lengthOf(s.start, s.end);
    const nextEx = c.exams.filter(x => x.date && U.stamp(x.date, x.start) > Date.now())
      .sort((a, b) => U.stamp(a.date, a.start) - U.stamp(b.date, b.start))[0];
    const abs = Store.absenceState(c);

    UI.sheet({
      title: c.code || 'الحصة',
      body: `
        <div class="detail-hero" style="--c:${esc(c.color)}">
          <div class="row-wrap">
            <span class="tag"><i data-i="${KIND_ICON[s.kind]}"></i>${esc(KIND[s.kind])}</span>
            ${c.section ? `<span class="tag">شعبة ${esc(c.section)}</span>` : ''}
          </div>
          <h3 style="margin-top:8px;font-size:var(--fs-lg)">${esc(c.title || c.code)}</h3>
          <p class="small muted">${esc(c.instructor || 'بدون مدرّس مسجّل')}</p>
          <div class="detail-grid">
            <div><small>اليوم</small><b>${U.DAY_FULL[s.day]}</b></div>
            <div><small>الوقت</small><b class="num">${U.spanText(s.start, s.end)}</b></div>
            <div><small>المكان</small><b>${esc(s.room || '—')}</b></div>
            <div><small>المدة</small><b>${U.durationText(len)}</b></div>
          </div>
        </div>

        <div class="row-wrap" style="margin-top:var(--s4)">
          <span class="chip chip-static"><i data-i="user"></i>الغياب ${c.absences} من ${c.maxAbsences}</span>
          ${abs.level !== 'ok' ? `<span class="tag ${abs.level}">${esc(abs.text)}</span>` : ''}
        </div>

        ${nextEx ? `<div class="note" style="margin-top:var(--s3)">
          <i data-i="clipboard"></i>
          <span>${esc(EXAM[nextEx.kind] || 'اختبار')} ${esc(U.fmtLong(nextEx.date))} · ${U.time12(nextEx.start)}${nextEx.room ? ' · ' + esc(nextEx.room) : ''}</span>
        </div>` : ''}

        <div class="row-wrap" style="margin-top:var(--s4)">
          <button class="btn btn-quiet btn-sm" data-act="abs" data-c="${c.id}" data-d="1"><i data-i="plus"></i><span>سجّل غياب</span></button>
          <button class="btn btn-quiet btn-sm" data-act="edit-session" data-c="${c.id}" data-s="${s.id}"><i data-i="pencil"></i><span>تعديل الحصة</span></button>
          <button class="btn btn-quiet btn-sm" data-act="goto-course" data-c="${c.id}"><i data-i="book"></i><span>فتح المقرر</span></button>
        </div>`,
      foot: null
    });
  }

  /* ---------------------------- ورقة حصة واحدة ---------------------------- */
  function sessionForm(courseId, sessionId) {
    const c = Store.course(courseId);
    const s = sessionId ? c.sessions.find(x => x.id === sessionId) : Store.newSession();
    const isNew = !sessionId;

    UI.sheet({
      title: isNew ? 'حصة جديدة' : 'تعديل الحصة',
      body: `<div id="session-form" data-c="${c.id}" data-s="${s.id}">
        <div class="field"><label for="sf-kind">النوع</label>
          <select class="select" id="sf-kind" data-f="kind">
            ${Object.entries(KIND).map(([k, v]) => `<option value="${k}"${s.kind === k ? ' selected' : ''}>${v}</option>`).join('')}
          </select></div>
        <div class="field" style="margin-top:var(--s3)"><label for="sf-day">اليوم</label>
          <select class="select" id="sf-day" data-f="day">
            ${U.DAY_FULL.map((d, i) => `<option value="${i}"${s.day === i ? ' selected' : ''}>${d}</option>`).join('')}
          </select></div>
        <div class="field-row" style="margin-top:var(--s3)">
          <div class="field"><label for="sf-start">من</label>
            <input class="input" id="sf-start" type="time" data-f="start" value="${attr(s.start)}"></div>
          <div class="field"><label for="sf-end">إلى</label>
            <input class="input" id="sf-end" type="time" data-f="end" value="${attr(s.end)}"></div>
        </div>
        <div class="field" style="margin-top:var(--s3)"><label for="sf-room">القاعة</label>
          <input class="input" id="sf-room" data-f="room" value="${attr(s.room)}" placeholder="S40-1023"></div>
      </div>`,
      foot: `${isNew ? '' : `<button class="btn btn-danger" data-act="del-session" data-c="${c.id}" data-s="${s.id}">حذف</button>`}
             <button class="btn btn-quiet" data-act="close-sheet">إلغاء</button>
             <button class="btn btn-primary" data-act="save-session" data-new="${isNew ? 1 : 0}">حفظ</button>`
    });
  }

  /* --------------------------- ورقة اختبار --------------------------- */
  function examForm(courseId, examId) {
    const list = Store.courses();
    const c = courseId ? Store.course(courseId) : list[0];
    if (!c) { UI.toast('أضف مقرر أولاً', 'info'); return; }
    const x = examId ? c.exams.find(e => e.id === examId) : Store.newExam({ kind: 'quiz', date: U.isoOf() });
    const isNew = !examId;

    UI.sheet({
      title: isNew ? 'اختبار جديد' : 'تعديل الاختبار',
      body: `<div id="exam-form" data-c="${c.id}" data-x="${x.id}">
        <div class="field"><label for="xf-course">المقرر</label>
          <select class="select" id="xf-course" data-f="courseId" ${isNew ? '' : 'disabled'}>
            ${list.map(o => `<option value="${o.id}"${o.id === c.id ? ' selected' : ''}>${esc(o.code)} ${esc(o.title || '')}</option>`).join('')}
          </select></div>
        <div class="field" style="margin-top:var(--s3)"><label for="xf-kind">النوع</label>
          <select class="select" id="xf-kind" data-f="kind">
            ${Object.entries(EXAM).map(([k, v]) => `<option value="${k}"${x.kind === k ? ' selected' : ''}>${v}</option>`).join('')}
          </select></div>
        <div class="field-row" style="margin-top:var(--s3)">
          <div class="field"><label for="xf-date">التاريخ</label>
            <input class="input" id="xf-date" type="date" data-f="date" value="${attr(x.date)}"></div>
          <div class="field"><label for="xf-room">القاعة</label>
            <input class="input" id="xf-room" data-f="room" value="${attr(x.room)}"></div>
        </div>
        <div class="field-row" style="margin-top:var(--s3)">
          <div class="field"><label for="xf-start">من</label>
            <input class="input" id="xf-start" type="time" data-f="start" value="${attr(x.start)}"></div>
          <div class="field"><label for="xf-end">إلى</label>
            <input class="input" id="xf-end" type="time" data-f="end" value="${attr(x.end)}"></div>
        </div>
      </div>`,
      foot: `${isNew ? '' : `<button class="btn btn-danger" data-act="del-exam" data-c="${c.id}" data-x="${x.id}">حذف</button>`}
             <button class="btn btn-quiet" data-act="close-sheet">إلغاء</button>
             <button class="btn btn-primary" data-act="save-exam" data-new="${isNew ? 1 : 0}">حفظ</button>`
    });
  }

  /* ----------------------------- ورقة رابط ----------------------------- */
  function linkForm(courseId) {
    UI.sheet({
      title: 'إضافة رابط',
      body: `<div id="link-form" data-c="${courseId}">
        <div class="field"><label for="lf-label">الاسم</label>
          <input class="input" id="lf-label" placeholder="ملفات Drive، قروب تيليجرام، السلايدات…"></div>
        <div class="field" style="margin-top:var(--s3)"><label for="lf-url">الرابط</label>
          <input class="input" id="lf-url" type="url" placeholder="https://…" dir="ltr"></div>
      </div>`,
      foot: `<button class="btn btn-quiet" data-act="close-sheet">إلغاء</button>
             <button class="btn btn-primary" data-act="save-link">إضافة</button>`
    });
  }

  function chapterForm(courseId) {
    UI.sheet({
      title: 'إضافة فصل',
      body: `<div id="chapter-form" data-c="${courseId}">
        <div class="field"><label for="cf-title">عنوان الفصل</label>
          <input class="input" id="cf-title" placeholder="مثال: الحلقات التكرارية"></div>
        <p class="small dim" style="margin-top:var(--s2)">تقدر تلصق عدة فصول، كل سطر فصل مستقل.</p>
        <textarea class="textarea" id="cf-bulk" placeholder="أو الصق قائمة فصول هنا…" style="margin-top:var(--s2)"></textarea>
      </div>`,
      foot: `<button class="btn btn-quiet" data-act="close-sheet">إلغاء</button>
             <button class="btn btn-primary" data-act="save-chapter">إضافة</button>`
    });
  }

  /* ============================== الأذكار ============================== */
  function adhkar(state) {
    const period = state.period || ADHKAR.suggested();
    const list = ADHKAR.list(period);
    const prog = Store.adhkarProgress(period);
    const now = new Date();

    const cards = list.map((d, i) => {
      const done = Store.dhikrDone(period, d.id);
      const left = Math.max(0, d.count - done);
      const finished = left === 0;
      return `<article class="dhikr ${finished ? 'done' : ''}" data-dhikr="${d.id}">
        <div class="dhikr-head">
          <span class="dhikr-no num">${U.pad(i + 1)}</span>
          ${d.tag ? `<span class="tag">${esc(d.tag)}</span>` : ''}
          ${finished ? `<button class="icon-btn push" data-act="dhikr-reset" data-p="${period}" data-id="${d.id}" aria-label="إعادة"><i data-i="refresh"></i></button>` : ''}
        </div>
        <p class="dhikr-text">${esc(d.text)}</p>
        ${d.note ? `<p class="dhikr-note">${esc(d.note)}</p>` : ''}
        <button class="dhikr-count" data-act="dhikr" data-p="${period}" data-id="${d.id}" data-total="${d.count}"
                ${finished ? 'disabled' : ''}>
          ${finished
            ? `<i data-i="check"></i><span>تمّت</span>`
            : `<span class="num">${left}</span><span>${d.count > 1 ? 'مرات متبقية' : 'مرة'}</span>`}
        </button>
      </article>`;
    }).join('');

    return `<section>
      <div class="segmented wide" role="group" style="margin-bottom:var(--s3)">
        <button data-act="adhkar-period" data-p="morning" aria-pressed="${period === 'morning'}"><i data-i="sun"></i>الصباح</button>
        <button data-act="adhkar-period" data-p="evening" aria-pressed="${period === 'evening'}"><i data-i="moon"></i>المساء</button>
      </div>

      <div class="card card-pad">
        <div class="row">
          <div style="flex:1;min-width:0">
            <b>${esc(ADHKAR.title(period))}</b>
            <p class="small dim">${esc(U.fmtFull(U.isoOf(now)))}</p>
          </div>
          <span class="num strong">${prog.done}/${prog.total}</span>
        </div>
        <div class="bar ${prog.pct === 100 ? 'ok' : ''}" style="margin-top:var(--s3)"><i style="width:${prog.pct}%"></i></div>
        <div class="row-wrap" style="margin-top:var(--s3)">
          <span class="small dim" style="flex:1">${prog.pct === 100 ? 'ما شاء الله، أتممتها اليوم.' : 'اضغط على الذكر لتعدّ مراته.'}</span>
          <button class="btn btn-plain btn-sm" data-act="dhikr-reset-all" data-p="${period}"><i data-i="refresh"></i><span>إعادة الكل</span></button>
        </div>
      </div>

      <div class="dhikr-list">${cards}</div>
    </section>`;
  }

  return {
    welcome, home, schedule, exams, courses, settings, adhkar,
    openCourseSheet, refreshWizard, refreshCatalogResults, syncDraft, wizard,
    sessionDetail, sessionForm, examForm, linkForm, chapterForm,
    KIND, EXAM
  };
})();
