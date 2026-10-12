// node --test test/engine.test.mjs
// Expected values come from the text of Resolución 0312 de 2019 (arts. 3, 7, 8, 9, 15, 16, 27, 28) and the
// table of values in Diario Oficial No. 50.872, p. 15 (sources/diario-oficial-50872-p15-tabla-de-valores.png).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../docs/assets/estandares.js');
require('../docs/assets/engine.js');
const E = globalThis.PuntalEngine;
const D = globalThis.PUNTAL_DATA;
const SENA = JSON.parse(readFileSync(new URL('../sources/res0312-arts-sena.json', import.meta.url), 'utf8'));

test('selection by size and risk class (arts. 3, 7, 8, 9, 15, 16)', () => {
  const cases = [
    [1, 1, false, '7', 'art. 3'], [10, 3, false, '7', 'art. 3'], [5, 2, true, 'upa3', 'art. 7'],
    [10, 4, false, '60', 'art. 8'], [10, 5, true, '60', 'art. 8'],
    [11, 1, false, '21', 'art. 9'], [50, 3, false, '21', 'art. 9'], [30, 2, true, '21', 'art. 9'],
    [11, 4, false, '60', 'art. 15'], [50, 5, false, '60', 'art. 15'],
    [51, 1, false, '60', 'art. 16'], [400, 3, true, '60', 'art. 16'],
  ];
  for (const [w, r, upa, g, via] of cases) {
    const s = E.selectGroup(w, r, upa);
    assert.equal(s.group, g, `${w} trabajadores, riesgo ${r}, upa ${upa}`);
    assert.equal(s.via, via, `${w}/${r}/${upa}`);
  }
  assert.throws(() => E.selectGroup(0, 1));
  assert.throws(() => E.selectGroup(3.5, 1));
  assert.throws(() => E.selectGroup(5, 6));
});

test('who designs the SG-SST (arts. 4, 10, 17)', () => {
  assert.equal(E.selectGroup(8, 1).designer, 'art. 4');
  assert.equal(E.selectGroup(20, 1).designer, 'art. 10');
  assert.equal(E.selectGroup(20, 4).designer, 'art. 17');
});

test('table of values: 60 items, weights from the Diario Oficial, total 100', () => {
  assert.equal(D.items60.length, 60);
  const sum = D.items60.reduce((a, i) => a + i.weight, 0);
  assert.equal(sum, 100);
  const w = Object.fromEntries(D.items60.map(i => [i.code, i.weight]));
  const expected = {
    '1.1.1': 0.5, '1.1.8': 0.5, '1.2.1': 2, '1.2.3': 2, '2.1.1': 1, '2.4.1': 2, '2.5.1': 2, '2.7.1': 2, '2.10.1': 2, '2.11.1': 1,
    '3.1.1': 1, '3.1.9': 1, '3.2.1': 2, '3.2.2': 2, '3.2.3': 1, '3.3.6': 1, '4.1.1': 4, '4.1.2': 4, '4.1.3': 3, '4.1.4': 4,
    '4.2.1': 2.5, '4.2.6': 2.5, '5.1.1': 5, '5.1.2': 5, '6.1.1': 1.25, '6.1.4': 1.25, '7.1.1': 2.5, '7.1.4': 2.5,
  };
  for (const [c, v] of Object.entries(expected)) assert.equal(w[c], v, c);
  const byStd = {};
  for (const i of D.items60) byStd[i.standard] = (byStd[i.standard] || 0) + i.weight;
  assert.deepEqual(byStd, {
    'RECURSOS': 10, 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO': 15, 'GESTIÓN DE LA SALUD': 20,
    'GESTIÓN DE PELIGROS Y RIESGOS': 30, 'GESTIÓN DE AMENAZAS': 10, 'VERIFICACIÓN DEL SG-SST': 5, 'MEJORAMIENTO': 10,
  });
});

test('standards text is the resolution text (arts. 3, 9, 16)', () => {
  assert.equal(D.g7.length, 7);
  assert.equal(D.g21.length, 21);
  D.g7.forEach((s, k) => { assert.equal(s.criterio, SENA.a3[k][1]); assert.equal(s.verificacion, SENA.a3[k][2]); });
  D.g21.forEach((s, k) => { assert.equal(s.criterio, SENA.a9[k][1]); });
  D.items60.forEach((s, k) => { assert.equal(s.criterio, SENA.a16[k][1]); });
  assert.equal(D.g7[3].title, 'Plan Anual de Trabajo');
  assert.match(D.g7[0].criterio, /cincuenta \(50\) horas/);
  assert.equal(D.g21[20].title, 'Revisión por la alta dirección');
  assert.equal(D.items60[59].title, 'Plan de mejoramiento');
  assert.match(D.items60[0].criterio, /profesionales en SST/);
});

