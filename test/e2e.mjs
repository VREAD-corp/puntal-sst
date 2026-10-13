// Playwright e2e, 390 px and 1440 px.
// node test/e2e.mjs [baseUrl] [screenshotDir]      (default: the live site)
// Expected numbers are computed by hand from the table of values (Diario Oficial No. 50.872, p. 15) and the
// article text, not taken from the engine. PLAYWRIGHT_CORE can point to another playwright-core entry.
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || '/home/vincent/clients/v-read/dev/octave-checkout/node_modules/playwright-core/index.mjs');
const BASE = process.argv[2] || 'https://outils.vread.fr/puntal-sst/';
const OUT = process.argv[3] || join(tmpdir(), 'puntal-e2e');
mkdirSync(OUT, { recursive: true });
const LIVE = !/127\.0\.0\.1|localhost/.test(BASE);
const SENA = JSON.parse(readFileSync(new URL('../sources/res0312-arts-sena.json', import.meta.url), 'utf8'));
const API = (readFileSync(new URL('../docs/assets/mesure.js', import.meta.url), 'utf8').match(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/) || [])[0];

// Table of values, art. 27 (code -> weight), typed again here from the Diario Oficial for an independent check.
const W = {};
const put = (codes, w) => codes.forEach(c => { W[c] = w; });
put(['1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.1.5', '1.1.6', '1.1.7', '1.1.8'], 0.5);
put(['1.2.1', '1.2.2', '1.2.3'], 2);
put(['2.1.1', '2.2.1', '2.3.1', '2.6.1', '2.8.1', '2.9.1', '2.11.1'], 1); put(['2.4.1', '2.5.1', '2.7.1', '2.10.1'], 2);
put(['3.1.1', '3.1.2', '3.1.3', '3.1.4', '3.1.5', '3.1.6', '3.1.7', '3.1.8', '3.1.9'], 1); put(['3.2.1', '3.2.2'], 2); put(['3.2.3'], 1);
put(['3.3.1', '3.3.2', '3.3.3', '3.3.4', '3.3.5', '3.3.6'], 1);
put(['4.1.1', '4.1.2', '4.1.4'], 4); put(['4.1.3'], 3); put(['4.2.1', '4.2.2', '4.2.3', '4.2.4', '4.2.5', '4.2.6'], 2.5);
put(['5.1.1', '5.1.2'], 5); put(['6.1.1', '6.1.2', '6.1.3', '6.1.4'], 1.25); put(['7.1.1', '7.1.2', '7.1.3', '7.1.4'], 2.5);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok === true ? 'PASS' : ok === null ? 'PEND' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

