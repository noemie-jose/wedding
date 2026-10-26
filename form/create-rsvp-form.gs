/**
 * Builds a Google Form that mirrors the website's RSVP page question for
 * question, then prints the js/rsvp-config.js block the site needs.
 *
 * Every person gets their own fields, so the responses spreadsheet has columns
 * like "Child 2 name" and "Plus one's dietary needs" rather than one bundled
 * cell. The site fills in whichever of them apply and leaves the rest empty.
 *
 * TWO FUNCTIONS. Pick one in the dropdown next to Run:
 *
 *   createRsvpForm()              Makes the form, its responses spreadsheet,
 *                                 and prints the config block.
 *
 *   printConfigForExistingForm()  Prints the config block for a form that
 *                                 already exists and already has these exact
 *                                 question titles. Paste its edit URL into
 *                                 EXISTING_FORM_URL below first.
 *
 * HOW TO RUN
 *   1. https://script.google.com, open your project or start a New project.
 *   2. Paste this whole file in, replacing whatever is there. Save.
 *   3. Choose the function, click Run.
 *   4. First time only: Review permissions > your account > Advanced >
 *      Go to (project name) (unsafe) > Allow. That warning shows for every
 *      personal script; this is your own code making your own form.
 *   5. Open the Execution log at the bottom and copy the block it prints.
 *
 * Already made a form with the older questions? Delete it and its "RSVPs ·"
 * spreadsheet from Drive, then run createRsvpForm here. The question set
 * changed, so the old form no longer matches the site.
 *
 * Google Workspace accounts: in the form, Settings > Responses, make sure it
 * is not restricted to people in your organisation.
 */

// Only for printConfigForExistingForm. The form's edit URL, ending in /edit.
var EXISTING_FORM_URL = '';

// How many children the form has blocks for. The website's dropdown offers the
// same number. Raising it here means raising it in rsvp.html and fr/rsvp.html.
var MAX_CHILDREN = 6;

// Question title -> the name the website uses for it.
var TITLE_TO_KEY = {
  'Your full name': 'name',
  'Email': 'email',
  'Phone': 'phone',
  'Will you join us?': 'attending',
  'Your dietary needs': 'dietYou',
  'Bringing a plus one?': 'plusOne',
  "Plus one's name": 'plusOneName',
  "Plus one's dietary needs": 'dietPlus',
  'Bringing children?': 'hasChildren',
  'How many children?': 'childCount',
  'How many of you are coming in total?': 'partySize',
  'Anything else we should know?': 'note'
};

var KEY_ORDER = ['name', 'email', 'phone', 'attending', 'dietYou', 'plusOne',
                 'plusOneName', 'dietPlus', 'hasChildren', 'childCount',
                 'partySize', 'note'];


