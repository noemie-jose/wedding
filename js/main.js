/* Shared behaviour: mobile nav + countdown to the celebration. */
(function () {
  // mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // countdown: the celebration starts on 18 September 2027 in Annecy (UTC+2)
  var el = document.getElementById('countdown');
  if (!el) return;
  var fr = document.documentElement.lang === 'fr';
  var L = fr ? { d: 'Jours', h: 'Heures', m: 'Minutes', today: "C'est aujourd'hui", sub: 'Rendez-vous à Annecy' }
             : { d: 'Days', h: 'Hours', m: 'Minutes', today: 'Today', sub: 'See you in Annecy' };
  var target = new Date('2027-09-18T16:00:00+02:00').getTime();
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) { el.innerHTML = '<div><b>' + L.today + '</b><span>' + L.sub + '</span></div>'; return; }
    var d = Math.floor(diff / 864e5),
        h = Math.floor(diff / 36e5) % 24,
        m = Math.floor(diff / 6e4) % 60;
    el.innerHTML =
      '<div><b>' + d + '</b><span>' + L.d + '</span></div>' +
      '<div><b>' + pad(h) + '</b><span>' + L.h + '</span></div>' +
      '<div><b>' + pad(m) + '</b><span>' + L.m + '</span></div>';
  }
  tick();
  setInterval(tick, 30000);
})();
