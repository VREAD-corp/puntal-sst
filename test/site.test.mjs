// Wiring of the shared CRO framework: pages load assets/xp.js then cro.js before app.js, the price test keeps its
// variants and ?precio= forcing, app.js reads octaveCro, and the backend routes cro batches, cro and cro_init.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const API = read('docs/assets/mesure.js').match(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/)[0];
const PAGES = fs.readdirSync(new URL('../docs/', import.meta.url)).filter((f) => f.endsWith('.html') && !/^google[0-9a-f]+\.html$/.test(f));

test('every page loads xp.js then cro.js (classic, same backend and hosts as mesure.js) before the site scripts', () => {
  assert.ok(PAGES.includes('index.html') && PAGES.length >= 3, PAGES.join());
  for (const f of PAGES) {
    const html = read('docs/' + f);
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((m) => ({ tag: m[0], src: m[1] }));
    const at = (re) => scripts.findIndex((s) => re.test(s.src));
    const cro = scripts[at(/^assets\/cro\.js$/)];
    assert.ok(cro, f + ': cro.js tag');
    assert.ok(!/type="module"/.test(cro.tag), f + ': classic script');
    assert.match(cro.tag, /data-site="puntal-sst"/);
    assert.ok(cro.tag.includes(`data-api="${API}"`), f + ': same backend as mesure.js');
    assert.match(cro.tag, /data-hosts="puntal\.jalonel\.com outils\.vread\.fr"/);
    assert.match(cro.tag, /data-cta="\[data-oferta\]"/);
    assert.ok(at(/^assets\/xp\.js$/) >= 0 && at(/^assets\/xp\.js$/) < at(/^assets\/cro\.js$/), f + ': OCTAVE_XP before cro.js');
    for (const later of [/app\.js$/, /mesure\.js/]) if (at(later) >= 0) assert.ok(at(/^assets\/cro\.js$/) < at(later), f + ': cro.js before ' + later);
  }
});

function browser({ search = '', path = '/', session = {}, local = { octave_notrack: '1' } } = {}) {
  const store = (o) => ({ getItem: (k) => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: (k) => { delete o[k]; } });
  const attrs = {}, sent = [];
  const ctx = {
    document: { currentScript: { dataset: { site: 'puntal-sst', api: API, hosts: 'puntal.jalonel.com' } }, readyState: 'complete', visibilityState: 'visible',
      documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, querySelectorAll: () => [], addEventListener() {} },
    navigator: { userAgent: 'Mozilla/5.0 Chrome/141.0.0.0', webdriver: false }, location: { search, pathname: path, hostname: 'puntal.jalonel.com' },
    sessionStorage: store(session), localStorage: store(local), innerWidth: 1200, addEventListener() {}, URLSearchParams,
    fetch: (u, o) => { sent.push(o); return Promise.resolve(); },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('docs/assets/xp.js'), ctx);
  vm.runInContext(read('docs/assets/cro.js'), ctx);
  return { v: ctx.octaveCro.v('price'), attrs, session, sent };
}

test('price test: a149 / b249, ?precio=a|b forces it, uniform draw kept for the tab only, nothing sent for our tests', () => {
  assert.equal(browser({ search: '?precio=a' }).v, 'a149');
  const b = browser({ search: '?precio=b' });
  assert.equal(b.v, 'b249');
  assert.equal(b.attrs['data-xp-price'], 'b249');
  assert.equal(b.session.oxp_price, 'b249');
  assert.equal(browser({ session: { oxp_price: 'b249' } }).v, 'b249', 'same variant for the rest of the tab');
  const seen = { a149: 0, b249: 0 };
  for (let i = 0; i < 400; i++) seen[browser().v]++;
  assert.ok(seen.a149 > 140 && seen.b249 > 140, JSON.stringify(seen));
  assert.equal(browser({ search: '?precio=b&octave_notrack=1', local: {} }).sent.length, 0);
  const XP = ((w) => { vm.runInNewContext(read('docs/assets/xp.js'), { window: w }); return w.OCTAVE_XP; })({});
  assert.equal(XP.length, 1);
  const re = new RegExp(XP[0].pages);
  assert.ok(re.test('/puntal-sst/') && re.test('/puntal-sst/index.html') && re.test('/') && !re.test('/puntal-sst/privacidad.html'));
});

test('app.js reads octaveCro.v("price"), clears the old localStorage draw and records the pre-order goal', () => {
  const app = read('docs/assets/app.js');
  assert.match(app, /octaveCro\.v\('price'\)/);
  assert.match(app, /localStorage\.removeItem\('puntal_v'\)/);
  assert.ok(!/localStorage\.setItem\('puntal_v'/.test(app));
  assert.match(app, /octaveCro\.goal\(data\.oferta === 'kit' \? 'preorder' : 'waitlist'\)/);
  assert.match(app, /variant: variant,/, 'the pre-order still sends the variant');
});

test('backend: cro batches, cro and cro_init are routed; experiments whitelist matches xp.js', () => {
  const out = (o) => ({ setMimeType() { return o; } });
  const ctx = {
    ContentService: { createTextOutput: (s) => out(JSON.parse(s)), MimeType: { JSON: 'json' } },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 10), computeDigest: () => new Array(32).fill(1), DigestAlgorithm: {}, Charset: {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(read('gas/src/Cro.js'), ctx);
  vm.runInContext(read('gas/src/Code.js'), ctx);
  const post = (body) => ctx.doPost({ postData: { contents: JSON.stringify(body) }, parameter: {} });
  assert.deepEqual(post({ action: 'track', kind: 'cro', v: 2, site: 'nope', page: '/', e: [['pv', '', '']] }), { ok: false, error: 'bad_request' });
  assert.deepEqual(ctx.doGet({ parameter: { action: 'cro_init', key: 'x'.repeat(40) } }), { ok: false, error: 'method_not_allowed' });
  assert.deepEqual(post({ action: 'cro', key: 'nope' }), { ok: false, error: 'forbidden' });
  assert.ok(!/croSummary_/.test(ctx.stats_.toString()), 'public stats must not include the key-protected cro summary');
  const XP = ((w) => { vm.runInNewContext(read('docs/assets/xp.js'), { window: w }); return w.OCTAVE_XP; })({});
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.CRO_EXPERIMENTS_)), JSON.parse(JSON.stringify(Object.fromEntries(XP.map((x) => [x.id, x.variants])))));
  const b = ctx.croValidate_({ site: 'puntal-sst', v: 2, page: '/puntal-sst/index.html', e: [['xp', 'price', 'b249.n'], ['xp', 'price', 'a149.preorder'], ['xp', 'price', 'a149.waitlist'], ['xp', 'price', 'b.n']] });
  assert.equal(b.page, '/');
  assert.equal(b.exp.length, 3);
  assert.equal(b.dropped, 1);
});