/* ------------------------------------------------------------------ */
/*  Make the form                                                      */
/* ------------------------------------------------------------------ */
function createRsvpForm() {
  var form = FormApp.create('Noémie & Jose RSVP · 18 September 2027 · Annecy');

  form.setDescription(
    'We got married in June 2026 and had a small gathering in Boston. This is the celebration ' +
    'with our wider community, in Annecy. Please reply by 31 December 2026. ' +
    'One response per household is fine: fill in the parts that apply to you.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(false);
  form.setConfirmationMessage('Thank you! Your RSVP is in. Noémie and Jose');

  var ss = SpreadsheetApp.create('RSVPs · Noémie & Jose (Annecy 2027)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ---- you -----------------------------------------------------------
  form.addTextItem().setTitle('Your full name').setRequired(true);
  form.addTextItem().setTitle('Email').setRequired(true);
  form.addTextItem().setTitle('Phone').setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Will you join us?')
    .setChoiceValues(['Joyfully accepts', 'Regretfully declines'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Your dietary needs')
    .setHelpText('Leave blank if you have none.');

  // ---- plus one --------------------------------------------------------
  form.addMultipleChoiceItem()
    .setTitle('Bringing a plus one?')
    .setChoiceValues(['Yes', 'No']);
  form.addTextItem().setTitle("Plus one's name");
  form.addTextItem().setTitle("Plus one's dietary needs");

  // ---- children --------------------------------------------------------
  form.addMultipleChoiceItem()
    .setTitle('Bringing children?')
    .setChoiceValues(['Yes', 'No']);
  form.addTextItem().setTitle('How many children?');

  for (var i = 1; i <= MAX_CHILDREN; i++) {
    form.addTextItem().setTitle('Child ' + i + ' name');
    form.addTextItem().setTitle('Child ' + i + ' age');
    form.addTextItem().setTitle('Child ' + i + ' dietary needs');
  }

  // ---- the rest --------------------------------------------------------
  form.addTextItem()
    .setTitle('How many of you are coming in total?')
    .setHelpText('The website works this out for you.');
  form.addParagraphTextItem().setTitle('Anything else we should know?');

  var out = report_(form, ss.getUrl());
  Logger.log(out);
  return out;
}


/* ------------------------------------------------------------------ */
/*  Print the config for a form that already exists                    */
/* ------------------------------------------------------------------ */
function printConfigForExistingForm() {
  if (!EXISTING_FORM_URL) {
    var hint = 'Paste your form\'s edit URL into EXISTING_FORM_URL at the top of this file first.';
    Logger.log(hint);
    return hint;
  }
  var form = FormApp.openByUrl(EXISTING_FORM_URL);
  var out = report_(form, '(open the form and click Responses to find its spreadsheet)');
  Logger.log(out);
  return out;
}


/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

/**
 * Items straight from addTextItem() are already typed; items from getItems()
 * are generic and need converting. This copes with both.
 */
function asTyped_(item) {
  if (typeof item.asTextItem !== 'function') return item;   // already typed
  switch (item.getType()) {
    case FormApp.ItemType.MULTIPLE_CHOICE: return item.asMultipleChoiceItem();
    case FormApp.ItemType.PARAGRAPH_TEXT: return item.asParagraphTextItem();
    case FormApp.ItemType.LIST: return item.asListItem();
    case FormApp.ItemType.CHECKBOX: return item.asCheckboxItem();
    default: return item.asTextItem();
  }
}

/**
 * A question's entry id is only exposed in a prefilled link, so build one for
 * this question alone and read the number out of it.
 */
function entryIdFor_(form, item) {
  var typed = asTyped_(item);
  var type = item.getType();
  var value;
  if (type === FormApp.ItemType.MULTIPLE_CHOICE || type === FormApp.ItemType.LIST) {
    value = typed.getChoices()[0].getValue();
  } else if (type === FormApp.ItemType.CHECKBOX) {
    value = [typed.getChoices()[0].getValue()];
  } else {
    value = 'x';
  }
  var url = form.createResponse().withItemResponse(typed.createResponse(value)).toPrefilledUrl();
  var m = url.match(/entry\.(\d+)/);
  return m ? 'entry.' + m[1] : '';
}

function report_(form, sheetNote) {
  var ids = {};
  var kids = [];      // kids[0] = { name:, age:, diet: } for Child 1
  var unknown = [];

  for (var i = 0; i < MAX_CHILDREN; i++) kids.push({ name: '', age: '', diet: '' });

  form.getItems().forEach(function (item) {
    var title = item.getTitle();
    if (!title) return;

    var key = TITLE_TO_KEY[title];
    if (key) { ids[key] = entryIdFor_(form, item); return; }

    var m = title.match(/^Child (\d+) (name|age|dietary needs)$/);
    if (m) {
      var idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < MAX_CHILDREN) {
        var slot = m[2] === 'dietary needs' ? 'diet' : m[2];
        kids[idx][slot] = entryIdFor_(form, item);
      }
      return;
    }
    unknown.push(title);
  });

  var missing = KEY_ORDER.filter(function (k) { return !ids[k]; });
  var missingKids = [];
  kids.forEach(function (k, i) {
    if (!k.name || !k.age || !k.diet) missingKids.push('Child ' + (i + 1));
  });

  var lines = [];
  lines.push('');
  lines.push('Edit the form:     ' + form.getEditUrl());
  lines.push('Guest view:        ' + form.getPublishedUrl());
  lines.push('Responses sheet:   ' + sheetNote);
  lines.push('');
  if (missing.length) {
    lines.push('!! No question matched: ' + missing.join(', '));
    lines.push('   Check the titles in the form against TITLE_TO_KEY at the top of this file.');
    lines.push('');
  }
  if (missingKids.length) {
    lines.push('!! Incomplete child blocks: ' + missingKids.join(', '));
    lines.push('   Each one needs "Child N name", "Child N age" and "Child N dietary needs".');
    lines.push('');
  }
  if (unknown.length) {
    lines.push('(Questions the website ignores: ' + unknown.join(' | ') + ')');
    lines.push('');
  }

  lines.push('----- paste everything below over js/rsvp-config.js -----');
  lines.push('window.RSVP_CONFIG = {');
  lines.push('  formAction: "' + form.getPublishedUrl().replace('/viewform', '/formResponse') + '",');
  lines.push('  fields: {');
  KEY_ORDER.forEach(function (k, i) {
    lines.push('    ' + k + ': "' + (ids[k] || '') + '"' + (i < KEY_ORDER.length - 1 ? ',' : ''));
  });
  lines.push('  },');
  lines.push('  children: [');
  kids.forEach(function (k, i) {
    lines.push('    { name: "' + k.name + '", age: "' + k.age + '", diet: "' + k.diet + '" }' +
               (i < kids.length - 1 ? ',' : '') + '   // Child ' + (i + 1));
  });
  lines.push('  ],');
  lines.push('  rsvpBy: "31 December 2026",');
  lines.push('  rsvpByFr: "31 décembre 2026",');
  lines.push('  fallbackFormUrl: "' + form.getPublishedUrl() + '"');
  lines.push('};');
  lines.push('----- end -----');

  return lines.join('\n');
}
