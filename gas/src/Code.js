/**
 * Puntal SST: backend Apps Script (web app, runs as the owner, anonymous access).
 * Operated by READ FRANCE SAS (Paris). Bound to its own new spreadsheet; only scope: spreadsheets.currentonly.
 * Not octave-checkout: no payment, no shared data.
 *
 * Actions (POST text/plain JSON, so no CORS preflight; GET works for track and stats):
 *  - track     cookieless anonymous counters (no IP, no user agent, no identifier), aggregated per day and
 *              per price variant into `Stats`, never one row per hit. Same approach as octave-checkout Track.js.
 *              A hit flagged `excluded` by mesure.js (crawler or headless user agent, navigator.webdriver, our tests
 *              with octave_notrack=1) or sent without `v` (a stale cached snippet: 'legacy') goes to `Exclus` by
 *              reason instead, so stats shows counted and raw views side by side.
 *  - preventa  B2B pre-order / waitlist for the document kit or the consultant licence: razón social,
 *              NIT (+ check digit), e-mail, offer, price shown, explicit Ley 1581 consent. One row per
 *              (NIT, offer) in `Preventa`. Nothing is charged.
 *              kind 'cro': the once-per-page behaviour batch of cro.js (Cro.js, vendored byte-identical from
 *              octave-checkout): daily counters in `Comportement` and A/B results in `Experiences`.
 *  - stats     (GET) today's counters, excluded hits by reason, views counted vs raw, and the number of
 *              pre-order rows per offer. No personal data. Public, so no CRO summary here: that is `cro` (key).
 *  - cro       aggregated behaviour + A/B summary over `days` (1-92) or from..to, for the weekly CRO report.
 *              Key required (its SHA-256 is the Script Property CRO_KEY_SHA256, never in git).
 *  - cro_init  (POST only) stores the SHA-256 of the CRO read key once (tools/cro-keys.mjs init).
 * Helpers end with "_" so they cannot be called through google.script.run.
 */

var SITE_ = 'puntal-sst';
var EVENTS_ = ['view', 'grupo', 'evaluar', 'imprimir', 'csv', 'preventa_abrir', 'preventa_error'];
var SERVER_EVENTS_ = ['preventa_registro'];
var VARIANTS_ = ['a149', 'b249'];
var PRICES_ = { a149: 149000, b249: 249000 };
var CONSULTOR_PRICE_ = 99000;
var STATS_TAB_ = 'Stats';
var STATS_HEADER_ = ['date', 'site', 'page', 'event', 'variant', 'source', 'medium', 'campaign', 'count', 'mobile', 'desktop', 'updated_at'];
var STATS_KEYS_ = 8;
var EXCL_TAB_ = 'Exclus';
var EXCL_HEADER_ = ['date', 'site', 'page', 'event', 'variant', 'reason', 'count', 'mobile', 'desktop', 'updated_at'];
var EXCL_KEYS_ = 6;
// Why a hit is not a visit (decided in the browser; the user agent itself is never sent). 'legacy': no `v`.
var EXCL_REASONS_ = ['webdriver', 'bot', 'notrack', 'legacy'];
var PV_TAB_ = 'Preventa';
var PV_HEADER_ = ['created_at', 'oferta', 'variant', 'precio_cop', 'razon_social', 'nit', 'dv', 'email', 'perfil', 'empresas', 'responsable_sst', 'consent_version', 'page', 'source'];
var OWN_HOSTS_ = ['puntal.jalonel.com', 'outils.vread.fr', 'vread-corp.github.io', 'puntal-sst.github.io'];
var EMAIL_RE_ = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/;
var CONSENT_VERSIONS_ = ['v1-2026-10-13'];
var OFFERS_ = ['kit', 'consultor'];
var PERFILES_ = ['empresa', 'consultor'];
var EMPRESAS_ = ['', '1-5', '6-20', '21-50', 'mas50'];
var RESPONSABLE_ = ['', 'si', 'no', 'buscando'];
var RATE_TRACK_ = 300;
var RATE_PV_ = 20;

