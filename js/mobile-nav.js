/**
 * KetoDial mobile navigation.
 * Self-contained: detects either nav structure, injects a hamburger + slide-down
 * menu, and injects its own CSS. Just add <script src="/js/mobile-nav.js" defer>
 * to any page — no per-page markup or CSS needed.
 *
 * Handles both KD nav variants:
 *   - <header class="nav"> ... <nav class="nav-links"> + <div class="nav-cta">   (home + index pages)
 *   - <header class="site-nav"> ... <nav style="display:flex"> ...                (recipe / content pages)
 */
(function () {
  'use strict';
  var BP = 860; // match the existing breakpoint that hides the desktop links

  function collectLinks(header, isPrimary) {
    var links = [];
    var seen = {};
    var sources = isPrimary
      ? [header.querySelector('.nav-links'), header.querySelector('.nav-cta')]
      : [header.querySelector('nav')];
    sources.forEach(function (src) {
      if (!src) return;
      src.querySelectorAll('a').forEach(function (a) {
        var href = a.getAttribute('href');
        var text = a.textContent.trim();
        if (!text || seen[text]) return;
        seen[text] = true;
        // A pill/button-styled link becomes the emphasized menu item.
        var isCta = a.classList.contains('btn-pill') ||
          /background:\s*#0f172a/i.test(a.getAttribute('style') || '');
        links.push({ text: text, href: href, cta: isCta });
      });
    });
    return links;
  }

  function injectStyles(isPrimary) {
    if (document.getElementById('kd-mobilenav-styles')) return;
    var hideRule = isPrimary
      ? 'header.nav .nav-links{display:none!important}'
      : 'header.site-nav > div > nav{display:none!important}';
    var css =
      '@media(max-width:' + BP + 'px){' +
      hideRule +
      '.kd-hamburger{display:inline-flex!important}' +
      '}' +
      '.kd-hamburger{display:none;align-items:center;justify-content:center;width:42px;height:42px;' +
      'margin-left:8px;border:1px solid var(--line,#e2e8f0);border-radius:10px;background:var(--surface,#fff);' +
      'cursor:pointer;padding:0;color:var(--ink,#0f172a);flex:none}' +
      '.kd-hamburger svg{width:22px;height:22px}' +
      '.kd-mobile-menu{position:fixed;left:0;right:0;top:0;z-index:9999;background:var(--surface,#fff);' +
      'border-bottom:1px solid var(--line,#e2e8f0);box-shadow:0 12px 30px rgba(15,23,42,.12);' +
      'transform:translateY(-100%);transition:transform .28s ease;padding:14px 20px 20px;' +
      'display:flex;flex-direction:column;gap:2px}' +
      '.kd-mobile-menu.open{transform:translateY(0)}' +
      '.kd-mobile-menu .kd-mm-head{display:flex;justify-content:flex-end;margin-bottom:6px}' +
      '.kd-mobile-menu .kd-mm-close{width:40px;height:40px;border:none;background:transparent;cursor:pointer;' +
      'color:var(--ink-soft,#475569)}' +
      '.kd-mobile-menu a{display:block;padding:14px 6px;font-size:17px;font-weight:600;color:var(--ink,#0f172a);' +
      'text-decoration:none;border-bottom:1px solid var(--line-soft,#eef2f6)}' +
      '.kd-mobile-menu a:last-child{border-bottom:none}' +
      '.kd-mobile-menu a.cta{margin-top:12px;background:var(--accent-deep,#0ea5e9);color:#fff;text-align:center;' +
      'border-radius:10px;border-bottom:none;padding:15px}' +
      '.kd-menu-backdrop{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.4);' +
      'opacity:0;visibility:hidden;transition:opacity .28s ease}' +
      '.kd-menu-backdrop.open{opacity:1;visibility:visible}';
    var style = document.createElement('style');
    style.id = 'kd-mobilenav-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function init() {
    var header = document.querySelector('header.nav');
    var isPrimary = !!header;
    if (!header) header = document.querySelector('header.site-nav');
    if (!header) return;

    var links = collectLinks(header, isPrimary);
    if (!links.length) return;

    injectStyles(isPrimary);

    // Hamburger button
    var btn = document.createElement('button');
    btn.className = 'kd-hamburger';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    var host = header.querySelector('.nav-inner') || header.firstElementChild;
    host.appendChild(btn);

    // Backdrop + slide-down menu
    var backdrop = document.createElement('div');
    backdrop.className = 'kd-menu-backdrop';

    var menu = document.createElement('div');
    menu.className = 'kd-mobile-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Site menu');
    var head = document.createElement('div');
    head.className = 'kd-mm-head';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'kd-mm-close';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    head.appendChild(closeBtn);
    menu.appendChild(head);
    links.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.textContent = l.text;
      if (l.cta) a.className = 'cta';
      menu.appendChild(a);
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(menu);

    function open() {
      menu.classList.add('open');
      backdrop.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      menu.classList.remove('open');
      backdrop.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    btn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) close();
    });
    // If the viewport grows past the breakpoint while open, close cleanly.
    window.addEventListener('resize', function () {
      if (window.innerWidth > BP && menu.classList.contains('open')) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
