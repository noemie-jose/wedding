/* RSVP form behaviour.

   Reads and writes through the Apps Script web app in rsvp-config.js:
     GET  apiUrl?email=...   looks up an existing RSVP
     POST apiUrl             saves one (text/plain body, so no CORS preflight)

   If only a Google Form is configured, it falls back to posting into a hidden
   iframe. That route can save but not look up, so returning guests are not
   recognised; the page says so to the site owners, never to the guests. */

(function () {
  var cfg = window.RSVP_CONFIG || {};
  var form = document.getElementById('rsvp-form');
  if (!form) return;

  var FR = document.documentElement.lang === 'fr';
  var msg = document.getElementById('form-msg');
  var submitBtn = document.getElementById('rsvp-submit');
  var known = document.getElementById('rsvp-known');
  var hasApi = !!cfg.apiUrl;
  var hasForm = !!(cfg.formAction && cfg.fields && cfg.fields.name);

  var T = FR ? {
    noName: 'Merci d’indiquer votre nom, pour que nous sachions qui vient.',
    noEmail: 'Merci d’indiquer une adresse e-mail où vous joindre.',
    noPhone: 'Merci d’indiquer un numéro de téléphone où vous joindre.',
    noChoice: 'Dites-nous si vous pouvez venir.',
    notReady: 'Le formulaire n’est pas encore connecté. Réessayez un peu plus tard, ou écrivez-nous.',
    failed: 'L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez.',
    sending: 'Envoi…',
    send: 'Envoyer notre réponse',
    update: 'Mettre à jour notre réponse',
    checking: 'Nous regardons si vous avez déjà répondu…',
    foundTitle: 'Vous avez déjà répondu.',
    foundOn: 'Dernière réponse le ',
    foundSub: 'Nous avons rempli vos réponses ci-dessous. Modifiez ce que vous voulez et renvoyez : cela remplacera la précédente.',
    yesTitle: 'Merci, on a hâte !',
    noTitle: 'Merci de nous avoir prévenus',
    updatedTitle: 'C’est mis à jour',
    yesBody: 'Votre réponse est enregistrée. Nous vous enverrons les détails du voyage et de l’hôtel dès qu’ils seront calés. Si quelque chose change, revenez sur cette page avec la même adresse e-mail.',
    updatedBody: 'Nous avons remplacé votre réponse précédente par celle-ci. Vous pouvez revenir la modifier autant de fois que vous voulez avant le ',
    noBodyA: 'Nous serons tristes de ne pas vous voir, mais merci de nous l’avoir dit. Si vos plans changent avant le ',
    noBodyB: ', revenez sur cette page.',
    deadline: 'la date limite',
    child: 'Enfant ',
    childName: 'Prénom',
    childAge: 'Âge',
    dietLabel: 'Restriction alimentaire ou allergie',
    dietPlaceholder: 'Végétarien, allergie aux noix, sans gluten…',
    dietWhat: 'Que doit savoir le traiteur ?',
    you: 'vous',
    plusOne: 'votre accompagnant(e)'
  } : {
    noName: 'Please add your name so we know who is coming.',
    noEmail: 'Please add an email address we can reach you at.',
    noPhone: 'Please add a phone number we can reach you on.',
    noChoice: 'Please let us know whether you can make it.',
    notReady: 'The RSVP form is not connected yet. Please try again shortly, or email us.',
    failed: 'That did not go through. Check your connection and try again.',
    sending: 'Sending…',
    send: 'Send our RSVP',
    update: 'Update our RSVP',
    checking: 'Checking whether you have replied already…',
    foundTitle: 'You have already RSVP’d.',
    foundOn: 'Last sent ',
    foundSub: 'We have filled in your answers below. Change anything you like and send it again: the new answers replace the old ones.',
    yesTitle: 'Thank You, We Can’t Wait!',
    noTitle: 'Thank You for Letting Us Know',
    updatedTitle: 'Your RSVP Is Updated',
    yesBody: 'Your RSVP is in. We’ll send travel and hotel details as they firm up. If anything changes, come back to this page with the same email address.',
    updatedBody: 'We have replaced your earlier answers with these. You can come back and change them as often as you like before ',
    noBodyA: 'We’re sorry to miss you, but thank you for telling us. If your plans change before ',
    noBodyB: ', come back to this page.',
    deadline: 'the deadline',
    child: 'Child ',
    childName: 'Name',
    childAge: 'Age',
    dietLabel: 'Dietary restriction or allergy',
    dietPlaceholder: 'Vegetarian, nut allergy, gluten free…',
    dietWhat: 'What should the caterer know?',
    you: 'you',
    plusOne: 'your plus one'
  };

  var deadline = (FR ? (cfg.rsvpByFr || cfg.rsvpBy) : cfg.rsvpBy) || '';
  Array.prototype.forEach.call(document.querySelectorAll('.rsvp-by'), function (n) {
    if (deadline) n.textContent = deadline;
  });

  /* ---------------- setup notice for the site owners ---------------- */
  if (!hasApi) {
    var warn = document.getElementById('setup-warning');
    if (warn) {
      warn.hidden = false;
      var extra = document.createElement('p');
      extra.style.marginBottom = '0';
      extra.innerHTML = hasForm
        ? 'A Google Form is configured, so replies are saved, but a Form cannot be read back: returning guests will not be recognised. Deploy <code>form/rsvp-backend.gs</code> to turn that on.'
        : (cfg.fallbackFormUrl
          ? 'Until then, guests can use the Google Form directly: <a href="' + cfg.fallbackFormUrl + '" target="_blank" rel="noopener">open the RSVP form</a>.'
          : 'Nothing is connected yet, so the page cannot save replies.');
      warn.appendChild(extra);
    }
  }

  /* ---------------- show and hide the conditional parts ---------------- */
  function show(el, on) { if (el) el.hidden = !on; }

  var ifComing = document.getElementById('if-coming');
  function syncAttending() {
    var picked = form.querySelector('input[name="attending"]:checked');
    show(ifComing, !!picked && picked.value.indexOf('Joyfully') === 0);
  }
  form.querySelectorAll('input[name="attending"]').forEach(function (r) {
    r.addEventListener('change', syncAttending);
  });

  var plusBox = document.getElementById('plus-one-box');
  function syncPlusOne() {
    var picked = form.querySelector('input[name="plusOne"]:checked');
    show(plusBox, !!picked && picked.value === 'yes');
  }
  form.querySelectorAll('input[name="plusOne"]').forEach(function (r) {
    r.addEventListener('change', syncPlusOne);
  });

  var childrenBox = document.getElementById('children-box');
  var childList = document.getElementById('children-list');
  var childCount = document.getElementById('childCount');
  function syncChildren() {
    var picked = form.querySelector('input[name="hasChildren"]:checked');
    var on = !!picked && picked.value === 'yes';
    show(childrenBox, on);
    if (on) renderChildren(+childCount.value || 1);
    else childList.innerHTML = '';
  }
  form.querySelectorAll('input[name="hasChildren"]').forEach(function (r) {
    r.addEventListener('change', syncChildren);
  });
  childCount.addEventListener('change', function () { renderChildren(+childCount.value || 1); });

  // Rebuild the per-child blocks, keeping anything already typed.
  function renderChildren(n) {
    var current = readChildren();
    childList.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var c = current[i] || { name: '', age: '', diet: '' };
      var box = document.createElement('fieldset');
      box.className = 'guestbox';
      box.dataset.child = String(i);
      box.innerHTML =
        '<legend>' + T.child + (i + 1) + '</legend>' +
        '<div class="row2">' +
          '<div class="field"><label>' + T.childName + '</label>' +
          '<input type="text" class="childName" value="' + esc(c.name) + '"></div>' +
          '<div class="field"><label>' + T.childAge + '</label>' +
          '<input type="number" class="childAge" min="0" max="17" inputmode="numeric" value="' + esc(c.age) + '"></div>' +
        '</div>' +
        '<label class="check"><input type="checkbox" class="dietToggle"' + (c.diet ? ' checked' : '') + '>' +
        '<span>' + T.dietLabel + '</span></label>' +
        '<div class="field dietbox"' + (c.diet ? '' : ' hidden') + '>' +
        '<input type="text" class="dietNote" placeholder="' + esc(T.dietPlaceholder) + '" value="' + esc(c.diet) + '"></div>';
      childList.appendChild(box);
    }
    wireDietToggles();
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Every "has a dietary restriction" checkbox reveals its own text box.
  function wireDietToggles() {
    document.querySelectorAll('.dietToggle').forEach(function (cb) {
      if (cb.dataset.wired) return;
      cb.dataset.wired = '1';
      cb.addEventListener('change', function () {
        var box = cb.closest('.guestbox').querySelector('.dietbox');
        box.hidden = !cb.checked;
        if (cb.checked) box.querySelector('.dietNote').focus();
        else box.querySelector('.dietNote').value = '';
      });
    });
  }
  wireDietToggles();

  function readChildren() {
    return Array.prototype.map.call(childList.querySelectorAll('.guestbox'), function (box) {
      return {
        name: box.querySelector('.childName').value.trim(),
        age: box.querySelector('.childAge').value.trim(),
        diet: box.querySelector('.dietToggle').checked ? box.querySelector('.dietNote').value.trim() : ''
      };
    });
  }

  function dietOf(id) {
    var box = document.getElementById(id);
    if (!box) return '';
    var cb = box.querySelector('.dietToggle');
    return cb && cb.checked ? box.querySelector('.dietNote').value.trim() : '';
  }

  /* ---------------- gather and fill ---------------- */
  function collect() {
    var data = new FormData(form);
    var plusPicked = form.querySelector('input[name="plusOne"]:checked');
    var plusOne = !!plusPicked && plusPicked.value === 'yes';
    var children = (form.querySelector('input[name="hasChildren"]:checked') || {}).value === 'yes'
      ? readChildren() : [];

    var name = (data.get('name') || '').toString().trim();
    var plusOneName = (data.get('plusOneName') || '').toString().trim();

    var dietary = [];
    var mine = dietOf('guest-you');
    if (mine) dietary.push({ who: name || T.you, note: mine });
    var theirs = plusOne ? dietOf('plus-one-box') : '';
    if (theirs) dietary.push({ who: plusOneName || T.plusOne, note: theirs });
    children.forEach(function (c, i) {
      if (c.diet) dietary.push({ who: c.name || (T.child + (i + 1)), note: c.diet });
    });

    return {
      email: (data.get('email') || '').toString().trim(),
      phone: (data.get('phone') || '').toString().trim(),
      name: name,
      attending: (data.get('attending') || '').toString(),
      plusOne: plusOne,
      plusOneName: plusOne ? plusOneName : '',
      children: children,
      dietary: dietary,
      partySize: 1 + (plusOne ? 1 : 0) + children.length,
      note: (data.get('note') || '').toString().trim(),
      lang: FR ? 'fr' : 'en',
      secret: cfg.secret || ''
    };
  }

  function fill(r) {
    if (!r) return;
    setValue('name', r.name);
    setValue('phone', r.phone);
    setValue('note', r.note);
    setValue('plusOneName', r.plusOneName);

    check('attending', r.attending);
    syncAttending();
    check('plusOne', r.plusOne ? 'yes' : 'no');
    syncPlusOne();

    var kids = r.children || [];
    check('hasChildren', kids.length ? 'yes' : 'no');
    show(childrenBox, kids.length > 0);
    if (kids.length) {
      childCount.value = String(Math.min(kids.length, 8));
      renderChildrenFrom(kids);
    }

    // per guest dietary notes
    (r.dietary || []).forEach(function (d) {
      if (d.who === r.name || d.who === T.you) setDiet('guest-you', d.note);
      else if (r.plusOne && (d.who === r.plusOneName || d.who === T.plusOne)) setDiet('plus-one-box', d.note);
    });
  }

  function renderChildrenFrom(kids) {
    childList.innerHTML = '';
    kids.forEach(function (c, i) {
      var box = document.createElement('fieldset');
      box.className = 'guestbox';
      box.dataset.child = String(i);
      box.innerHTML =
        '<legend>' + T.child + (i + 1) + '</legend>' +
        '<div class="row2">' +
          '<div class="field"><label>' + T.childName + '</label>' +
          '<input type="text" class="childName" value="' + esc(c.name) + '"></div>' +
          '<div class="field"><label>' + T.childAge + '</label>' +
          '<input type="number" class="childAge" min="0" max="17" inputmode="numeric" value="' + esc(c.age) + '"></div>' +
        '</div>' +
        '<label class="check"><input type="checkbox" class="dietToggle"' + (c.diet ? ' checked' : '') + '>' +
        '<span>' + T.dietLabel + '</span></label>' +
        '<div class="field dietbox"' + (c.diet ? '' : ' hidden') + '>' +
        '<input type="text" class="dietNote" placeholder="' + esc(T.dietPlaceholder) + '" value="' + esc(c.diet) + '"></div>';
      childList.appendChild(box);
    });
    wireDietToggles();
  }

  function setDiet(boxId, note) {
    var box = document.getElementById(boxId);
    if (!box || !note) return;
    box.querySelector('.dietToggle').checked = true;
    box.querySelector('.dietbox').hidden = false;
    box.querySelector('.dietNote').value = note;
  }
  function setValue(name, v) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el && v) el.value = v;
  }
  function check(name, value) {
    if (!value) return;
    var el = form.querySelector('input[name="' + name + '"][value="' + cssEscape(value) + '"]');
    if (el) el.checked = true;
  }
  function cssEscape(v) { return String(v).replace(/"/g, '\\"'); }

  /* ---------------- look up an existing RSVP ---------------- */
  var lastLookup = '';
  var emailInput = form.querySelector('[name="email"]');

  function lookup() {
    if (!hasApi) return;
    var email = emailInput.value.trim().toLowerCase();
    if (!email || email.indexOf('@') < 1 || email === lastLookup) return;
    lastLookup = email;
    var url = cfg.apiUrl + (cfg.apiUrl.indexOf('?') < 0 ? '?' : '&') +
      'email=' + encodeURIComponent(email) +
      (cfg.secret ? '&secret=' + encodeURIComponent(cfg.secret) : '');

    fetch(url, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.found) { show(known, false); return; }
        var when = res.rsvp.lastUpdated ? new Date(res.rsvp.lastUpdated) : null;
        document.getElementById('known-title').textContent = T.foundTitle;
        document.getElementById('known-detail').textContent = when
          ? T.foundOn + when.toLocaleDateString(FR ? 'fr-FR' : 'en-GB',
              { day: 'numeric', month: 'long', year: 'numeric' }) + '.'
          : '';
        document.getElementById('known-sub').textContent = T.foundSub;
        show(known, true);
        fill(res.rsvp);
        if (submitBtn) submitBtn.textContent = T.update;
        known.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(function () { /* a failed lookup must never block an RSVP */ });
  }
  if (emailInput) {
    emailInput.addEventListener('change', lookup);
    emailInput.addEventListener('blur', lookup);
  }

  /* ---------------- submit ---------------- */
  function fail(text) {
    msg.className = 'form-msg error';
    msg.textContent = text;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = lastLookup && known && !known.hidden ? T.update : T.send; }
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function done(payload, updated) {
    var coming = payload.attending.indexOf('Joyfully') === 0;
    var panel = document.getElementById('rsvp-thanks');
    document.getElementById('rsvp-panel').hidden = true;
    show(known, false);
    panel.hidden = false;
    panel.querySelector('h2').textContent = coming ? (updated ? T.updatedTitle : T.yesTitle) : T.noTitle;
    panel.querySelector('p').textContent = coming
      ? (updated ? T.updatedBody + (deadline || T.deadline) + '.' : T.yesBody)
      : T.noBodyA + (deadline || T.deadline) + T.noBodyB;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { localStorage.setItem('rsvp-sent', payload.email); } catch (e) {}
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    msg.textContent = '';
    msg.className = 'form-msg';

    var payload = collect();
    if (!payload.email || payload.email.indexOf('@') < 1) return fail(T.noEmail);
    if (!payload.phone) return fail(T.noPhone);
    if (!payload.attending) return fail(T.noChoice);
    if (payload.attending.indexOf('Joyfully') === 0 && !payload.name) return fail(T.noName);

    if (!hasApi && !hasForm) return fail(T.notReady);

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = T.sending; }
    var wasKnown = !!(known && !known.hidden);

    if (hasApi) {
      fetch(cfg.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'save failed');
          done(payload, !!res.updated || wasKnown);
        })
        .catch(function () { fail(T.failed); });
      return;
    }

    // Google Form fallback: write only, into a hidden iframe.
    postToGoogleForm(payload);
    setTimeout(function () { done(payload, wasKnown); }, 1500);
  });

  function postToGoogleForm(payload) {
    var iframe = document.getElementById('gform-target');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'gform-target';
      iframe.name = 'gform-target';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    var post = document.createElement('form');
    post.action = cfg.formAction;
    post.method = 'POST';
    post.target = 'gform-target';
    post.style.display = 'none';

    function add(entry, value) {
      if (!entry || !value) return;
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = entry;
      input.value = value;
      post.appendChild(input);
    }
    var f = cfg.fields;
    add(f.name, payload.name);
    add(f.email, payload.email);
    add(f.phone, payload.phone);
    add(f.attending, payload.attending);
    add(f.partySize, payload.partySize);
    add(f.plusOne, payload.plusOne ? 'Yes' : 'No');
    add(f.plusOneName, payload.plusOneName);
    add(f.guests, payload.children.map(function (c, i) {
      return (c.name || (T.child + (i + 1))) + ' (' + (c.age || '?') + ')';
    }).join(', '));
    add(f.dietary, payload.dietary.map(function (d) { return d.who + ': ' + d.note; }).join('; '));
    add(f.note, payload.note);

    document.body.appendChild(post);
    post.submit();
    setTimeout(function () { post.remove(); }, 2000);
  }

  /* ---------------- first paint ---------------- */
  syncAttending();
  syncPlusOne();
  syncChildren();
  if (submitBtn) submitBtn.textContent = T.send;

  // If the API is off, at least recognise this browser.
  if (!hasApi) {
    try {
      var seen = localStorage.getItem('rsvp-sent');
      if (seen && emailInput) {
        emailInput.value = seen;
        document.getElementById('known-title').textContent = T.foundTitle;
        document.getElementById('known-detail').textContent = '';
        document.getElementById('known-sub').textContent = T.foundSub;
        show(known, true);
      }
    } catch (e) {}
  }
})();
