/* Our Story: a map of everywhere we have been together, tied to a timeline of
   the photos. Needs js/vendor/d3.min.js, js/vendor/topojson-client.min.js,
   data/map-data.js and js/story-data.js, all loaded before this file. */

(function () {
  var D = window.STORY_DATA;
  if (!D || typeof d3 === 'undefined') return;

  var FR = document.documentElement.lang === 'fr';
  var P = window.SITE_PREFIX || '';

  var T = FR ? {
    world: 'Monde', pnw: 'Nord-Ouest', ne: 'Nouvelle-Angleterre', eu: 'Europe',
    play: 'Voir notre parcours', pause: 'Pause',
    legend: 'Les lignes suivent l’ordre de nos voyages',
    moments: 'moments', moment: 'moment', approx: '(environ)',
    showOnMap: 'Voir sur la carte', openPhoto: 'Agrandir la photo',
    places: 'lieux', place: 'lieu', of: 'sur'
  } : {
    world: 'World', pnw: 'Pacific NW', ne: 'New England', eu: 'Europe',
    play: 'Play Our Journey', pause: 'Pause',
    legend: 'Lines follow the order we travelled',
    moments: 'moments', moment: 'moment', approx: '(approx.)',
    showOnMap: 'Show on map', openPhoto: 'Open photo',
    places: 'places', place: 'place', of: 'of'
  };

  var PLACES = {};
  Object.keys(D.places).forEach(function (k) {
    var p = D.places[k];
    PLACES[k] = { name: FR ? p.nameFr : p.name, lat: p.lat, lon: p.lon, approx: p.approx };
  });

  var EVENTS = D.events.map(function (e) {
    return {
      id: e.id, sort: e.sort, year: e.year, place: e.place, w: e.w, h: e.h,
      img: P + 'img/story/' + e.img,
      date: FR ? e.dateFr : e.date,
      title: FR ? e.titleFr : e.title,
      text: FR ? e.textFr : e.text
    };
  });

  var YEARS = [];
  EVENTS.forEach(function (e) { if (YEARS.indexOf(e.year) < 0) YEARS.push(e.year); });
  var byId = new Map(EVENTS.map(function (e) { return [e.id, e]; }));
  var yc = function (y) { return 'var(--y' + y + ')'; };
  var pinIcon = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0.8a3.9 3.9 0 0 0-3.9 3.9C2.1 7.6 6 11.2 6 11.2s3.9-3.6 3.9-6.5A3.9 3.9 0 0 0 6 .8zm0 5.4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ---------------- vertical timeline ---------------- */
  var yearsEl = document.getElementById('years');
  YEARS.forEach(function (y) {
    var evs = EVENTS.filter(function (e) { return e.year === y; });
    var nPlaces = new Set(evs.map(function (e) { return e.place; })).size;
    var sec = document.createElement('section');
    sec.className = 'year';
    sec.style.setProperty('--yc', yc(y));
    sec.innerHTML = '<div class="yearhead" id="y' + y + '"><h2>' + y + '</h2><span>' +
      plural(evs.length, T.moment, T.moments) + ' · ' + plural(nPlaces, T.place, T.places) + '</span></div>';
    evs.forEach(function (e) {
      var pl = PLACES[e.place];
      var art = document.createElement('article');
      art.className = 'moment';
      art.id = 'm' + e.id;
      art.dataset.id = e.id;
      art.innerHTML =
        '<button class="ph" aria-label="' + esc(T.openPhoto) + ': ' + esc(e.title) + '">' +
        '<img loading="lazy" width="' + e.w + '" height="' + e.h + '" src="' + e.img + '" alt="' + esc(e.title) + '"></button>' +
        '<div class="body"><div class="meta"><span class="date">' + esc(e.date) + '</span>' +
        '<button class="placechip" data-id="' + e.id + '" title="' + esc(T.showOnMap) + '">' + pinIcon + esc(pl.name) +
        (pl.approx ? ' <span class="muted">' + T.approx + '</span>' : '') + '</button></div>' +
        '<h3>' + esc(e.title) + '</h3><p>' + esc(e.text) + '</p></div>';
      sec.appendChild(art);
    });
    yearsEl.appendChild(sec);
  });
  document.getElementById('yearnav').innerHTML = YEARS.map(function (y) {
    return '<a href="#y' + y + '" data-y="' + y + '">' + y + '</a>';
  }).join('');
  document.getElementById('legend').innerHTML = YEARS.map(function (y) {
    return '<span><i style="background:' + yc(y) + '"></i>' + y + '</span>';
  }).join('') + '<span class="note">' + T.legend + '</span>';
  document.querySelectorAll('#regions button').forEach(function (b) { b.textContent = T[b.dataset.r]; });
  document.querySelector('#play span').textContent = T.play;

  /* ---------------- map ---------------- */
  var svg = d3.select('#map');
  var mapwrap = document.querySelector('.mapwrap');
  var proj = d3.geoNaturalEarth1();
  var path = d3.geoPath(proj);
  var countries = topojson.feature(window.MAP_DATA.world, window.MAP_DATA.world.objects.countries);
  var states = topojson.mesh(window.MAP_DATA.states, window.MAP_DATA.states.objects.states, function (a, b) { return a !== b; });
  var root = svg.append('g');
  var gBase = root.append('g');
  var gArcs = root.append('g').attr('class', 'arcs');
  var gPins = root.append('g');

  var placeEvents = d3.group(EVENTS, function (e) { return e.place; });
  var pinData = Array.from(placeEvents, function (d) {
    var k = d[0], evs = d[1];
    return { key: k, name: PLACES[k].name, lat: PLACES[k].lat, lon: PLACES[k].lon, approx: PLACES[k].approx, evs: evs, lastYear: d3.max(evs, function (e) { return e.year; }) };
  });

  var trail = [];
  EVENTS.forEach(function (e) { if (!trail.length || trail[trail.length - 1].place !== e.place) trail.push(e); });
  var legs = d3.pairs(trail).map(function (p) { return { a: p[0], b: p[1], year: p[1].year }; });

  var W = 0, H = 0, k = 1;

  function layout() {
    var r = mapwrap.getBoundingClientRect();
    W = r.width; H = r.height;
    svg.attr('viewBox', '0 0 ' + W + ' ' + H);
    proj.fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
    gBase.selectAll('*').remove();
    gBase.append('path').attr('class', 'graticule').attr('d', path(d3.geoGraticule10()));
    gBase.append('path').attr('class', 'land').attr('d', path(countries));
    gBase.append('path').attr('class', 'states').attr('d', path(states));
    drawArcs(); drawPins();
  }

  function arcPath(d) {
    var a = proj([PLACES[d.a.place].lon, PLACES[d.a.place].lat]);
    var b = proj([PLACES[d.b.place].lon, PLACES[d.b.place].lat]);
    var dx = b[0] - a[0], dy = b[1] - a[1], dist = Math.hypot(dx, dy);
    var bend = Math.min(0.28, 0.12 + dist / 3000);
    var mx = (a[0] + b[0]) / 2 - dy * bend, my = (a[1] + b[1]) / 2 + dx * bend;
    return 'M' + a + 'Q' + mx + ',' + my + ' ' + b;
  }
  function drawArcs() {
    gArcs.selectAll('path').data(legs).join('path')
      .attr('class', 'arc').attr('d', arcPath).attr('stroke', function (d) { return yc(d.year); });
  }
  function drawPins() {
    var g = gPins.selectAll('g.pin').data(pinData, function (d) { return d.key; }).join(function (enter) {
      var g = enter.append('g').attr('class', 'pin').attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', function (d) { return d.name + ': ' + plural(d.evs.length, T.moment, T.moments); });
      g.append('circle').attr('class', 'halo');
      g.append('circle').attr('class', 'dot');
      g.append('text');
      g.on('click', function (ev, d) { ev.stopPropagation(); openPopup(d); })
        .on('keydown', function (ev, d) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPopup(d); } })
        .on('mouseenter', function () { d3.select(this).classed('hover', true).raise(); })
        .on('mouseleave', function () { d3.select(this).classed('hover', false); });
      return g;
    });
    g.attr('transform', function (d) { return 'translate(' + proj([d.lon, d.lat]) + ')'; });
    g.select('.dot').attr('fill', function (d) { return yc(d.lastYear); });
    g.select('text').text(function (d) { return d.name + (d.evs.length > 1 ? ' · ' + d.evs.length : ''); });
    scalePins();
  }
  function scalePins() {
    gPins.selectAll('g.pin').each(function (d) {
      var s = d3.select(this), r = (4 + Math.sqrt(d.evs.length) * 2.4) / k;
      s.select('.dot').attr('r', r);
      s.select('.halo').attr('r', r * 1.9);
      s.select('text').attr('x', r + 5 / k).attr('y', 4 / k)
        .style('font-size', (12 / k) + 'px').style('stroke-width', (3 / k) + 'px');
    });
  }

  var zoom = d3.zoom().scaleExtent([1, 90]).on('zoom', function (ev) {
    root.attr('transform', ev.transform);
    if (ev.transform.k !== k) { k = ev.transform.k; scalePins(); }
    hidePopup();
  });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.on('click', hidePopup);

  function boundsFor(lonlats, pad, maxK) {
    pad = pad || 40; maxK = maxK || 40;
    var pts = lonlats.map(function (ll) { return proj(ll); });
    var xs = d3.extent(pts, function (p) { return p[0]; });
    var ys = d3.extent(pts, function (p) { return p[1]; });
    var kk = Math.min(maxK,
      (W - 2 * pad - 70) / Math.max(xs[1] - xs[0], 1e-6),
      (H - 2 * pad) / Math.max(ys[1] - ys[0], 1e-6));
    return d3.zoomIdentity.translate(W / 2, H / 2).scale(Math.max(1, kk))
      .translate(-(xs[0] + xs[1]) / 2, -(ys[0] + ys[1]) / 2);
  }
  var REGIONS = {
    world: [[-126, 56], [58, -22]],
    pnw: [[-124.6, 48.4], [-114, 42.8]],
    ne: [[-73.8, 45.8], [-69.8, 41.4]],
    eu: [[-1.5, 54.2], [12.5, 42.2]]
  };
  function goRegion(r, dur) {
    svg.transition().duration(dur === undefined ? 900 : dur).call(zoom.transform, boundsFor(REGIONS[r]));
    document.querySelectorAll('#regions button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.r === r));
    });
  }
  document.getElementById('regions').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    follow = false; goRegion(b.dataset.r);
  });
  document.getElementById('zin').onclick = function () { svg.transition().duration(300).call(zoom.scaleBy, 1.8); };
  document.getElementById('zout').onclick = function () { svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.8); };

  var popup = document.getElementById('popup');
  function openPopup(d) {
    var xy = d3.zoomTransform(svg.node()).apply(proj([d.lon, d.lat]));
    popup.innerHTML = '<h4>' + esc(d.name) + '<small>' + plural(d.evs.length, T.moment, T.moments) +
      (d.approx ? ' · ' + T.approx : '') + '</small></h4>' +
      d.evs.map(function (e) {
        return '<button class="item" data-id="' + e.id + '"><img src="' + e.img + '" alt="">' +
          '<span class="it"><b>' + esc(e.title) + '</b><span>' + esc(e.date) + '</span></span></button>';
      }).join('');
    popup.style.display = 'block';
    var pw = popup.offsetWidth, ph = popup.offsetHeight;
    popup.style.left = Math.max(8, Math.min(W - pw - 8, xy[0] + 14)) + 'px';
    popup.style.top = Math.max(8, Math.min(H - ph - 8, xy[1] - ph / 2)) + 'px';
  }
  function hidePopup() { popup.style.display = 'none'; }
  popup.addEventListener('click', function (e) {
    e.stopPropagation();
    var b = e.target.closest('.item'); if (!b) return;
    hidePopup(); stopPlay();
    document.getElementById('m' + b.dataset.id).scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------------- timeline <-> map ---------------- */
  var activeId = null, follow = true, lastFlyKey = null;
  var nowcard = document.getElementById('nowcard');
  function prevLocated(id) {
    var prev = null;
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].id === id) break;
      prev = EVENTS[i];
    }
    return prev;
  }
  function setActive(id, fly) {
    if (id === activeId && !fly) return;
    activeId = id;
    var e = byId.get(id), p = PLACES[e.place];
    document.querySelectorAll('.moment.active').forEach(function (m) { m.classList.remove('active'); });
    var card = document.getElementById('m' + id);
    if (card) card.classList.add('active');
    document.querySelectorAll('#yearnav a').forEach(function (a) { a.classList.toggle('cur', +a.dataset.y === e.year); });
    gPins.selectAll('g.pin').classed('active', function (d) { return d.key === e.place; })
      .classed('dim', function (d) { return d.key !== e.place; });
    gPins.selectAll('g.pin.active').raise();
    var arrive = trail.filter(function (t) { return t.id <= id; }).pop();
    gArcs.classed('dim', true);
    gArcs.selectAll('path').classed('on', function (d) { return !!arrive && d.b.id === arrive.id; });
    nowcard.innerHTML = '<b>' + esc(p.name) + (p.approx ? ' <span>' + T.approx + '</span>' : '') + '</b>' +
      '<span>' + esc(e.date) + ' · ' + esc(e.title) + '</span>';
    nowcard.style.opacity = 1;
    if ((follow || fly) && (fly || lastFlyKey !== e.place)) {
      lastFlyKey = e.place;
      var prev = prevLocated(id);
      var pts = [[p.lon, p.lat]];
      if (prev && prev.place !== e.place) pts.push([PLACES[prev.place].lon, PLACES[prev.place].lat]);
      pts.push([p.lon - 1.6, p.lat - 1.1], [p.lon + 1.6, p.lat + 1.1]);
      svg.interrupt().transition().duration(1000).ease(d3.easeCubicInOut)
        .call(zoom.transform, boundsFor(pts, 60, 40));
      document.querySelectorAll('#regions button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    }
  }

  var io = new IntersectionObserver(function (entries) {
    if (playing) return;
    var vis = entries.filter(function (en) { return en.isIntersecting; });
    if (vis.length) setActive(+vis[0].target.dataset.id);
  }, { rootMargin: window.innerWidth <= 900 ? '-62% 0px -30% 0px' : '-42% 0px -52% 0px' });
  document.querySelectorAll('.moment').forEach(function (m) { io.observe(m); });

  yearsEl.addEventListener('click', function (ev) {
    var chip = ev.target.closest('button.placechip');
    if (chip) {
      var art = chip.closest('.moment');
      follow = true; setActive(+art.dataset.id, true);
      if (window.innerWidth <= 900) {
        window.scrollTo({ top: art.getBoundingClientRect().top + scrollY - Math.max(innerHeight * 0.42, 260) - 70, behavior: 'smooth' });
      }
      return;
    }
    var ph = ev.target.closest('.ph');
    if (ph) openLB(+ph.closest('.moment').dataset.id);
  });

  /* ---------------- play ---------------- */
  var playing = false, playTimer = null, playIdx = 0;
  var playBtn = document.getElementById('play');
  function stopPlay() {
    playing = false; clearTimeout(playTimer);
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.querySelector('span').textContent = T.play;
    playBtn.querySelector('svg').innerHTML = '<path d="M2 1l9 5-9 5z" fill="currentColor"/>';
  }
  function step() {
    if (!playing) return;
    if (playIdx >= trail.length) { stopPlay(); return; }
    var e = trail[playIdx++];
    setActive(e.id, true);
    var art = document.getElementById('m' + e.id);
    var off = window.innerWidth <= 900 ? Math.max(innerHeight * 0.42, 260) + 70 : innerHeight * 0.3;
    window.scrollTo({ top: art.getBoundingClientRect().top + scrollY - off, behavior: 'smooth' });
    playTimer = setTimeout(step, 2300);
  }
  playBtn.onclick = function () {
    if (playing) { stopPlay(); return; }
    playing = true; follow = true;
    var cur = activeId ? trail.findIndex(function (t) { return t.id >= activeId; }) : 0;
    playIdx = (cur < 0 || cur >= trail.length - 1) ? 0 : cur;
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.querySelector('span').textContent = T.pause;
    playBtn.querySelector('svg').innerHTML = '<path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/>';
    step();
  };
  ['wheel', 'touchstart', 'keydown'].forEach(function (t) {
    window.addEventListener(t, function (ev) {
      if (playing && !(ev.target.closest && ev.target.closest('#play'))) stopPlay();
    }, { passive: true });
  });

  /* ---------------- horizontal view ---------------- */
  var hscroll = document.getElementById('hscroll'), htrack = document.getElementById('htrack');
  var parseD = d3.timeParse('%Y-%m-%d');
  var hBuilt = false, hx = null, hpos = null;

  function buildH() {
    var mobile = innerWidth <= 700;
    var CW = mobile ? 170 : 210, IH = mobile ? 110 : 140, GAP = 14, CH = IH + 92;
    var LANE = 26, AX = CH + LANE * 2 + 40, HH = AX * 2;
    htrack.style.setProperty('--cw', CW + 'px');
    htrack.style.setProperty('--ih', IH + 'px');
    htrack.style.setProperty('--hh', HH + 'px');
    var t0 = d3.timeMonth.offset(d3.timeMonth.floor(parseD(EVENTS[0].sort)), -1);
    var t1 = d3.timeMonth.offset(d3.timeMonth.ceil(parseD(EVENTS[EVENTS.length - 1].sort)), 1);
    var days = (t1 - t0) / 864e5, pxDay = mobile ? 2.4 : 3.1;
    var x = d3.scaleTime().domain([t0, t1]).range([60, 60 + days * pxDay]);
    var lastRight = [-Infinity, -Infinity];
    var pos = EVENTS.map(function (e, i) {
      var lane = i % 2, tx = x(parseD(e.sort));
      var left = Math.max(tx - CW / 2, lastRight[lane] + GAP);
      lastRight[lane] = left + CW;
      return { e: e, lane: lane, tx: tx, left: left };
    });
    var width = Math.max(x(t1), d3.max(pos, function (p) { return p.left + CW; })) + 60;
    htrack.style.width = width + 'px';
    htrack.querySelectorAll('.hcard').forEach(function (n) { n.remove(); });
    var ax = d3.select('#haxis').attr('width', width).attr('height', HH);
    ax.selectAll('*').remove();
    ax.append('line').attr('class', 'base').attr('x1', 20).attr('x2', width - 20).attr('y1', AX).attr('y2', AX);
    var months = d3.timeMonth.range(t0, t1);
    ax.selectAll('.mtick').data(months).join('line').attr('class', 'mtick')
      .attr('x1', x).attr('x2', x).attr('y1', AX - 4).attr('y2', AX + 4);
    var fmt = d3.timeFormat('%b');
    ax.selectAll('.mlab').data(months.filter(function (d) { return d.getMonth() % 3 === 0 && d.getMonth() !== 0; }))
      .join('text').attr('class', 'mlab').attr('x', function (d) { return x(d) + 3; }).attr('y', AX + 16).text(fmt);
    var yrs = d3.timeYear.range(d3.timeYear.ceil(t0), t1);
    var yg = ax.selectAll('.yr').data(yrs).join('g').attr('class', 'yr');
    yg.append('line').attr('class', 'ytick').attr('x1', x).attr('x2', x).attr('y1', AX - 12).attr('y2', AX + 12);
    yg.append('text').attr('class', 'ylab').attr('x', function (d) { return x(d) + 6; }).attr('y', AX + 40)
      .text(function (d) { return d.getFullYear(); });

    pos.forEach(function (p) {
      var e = p.e, top = p.lane === 0;
      var stagger = (Math.floor(e.id / 2) % 2) * LANE;
      var cardTop = top ? AX - 40 - LANE - stagger - CH : AX + 40 + LANE + stagger;
      var cx = p.left + CW / 2, cy = top ? cardTop + CH : cardTop, midY = top ? AX - 22 : AX + 22;
      ax.append('path').attr('class', 'stem').attr('stroke', yc(e.year))
        .attr('d', 'M' + cx + ',' + cy + ' L' + cx + ',' + ((cy + midY) / 2) +
          ' C' + cx + ',' + midY + ' ' + p.tx + ',' + ((cy + midY) / 2) + ' ' + p.tx + ',' + midY +
          ' L' + p.tx + ',' + AX);
      ax.append('circle').attr('class', 'dot').attr('cx', p.tx).attr('cy', AX).attr('r', 5).attr('fill', yc(e.year));
      var pl = PLACES[e.place];
      var card = document.createElement('article');
      card.className = 'hcard';
      card.dataset.id = e.id;
      card.style.cssText = 'left:' + p.left + 'px;top:' + cardTop + 'px;--yc:' + yc(e.year);
      card.innerHTML = '<button class="ph" aria-label="' + esc(T.openPhoto) + ': ' + esc(e.title) + '">' +
        '<img loading="lazy" src="' + e.img + '" alt="' + esc(e.title) + '"></button>' +
        '<div class="b"><div class="d">' + esc(e.date) + '</div><h4>' + esc(e.title) + '</h4>' +
        '<button class="placechip" data-id="' + e.id + '" title="' + esc(T.showOnMap) + '">' + pinIcon + esc(pl.name) + '</button></div>';
      htrack.appendChild(card);
    });

    document.getElementById('hyears').innerHTML = YEARS.map(function (y) {
      return '<button data-y="' + y + '"><i style="background:' + yc(y) + '"></i>' + y + '</button>';
    }).join('');
    hx = x; hpos = pos; hBuilt = true;
    updateHYear();
  }
  function updateHYear() {
    if (!hBuilt) return;
    var d = hx.invert(hscroll.scrollLeft + hscroll.clientWidth / 2);
    var y = Math.min(Math.max(d.getFullYear(), YEARS[0]), YEARS[YEARS.length - 1]);
    document.querySelectorAll('#hyears button').forEach(function (b) { b.classList.toggle('cur', +b.dataset.y === y); });
  }
  hscroll.addEventListener('scroll', function () { requestAnimationFrame(updateHYear); }, { passive: true });
  document.getElementById('hyears').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var first = hpos.find(function (p) { return p.e.year === +b.dataset.y; });
    hscroll.scrollTo({ left: Math.max(0, Math.min(first.left, first.tx) - 80), behavior: 'smooth' });
  });
  document.getElementById('hprev').onclick = function () { hscroll.scrollBy({ left: -hscroll.clientWidth * 0.8, behavior: 'smooth' }); };
  document.getElementById('hnext').onclick = function () { hscroll.scrollBy({ left: hscroll.clientWidth * 0.8, behavior: 'smooth' }); };
  hscroll.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowRight') { hscroll.scrollBy({ left: 300, behavior: 'smooth' }); ev.preventDefault(); }
    if (ev.key === 'ArrowLeft') { hscroll.scrollBy({ left: -300, behavior: 'smooth' }); ev.preventDefault(); }
  });
  hscroll.addEventListener('wheel', function (ev) {
    if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) { hscroll.scrollLeft += ev.deltaY; ev.preventDefault(); }
  }, { passive: false });
  var drag = null, moved = false;
  hscroll.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
    drag = { x: ev.clientX, s: hscroll.scrollLeft }; moved = false;
  });
  window.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var dx = ev.clientX - drag.x;
    if (Math.abs(dx) > 4) { moved = true; hscroll.classList.add('drag'); }
    if (moved) hscroll.scrollLeft = drag.s - dx;
  });
  window.addEventListener('pointerup', function () { drag = null; hscroll.classList.remove('drag'); });
  htrack.addEventListener('click', function (ev) {
    if (moved) { ev.preventDefault(); ev.stopPropagation(); moved = false; return; }
    var chip = ev.target.closest('.placechip');
    if (chip) {
      var id = +chip.dataset.id;
      showView('story');
      requestAnimationFrame(function () {
        document.getElementById('m' + id).scrollIntoView({ block: 'center' });
        follow = true; setActive(id, true);
      });
      return;
    }
    var ph = ev.target.closest('.ph');
    if (ph) openLB(+ph.closest('.hcard').dataset.id);
  }, true);

  /* ---------------- tabs ---------------- */
  function showView(v) {
    var h = v === 'h';
    document.getElementById('view-h').hidden = !h;
    document.getElementById('view-story').hidden = h;
    document.getElementById('tab-h').setAttribute('aria-selected', String(h));
    document.getElementById('tab-story').setAttribute('aria-selected', String(!h));
    if (h) { stopPlay(); if (!hBuilt) buildH(); else updateHYear(); }
    try { history.replaceState(null, '', h ? '#horizontal' : location.pathname + location.search); } catch (e) {}
  }
  document.getElementById('tab-story').onclick = function () { showView('story'); };
  document.getElementById('tab-h').onclick = function () { showView('h'); };
  var hResizeW = innerWidth;
  window.addEventListener('resize', function () {
    if (hBuilt && (innerWidth <= 700) !== (hResizeW <= 700)) {
      var f = hscroll.scrollLeft / htrack.offsetWidth;
      buildH();
      hscroll.scrollLeft = f * htrack.offsetWidth;
    }
    hResizeW = innerWidth;
  });

  /* ---------------- lightbox ---------------- */
  var lb = document.getElementById('lb'), lbId = null;
  function openLB(id) {
    lbId = id;
    var e = byId.get(id);
    lb.querySelector('img').src = e.img;
    lb.querySelector('img').alt = e.title;
    lb.querySelector('.cap').innerHTML = '<b>' + esc(e.date) + ' · ' + esc(PLACES[e.place].name) + '</b>' + esc(e.text);
    if (!lb.open) lb.showModal();
  }
  function lbStep(d) {
    var i = EVENTS.findIndex(function (e) { return e.id === lbId; }) + d;
    if (i >= 0 && i < EVENTS.length) openLB(EVENTS[i].id);
  }
  lb.querySelector('.prev').onclick = function () { lbStep(-1); };
  lb.querySelector('.next').onclick = function () { lbStep(1); };
  lb.querySelector('.close').onclick = function () { lb.close(); };
  lb.addEventListener('click', function (e) { if (e.target.classList.contains('lb')) lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  });
  lb.addEventListener('close', function () {
    if (lbId && !document.getElementById('view-story').hidden) {
      document.getElementById('m' + lbId).scrollIntoView({ block: 'center' });
    }
  });

  /* ---------------- init ---------------- */
  layout();
  svg.call(zoom.transform, boundsFor(REGIONS.world));
  var lastSize = '';
  new ResizeObserver(function () {
    var r = mapwrap.getBoundingClientRect();
    var sz = Math.round(r.width) + 'x' + Math.round(r.height);
    if (r.width < 20 || r.height < 20 || sz === lastSize) return;
    lastSize = sz;
    layout();
    if (activeId) setActive(activeId, true); else goRegion('world', 0);
  }).observe(mapwrap);
  if (location.hash === '#horizontal') showView('h');
})();
