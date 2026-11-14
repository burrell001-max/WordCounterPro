/* ==== EDIT THESE FOUR VALUES BEFORE YOU PUBLISH ==== */
window.SITE = {
  name: 'WordCounterPro',
  email: 'hello@YOUR-DOMAIN.com',      // shown on Contact/Privacy pages; also receives mailto messages
  formEndpoint: '',                     // optional: a Formspree/Basin URL. Leave '' to use the visitor's email app
  adsenseClient: '',                    // e.g. 'ca-pub-1234567890123456' (leave '' until AdSense approves you)
  adSlots: { inarticle: '', sidebar: '' } // ad unit IDs from AdSense (numbers as text)
};
/* ==================================================== */

(function () {
  var FONTS = {
    serif: '"Newsreader",Georgia,serif',
    sans: '"Instrument Sans",system-ui,sans-serif',
    georgia: 'Georgia,serif',
    verdana: 'Verdana,Geneva,sans-serif',
    arial: 'Arial,Helvetica,sans-serif',
    mono: 'ui-monospace,Menlo,Consolas,"Courier New",monospace'
  };
  window.WCP_FONTS = FONTS;
  window.loadPrefs = function () {
    try { return JSON.parse(localStorage.getItem('wcp-settings') || '{}'); } catch (e) { return {}; }
  };
  window.applyPrefs = function (S) {
    var r = document.documentElement;
    if (S.theme === 'dark' || S.theme === 'light') r.setAttribute('data-theme', S.theme);
    else r.removeAttribute('data-theme');
    r.style.setProperty('--edfont', FONTS[S.font] || FONTS.serif);
    r.style.setProperty('--edsize', (S.size || 19) + 'px');
  };
  window.applyPrefs(window.loadPrefs());

  document.addEventListener('DOMContentLoaded', function () {
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

    all('[data-email]').forEach(function (e) { e.textContent = SITE.email; });
    all('[data-mailto]').forEach(function (e) { e.href = 'mailto:' + SITE.email; e.textContent = SITE.email; });
    all('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });

    var tg = $('#navtoggle'), nl = $('.navlinks');
    if (tg) tg.onclick = function () { var o = nl.classList.toggle('open'); tg.setAttribute('aria-expanded', o); };
    var mb = $('#morenav'), mm = $('#moremenu');
    if (mb) mb.onclick = function () { mm.classList.toggle('open'); };
    document.addEventListener('click', function (e) {
      all('.menu.open').forEach(function (m) { if (!m.contains(e.target)) m.classList.remove('open'); });
    });

    /* AdSense: only loads when you've filled in adsenseClient */
    if (SITE.adsenseClient) {
      var s = document.createElement('script');
      s.async = true; s.crossOrigin = 'anonymous';
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(SITE.adsenseClient);
      document.head.appendChild(s);
      all('.adslot').forEach(function (el) {
        var slot = SITE.adSlots[el.getAttribute('data-slot')];
        if (!slot) return;
        var ins = document.createElement('ins');
        ins.className = 'adsbygoogle'; ins.style.display = 'block';
        ins.setAttribute('data-ad-client', SITE.adsenseClient);
        ins.setAttribute('data-ad-slot', slot);
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        el.appendChild(ins); el.classList.add('live');
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      });
    }

    /* Contact / bug report form */
    var f = $('#cform');
    if (f) {
      var q = new URLSearchParams(location.search).get('type');
      if (q === 'bug') f.type.value = 'bug';
      var sync = function () { $('#bugextra').hidden = f.type.value !== 'bug'; };
      f.type.onchange = sync; sync();
      f.onsubmit = function (e) {
        e.preventDefault();
        var typ = f.type.value === 'bug' ? 'Bug report' : 'Message';
        var body = (f.message.value || '').trim();
        if (f.type.value === 'bug' && f.tech.checked) body += '\n\n---\nBrowser: ' + navigator.userAgent + '\nScreen: ' + screen.width + 'x' + screen.height + '\nPage: ' + (f.page.value || 'n/a');
        var subject = 'WordCounterPro ' + typ + (f.name.value ? ' from ' + f.name.value : '');
        var st = $('#cstatus');
        if (SITE.formEndpoint) {
          fetch(SITE.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ name: f.name.value, email: f.email.value, subject: subject, message: body }) })
            .then(function (r) { st.textContent = r.ok ? 'Thanks. Your message was sent.' : 'Sorry, sending failed. Please email us directly.'; if (r.ok) f.reset(); })
            .catch(function () { st.textContent = 'Sorry, sending failed. Please email us directly.'; });
        } else {
          var from = f.email.value ? '\n\nReply to: ' + f.email.value : '';
          location.href = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body + from);
          st.textContent = 'Your email app should open with the message ready to send.';
        }
      };
    }
  });
})();
