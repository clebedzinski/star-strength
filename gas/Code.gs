/**
 * SIC bug-report receiver.
 * Deploy as a Web App: Execute as Me, Who has access: Anyone.
 * Bind this script to a private Google Sheet. Do not put secrets in the client.
 * Consumer Apps Script quotas apply and can change. This is not unlimited.
 */
var MAX_PER_DAY = 200;
var MAX_MESSAGE = 4096;
var ID_RE = /^rpt_[A-Za-z0-9_-]{6,80}$/;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
    if (raw.length > MAX_MESSAGE + 2048) return json_({ ok: false, error: 'too-large' });
    var data;
    try { data = JSON.parse(raw); } catch (err) { return json_({ ok: false, error: 'json' }); }
    if (!data || typeof data !== 'object') return json_({ ok: false, error: 'json' });
    if (data.company) return json_({ ok: false, error: 'rejected' });
    if (!ID_RE.test(String(data.id || ''))) return json_({ ok: false, error: 'id' });
    var message = String(data.message || '').trim();
    if (!message) return json_({ ok: false, error: 'message' });
    if (message.length > MAX_MESSAGE) return json_({ ok: false, error: 'too-large' });

    var sheet = reportsSheet_();
    var last = Math.max(sheet.getLastRow(), 1);
    var width = 1;
    var ids = sheet.getRange(1, 2, last, width).getValues();
    var id = String(data.id);
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === id) return json_({ ok: true, id: id, duplicate: true });
    }

    var props = PropertiesService.getScriptProperties();
    var day = Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyy-MM-dd');
    var countKey = 'count_' + day;
    var count = parseInt(props.getProperty(countKey) || '0', 10) || 0;
    if (count >= MAX_PER_DAY) return json_({ ok: false, error: 'daily-cap' });
    props.setProperty(countKey, String(count + 1));

    var diagnostics = '';
    if (data.diagnostics && typeof data.diagnostics === 'object') {
      diagnostics = JSON.stringify(data.diagnostics).slice(0, 2000);
    }
    sheet.appendRow([
      new Date().toISOString(),
      id,
      String(data.version || '').slice(0, 40),
      String(data.platform || '').slice(0, 40),
      String(data.skin || '').slice(0, 40),
      message,
      String(data.contact || '').slice(0, 120),
      diagnostics
    ]);
    return json_({ ok: true, id: id });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function reportsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Reports');
  if (!sheet) sheet = ss.insertSheet('Reports');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp', 'id', 'version', 'platform', 'skin', 'message', 'contact', 'diagnostics']);
  }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
