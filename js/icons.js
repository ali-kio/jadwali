/* ==========================================================================
   icons.js — أيقونات SVG مضمّنة. لا CDN، تشتغل أوفلاين من أول ثانية.
   الاستخدام في HTML:  <i data-i="calendar"></i>
   ========================================================================== */
window.ICONS = {
  home:        '<path d="M3.2 10.6 12 3.4l8.8 7.2"/><path d="M5.6 9.6V20h12.8V9.6"/>',
  calendar:    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clipboard:   '<rect x="5" y="4" width="14" height="17" rx="3"/><rect x="9" y="2.2" width="6" height="3.8" rx="1.4"/><path d="M9.2 12.6l2 2 3.6-3.8"/>',
  library:     '<rect x="3.2" y="4" width="4.6" height="16" rx="1.6"/><rect x="9.6" y="4" width="4.6" height="16" rx="1.6"/><path d="m17 5.4 3.4 13.8"/>',
  settings:    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2 5.4 5.4"/>',
  search:      '<circle cx="11" cy="11" r="6.6"/><path d="m16.2 16.2 4.4 4.4"/>',
  plus:        '<path d="M12 5v14M5 12h14"/>',
  minus:       '<path d="M5 12h14"/>',
  x:           '<path d="m6 6 12 12M18 6 6 18"/>',
  check:       '<path d="m5 12.6 4.6 4.6L19 6.8"/>',
  down:        '<path d="m6 9.5 6 6 6-6"/>',
  up:          '<path d="m6 14.5 6-6 6 6"/>',
  back:        '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  forward:     '<path d="M5 12h14M13 6l6 6-6 6"/>',
  pencil:      '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m14.5 5.5 4 4"/>',
  trash:       '<path d="M4 7h16M9.2 7V4.6h5.6V7M6.6 7l.9 13h9l.9-13"/>',
  link:        '<path d="M10.2 14a4.6 4.6 0 0 0 6.5 0l2.2-2.2a4.6 4.6 0 0 0-6.5-6.5l-1 1"/><path d="M13.8 10a4.6 4.6 0 0 0-6.5 0L5.1 12.2a4.6 4.6 0 0 0 6.5 6.5l1-1"/>',
  download:    '<path d="M12 3.5v12M7.6 11.2 12 15.6l4.4-4.4"/><path d="M4.5 20h15"/>',
  upload:      '<path d="M12 20.5v-12M7.6 12.8 12 8.4l4.4 4.4"/><path d="M4.5 4h15"/>',
  refresh:     '<path d="M20.2 12a8.2 8.2 0 1 1-2.6-6"/><path d="M20.4 4v5.2h-5.2"/>',
  sun:         '<circle cx="12" cy="12" r="4"/><path d="M12 2.4v2.4M12 19.2v2.4M21.6 12h-2.4M4.8 12H2.4M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1 5.4 5.4"/>',
  moon:        '<path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6a8.6 8.6 0 1 0 11 11z"/>',
  monitor:     '<rect x="3" y="4.2" width="18" height="13" rx="2.6"/><path d="M9 21h6M12 17.2V21"/>',
  clock:       '<circle cx="12" cy="12" r="8.8"/><path d="M12 6.8v5.5l3.6 2.1"/>',
  pin:         '<path d="M12 21.2s6.8-5.6 6.8-10.8a6.8 6.8 0 1 0-13.6 0C5.2 15.6 12 21.2 12 21.2z"/><circle cx="12" cy="10.2" r="2.5"/>',
  user:        '<circle cx="12" cy="8" r="3.8"/><path d="M4.6 20a7.4 7.4 0 0 1 14.8 0"/>',
  users:       '<circle cx="9.2" cy="8" r="3.5"/><path d="M2.6 20a6.6 6.6 0 0 1 13.2 0"/><path d="M16.2 5.2a3.5 3.5 0 0 1 0 5.6M18 20a6.7 6.7 0 0 0-1.8-4.4"/>',
  alert:       '<path d="M12 3.6 21 19.6H3z"/><path d="M12 10v4.6M12 17.4v.1"/>',
  info:        '<circle cx="12" cy="12" r="8.8"/><path d="M12 11v6M12 7.6v.1"/>',
  book:        '<path d="M5 4.6h8.6a4 4 0 0 1 4 4V21a3.4 3.4 0 0 0-3.4-3.4H5z"/><path d="M5 4.6v13"/>',
  flask:       '<path d="M10 3.2v5.6L4.8 18.4A2 2 0 0 0 6.6 21.4h10.8a2 2 0 0 0 1.8-3L14 8.8V3.2"/><path d="M8.8 3.2h6.4M7.6 15.4h8.8"/>',
  cap:         '<path d="m3 9.6 9-4.4 9 4.4-9 4.4z"/><path d="M7.2 11.8V16c0 1.5 2.3 2.8 4.8 2.8s4.8-1.3 4.8-2.8v-4.2"/>',
  palette:     '<path d="M12 21a9 9 0 1 1 9-9c0 2-1.7 3-3.3 3H16a2 2 0 0 0-1.4 3.4A2 2 0 0 1 12 21z"/><circle cx="8" cy="10.4" r="1.1"/><circle cx="12" cy="7.6" r="1.1"/><circle cx="16" cy="10.4" r="1.1"/>',
  grid:        '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.6"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.6"/>',
  rows:        '<path d="M4 7.2h16M4 12h16M4 16.8h16"/>',
  copy:        '<rect x="8.2" y="8.2" width="11.8" height="11.8" rx="2.6"/><path d="M15.8 8.2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.8a2 2 0 0 0 2 2h2.2"/>',
  external:    '<path d="M14 4h6v6"/><path d="m20 4-8.4 8.4"/><path d="M19 13.6v4.9A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-9A2.5 2.5 0 0 1 7.5 7h4.9"/>',
  note:        '<path d="M5.2 4.4h9.6L19 8.6V19.6H5.2z"/><path d="M8.4 10.4h7.2M8.4 13.8h7.2M8.4 17.2h4.6"/>',
  target:      '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r=".9"/>',
  filter:      '<path d="M4 5.6h16l-6.3 7.5V20l-3.4-1.9v-5z"/>',
  dots:        '<circle cx="12" cy="5.4" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18.6" r="1.5"/>',
  offline:     '<path d="m3 3.6 17.4 17.4"/><path d="M8.6 13.8a5 5 0 0 1 6.4-.5M5.2 10.2a10 10 0 0 1 3.6-2.2M18.8 10.2a10 10 0 0 0-8.2-2.8"/><path d="M12 18.4v.1"/>',
  sparkle:     '<path d="m12 3.4 1.8 4.8 4.8 1.8-4.8 1.8L12 16.6l-1.8-4.8-4.8-1.8 4.8-1.8z"/><path d="m18.6 16.4.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>',
  percent:     '<path d="M6.4 17.6 17.6 6.4"/><circle cx="7.6" cy="7.6" r="2.1"/><circle cx="16.4" cy="16.4" r="2.1"/>',
  hash:        '<path d="M6 9.2h13M5 14.8h13M10.4 4 8.8 20M16.4 4 14.8 20"/>',
  lock:        '<rect x="5" y="10.4" width="14" height="10.2" rx="2.6"/><path d="M8.6 10.4V8a3.4 3.4 0 0 1 6.8 0v2.4"/>',
  bell:        '<path d="M18 9.4a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z"/><path d="M10.4 19.6a2 2 0 0 0 3.2 0"/>',
  print:       '<path d="M7 9V3.6h10V9"/><rect x="3.6" y="9" width="16.8" height="7.4" rx="2.4"/><path d="M7 14.4h10V21H7z"/>',
  swap:        '<path d="M4.6 8.4h14.8M15.8 4.8l3.6 3.6-3.6 3.6"/><path d="M19.4 15.6H4.6M8.2 12l-3.6 3.6L8.2 19.2"/>'
};

(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function svgFor(name) {
    const body = window.ICONS[name];
    if (!body) return '';
    return `<svg xmlns="${NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /** يستبدل كل <i data-i="name"> بالأيقونة نفسها (مرة واحدة فقط لكل عنصر) */
  function paint(root) {
    (root || document).querySelectorAll('i[data-i]:not([data-painted])').forEach(el => {
      const html = svgFor(el.dataset.i);
      if (!html) { el.dataset.painted = '1'; return; }
      el.innerHTML = html;
      el.dataset.painted = '1';
    });
  }

  window.Icons = { svgFor, paint };
})();
