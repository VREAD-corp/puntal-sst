/* Puntal SST: motor de cálculo (sin dependencias). Resolución 0312 de 2019, arts. 3, 7, 8, 9, 15, 16, 27 y 28.
   Se usa en el navegador (globalThis.PuntalEngine) y en las pruebas de Node. */
(function (root) {
  'use strict';

  /** Grupo de estándares que aplica. workers: número total de trabajadores (art. 23); risk: 1-5; upa: unidad de producción agropecuaria. */
  function selectGroup(workers, risk, upa) {
    var w = Number(workers), r = Number(risk);
    if (!Number.isInteger(w) || w < 1) throw new Error('trabajadores');
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new Error('riesgo');
    var size = w <= 10 ? 'hasta10' : (w <= 50 ? '11a50' : 'mas50');
    if (r >= 4) {
      var via = size === 'hasta10' ? 'art. 8' : (size === '11a50' ? 'art. 15' : 'art. 16');
      return { group: '60', count: 60, size: size, articulo: 'art. 16', via: via, designer: 'art. 17' };
    }
    if (size === 'mas50') return { group: '60', count: 60, size: size, articulo: 'art. 16', via: 'art. 16', designer: 'art. 17' };
    if (size === '11a50') return { group: '21', count: 21, size: size, articulo: 'art. 9', via: 'art. 9', designer: 'art. 10' };
    if (upa) return { group: 'upa3', count: 3, size: size, articulo: 'art. 7', via: 'art. 7', designer: 'art. 5' };
    return { group: '7', count: 7, size: size, articulo: 'art. 3', via: 'art. 3', designer: 'art. 4' };
  }

  /** Valoración del art. 28: menor a 60 crítico; entre 60 y 85 moderadamente aceptable; mayor a 85 aceptable. */
  function valoracion(score) {
    if (score < 60) return { key: 'critico', label: 'Crítico', reportMonths: 3 };
    if (score <= 85) return { key: 'moderado', label: 'Moderadamente aceptable', reportMonths: 6 };
    return { key: 'aceptable', label: 'Aceptable', reportMonths: 0 };
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  /**
   * Calificación con la tabla de valores del art. 27.
   * data: PUNTAL_DATA; group: '7' | '21' | '60'; answers: { code: 'si' | 'no' } (códigos 1.1.1 a 7.1.4).
   * Grupos 7 y 21: los ítems de la tabla que no corresponden al grupo reciben el valor máximo ("No aplica", art. 27).
   * Grupo 60: solo cumple (valor máximo) o no cumple (cero).
   */
  function score(data, group, answers) {
    var inGroup = {};
    var groupItems = group === '60' ? data.items60.map(function (i) { return { code: i.code }; }) : data['g' + group];
    if (!groupItems) throw new Error('grupo');
    groupItems.forEach(function (s) { inGroup[s.code] = true; });
    var total = 0, noAplica = 0, cumpleW = 0, groupW = 0, cumpleN = 0, pending = [], fails = [];
    data.items60.forEach(function (it) {
      if (!inGroup[it.code]) { total += it.weight; noAplica += it.weight; return; }
      groupW += it.weight;
      var a = answers[it.code];
      if (a === 'si') { total += it.weight; cumpleW += it.weight; cumpleN++; }
      else if (a === 'no') fails.push(it.code);
      else pending.push(it.code);
    });
    total = round2(total);
    return {
      group: group,
      total: total,
      valoracion: valoracion(total),
      noAplica: round2(noAplica),
      groupWeight: round2(groupW),
      groupScore: round2(cumpleW),
      groupPct: groupW ? round2(cumpleW / groupW * 100) : 0,
      cumple: cumpleN,
      count: groupItems.length,
      fails: fails,
      pending: pending,
      complete: pending.length === 0,
    };
  }

  /** Fecha límite (YYYY-MM-DD) para el reporte de avances a la ARL (art. 28): +3 o +6 meses desde la autoevaluación. */
  function addMonths(isoDate, months) {
    var p = String(isoDate).split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1 + months, 1));
    var last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(p[2], last));
    return d.toISOString().slice(0, 10);
  }

  /** Dígito de verificación DIAN de un NIT (solo dígitos). */
  function nitDv(nit) {
    var w = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    var s = 0, n = String(nit).replace(/\D/g, '');
    for (var i = 0; i < n.length; i++) s += Number(n.charAt(n.length - 1 - i)) * w[i];
    var r = s % 11;
    return r > 1 ? 11 - r : r;
  }

  /** Número con coma decimal (es-CO): 87.5 -> "87,5"; 100 -> "100". */
  function fmt(x) { return String(round2(x)).replace('.', ','); }

  var api = { selectGroup: selectGroup, valoracion: valoracion, score: score, addMonths: addMonths, nitDv: nitDv, fmt: fmt };
  root.PuntalEngine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
