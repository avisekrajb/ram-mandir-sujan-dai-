// Turns the preloaded Google Fonts request (see index.html) into a real stylesheet. The font file was
// already asked for by the <link rel="preload">, so this reuses that download; the page does not wait
// for it (display=swap shows the text straight away). It lives in a file of its own because a strict
// Content-Security-Policy does not allow inline event handlers such as onload="...".
(function () {
  var link = document.getElementById('webfont-css');
  if (link) link.rel = 'stylesheet';
})();
