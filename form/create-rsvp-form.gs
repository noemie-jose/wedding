/**
 * Creates the RSVP Google Form, its responses spreadsheet, and prints the exact
 * js/rsvp-config.js block to paste into the website.
 *
 * You only visit script.google.com once, to run this. Nothing is deployed and
 * nothing keeps running: the result is an ordinary Google Form in your Drive
 * that you can edit in the normal Forms editor afterwards.
 *
 * HOW TO RUN
 *   1. Go to https://script.google.com and click New project.
 *   2. Delete the sample code, paste this whole file in, and save.
 *   3. With "createRsvpForm" showing in the function dropdown, click Run.
 *   4. Approve the permissions prompt the first time: Review permissions >
 *      your account > Advanced > Go to (project name) (unsafe) > Allow.
 *      That warning shows for every personal script; this is your own code
 *      making your own form.
 *   5. Open the Execution log at the bottom. It prints:
 *        - a link to edit the form
 *        - a link to the form as guests would see it
 *        - a link to the responses spreadsheet
 *        - the finished contents of js/rsvp-config.js
 *   6. Paste that last block over js/rsvp-config.js in the site, commit, push.
 *
 * If you later rename a question or change an answer option in the Forms
 * editor, the website must match it exactly. The safest edits are wording in
 * the question titles, which the site never sends.
 *
 * Google Workspace accounts: open the form, Settings > Responses, and make
 * sure it is NOT restricted to people in your organisation, or guests outside
 * it cannot reply.
 */

function createRsvpForm() {
  var form = FormApp.create('Noémie & Jose RSVP · 18 September 2027 · Annecy');

  form.setDescription(
    'We got married in June 2026 and had a small gathering in Boston. This is the celebration ' +
    'with our wider community, in Annecy. Please reply by 31 December 2026. ' +
    'One response per household is fine.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(false);
  form.setConfirmationMessage('Thank you! Your RSVP is in. Noémie and Jose');

  var ss = SpreadsheetApp.create('RSVPs · Noémie & Jose (Annecy 2027)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ---- the questions, in the same order as the website ----------------------
  var items = {};

  items.name = form.addTextItem()
    .setTitle('Full name(s)')
    .setHelpText('Everyone this RSVP covers.')
    .setRequired(true);

  items.email = form.addTextItem()
    .setTitle('Email')
    .setRequired(true);

  items.phone = form.addTextItem()
    .setTitle('Phone')
    .setRequired(true);

  items.attending = form.addMultipleChoiceItem()
    .setTitle('Will you join us?')
    .setChoiceValues(['Joyfully accepts', 'Regretfully declines'])
    .setRequired(true);

  items.partySize = form.addTextItem()
    .setTitle('How many of you are coming in total?');

  items.plusOne = form.addMultipleChoiceItem()
    .setTitle('Bringing a plus one?')
    .setChoiceValues(['Yes', 'No']);

  items.plusOneName = form.addTextItem()
    .setTitle("Plus one's name");

  items.guests = form.addParagraphTextItem()
    .setTitle('Children')
    .setHelpText('Each child and their age, for example: Mira (6), Theo (3).');

  items.dietary = form.addParagraphTextItem()
    .setTitle('Dietary needs')
    .setHelpText('Per person, for example: Haley: pescatarian; Mira: dairy free.');

  items.note = form.addParagraphTextItem()
    .setTitle('Anything else we should know?');

  // ---- read each question's entry id ---------------------------------------
  // A prefilled link is the only place Google exposes these ids, so build one
  // per question and read the number out of it.
  var ids = {};
  Object.keys(items).forEach(function (key) {
    var item = items[key], typed, value;
    switch (item.getType()) {
      case FormApp.ItemType.MULTIPLE_CHOICE:
        typed = item.asMultipleChoiceItem();
        value = typed.getChoices()[0].getValue();
        break;
      case FormApp.ItemType.PARAGRAPH_TEXT:
        typed = item.asParagraphTextItem();
        value = 'x';
        break;
      default:
        typed = item.asTextItem();
        value = 'x';
    }
    var url = form.createResponse().withItemResponse(typed.createResponse(value)).toPrefilledUrl();
    var m = url.match(/entry\.(\d+)/);
    ids[key] = m ? 'entry.' + m[1] : '';
  });

  // ---- print the config -----------------------------------------------------
  var action = form.getPublishedUrl().replace('/viewform', '/formResponse');
  var keys = Object.keys(items);
  var lines = [];

  lines.push('');
  lines.push('Edit the form:     ' + form.getEditUrl());
  lines.push('Guest view:        ' + form.getPublishedUrl());
  lines.push('Responses sheet:   ' + ss.getUrl());
  lines.push('');
  lines.push('----- paste everything below over js/rsvp-config.js -----');
  lines.push('window.RSVP_CONFIG = {');
  lines.push('  formAction: "' + action + '",');
  lines.push('  fields: {');
  keys.forEach(function (k, i) {
    lines.push('    ' + (k + ':') + ' "' + ids[k] + '"' + (i < keys.length - 1 ? ',' : ''));
  });
  lines.push('  },');
  lines.push('  rsvpBy: "31 December 2026",');
  lines.push('  rsvpByFr: "31 décembre 2026",');
  lines.push('  fallbackFormUrl: "' + form.getPublishedUrl() + '"');
  lines.push('};');
  lines.push('----- end -----');

  Logger.log(lines.join('\n'));
  return lines.join('\n');
}
