/*
 * Site feedback form for KetoDial and PescoDial (Brew, 2026-10-10).
 * One self-contained file, copied byte for byte to ketodial/public/js/feedback.js
 * (tests/feedback-form.test.mjs checks the two match). Load it with
 *   <script src="/js/feedback.js" data-site="kd|pd" defer></script>
 * Posts to the same worker endpoint as the Carnivore Weekly modal, which saves to
 * content_feedback with the site tag; the daily writer-inbox check reads it from there.
 * Any element with data-open-feedback also opens the form (footer links).
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/feedback';
  var WAIT_MS = 60000;

  var script = document.currentScript;
  var site = script && script.getAttribute('data-site');

  var SITES = {
    kd: {
      placeholder: "For example: Can you add more dairy-free keto dinners?",
      vars: {
        '--sfb-font': '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
        '--sfb-head': '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
        '--sfb-head-weight': '700',
        '--sfb-pill-bg': '#0f172a',
        '--sfb-pill-ink': '#ffffff',
        '--sfb-pill-icon': '#38bdf8',
        '--sfb-panel': '#ffffff',
        '--sfb-ink': '#0f172a',
        '--sfb-muted': '#475569',
        '--sfb-line': '#cbd5e1',
        '--sfb-field': '#f8fafc',
        '--sfb-primary': '#0369a1',
        '--sfb-primary-dark': '#075985',
        '--sfb-focus': '#0ea5e9',
        '--sfb-error': '#b91c1c',
        '--sfb-radius': '12px'
      }
    },
    pd: {
      placeholder: "For example: Which fish are best for a tight budget?",
      vars: {
        '--sfb-font': '"Atkinson Hyperlegible", system-ui, sans-serif',
        '--sfb-head': '"DM Serif Display", Georgia, serif',
        '--sfb-head-weight': '400',
        '--sfb-pill-bg': '#1d3a57',
        '--sfb-pill-ink': '#fffbf4',
        '--sfb-pill-icon': '#c6cf91',
        '--sfb-panel': '#fffbf4',
        '--sfb-ink': '#1f2328',
        '--sfb-muted': '#4a4f55',
        '--sfb-line': '#d8ccb6',
        '--sfb-field': '#ffffff',
        '--sfb-primary': '#b04f2c',
        '--sfb-primary-dark': '#8e3d1f',
        '--sfb-focus': '#1d3a57',
        '--sfb-error': '#a3261b',
        '--sfb-radius': '14px'
      }
    }
  };

  var cfg = SITES[site];
  if (!cfg || document.getElementById('sfb-root')) return;

  var CSS = [
    '#sfb-root{font-family:var(--sfb-font);color:var(--sfb-ink);}',
    '#sfb-root *,#sfb-root *::before,#sfb-root *::after{box-sizing:border-box;}',
    '.sfb-pill{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:900;',
    'display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 18px 0 14px;border:0;border-radius:999px;',
    'background:var(--sfb-pill-bg);color:var(--sfb-pill-ink);font:600 16px/1 var(--sfb-font);cursor:pointer;',
    'box-shadow:0 6px 20px rgba(15,23,42,.22);}',
    '.sfb-pill svg{width:20px;height:20px;flex:none;stroke:var(--sfb-pill-icon);}',
    '.sfb-pill:hover{filter:brightness(1.12);}',
    '.sfb-pill:focus-visible,.sfb-btn:focus-visible,.sfb-x:focus-visible{outline:3px solid var(--sfb-focus);outline-offset:3px;}',
    '.sfb-dialog{width:min(520px,calc(100vw - 32px));max-height:calc(100dvh - 32px);margin:auto;padding:0;border:0;',
    'border-radius:var(--sfb-radius);background:var(--sfb-panel);color:var(--sfb-ink);box-shadow:0 24px 60px rgba(15,23,42,.3);}',
    '.sfb-dialog::backdrop{background:rgba(15,23,42,.55);}',
    '.sfb-body{position:relative;padding:28px 24px 24px;}',
    '.sfb-dialog h2{margin:0 40px 8px 0;font-family:var(--sfb-head);font-weight:var(--sfb-head-weight);font-size:26px;line-height:1.2;}',
    '.sfb-dialog p{margin:0 0 20px;font-size:17px;line-height:1.5;color:var(--sfb-muted);}',
    '.sfb-x{position:absolute;top:14px;right:14px;width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:50%;',
    'background:transparent;color:var(--sfb-muted);cursor:pointer;}',
    '.sfb-x:hover{background:rgba(15,23,42,.06);}',
    '.sfb-x svg{width:22px;height:22px;}',
    '.sfb-field{margin:0 0 18px;}',
    '.sfb-field label{display:block;margin:0 0 6px;font-weight:700;font-size:16px;}',
    '.sfb-field textarea,.sfb-field input{display:block;width:100%;padding:12px 14px;border:1.5px solid var(--sfb-line);',
    'border-radius:10px;background:var(--sfb-field);color:var(--sfb-ink);font:17px/1.45 var(--sfb-font);}',
    '.sfb-field textarea{min-height:132px;resize:vertical;}',
    '.sfb-field textarea:focus,.sfb-field input:focus{outline:none;border-color:var(--sfb-focus);box-shadow:0 0 0 3px rgba(14,165,233,.18);}',
    '.sfb-hint{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:14px;color:var(--sfb-muted);}',
    '.sfb-error{margin:0 0 16px;font-size:16px;font-weight:600;color:var(--sfb-error);}',
    '.sfb-actions{display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;}',
    '.sfb-btn{min-height:48px;padding:0 22px;border-radius:10px;font:700 16px/1 var(--sfb-font);cursor:pointer;}',
    '.sfb-btn-primary{border:0;background:var(--sfb-primary);color:#fff;}',
    '.sfb-btn-primary:hover{background:var(--sfb-primary-dark);}',
    '.sfb-btn-primary[disabled]{opacity:.65;cursor:progress;}',
    '.sfb-btn-quiet{border:1.5px solid var(--sfb-line);background:transparent;color:var(--sfb-ink);}',
    '@media (max-width:480px){.sfb-pill{padding:0 14px 0 12px;font-size:15px;}.sfb-body{padding:24px 18px 18px;}',
    '.sfb-dialog h2{font-size:23px;}.sfb-actions .sfb-btn{flex:1 1 auto;}}',
    '@media print{#sfb-root{display:none!important;}}'
  ].join('');

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html) n.innerHTML = html;
    return n;
  }

  function lastSent() {
    try { return parseInt(localStorage.getItem('sfb_last_' + site) || '0', 10); } catch (e) { return 0; }
  }
  function markSent() {
    try { localStorage.setItem('sfb_last_' + site, String(Date.now())); } catch (e) { /* private mode */ }
  }

  function build() {
    var style = el('style', { id: 'sfb-style' });
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = el('div', { id: 'sfb-root' });
    for (var v in cfg.vars) root.style.setProperty(v, cfg.vars[v]);

    var pill = el('button', { type: 'button', 'class': 'sfb-pill', 'aria-haspopup': 'dialog' },
      ICON_CHAT + '<span>Send feedback</span>');

    var dialog = el('dialog', { 'class': 'sfb-dialog', 'aria-labelledby': 'sfb-title' });
    dialog.innerHTML =
      '<div class="sfb-body">' +
        '<button type="button" class="sfb-x" aria-label="Close">' + ICON_X + '</button>' +
        '<div class="sfb-form-view">' +
          '<h2 id="sfb-title">What would help you most?</h2>' +
          '<p>Ask a question, ask for a recipe or guide, or tell us what isn’t working. A real person reads every note.</p>' +
          '<form novalidate>' +
            '<div class="sfb-field">' +
              '<label for="sfb-text">Your note</label>' +
              '<textarea id="sfb-text" name="request_text" maxlength="1000" required></textarea>' +
              '<div class="sfb-hint"><span>At least 10 characters</span><span><span class="sfb-count">0</span> / 1000</span></div>' +
            '</div>' +
            '<div class="sfb-field">' +
              '<label for="sfb-email">Your email</label>' +
              '<input id="sfb-email" name="email" type="email" autocomplete="email" inputmode="email" required>' +
              '<div class="sfb-hint"><span>So we can write back. This doesn’t sign you up for anything.</span></div>' +
            '</div>' +
            '<p class="sfb-error" role="alert" hidden></p>' +
            '<div class="sfb-actions">' +
              '<button type="button" class="sfb-btn sfb-btn-quiet sfb-cancel">Cancel</button>' +
              '<button type="submit" class="sfb-btn sfb-btn-primary">Send feedback</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
        '<div class="sfb-done-view" hidden>' +
          '<h2 tabindex="-1">Feedback sent</h2>' +
          '<p>Thanks for writing. If you asked a question, we’ll reply to the email you gave us.</p>' +
          '<div class="sfb-actions"><button type="button" class="sfb-btn sfb-btn-primary sfb-close">Close</button></div>' +
        '</div>' +
      '</div>';

    root.appendChild(pill);
    root.appendChild(dialog);
    document.body.appendChild(root);

    var form = dialog.querySelector('form');
    var text = dialog.querySelector('#sfb-text');
    var email = dialog.querySelector('#sfb-email');
    var count = dialog.querySelector('.sfb-count');
    var err = dialog.querySelector('.sfb-error');
    var submit = dialog.querySelector('.sfb-btn-primary');
    var formView = dialog.querySelector('.sfb-form-view');
    var doneView = dialog.querySelector('.sfb-done-view');
    text.placeholder = cfg.placeholder;

    function showError(msg) { err.textContent = msg; err.hidden = false; }

    function open(e) {
      if (e) e.preventDefault();
      if (doneView.hidden === false) {
        doneView.hidden = true; formView.hidden = false;
        form.reset(); count.textContent = '0';
      }
      err.hidden = true;
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      text.focus();
    }
    function close() {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
      pill.focus();
    }

    pill.addEventListener('click', open);
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-open-feedback]');
      if (t) open(e);
    });
    dialog.querySelector('.sfb-x').addEventListener('click', close);
    dialog.querySelector('.sfb-cancel').addEventListener('click', close);
    dialog.querySelector('.sfb-close').addEventListener('click', close);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    text.addEventListener('input', function () { count.textContent = String(text.value.length); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      var note = text.value.trim();
      var addr = email.value.trim();
      if (note.length < 10) { showError('Please write at least 10 characters so we know what you need.'); text.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr)) { showError('Please enter an email address we can reply to, like name@example.com.'); email.focus(); return; }
      if (Date.now() - lastSent() < WAIT_MS) { showError('Your last note just went through. Please wait a minute before sending another.'); return; }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_text: note, email: addr, site: site })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok || !data.success) {
            var api = new Error('not saved');
            // 4xx carries a readable reason ({code, message}); anything else is generic.
            api.fromApi = r.status >= 400 && r.status < 500 && data && data.message;
            throw api;
          }
        });
      }).then(function () {
        markSent();
        formView.hidden = true;
        doneView.hidden = false;
        doneView.querySelector('h2').focus();
        if (typeof window.gtag === 'function') window.gtag('event', 'feedback_submit', { site: site });
      }).catch(function (x) {
        if (x && x.fromApi) showError(x.fromApi + '.');
        else showError('Your note didn’t send. Check your connection and try again.');
      }).then(function () {
        submit.disabled = false;
        submit.textContent = 'Send feedback';
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
