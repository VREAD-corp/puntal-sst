# Puntal SST

A free self-assessment of the Colombian SG-SST minimum standards (Resolución 0312 de 2019): it picks the group of 7, 21 or 60 standards from the number of workers and the risk class, scores each item with the art. 27 table of values, applies the art. 28 rating, and builds a printable improvement plan (plus CSV). It also runs a pre-order test (fake door) for a document kit and a consultant licence. Brand Jalonel (https://jalonel.com/en/), operated by READ FRANCE SAS (Paris), built by Octave, the company's AI agent. Venture SA-CO-01 in `octave-global-ventures`. Spanish (Colombia), B2B only.

- Live: https://puntal.jalonel.com/ (brand Jalonel, a brand of READ FRANCE SAS; GitHub Pages custom domain, `docs/CNAME`). Moved 2026-10-16 from https://outils.vread.fr/puntal-sst/, which now redirects (301). `mesure.js`, `cro.js` (`data-hosts`) and the backend's `OWN_HOSTS_` accept `puntal.jalonel.com` (old hosts kept).
- `docs/`: the static site. `assets/estandares.js` is generated; `assets/engine.js` is the pure engine; `assets/app.js` is the UI; `assets/mesure.js` is cookieless tracking (octave-checkout pattern).
- `gas/`: Apps Script web app bound to its own new Sheet (scope `spreadsheets.currentonly`): `track`, `preventa` (razón social + NIT with DIAN check digit, Ley 1581 consent) `stats` (public, aggregates only, no CRO summary), plus the shared CRO module `gas/src/Cro.js` (vendored byte-identical from octave-checkout): `track` with `kind:'cro'`, `cro` (key-protected summary for the weekly report) and `cro_init` (POST, stores the key hash once). Deploy: `clasp push && clasp deploy -i $(jq -r .deploymentId gas/.deployment.json)`.
- CRO: `assets/cro.js` (vendored byte-identical from octave-checkout `gas/web/cro.js`) counts aggregate behaviour (scroll, sections, time to first offer click, forms, details opened, errors, Core Web Vitals) and runs the A/B tests of `assets/xp.js`: `price` = kit price COP 149.000 (`a149`) vs 249.000 (`b249`), uniform draw once per tab (sessionStorage `oxp_price`), forced with `?precio=a|b`, exposed on the home page only. `app.js` reads `octaveCro.v('price')`; the old per-browser `localStorage.puntal_v` is removed. Successful pre-orders record the goal `preorder` (kit) or `waitlist` (consultor).
- `sources/`: the article tables parsed from the SENA compilation, and pages 14-15 of Diario Oficial No. 50.872 (table of values) as images.
- `scripts/build-data.py`: builds `estandares.js` from `sources/` and the hand-typed table, with asserts (60 items, total 100, sub-totals).

## Sources (read 2026-10-13)

- Res. 0312/2019 text: https://normograma.sena.edu.co/compilacion/docs/resolucion_mtra_0312_2019.htm (SENA compilation; no amendment notes).
- Table of values (art. 27): Diario Oficial No. 50.872, 19 Feb 2019, p. 15, from http://svrpubindc.imprenta.gov.co/diario/ (the SENA compilation omits it; it is an image in the Diario).
- Decreto 1072/2015: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=72173. Ley 1581/2012: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981.
- mintrabajo.gov.co timed out from our network (curl and Chromium); Función Pública's gestor normativo does not index Res. 0312.

## Method choices (stated on the page)

1. Selection: ≤10 workers and risk I-III → 7 (art. 3); agricultural unit (UPA) ≤10 permanent workers, risk I-III → 3 (art. 7, no score: the resolution gives no values); 11-50 and risk I-III → 21 (art. 9, UPAs included); >50, or any size in risk IV-V → 60 (arts. 8, 15, 16).
2. Scoring: art. 27 literally. Groups 7 and 21 get the maximum on table items outside the group ("No aplica"). The 7 standards weigh 12.5 and the 21 weigh 37.75, so 0/7 gives 87.5 = "Aceptable" under art. 28. The page shows "X de N estándares" first and warns with art. 23 (every standard is mandatory).
3. The resolution publishes no item mapping for the 7/21 standards: each maps to the art. 16 item with the same title (table on the page).
4. Group 60: only Cumple / No cumple (art. 27 allows "No aplica" only for <50 workers in risk I-III).

## Tests

- `npm test`: 8 unit tests (selection matrix, weights from the Diario, verbatim article text, art. 27/28 scoring, deadlines, NIT check digit).
  It also checks the pages' cro.js wiring and the price variant, the backend routes (`test/site.test.mjs`), and runs the vendored `test/cro.check.mjs` and `test/cro-gas.check.mjs` on `docs/assets/cro.js` and `gas/src/Cro.js`.
- `node test/e2e.mjs [url] [shots]` (default url https://puntal.jalonel.com/): Playwright at 390 px and 1440 px (always `octave_notrack=1`), expected values hand-computed from the table; checks both forced price variants.