test('scoring with art. 27 ("No aplica" = maximum for groups 7 and 21)', () => {
  const all = v => Object.fromEntries(D.items60.map(i => [i.code, v]));
  // 7 standards: their weights add up to 12.5, so the other 53 items carry 87.5.
  let r = E.score(D, '7', {});
  assert.equal(r.noAplica, 87.5); assert.equal(r.groupWeight, 12.5); assert.equal(r.complete, false);
  r = E.score(D, '7', all('no'));
  // Literal art. 27 + art. 28: 87.5 > 85 gives "Aceptable" even with 0 of 7 met; the page warns about it (art. 23).
  assert.equal(r.total, 87.5); assert.equal(r.valoracion.key, 'aceptable'); assert.equal(r.cumple, 0); assert.equal(r.groupPct, 0);
  r = E.score(D, '7', all('si'));
  assert.equal(r.total, 100); assert.equal(r.valoracion.key, 'aceptable'); assert.equal(r.cumple, 7);
  // 21 standards: 37.75 in the group, 62.25 "No aplica".
  r = E.score(D, '21', all('no'));
  assert.equal(r.total, 62.25); assert.equal(r.groupWeight, 37.75); assert.equal(r.valoracion.key, 'moderado');
  // Missing the emergency plan and the brigade (5 + 5) and the hazard identification (4) in group 21.
  const a = all('si'); a['5.1.1'] = 'no'; a['5.1.2'] = 'no'; a['4.1.2'] = 'no';
  r = E.score(D, '21', a);
  assert.equal(r.total, 86); assert.equal(r.valoracion.key, 'aceptable'); assert.deepEqual(r.fails, ['4.1.2', '5.1.1', '5.1.2']);
  // 60 standards: no "No aplica".
  r = E.score(D, '60', all('no'));
  assert.equal(r.total, 0); assert.equal(r.valoracion.key, 'critico');
  r = E.score(D, '60', all('si'));
  assert.equal(r.total, 100);
  const b = all('si'); for (const c of ['4.1.1', '4.1.2', '4.1.3', '4.1.4']) b[c] = 'no';
  r = E.score(D, '60', b);
  assert.equal(r.total, 85); assert.equal(r.valoracion.key, 'moderado');
  const c = all('si'); for (const k of ['5.1.1', '5.1.2', '4.1.1', '4.1.2', '4.1.4', '4.2.1', '4.2.2', '4.2.3', '4.2.4', '4.2.5', '4.2.6', '1.2.1', '2.4.1', '2.5.1', '2.7.1', '1.2.2', '1.2.3']) c[k] = 'no';
  r = E.score(D, '60', c);
  assert.equal(r.total, 100 - 10 - 12 - 15 - 8 - 4); assert.equal(r.valoracion.key, 'critico');
});

test('art. 28 thresholds and ARL report deadlines', () => {
  assert.equal(E.valoracion(59.99).key, 'critico');
  assert.equal(E.valoracion(60).key, 'moderado');
  assert.equal(E.valoracion(85).key, 'moderado');
  assert.equal(E.valoracion(85.25).key, 'aceptable');
  assert.equal(E.valoracion(10).reportMonths, 3);
  assert.equal(E.valoracion(70).reportMonths, 6);
  assert.equal(E.addMonths('2026-10-13', 3), '2027-01-13');
  assert.equal(E.addMonths('2026-08-31', 6), '2027-02-28');
});

test('NIT check digit (DIAN modulo 11)', () => {
  assert.equal(E.nitDv('890903938'), 8);   // Bancolombia S.A. 890.903.938-8
  assert.equal(E.nitDv('899999068'), 1);   // Ecopetrol S.A. 899.999.068-1
  assert.equal(E.nitDv('890.903.938'), 8);
});

test('format', () => {
  assert.equal(E.fmt(87.5), '87,5');
  assert.equal(E.fmt(62.25), '62,25');
  assert.equal(E.fmt(100), '100');
});