// Behaviour counters and A/B results of cro.js (src/Cro.js, canonical copy in octave-checkout: do not edit here).
var CRO_SITES_ = [SITE_];
var CRO_EXPERIMENTS_ = { price: ['a149', 'b249'] }; // docs/assets/xp.js (same labels as Stats.variant and VARIANTS_)
var CRO_TZ_ = 'America/Bogota';              // same day as the Stats date column (day_)
function croBook_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function doGet(e) { return route_((e && e.parameter) || {}, false); }

function doPost(e) {
  var raw = e && e.postData && e.postData.contents;
  var body = {};
  if (raw) {
    try { body = JSON.parse(raw); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json_({ ok: false, error: 'bad_json' });
  }
  var params = (e && e.parameter) || {};
  if (!body.action && params.action) body.action = params.action;
  return route_(body, true);
}

function route_(req, post) {
  try {
    switch (String(req.action || '')) {
      case 'track': return json_(req.kind === 'cro' ? croTrack_(req) : track_(req));
      case 'preventa': return json_(preventa_(req));
      case 'stats': return json_(stats_());
      case 'cro': return json_(croAction_(req));
      case 'cro_init': return json_(post ? croInit_(req) : { ok: false, error: 'method_not_allowed' });
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    if (err && err.userError) return json_({ ok: false, error: err.code });
    console.error(String((err && err.stack) || err));
    return json_({ ok: false, error: 'server_error' });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function userError_(code) { var e = new Error(code); e.userError = true; e.code = code; return e; }
function now_() { return new Date(); }
function day_(d) { return Utilities.formatDate(d, 'America/Bogota', 'yyyy-MM-dd'); }
/** Text cell that a spreadsheet never reads as a formula, number or date. */
function txt_(v) { var s = String(v === undefined || v === null ? '' : v); return /^[=+\-@0-9]/.test(s) ? "'" + s : s; }
function cell_(v) { return v instanceof Date ? day_(v) : String(v === undefined || v === null ? '' : v).replace(/^'/, ''); }

function tab_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function token_(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).toLowerCase().replace(/[^a-z0-9._ -]+/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function page_(p) {
  p = String(p === undefined || p === null ? '' : p).slice(0, 300).toLowerCase().replace(/[?#].*$/, '');
  if (!/^\/[a-z0-9\/._%~-]*$/.test(p)) throw userError_('bad_request');
  p = p.replace(/^\/puntal-sst(?=\/|$)/, '') || '/';
  return p.replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/').slice(0, 80) || '/';
}

function variant_(v) { v = String(v || ''); return VARIANTS_.indexOf(v) >= 0 ? v : ''; }

function rateOk_(kind, limit) {
  var cache = CacheService.getScriptCache();
  var k = 'rate:' + kind + ':' + Math.floor(now_().getTime() / 60000);
  var n = Number(cache.get(k) || 0);
  if (n >= limit) return false;
  cache.put(k, String(n + 1), 120);
  return true;
}

function source_(req) {
  var ref = String(req.ref_domain || '').toLowerCase().replace(/^www\./, '');
  if (ref && !/^[a-z0-9.-]{1,100}$/.test(ref)) ref = '';
  if (OWN_HOSTS_.indexOf(ref) >= 0) ref = '(interno)';
  return token_(req.utm_source, 50) || ref || '(directo)';
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw userError_('busy');
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */

function track_(req) {
  var event = String(req.event || '');
  if (EVENTS_.indexOf(event) < 0) throw userError_('bad_request');
  if (req.ts !== undefined && req.ts !== null && req.ts !== '') {
    var ts = Number(req.ts);
    if (!isFinite(ts) || Math.abs(ts - now_().getTime()) > 2 * 86400 * 1000) throw userError_('bad_request');
  }
  var hit = {
    date: day_(now_()), site: SITE_, page: page_(req.page), event: event, variant: variant_(req.variant), source: source_(req),
    medium: token_(req.utm_medium, 30), campaign: token_(req.utm_campaign, 50),
    device: req.device === 'mobile' || req.device === 'desktop' ? req.device : '',
    reason: EXCL_REASONS_.indexOf(String(req.excluded || '')) >= 0 ? String(req.excluded) : (req.excluded ? 'bot' : (!req.v ? 'legacy' : '')),
  };
  if (!rateOk_('track', RATE_TRACK_)) return { ok: false, error: 'rate_limited' };
  withLock_(function () { if (hit.reason) incrementRow_(EXCL_TAB_, EXCL_HEADER_, EXCL_KEYS_, [hit.date, hit.site, hit.page, hit.event, hit.variant, hit.reason], hit.device); else increment_(hit); });
  return { ok: true };
}

/** Caller holds the lock. Increments the day's counter row for this key, or appends it. */
function increment_(h) {
  incrementRow_(STATS_TAB_, STATS_HEADER_, STATS_KEYS_, [h.date, h.site, h.page, h.event, h.variant, h.source, h.medium, h.campaign], h.device);
}

/** Caller holds the lock. Increments the day's counter row `keys` (date first) of tab `name`, or appends it. */
function incrementRow_(name, header, nKeys, keys, device) {
  var sh = tab_(name, header);
  var key = keys.join('\u001f');
  var last = sh.getLastRow();
  var row = 0;
  var n = Math.min(Math.max(last - 1, 0), 2000);
  if (n > 0) {
    var vals = sh.getRange(last - n + 1, 1, n, nKeys).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (cell_(vals[i][0]) < keys[0]) break;
      if (vals[i].map(cell_).join('\u001f') === key) { row = last - n + 1 + i; break; }
    }
  }
  if (!row) {
    sh.appendRow(keys.map(txt_).concat([1,
      device === 'mobile' ? 1 : 0, device === 'desktop' ? 1 : 0, now_().toISOString()]));
  } else {
    var c = sh.getRange(row, nKeys + 1, 1, 3).getValues()[0];
    sh.getRange(row, nKeys + 1, 1, 4).setValues([[Number(c[0] || 0) + 1,
      Number(c[1] || 0) + (device === 'mobile' ? 1 : 0), Number(c[2] || 0) + (device === 'desktop' ? 1 : 0), now_().toISOString()]]);
  }
}

/* ------------------------------------------------------------------ */
/* Preventa (B2B only: razón social + NIT required)                    */
/* ------------------------------------------------------------------ */

/** DIAN check digit (dígito de verificación) of a NIT given as digits only. */
function nitDv_(nit) {
  var w = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  var s = 0;
  for (var i = 0; i < nit.length; i++) s += Number(nit.charAt(nit.length - 1 - i)) * w[i];
  var r = s % 11;
  return r > 1 ? 11 - r : r;
}

function preventa_(req) {
  if (req.hp) return { ok: true };                                   // honeypot: pretend success, store nothing
  var oferta = String(req.oferta || '');
  if (OFFERS_.indexOf(oferta) < 0) throw userError_('bad_offer');
  var razon = String(req.razon_social || '').replace(/\s+/g, ' ').trim();
  if (razon.length < 3 || razon.length > 160) throw userError_('bad_razon_social');
  var nit = String(req.nit || '').replace(/[^0-9]/g, '');
  if (nit.length < 6 || nit.length > 15) throw userError_('bad_nit');
  var dv = String(req.dv === undefined || req.dv === null ? '' : req.dv).replace(/[^0-9]/g, '');
  if (dv === '' || Number(dv) !== nitDv_(nit)) throw userError_('bad_dv');
  var email = String(req.email || '').trim().toLowerCase();
  if (!EMAIL_RE_.test(email) || email.length > 254) throw userError_('bad_email');
  if (req.consent !== true || CONSENT_VERSIONS_.indexOf(String(req.consent_version)) < 0) throw userError_('consent_required');
  var perfil = String(req.perfil || ''); if (PERFILES_.indexOf(perfil) < 0) throw userError_('bad_perfil');
  var empresas = String(req.empresas || ''); if (EMPRESAS_.indexOf(empresas) < 0) empresas = '';
  var resp = String(req.responsable_sst || ''); if (RESPONSABLE_.indexOf(resp) < 0) resp = '';
  var variant = variant_(req.variant);
  var precio = oferta === 'consultor' ? CONSULTOR_PRICE_ : (PRICES_[variant] || '');
  var page = page_(req.page || '/');
  if (!rateOk_('pv', RATE_PV_)) throw userError_('rate_limited');
  return withLock_(function () {
    var sh = tab_(PV_TAB_, PV_HEADER_);
    var last = sh.getLastRow();
    if (last > 1) {
      var vals = sh.getRange(2, 1, last - 1, 6).getValues();
      for (var i = 0; i < vals.length; i++) {
        if (cell_(vals[i][1]) === oferta && cell_(vals[i][5]) === nit) return { ok: true, already: true };
      }
    }
    sh.appendRow([now_().toISOString(), oferta, variant, precio, txt_(razon), txt_(nit), txt_(dv), txt_(email), perfil, txt_(empresas), resp,
      String(req.consent_version), txt_(page), txt_(source_(req))]);
    increment_({ date: day_(now_()), site: SITE_, page: page, event: 'preventa_registro', variant: variant, source: '(servidor)', medium: oferta, campaign: '',
      device: req.device === 'mobile' || req.device === 'desktop' ? req.device : '' });
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ */
/* Aggregated stats (no personal data)                                 */
/* ------------------------------------------------------------------ */

function stats_() {
  var date = day_(now_());
  var sh = tab_(STATS_TAB_, STATS_HEADER_);
  var last = sh.getLastRow();
  var out = {};
  var n = Math.min(Math.max(last - 1, 0), 5000);
  if (n > 0) {
    var vals = sh.getRange(last - n + 1, 1, n, STATS_HEADER_.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (cell_(vals[i][0]) !== date) continue;
      var k = cell_(vals[i][2]) + ' ' + vals[i][3] + (vals[i][4] ? ' ' + vals[i][4] : '');
      out[k] = (out[k] || 0) + Number(vals[i][8] || 0);
    }
  }
  var views = { counted: 0, excluded: 0, raw: 0 };
  Object.keys(out).forEach(function (k) { if (k.split(' ')[1] === 'view') views.counted += out[k]; });
  var excluded = {};
  var ex = tab_(EXCL_TAB_, EXCL_HEADER_);
  var el = ex.getLastRow();
  var m = Math.min(Math.max(el - 1, 0), 5000);
  if (m > 0) ex.getRange(el - m + 1, 1, m, EXCL_HEADER_.length).getValues().forEach(function (r) {
    if (cell_(r[0]) !== date) return;
    var k = cell_(r[2]) + ' ' + r[3] + (r[4] ? ' ' + r[4] : '') + ' |' + r[5];
    excluded[k] = (excluded[k] || 0) + Number(r[6] || 0);
    if (r[3] === 'view') views.excluded += Number(r[6] || 0);
  });
  views.raw = views.counted + views.excluded;
  var pv = tab_(PV_TAB_, PV_HEADER_);
  var byOffer = { kit: 0, consultor: 0 };
  var pl = pv.getLastRow();
  if (pl > 1) pv.getRange(2, 2, pl - 1, 1).getValues().forEach(function (r) { var o = cell_(r[0]); if (byOffer[o] !== undefined) byOffer[o]++; });
  return { ok: true, day: date, counters: out, excluded: excluded, views: views, preventa: byOffer, events: EVENTS_.concat(SERVER_EVENTS_) };
}

/** Run once from the editor (or let the first request do it): creates both tabs with headers. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  tab_(STATS_TAB_, STATS_HEADER_);
  tab_(EXCL_TAB_, EXCL_HEADER_);
  tab_(PV_TAB_, PV_HEADER_);
  ['Sheet1', 'Hoja 1', 'Página1', 'Feuille 1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 2) ss.deleteSheet(s);
  });
  return 'ok';
}
