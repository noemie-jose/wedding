/* RSVP form behaviour.

   Replies are posted into a Google Form. Google Forms do not send CORS headers,
   so the answer cannot be read back; the reliable way is to POST into a hidden
   iframe. The submission lands in the form's responses and in its linked
   spreadsheet, and we show our own thank-you message.

   A Google Form can be written to but never queried, so the page cannot tell a
   returning guest what they sent before. It does remember, in this browser
   only, that an RSVP was already sent, and says so. */

(function () {
  var cfg = window.RSVP_CONFIG || {};
  var form = document.getElementById('rsvp-form');
  if (!form) return;

  var FR = document.documentElement.lang === 'fr';
  var msg = document.getElementById('form-msg');
  var submitBtn = document.getElementById('rsvp-submit');
  var known = document.getElementById('rsvp-known');
  var configured = !!(cfg.formAction && cfg.fields && cfg.fields.name);

  var T = FR ? {
    noName: 'Merci d’indiquer votre nom, pour que nous sachions qui vient.',
    noEmail: 'Merci d’indiquer une adresse e-mail où vous joindre.',
    noPhone: 'Merci d’indiquer un numéro de téléphone où vous joindre.',
    noChoice: 'Dites-nous si vous pouvez venir.',
    notReady: 'Le formulaire n’est pas encore connecté. Réessayez un peu plus tard, ou écrivez-nous.',
    sending: 'Envoi…',
    send: 'Envoyer notre réponse',
    sendAgain: 'Renvoyer notre réponse',
    fallback: 'En attendant, vous pouvez utiliser le formulaire Google directement : ',
    fallbackLink: 'ouvrir le formulaire RSVP',
    againTitle: 'Vous avez déjà répondu depuis cet appareil',
    againOn: 'Réponse envoyée le ',
    againSub: 'Si quelque chose a changé, remplissez le formulaire à nouveau : nous garderons la réponse la plus récente.',
    yesTitle: 'Merci, on a hâte !',
    noTitle: 'Merci de nous avoir prévenus',
    yesBody: 'Votre réponse est enregistrée. Nous vous enverrons les détails du voyage et de l’hôtel dès qu’ils seront calés. Si quelque chose change, renvoyez simplement le formulaire : nous garderons la réponse la plus récente.',
    noBodyA: 'Nous serons tristes de ne pas vous voir, mais merci de nous l’avoir dit. Si vos plans changent avant le ',
    noBodyB: ', revenez sur cette page.',
    deadline: 'la date limite',
    child: 'Enfant ',
    childName: 'Prénom',
    childAge: 'Âge',
    dietLabel: 'Restriction alimentaire ou allergie',
    dietPlaceholder: 'Végétarien, allergie aux noix, sans gluten…',
    you: 'vous',
    plusOne: 'votre accompagnant(e)'
  } : {
    noName: 'Please add your name so we know who is coming.',
    noEmail: 'Please add an email address we can reach you at.',
    noPhone: 'Please add a phone number we can reach you on.',
    noChoice: 'Please let us know whether you can make it.',
    notReady: 'The RSVP form is not connected yet. Please try again shortly, or email us.',
    sending: 'Sending…',
    send: 'Send our RSVP',
    sendAgain: 'Send our RSVP again',
    fallback: 'Until then, guests can use the Google Form directly: ',
    fallbackLink: 'open the RSVP form',
    againTitle: 'You have already RSVP’d from this device',
    againOn: 'Sent ',
    againSub: 'If something has changed, fill the form in again and we will keep your most recent answer.',
    yesTitle: 'Thank You, We Can’t Wait!',
    noTitle: 'Thank You for Letting Us Know',
    yesBody: 'Your RSVP is in. We’ll send travel and hotel details as they firm up. If anything changes, just fill the form in again and we’ll keep your most recent answer.',
    noBodyA: 'We’re sorry to miss you, but thank you for telling us. If your plans change before ',
    noBodyB: ', come back to this page.',
    deadline: 'the deadline',
    child: 'Child ',
    childName: 'Name',
    childAge: 'Age',
    dietLabel: 'Dietary restriction or allergy',
    dietPlaceholder: 'Vegetarian, nut allergy, gluten free…',
    you: 'you',
    plusOne: 'your plus one'
  };

  var deadline = (FR ? (cfg.rsvpByFr || cfg.rsvpBy) : cfg.rsvpBy) || '';
  Array.prototype.forEach.call(document.querySelectorAll('.rsvp-by'), function (n) {
    if (deadline) n.textContent = deadline;
  });

  /* ---------------- setup notice, for the site owners only ---------------- */
  if (!configured) {
    var warn = document.getElementById('setup-warning');
    if (warn) {
      warn.hidden = false;
      if (cfg.fallbackFormUrl) {
        var extra = document.createElement('p');
        extra.style.marginBottom = '0';
        extra.innerHTML = T.fallback + '<a href="' + cfg.fallbackFormUrl +
          '" target="_blank" rel="noopener">' + T.fallbackLink + '</a>.';
        warn.appendChild(extra);
      }
    }
  }

  /* ---------------- conditional parts of the form ---------------- */
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

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

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

  /* ---------------- gather ---------------- */
  function collect() {
    var data = new FormData(form);
    var plusPicked = form.querySelector('input[name="plusOne"]:checked');
    var plusOne = !!plusPicked && plusPicked.value === 'yes';
    var coming = (data.get('attending') || '').toString().indexOf('Joyfully') === 0;
    var children = coming && (form.querySelector('input[name="hasChildren"]:checked') || {}).value === 'yes'
      ? readChildren() : [];

    var name = (data.get('name') || '').toString().trim();
    var plusOneName = (data.get('plusOneName') || '').toString().trim();

    var dietary = [];
    var mine = dietOf('guest-you');
    if (mine) dietary.push(({ who: name || T.you, note: mine }));
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
      partySize: coming ? 1 + (plusOne ? 1 : 0) + children.length : 0,
      note: (data.get('note') || '').toString().trim(),
      lang: FR ? 'fr' : 'en'
    };
  }

  /* ---------------- submit ---------------- */
  function fail(text) {
    msg.className = 'form-msg error';
    msg.textContent = text;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = T.send; }
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function done(payload) {
    var coming = payload.attending.indexOf('Joyfully') === 0;
    var panel = document.getElementById('rsvp-thanks');
    document.getElementById('rsvp-panel').hidden = true;
    show(known, false);
    panel.hidden = false;
    panel.querySelector('h2').textContent = coming ? T.yesTitle : T.noTitle;
    panel.querySelector('p').textContent = coming
      ? T.yesBody
      : T.noBodyA + (deadline || T.deadline) + T.noBodyB;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      localStorage.setItem('rsvp-sent', JSON.stringify({ email: payload.email, at: Date.now() }));
    } catch (e) {}
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
    if (!configured) return fail(T.notReady);

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = T.sending; }
    postToGoogleForm(payload);
    // The iframe load event is not reliable cross-origin, so show the thank-you either way.
    setTimeout(function () { done(payload); }, 1400);
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
      if (!entry || value === '' || value === null || value === undefined) return;
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
    add(f.partySize, payload.partySize || '');
    add(f.plusOne, payload.plusOne ? 'Yes' : 'No');
    add(f.plusOneName, payload.plusOneName);
    add(f.guests, payload.children.map(function (c, i) {
      return (c.name || (T.child + (i + 1))) + ' (' + (c.age || '?') + ')';
    }).join(', '));
    add(f.dietary, payload.dietary.map(function (d) { return d.who + ': ' + d.note; }).join('; '));
    add(f.note, payload.note);

    document.body.appendChild(post);
    post.submit();
    setTimeout(function () { post.remove(); }, 3000);
  }

  /* ---------------- first paint ---------------- */
  syncAttending();
  syncPlusOne();
  syncChildren();
  if (submitBtn) submitBtn.textContent = T.send;

  // A Google Form cannot be read back, so this is the one thing we can know:
  // that this browser has sent an RSVP before.
  try {
    var seen = localStorage.getItem('rsvp-sent');
    if (seen && known) {
      var info = JSON.parse(seen);
      var emailInput = form.querySelector('[name="email"]');
      if (info.email && emailInput && !emailInput.value) emailInput.value = info.email;
      document.getElementById('known-title').textContent = T.againTitle;
      document.getElementById('known-detail').textContent = info.at
        ? T.againOn + new Date(info.at).toLocaleDateString(FR ? 'fr-FR' : 'en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' }) + '.'
        : '';
      document.getElementById('known-sub').textContent = T.againSub;
      show(known, true);
      if (submitBtn) submitBtn.textContent = T.sendAgain;
    }
  } catch (e) {}
})();
