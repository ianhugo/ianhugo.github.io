(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // Theme toggle
  var toggle = document.getElementById('theme-toggle');
  var meta = document.querySelector('meta[name="theme-color"]');
  function sync() {
    var dark = root.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    if (meta) meta.setAttribute('content', dark ? '#0f0f17' : '#faf9f6');
  }
  sync();
  toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Fade-in sections on scroll
  var els = document.querySelectorAll('.anim');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('visible'); });
  }
})();
