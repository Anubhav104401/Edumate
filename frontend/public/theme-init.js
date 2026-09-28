/*
 * Runs BEFORE the page is drawn, so someone who chose dark mode never sees a white flash.
 * It re-applies the theme picked earlier with the theme switch (remembered in localStorage).
 * It is a separate file, not a <script> written inside index.html, because the
 * Content-Security-Policy in nginx.conf only allows scripts that come from this site's own files.
 */
(function () {
  try {
    var saved = localStorage.getItem('edumate.theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved;
    }
  } catch (e) {
    // Storage is blocked (for example a private window): simply follow the computer's setting.
  }
})();
