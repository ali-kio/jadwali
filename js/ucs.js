/* ==========================================================================
   ucs.js — قراءة صفحة UCS (ucs.uob.edu.bh) كما تُنسخ حرفياً

   صيغة الموقع:
     ITCS106 (Computer Programming I)
     Prereqs:
     Exam Date:
     2027-01-05 - 11:30 - 13:30
     Section: 01
     Instructor: AFRAH ALI YAQOOB YUSUF
     Available Seats: -Exam Room: To be announcedSection Status: OPENRemarks:
     Class Type: LEC   Day: Monday
     Time: From 09:30 To 10:45   Location: S40/1045

   ليش لصق وليس جلب مباشر؟ الموقع ASP.NET ينتج النتائج عبر POST + ViewState،
   والمتصفح يمنع أي موقع من قراءة موقع آخر (CORS). فاللصق هو الطريق المضمون
   بدون سيرفر وسيط — والكتالوج المدمج يغطي كلية تقنية المعلومات بدون أي لصق.
   ========================================================================== */
window.UCS = (function () {

  const SITE = 'https://ucs.uob.edu.bh';

  /* أداة الاستخراج: تنسخ نص الصفحة كامل بضغطة */
  const BOOKMARKLET =
    "javascript:(function(){try{var t=document.body.innerText||'';" +
    "if(t.length<200){alert('الصفحة تبدو فاضية — اعرض السكاشن أولاً');return}" +
    "var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();" +
    "document.execCommand('copy');a.remove();" +
    "alert('تم نسخ الصفحة. ارجع لتطبيق جدولي والصقها.')}" +
    "catch(e){alert('تعذّر النسخ: '+e.message)}})();";

  /* ------------------------------ خرائط ------------------------------ */
  const DAY_NAMES = [
    [/^sun|الأحد|الاحد/i, 0],
    [/^mon|الإثنين|الاثنين|الأثنين/i, 1],
    [/^tue|الثلاثاء/i, 2],
    [/^wed|الأربعاء|الاربعاء/i, 3],
    [/^thu|الخميس/i, 4],
    [/^fri|الجمعة/i, 5],
    [/^sat|السبت/i, 6]
  ];
  const LETTER_DAY = { U: 0, M: 1, T: 2, W: 3, H: 4, R: 4, F: 5, S: 6 };

  const KIND_OF = txt => {
    const s = String(txt || '').toUpperCase();
    if (s.includes('LAB') || /مختبر|عملي/.test(txt)) return 'lab';
    if (s.includes('TUT') || /تمارين/.test(txt)) return 'tutorial';
    return 'lecture';
  };

  /* ---------------------------- أدوات نصية ---------------------------- */
  function clean(text) {
    return U.latinDigits(String(text || ''))
      .replace(/\u00a0/g, ' ')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\r/g, '');
  }

  const COURSE_RE = /^([A-Z]{2,8}\s?\d{2,4})\s*\((.+)\)\s*$/;
  const TIME_RE = /(\d{1,2}):(\d{2})\s*([AaPp])?\.?[Mm]?\.?\s*(?:-|–|to|To|إلى)\s*(\d{1,2}):(\d{2})\s*([AaPp])?\.?[Mm]?\.?/;
  const ISO_RE = /(\d{4})-(\d{2})-(\d{2})/;
  const DMY_RE = /\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/;

  function to24(h, ap) {
    h = +h;
    if (!ap) return h;
    const pm = ap.toLowerCase() === 'p';
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h;
  }

  function findTime(text) {
    const m = clean(text).match(TIME_RE);
    if (!m) return null;
    let sh = to24(m[1], m[3]), eh = to24(m[4], m[6]);
    if (!m[3] && !m[6] && eh < sh) eh += 12;
    return { start: `${U.pad(sh)}:${m[2]}`, end: `${U.pad(eh)}:${m[5]}` };
  }

  function findDate(text) {
    const s = clean(text);
    let m = s.match(ISO_RE);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(DMY_RE);
    if (m) {
      let d = +m[1], mo = +m[2];
      if (mo > 12) { const t = d; d = mo; mo = t; }
      return `${m[3]}-${U.pad(mo)}-${U.pad(d)}`;
    }
    return '';
  }

  function findDay(text) {
    const s = clean(text).trim();
    for (const [re, d] of DAY_NAMES) if (re.test(s)) return d;
    const letters = s.toUpperCase().replace(/[^UMTWHRFS]/g, '');
    const out = [];
    for (const ch of letters) if (ch in LETTER_DAY) out.push(LETTER_DAY[ch]);
    return out.length === 1 ? out[0] : (out.length ? out : null);
  }

  /** يلتقط قيمة حقل داخل سطر مضغوط مثل: Exam Room: To be announcedSection Status: OPEN */
  function field(line, label, stops) {
    const i = line.indexOf(label);
    if (i === -1) return '';
    let rest = line.slice(i + label.length);
    (stops || []).forEach(stop => {
      const j = rest.indexOf(stop);
      if (j !== -1) rest = rest.slice(0, j);
    });
    return rest.trim();
  }

  /* ------------------------------ التحليل ------------------------------ */
  /**
   * @returns {{courses:Array, year:string, semester:string, warnings:Array}}
   */
  function parse(input) {
    const warnings = [];
    const lines = clean(input).split('\n').map(l => l.replace(/\s+$/, ''));

    const courses = [];
    let course = null, section = null;
    let pending = null;           // { kind, day } بانتظار سطر الوقت
    let expectExam = false;
    let year = '', semester = '';
    let expectYear = false, expectSemester = false;

    function applyTime(line) {
      if (!section) return;
      const timeTxt = field(line, 'Time:', ['Location:']);
      const time = findTime(timeTxt || line);
      if (!time) { pending = null; return; }             // "Time: From To" — بدون وقت
      const room = field(line, 'Location:', ['Class Type:']) || '';
      const kind = pending ? pending.kind : 'lecture';
      let days = pending ? pending.day : null;
      if (days === null || days === undefined) { pending = null; return; }
      if (!Array.isArray(days)) days = [days];
      days.forEach(d => section.meetings.push({ kind, day: d, start: time.start, end: time.end, room }));
      pending = null;
    }

    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) return;

      /* رأس الصفحة: السنة والفصل */
      if (/^Year:\s*$/i.test(line)) { expectYear = true; return; }
      if (expectYear) {
        expectYear = false;
        if (/^\d{4}\s*\/\s*\d{4}$/.test(line)) { year = line.replace(/\s/g, ''); return; }
      }
      if (/^Semester:\s*$/i.test(line)) { expectSemester = true; return; }
      if (expectSemester) {
        expectSemester = false;
        if (/semester|الفصل/i.test(line)) {
          semester = /second|الثاني/i.test(line) ? 'الفصل الثاني'
                   : /summer|صيفي/i.test(line) ? 'الفصل الصيفي' : 'الفصل الأول';
          return;
        }
      }

      /* تاريخ الامتحان يجي في السطر اللي بعد "Exam Date:" */
      if (expectExam) {
        expectExam = false;
        if (line === '0') return;
        const date = findDate(line);
        if (date && course) {
          const time = findTime(line);
          course.exam = { date, start: time ? time.start : '08:30', end: time ? time.end : '10:30' };
          return;
        }
      }

      /* رأس مقرر:  CODE (Title) */
      const head = line.match(COURSE_RE);
      if (head) {
        course = {
          code: head[1].replace(/\s/g, '').toUpperCase(),
          title: head[2].trim(),
          prereqs: '', exam: null, sections: []
        };
        courses.push(course);
        section = null; pending = null;
        return;
      }

      if (/^Prereqs\s*:/i.test(line)) {
        if (course) course.prereqs = line.replace(/^Prereqs\s*:/i, '').trim();
        return;
      }
      if (/^Exam\s*Date\s*:/i.test(line)) {
        const inline = line.replace(/^Exam\s*Date\s*:/i, '').trim();
        if (inline && inline !== '0') {
          const date = findDate(inline), time = findTime(inline);
          if (date && course) course.exam = { date, start: time ? time.start : '08:30', end: time ? time.end : '10:30' };
        } else if (!inline) {
          expectExam = true;
        }
        return;
      }

      if (/^Section\s*:/i.test(line)) {
        if (!course) return;
        section = {
          section: line.replace(/^Section\s*:/i, '').trim(),
          instructor: '', examRoom: '', status: '', meetings: []
        };
        course.sections.push(section);
        pending = null;
        return;
      }

      if (/^Instructor\s*:/i.test(line)) {
        if (section) section.instructor = line.replace(/^Instructor\s*:/i, '').trim();
        return;
      }

      if (/Exam\s*Room\s*:/i.test(line) || /Section\s*Status\s*:/i.test(line)) {
        if (section) {
          const room = field(line, 'Exam Room:', ['Section Status:', 'Remarks:']);
          const status = field(line, 'Section Status:', ['Remarks:']);
          if (room && !/to be announced/i.test(room)) section.examRoom = room;
          if (status) section.status = status;
        }
        return;
      }

      /* سطر النشاط: Class Type: LEC \t Day: Monday   (وقد يجي معه الوقت) */
      if (/Class\s*Type\s*:/i.test(line)) {
        const kind = KIND_OF(field(line, 'Class Type:', ['Day:', 'Time:', 'Location:']));
        const dayTxt = field(line, 'Day:', ['Time:', 'Location:', 'Class Type:']);
        pending = { kind, day: findDay(dayTxt) };
        if (/Time\s*:/i.test(line)) applyTime(line);
        return;
      }

      if (/Time\s*:/i.test(line)) { applyTime(line); return; }
    });

    const kept = courses.filter(c => c.sections.length);
    if (!kept.length) {
      warnings.push('ما قدرت أتعرّف على أي مقرر. تأكد أنك نسخت صفحة نتائج UCS كاملة.');
    }
    kept.forEach(c => {
      if (!c.exam) warnings.push(`${c.code}: ما فيه تاريخ امتحان نهائي في الصفحة.`);
      c.sections.forEach(s => {
        if (!s.meetings.length) warnings.push(`${c.code} شعبة ${s.section}: بدون أوقات محددة.`);
      });
    });

    return { courses: kept, year, semester, warnings };
  }

  /* -------------------- تحويل سكشن إلى مقرر في التطبيق -------------------- */
  function toCourse(course, section, extra = {}) {
    const sessions = section.meetings.map(m => ({
      day: m.day, start: m.start, end: m.end,
      room: m.room, kind: m.kind, teacher: section.instructor
    }));
    const exams = [];
    if (course.exam && course.exam.date) {
      exams.push({
        kind: 'final', date: course.exam.date,
        start: course.exam.start, end: course.exam.end,
        room: section.examRoom || ''
      });
    }
    return Object.assign({
      code: course.code,
      title: course.title || '',
      section: section.section || '',
      instructor: section.instructor || '',
      credits: 3,
      sessions, exams
    }, extra);
  }

  /** يجمع الحصص المتشابهة في سطر واحد للعرض */
  function describeSection(section) {
    const groups = new Map();
    section.meetings.forEach(m => {
      const key = [m.kind, m.start, m.end, m.room].join('|');
      if (!groups.has(key)) groups.set(key, { kind: m.kind, start: m.start, end: m.end, room: m.room, days: [] });
      groups.get(key).days.push(m.day);
    });
    const KIND = { lecture: 'محاضرة', lab: 'مختبر', tutorial: 'تمارين' };
    return Array.from(groups.values()).map(g => {
      const days = g.days.sort((a, b) => a - b).map(d => U.DAY_SHORT[d]).join('، ');
      return `${KIND[g.kind] || 'محاضرة'} — ${days} · ${U.spanText(g.start, g.end)}${g.room ? ' · ' + g.room : ''}`;
    });
  }

  return { SITE, BOOKMARKLET, parse, toCourse, describeSection, findTime, findDate, findDay };
})();