async function step1(p, workers, risk, upa = false) {
  await p.fill('#f-trab', String(workers));
  await p.locator(`input[name=riesgo][value="${risk}"]`).check({ force: true });
  const box = p.locator('#f-upa');
  if ((await box.isChecked()) !== upa) await box.click();
  await p.click('#paso1 button[type=submit]');
  await p.waitForSelector('#paso2:not([hidden])');
}
// answers: default 'si'|'no', plus exceptions {code: 'no'}
async function answerAll(p, def, except = {}) {
  await p.evaluate(([def, except]) => {
    document.querySelectorAll('#lista .item').forEach(it => {
      const v = except[it.dataset.code] || def;
      const r = it.querySelector(`input[value="${v}"]`); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, [def, except]);
}
const txt = async (p, sel) => (await p.locator(sel).innerText()).trim();

const browser = await chromium.launch({ headless: true });
for (const [w, h, tag] of [[390, 844, 'mobile'], [1440, 900, 'desktop']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500, locale: 'es-CO', acceptDownloads: true });
  // Our runs never count as visits: octave_notrack=1 (URL and remembered) sends mesure.js hits to the excluded counters
  // (reason notrack) and stops cro.js entirely. puntal_v is the old per-browser draw: it must be ignored and removed.
  await ctx.addInitScript(() => { localStorage.setItem('octave_notrack', '1'); if (location.search.includes('legacy')) localStorage.setItem('puntal_v', 'b249'); });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  const tracked = [], flags = new Set(); p.on('request', r => { if (r.url().includes('action=track')) { try { const b = JSON.parse(r.postData() || '{}'); tracked.push(b.event); flags.add(`${b.excluded}/v${b.v}`); } catch { /* */ } } });
  await p.goto(BASE + '?precio=a&octave_notrack=1&legacy', { waitUntil: 'networkidle' });

  check(`[${tag}] title`, /Autoevaluación de estándares mínimos SG-SST/.test(await p.title()));
  check(`[${tag}] no horizontal scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const foot = await txt(p, 'footer');
  check(`[${tag}] footer: READ FRANCE SAS, SIREN, contact, Ley 1581, terms, disclaimer`,
    /READ FRANCE SAS/.test(foot) && /988 741 773/.test(foot) && /octave@vread\.fr/.test(foot) && /Ley 1581 de 2012/.test(foot) && /Términos de uso/.test(foot) && /no sustituye el diseño del SG-SST/.test(foot));
  check(`[${tag}] price variant A shows COP 149.000`, (await txt(p, '#precio-kit')) === 'COP 149.000');
  const xpA = await p.evaluate(() => ({ cro: !!document.querySelector('script[src="assets/cro.js"][data-site="puntal-sst"]') && typeof window.octaveCro === 'object',
    v: window.octaveCro && octaveCro.v('price'), attr: document.documentElement.dataset.xpPrice, pv: window.PUNTAL_VARIANT, tab: sessionStorage.getItem('oxp_price'), old: localStorage.getItem('puntal_v') }));
  check(`[${tag}] cro.js loaded; ?precio=a -> a149 for the tab; old localStorage draw ignored and removed`,
    xpA.cro && xpA.v === 'a149' && xpA.attr === 'a149' && xpA.pv === 'a149' && xpA.tab === 'a149' && xpA.old === null, JSON.stringify(xpA));
  await p.screenshot({ path: join(OUT, `${tag}-1-top.png`) });

  // ---- Selection (arts. 3, 7, 8, 9, 15, 16) ----
  const sel = [[8, 3, false, 7, /Le aplican 7 estándares/], [10, 4, false, 60, /los 60 estándares/], [11, 1, false, 21, /21 estándares/],
    [50, 3, false, 21, /21 estándares/], [50, 5, false, 60, /los 60/], [51, 1, false, 60, /los 60/], [5, 2, true, 3, /3 estándares/], [30, 2, true, 21, /21 estándares/]];
  for (const [n, r, upa, count, re] of sel) {
    await step1(p, n, r, upa);
    const items = await p.locator('#lista .item').count();
    const g = await txt(p, '#grupo');
    check(`[${tag}] ${n} trabajadores, riesgo ${r}${upa ? ', UPA' : ''} -> ${count} estándares`, items === count && re.test(g), `items=${items}`);
  }
  // 10 workers, risk IV: the card cites art. 8
  await step1(p, 10, 4); check(`[${tag}] risk IV with 10 workers cites art. 8`, /art\. 8/.test(await txt(p, '#grupo')));

  // ---- Group 7: titles are the art. 3 titles; real clicks; all "No cumple" -> 87.5 (literal art. 27) ----
  await step1(p, 8, 3);
  const titles7 = await p.locator('#lista .item h3').allInnerTexts();
  check(`[${tag}] the 7 titles are art. 3 verbatim`, titles7.every((t, k) => t.trim() === SENA.a3[k][0].replace(/\n/g, ' ').replace(/\.$/, '')));
  const crit7 = await p.locator('#lista .item .crit').first().innerText();
  check(`[${tag}] criterion of standard 1 quotes the 50-hour course`, /cincuenta \(50\) horas/.test(crit7));
  for (const it of await p.locator('#lista .item').all()) await it.locator('.yn label').nth(1).click();
  await p.screenshot({ path: join(OUT, `${tag}-2-lista7.png`) });
  await p.click('#btn-resultado');
  await p.waitForSelector('#paso3:not([hidden])');
  const no7 = 100 - [W['1.1.1'], W['1.1.4'], W['1.2.1'], W['2.4.1'], W['3.1.4'], W['4.1.2'], W['4.2.1']].reduce((a, b) => a + b, 0);
  check(`[${tag}] 7 standards, none met: 0 de 7 and ${no7} %`, (await txt(p, '#res-cumple')) === '0 de 7' && (await txt(p, '#res-total')) === String(no7).replace('.', ',') + ' %');
  check(`[${tag}] 87,5 is "Aceptable" by art. 28 and the page warns with art. 23`, /^Aceptable/.test(await txt(p, '#res-val')) && /art\. 23/.test(await txt(p, '#paso3')));
  check(`[${tag}] plan has 7 rows`, (await p.locator('#tabla-plan tbody tr').count()) === 7);

  // ---- Group 21: miss 4.1.2, 5.1.1, 5.1.2 -> 100 - 14 = 86, Aceptable ----
  await step1(p, 30, 2);
  await answerAll(p, 'si', { '4.1.2': 'no', '5.1.1': 'no', '5.1.2': 'no' });
  await p.click('#btn-resultado'); await p.waitForSelector('#paso3:not([hidden])');
  const exp21 = 100 - W['4.1.2'] - W['5.1.1'] - W['5.1.2'];
  check(`[${tag}] 21 standards, 3 missing: 18 de 21, ${exp21} %, Aceptable`, (await txt(p, '#res-cumple')) === '18 de 21' && (await txt(p, '#res-total')) === `${exp21} %` && /^Aceptable/.test(await txt(p, '#res-val')));
  const codes = (await p.locator('#tabla-plan td.code').allInnerTexts()).map(s => s.split('\n')[0].trim());
  check(`[${tag}] plan rows are 4.1.2, 5.1.1, 5.1.2`, codes.join(',') === '4.1.2,5.1.1,5.1.2', codes.join(','));
  await p.fill('#tabla-plan tr[data-k="1"] [data-f="act"]', 'Redactar y divulgar el plan de emergencias con la ARL');
  await p.fill('#tabla-plan tr[data-k="1"] [data-f="resp"]', 'Responsable SG-SST');
  await p.screenshot({ path: join(OUT, `${tag}-3-resultado21.png`), fullPage: false });
  await p.locator('#paso3').screenshot({ path: join(OUT, `${tag}-3b-resultado21-full.png`) });
  // CSV
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btn-csv')]);
  const csv = readFileSync(await dl.path(), 'utf8');
  check(`[${tag}] CSV: header, 3 plan rows, activity typed`, /"Ítem";"Estándar"/.test(csv) && (csv.match(/^"[0-9]\.[0-9]\.[0-9]"/mg) || []).length === 3 && /plan de emergencias con la ARL/.test(csv));
  // Print view
  await p.evaluate(() => document.getElementById('btn-print') && window.dispatchEvent(new Event('beforeprint')));
  await p.emulateMedia({ media: 'print' });
  const rep = await txt(p, '#informe');
  check(`[${tag}] printable report: result line, plan, signatures`, /cumple 18 de 21/.test(rep) && /Firma del empleador o contratante/.test(rep) && /Redactar y divulgar/.test(rep));
  await p.screenshot({ path: join(OUT, `${tag}-4-informe-print.png`), fullPage: true });
  await p.emulateMedia({ media: 'screen' });

  // ---- Group 60: miss 4.1.1-4.1.4 -> 85 (moderadamente aceptable); all missing -> 0 (crítico, ARL in 3 months) ----
  await step1(p, 120, 1);
  check(`[${tag}] 60 items in table order 1.1.1 ... 7.1.4`, (await p.evaluate(() => [...document.querySelectorAll('#lista .item')].map(i => i.dataset.code))).join(',') === Object.keys(W).sort((a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }).join(','));
  await answerAll(p, 'si', { '4.1.1': 'no', '4.1.2': 'no', '4.1.3': 'no', '4.1.4': 'no' });
  await p.click('#btn-resultado'); await p.waitForSelector('#paso3:not([hidden])');
  check(`[${tag}] 60 standards, hazard identification missing: 85 %, Moderadamente aceptable`, (await txt(p, '#res-total')) === '85 %' && /^Moderadamente aceptable/.test(await txt(p, '#res-val')));
  await answerAll(p, 'no');
  await p.click('#btn-resultado'); await p.waitForSelector('#paso3:not([hidden])');
  check(`[${tag}] 60 standards, none met: 0 %, Crítico, report to the ARL within 3 months`, (await txt(p, '#res-total')) === '0 %' && /^Crítico/.test(await txt(p, '#res-val')) && /\(3 meses\)/.test(await txt(p, '#paso3')));
  // Incomplete answers are refused
  await step1(p, 9, 1);
  await p.click('#btn-resultado');
  check(`[${tag}] cannot see the result before rating every standard`, /Faltan 7/.test(await txt(p, '#progreso2')));

  // ---- Preventa (fake door) ----
  await p.click('[data-oferta="kit"]');
  await p.waitForSelector('#preventa:not([hidden])');
  await p.fill('#pv-razon', 'E2E PRUEBA PUNTAL SAS');
  await p.fill('#pv-nit', '890903938'); await p.fill('#pv-dv', '7');
  await p.fill('#pv-email', `e2e-${tag}@puntal-sst.test`);
  await p.check('#pv-consent');
  await p.click('#preventa button[type=submit]');
  check(`[${tag}] wrong NIT check digit is refused`, /dígito de verificación/.test(await txt(p, '#pv-err')));
  await p.fill('#pv-dv', '8');
  await p.locator('#preventa').screenshot({ path: join(OUT, `${tag}-5-preventa.png`) });
  // Wait for the submit round-trip to finish (button back from "Enviando…"); Apps Script often takes > 3 s.
  await p.click('#preventa button[type=submit]');
  await p.waitForFunction(() => !document.querySelector('#preventa button[type=submit]').disabled, null, { timeout: 30000 }).catch(() => {});
  const okShown = await p.locator('#pv-ok').isVisible();
  const fallback = await p.locator('#pv-err a[href^="mailto:octave@vread.fr"]').count();
  check(`[${tag}] pre-order saved in the Sheet`, okShown ? true : null, okShown ? '' : 'backend not authorized yet');
  check(`[${tag}] pre-order: success or e-mail fallback, never a silent failure`, okShown || fallback === 1);

  // ---- Forced variant B in a new tab: price COP 249.000 everywhere it is shown ----
  const pb = await ctx.newPage(); pb.on('pageerror', e => errors.push(String(e)));
  await pb.goto(BASE + '?precio=b&octave_notrack=1', { waitUntil: 'networkidle' });
  const xpB = await pb.evaluate(() => ({ v: octaveCro.v('price'), attr: document.documentElement.dataset.xpPrice, pv: window.PUNTAL_VARIANT,
    kit: document.querySelector('#precio-kit').textContent, kit2: [...document.querySelectorAll('.precio-kit-2')].map(e => e.textContent) }));
  check(`[${tag}] ?precio=b -> b249 shows COP 249.000`, xpB.v === 'b249' && xpB.attr === 'b249' && xpB.pv === 'b249' && xpB.kit === 'COP 249.000' && xpB.kit2.length > 0 && xpB.kit2.every(t => t === 'COP 249.000'), JSON.stringify(xpB));
  await pb.close();

  check(`[${tag}] no JS errors`, errors.length === 0, errors.join(' | '));
  if (LIVE) check(`[${tag}] tracking sent view, grupo, evaluar, csv, preventa_abrir`, ['view', 'grupo', 'evaluar', 'csv', 'preventa_abrir'].every(e => tracked.includes(e)), tracked.join(','));
  if (LIVE) check(`[${tag}] every test hit is flagged notrack (never a visit)`, [...flags].join() === 'notrack/v2', [...flags].join());
  await ctx.close();
}
await browser.close();
if (LIVE && API) {
  let s = null; try { s = JSON.parse(await (await fetch(API + '?action=stats')).text()); } catch { /* */ }
  check('backend stats (needs owner consent)', s && s.ok ? true : null, s ? JSON.stringify(s.preventa) : 'web app still asks for authorization');
  if (s && s.ok) check('stats includes the cro summary', !!(s.cro && s.cro.ok && s.cro.sites), s.cro ? Object.keys(s.cro).join() : 'missing');
  if (s && s.ok) check('test hits land in the excluded counters (views counted vs raw)', (s.excluded['/ view a149 |notrack'] || 0) >= 2 && s.views.raw >= s.views.counted + 2, JSON.stringify(s.views));
}
const fail = results.filter(r => r.ok === false).length, pend = results.filter(r => r.ok === null).length;
console.log(`\n${results.length - fail - pend} pass, ${fail} fail, ${pend} pending. Screenshots: ${OUT}`);
process.exit(fail ? 1 : 0);
