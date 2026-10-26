/**
 * RSVP backend for the wedding site.
 *
 * This is what lets the website both WRITE an RSVP and READ one back, so a
 * guest who returns to the page is told they have already replied and sees
 * their previous answers filled in. A plain Google Form can only be written
 * to, never queried, which is why this small web app sits in front of it.
 *
 * It keeps one row per household in a Google Sheet, keyed by email address.
 * Sending the same email again updates that row instead of adding a new one.
 * If you also want every submission to land in a Google Form's own responses,
 * fill in FORM_ID below and each save is mirrored there too.
 *
 * SETUP (about five minutes, once)
 *   1. https://script.google.com  ->  New project. Paste this whole file. Save.
 *   2. Run  setup  once. Approve the permissions prompt (it is your own script
 *      creating your own spreadsheet). The log prints the spreadsheet link.
 *   3. Deploy ▸ New deployment ▸ type "Web app".
 *        Execute as:        Me
 *        Who has access:    Anyone                      <-- this matters
 *      Deploy, then copy the Web app URL. It ends in /exec.
 *   4. Put that URL in js/rsvp-config.js as apiUrl. Commit and push.
 *
 * After any edit to this file you must Deploy ▸ Manage deployments ▸ edit ▸
 * New version, or the live URL keeps running the old code.
 *
 * "Who has access: Anyone" means anyone with the URL can read an RSVP if they
 * know the exact email address, and can save one. That is the same level of
 * privacy as a normal wedding RSVP page. If you would rather lock it down, set
 * SECRET below to a random string and put the same string in rsvp-config.js.
 */

var SHEET_NAME = 'RSVPs';
var FORM_ID = '';     // optional: a Google Form id to mirror submissions into
var SECRET = '';      // optional: must match `secret` in js/rsvp-config.js

var HEADERS = [
  'First replied', 'Last updated', 'Email', 'Name', 'Phone', 'Attending',
  'Party size', 'Plus one', 'Plus one name', 'Children', 'Children details',
  'Dietary needs', 'Note', 'Language', 'Raw'
];

/** Run this once from the editor. */
function setup() {
  var ss = SpreadsheetApp.create('RSVPs · Noémie & Jose (Annecy 2027)');
  var sh = ss.getActiveSheet();
  sh.setName(SHEET_NAME);
  sh.appendRow(HEADERS);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  Logger.log('Spreadsheet created: ' + ss.getUrl() +
             '\nNow deploy this script as a web app (Anyone) and copy the /exec URL.');
  return ss.getUrl();
}

function sheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Run setup() first.');
  var sh = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function norm_(email) {
  return String(email || '').trim().toLowerCase();
}

function rowFor_(sh, email) {
  var values = sh.getRange(2, 3, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (norm_(values[i][0]) === email) return i + 2;
  }
  return 0;
}

/** GET ?email=someone@example.com  ->  {found: true, rsvp: {...}} */
function doGet(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    if (SECRET && p.secret !== SECRET) return json_({ ok: false, error: 'bad secret' });
    var email = norm_(p.email);
    if (!email) return json_({ ok: true, found: false });

    var sh = sheet_();
    var row = rowFor_(sh, email);
    if (!row) return json_({ ok: true, found: false });

    var values = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    var raw = values[HEADERS.indexOf('Raw')];
    var rsvp = {};
    try { rsvp = JSON.parse(raw); } catch (err) { rsvp = {}; }
    rsvp.firstReplied = values[0] ? new Date(values[0]).toISOString() : '';
    rsvp.lastUpdated = values[1] ? new Date(values[1]).toISOString() : '';
    return json_({ ok: true, found: true, rsvp: rsvp });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** POST a JSON body (sent as text/plain so the browser skips preflight). */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    if (SECRET && data.secret !== SECRET) return json_({ ok: false, error: 'bad secret' });

    var email = norm_(data.email);
    if (!email) return json_({ ok: false, error: 'missing email' });

    var sh = sheet_();
    var row = rowFor_(sh, email);
    var now = new Date();

    var children = (data.children || []).map(function (c) {
      return (c.name || 'child') + ' (' + (c.age === '' || c.age === null || c.age === undefined ? '?' : c.age) + ')';
    }).join('; ');

    var dietary = (data.dietary || []).map(function (d) {
      return d.who + ': ' + d.note;
    }).join('; ');

    var values = [
      row ? sh.getRange(row, 1).getValue() || now : now,   // first replied
      now,                                                 // last updated
      email,
      data.name || '',
      data.phone || '',
      data.attending || '',
      data.partySize || '',
      data.plusOne ? 'Yes' : 'No',
      data.plusOneName || '',
      (data.children || []).length,
      children,
      dietary,
      data.note || '',
      data.lang || 'en',
      JSON.stringify(data)
    ];

    var updated = !!row;
    if (row) {
      sh.getRange(row, 1, 1, values.length).setValues([values]);
    } else {
      sh.appendRow(values);
    }

    if (FORM_ID) {
      try { mirrorToForm_(data); } catch (err) { /* the sheet is the record that matters */ }
    }

    return json_({ ok: true, updated: updated });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Optional: also drop a copy into a Google Form's responses. */
function mirrorToForm_(data) {
  var form = FormApp.openById(FORM_ID);
  var items = form.getItems();
  var response = form.createResponse();
  var text = [
    'Name: ' + (data.name || ''),
    'Email: ' + (data.email || ''),
    'Attending: ' + (data.attending || ''),
    'Party size: ' + (data.partySize || ''),
    'Plus one: ' + (data.plusOne ? (data.plusOneName || 'yes') : 'no'),
    'Children: ' + (data.children || []).map(function (c) { return (c.name || 'child') + ' (' + c.age + ')'; }).join(', '),
    'Dietary: ' + (data.dietary || []).map(function (d) { return d.who + ': ' + d.note; }).join(', '),
    'Note: ' + (data.note || '')
  ].join('\n');
  for (var i = 0; i < items.length; i++) {
    var type = items[i].getType();
    if (type === FormApp.ItemType.PARAGRAPH_TEXT) {
      response.withItemResponse(items[i].asParagraphTextItem().createResponse(text));
      break;
    }
    if (type === FormApp.ItemType.TEXT) {
      response.withItemResponse(items[i].asTextItem().createResponse(text));
      break;
    }
  }
  response.submit();
}

/** Handy from the editor: prints what is stored for one address. */
function testLookup() {
  Logger.log(doGet({ parameter: { email: 'test@example.com', secret: SECRET } }).getContent());
}
