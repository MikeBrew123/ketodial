/**
 * KetoDial Social Share Buttons
 * Injects share bar on blog posts and recipe pages.
 */
(function() {
  var style = document.createElement('style');
  style.textContent =
    '.kd-share-bar{display:flex;align-items:center;gap:14px;padding:18px 0;margin:32px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}' +
    '.kd-share-label{font-family:"Hanken Grotesk",system-ui,sans-serif;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8}' +
    '.kd-share-btns{display:flex;gap:8px}' +
    '.kd-share-btn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;color:#475569;text-decoration:none;cursor:pointer;transition:all .2s;font-size:16px}' +
    '.kd-share-btn:hover{background:#f0f7ff;border-color:#38bdf8;color:#0ea5e9}' +
    '.kd-share-fb:hover{color:#1877F2}.kd-share-x:hover{color:#0f172a}.kd-share-pin:hover{color:#E60023}';
  document.head.appendChild(style);
  var isBlog = window.location.pathname.startsWith('/blog/') &&
               window.location.pathname !== '/blog/' &&
               window.location.pathname !== '/blog/index.html';
  var isRecipe = window.location.pathname.startsWith('/recipes/') &&
                 window.location.pathname !== '/recipes/' &&
                 window.location.pathname !== '/recipes/index.html';

  if (!isBlog && !isRecipe) return;
  if (document.querySelector('.kd-share-bar')) return;

  var title = encodeURIComponent(document.title.replace(' — KetoDial', ''));
  var url = encodeURIComponent(window.location.href);

  var bar = document.createElement('div');
  bar.className = 'kd-share-bar';
  bar.innerHTML =
    '<span class="kd-share-label">Share this</span>' +
    '<div class="kd-share-btns">' +
      '<a href="https://www.facebook.com/sharer/sharer.php?u=' + url + '" target="_blank" rel="noopener" class="kd-share-btn kd-share-fb" title="Share on Facebook" onclick="try{gtag(\'event\',\'share\',{method:\'facebook\',content_type:\'' + (isRecipe ? 'recipe' : 'blog') + '\'})}catch(e){}">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' +
      '</a>' +
      '<a href="https://twitter.com/intent/tweet?text=' + title + '&url=' + url + '" target="_blank" rel="noopener" class="kd-share-btn kd-share-x" title="Share on X" onclick="try{gtag(\'event\',\'share\',{method:\'twitter\',content_type:\'' + (isRecipe ? 'recipe' : 'blog') + '\'})}catch(e){}">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
      '</a>' +
      '<a href="https://pinterest.com/pin/create/button/?url=' + url + '&description=' + title + '" target="_blank" rel="noopener" class="kd-share-btn kd-share-pin" title="Pin it" onclick="try{gtag(\'event\',\'share\',{method:\'pinterest\',content_type:\'' + (isRecipe ? 'recipe' : 'blog') + '\'})}catch(e){}">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>' +
      '</a>' +
      '<button class="kd-share-btn kd-share-copy" title="Copy link" onclick="try{navigator.clipboard.writeText(window.location.href);this.innerHTML=\'&#10003;\';setTimeout(function(){this.innerHTML=\'&#128279;\';}.bind(this),2000);gtag(\'event\',\'share\',{method:\'copy_link\',content_type:\'' + (isRecipe ? 'recipe' : 'blog') + '\'})}catch(e){}">' +
        '&#128279;' +
      '</button>' +
    '</div>';

  var target = isBlog
    ? (document.querySelector('article .cta-box') || document.querySelector('article blockquote:last-of-type') || document.querySelector('article'))
    : (document.querySelector('.rel-grid') || document.querySelector('footer'));

  if (target && target.parentNode) {
    target.parentNode.insertBefore(bar, target);
  }
})();
