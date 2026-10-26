/* A password screen for the site.

   WHAT THIS IS: a doorway that keeps the site from being read by anyone who
   wanders past, and keeps it out of search results. Guests type the password
   once and their browser remembers it for 30 days.

   WHAT THIS IS NOT: real security. The files are served by GitHub Pages and
   sit in a public repository, so anyone who knows how to view the page source
   or open the repo can read the content without the password. Treat the site
   as "unlisted and politely gated", not private. README section 6 lists the
   options if you ever need the real thing.

   TO CHANGE THE PASSWORD: paste this into your browser's console (right click
   the page, Inspect, Console), with your new password in the quotes:

     (async p => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
       let d = 5381; for (const c of p) d = ((d * 33) ^ c.charCodeAt(0)) >>> 0;
       console.log('SHA:', [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join(''), '\nALT:', d);
     })('your new password')

   Then put the two values into SHA and ALT below. */

(function () {
  var SHA = 'e78abb0902f175a3be3165680e9e50632cb262d35e1512117ac4b03e265806ce';
  var ALT = 2025537753;              // used only where crypto.subtle is missing
  var KEY = 'nj-unlocked';
  var DAYS = 30;

  var FR = document.documentElement.lang === 'fr';
  var T = FR ? {
    title: 'Noémie & Jose',
    sub: 'Cette page est réservée à nos invités. Le mot de passe se trouve sur votre invitation.',
    label: 'Mot de passe',
    go: 'Entrer',
    wrong: 'Ce mot de passe ne fonctionne pas. Vérifiez votre invitation, ou écrivez-nous.'
  } : {
    title: 'Noémie & Jose',
    sub: 'This page is for our guests. The password is on your invitation.',
    label: 'Password',
    go: 'Enter',
    wrong: 'That password did not work. Check your invitation, or write to us.'
  };

  function unlockedAlready() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (saved.v !== SHA) return false;                       // password changed
      if (Date.now() - saved.at > DAYS * 864e5) return false;  // expired
      return true;
    } catch (e) { return false; }
  }

  function remember() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: SHA, at: Date.now() })); } catch (e) {}
  }

  function weak(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h;
  }

  function check(value) {
    var pw = String(value || '').trim();
    if (!pw) return Promise.resolve(false);
    if (window.crypto && crypto.subtle && location.protocol !== 'file:') {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
        .then(function (buf) {
          var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join('');
          return hex === SHA;
        })
        .catch(function () { return weak(pw) === ALT; });
    }
    return Promise.resolve(weak(pw) === ALT);
  }

  if (unlockedAlready()) return;

  // Hide the page straight away, before anything paints.
  document.documentElement.classList.add('locked');

  function build() {
    var gate = document.createElement('div');
    gate.id = 'gate';
    gate.innerHTML =
      '<div class="gate-card">' +
        '<h1>' + T.title + '</h1>' +
        '<p class="gate-date">18 · 09 · 2027</p>' +
        '<p class="gate-sub">' + T.sub + '</p>' +
        '<form id="gate-form" autocomplete="off">' +
          '<label for="gate-pw">' + T.label + '</label>' +
          '<input type="password" id="gate-pw" autocomplete="current-password" autofocus>' +
          '<button class="btn" type="submit">' + T.go + '</button>' +
          '<p class="gate-error" id="gate-error" role="alert"></p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(gate);

    var input = gate.querySelector('#gate-pw');
    var error = gate.querySelector('#gate-error');
    input.focus();

    gate.querySelector('#gate-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      check(input.value).then(function (ok) {
        if (!ok) {
          error.textContent = T.wrong;
          gate.querySelector('.gate-card').classList.remove('shake');
          void gate.querySelector('.gate-card').offsetWidth;
          gate.querySelector('.gate-card').classList.add('shake');
          input.select();
          return;
        }
        remember();
        document.documentElement.classList.remove('locked');
        gate.remove();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
