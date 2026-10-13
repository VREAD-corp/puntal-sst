/* Puntal SST: interfaz de la autoevaluación y de la preventa. Sin dependencias. */
(function () {
  'use strict';
  var D = globalThis.PUNTAL_DATA, E = globalThis.PuntalEngine;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var track = function (e) { try { if (window.puntalTrack) window.puntalTrack(e); } catch (x) { /* nada */ } };
  var tracked = {};
  var trackOnce = function (e) { if (!tracked[e]) { tracked[e] = 1; track(e); } };

  /* ---------- Variante de precio (prueba A/B de la evaluación: COP 149.000 vs 249.000 al año) ---------- */
  // La sortea cro.js (assets/xp.js: una vez por pestaña, ?precio=a|b la fuerza). Si cro.js no cargó, sorteo sin guardar nada.
  var PRICES = { a149: 149000, b249: 249000 };
  var variant = window.octaveCro && window.octaveCro.v('price');
  if (!PRICES[variant]) variant = Math.random() < 0.5 ? 'a149' : 'b249';
  try { localStorage.removeItem('puntal_v'); } catch (x) { /* antes se guardaba por navegador */ }
  window.PUNTAL_VARIANT = variant;
  var cop = function (n) { return 'COP ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  var state = { workers: 0, risk: 0, upa: false, sel: null, answers: {}, empresa: '', nit: '', responsable: '', fecha: '' };
  var today = function () { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  var fechaLarga = function (iso) {
    var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var p = String(iso).split('-'); return Number(p[2]) + ' de ' + m[Number(p[1]) - 1] + ' de ' + p[0];
  };

  var GROUP_TEXT = {
    '7': { big: 'Le aplican 7 estándares mínimos', why: 'Empresa, empleador o contratante con 10 o menos trabajadores, clasificada en riesgo I, II o III.' },
    '21': { big: 'Le aplican 21 estándares mínimos', why: 'Empresa o unidad de producción agropecuaria de 11 a 50 trabajadores, clasificada en riesgo I, II o III.' },
    '60': { big: 'Le aplican los 60 estándares mínimos', why: '' },
    'upa3': { big: 'Le aplican 3 estándares mínimos', why: 'Unidad de producción agropecuaria con 10 o menos trabajadores permanentes, clasificada en riesgo I, II o III. Cuente como permanentes a quienes trabajan de forma continua, no por cosecha o temporada (art. 7, parágrafo 2).' },
  };
  var DESIGNER = {
    'art. 4': 'Diseño del SG-SST: técnico en SST con licencia vigente, mínimo 1 año de experiencia certificada y el curso virtual de 50 horas; también tecnólogos o profesionales en SST con licencia y el curso (art. 4).',
    'art. 10': 'Diseño del SG-SST: tecnólogo en SST con licencia vigente, mínimo 2 años de experiencia certificada y el curso virtual de 50 horas; también profesionales en SST con licencia y el curso (art. 10).',
    'art. 17': 'Diseño e implementación del SG-SST: profesional en SST o con posgrado en SST, con licencia vigente y el curso virtual de 50 horas (art. 17).',
    'art. 5': 'Apoyo gratuito posible: consultorios en riesgos laborales de instituciones educativas, gremios, cámaras de comercio y asociaciones de agricultores con personal licenciado (art. 5). Su ARL debe darle asesoría presencial (art. 6).',
  };

  /* ---------- Paso 1 ---------- */
  var f1 = $('#paso1');
  $('#f-fecha').value = today();
  f1.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = $('#paso1-err'); err.hidden = true;
    var w = $('#f-trab').value.trim();
    var r = ($('input[name=riesgo]:checked', f1) || {}).value;
    if (!/^\d+$/.test(w) || Number(w) < 1) { err.textContent = 'Escriba el número de trabajadores (un número entero, 1 o más).'; err.hidden = false; $('#f-trab').focus(); return; }
    if (!r) { err.textContent = 'Escoja la clase de riesgo (I a V) con la que la empresa está afiliada a la ARL.'; err.hidden = false; return; }
    var sel = E.selectGroup(Number(w), Number(r), $('#f-upa').checked);
    var changed = !state.sel || state.sel.group !== sel.group;
    state.workers = Number(w); state.risk = Number(r); state.upa = $('#f-upa').checked; state.sel = sel;
    state.empresa = $('#f-emp').value.trim(); state.nit = $('#f-nit').value.trim(); state.responsable = $('#f-resp').value.trim();
    state.fecha = $('#f-fecha').value || today();
    if (changed) state.answers = {};
    renderGroup(); renderList(); $('#paso3').hidden = true;
    track('grupo');
    $('#grupo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function riskRoman(n) { return ['', 'I', 'II', 'III', 'IV', 'V'][n]; }

  function renderGroup() {
    var s = state.sel, t = GROUP_TEXT[s.group];
    var why = t.why;
    if (s.group === '60') {
      why = s.via === 'art. 16' ? (state.risk >= 4 ? 'Empresa de más de 50 trabajadores en riesgo IV o V.' : 'Empresa de más de 50 trabajadores.') :
        'Empresa de ' + (s.size === 'hasta10' ? '10 o menos' : '11 a 50') + ' trabajadores en riesgo ' + riskRoman(state.risk) + ': el ' + s.via + ' la remite a los estándares de las empresas de más de 50 trabajadores.';
    }
    $('#grupo').innerHTML = '<p class="big">' + esc(t.big) + '</p>' +
      '<p class="art">Resolución 0312 de 2019, ' + esc(s.group === '60' && s.via !== 'art. 16' ? s.via + ' y art. 16' : s.articulo) + ' · ' + state.workers + ' trabajadores · riesgo ' + riskRoman(state.risk) + (state.upa ? ' · unidad agropecuaria' : '') + '</p>' +
      '<p>' + esc(why) + '</p><p class="small">' + esc(DESIGNER[s.designer]) + '</p>';
    $('#grupo').hidden = false;
  }

  /* ---------- Paso 2 ---------- */
  function itemsOfGroup() {
    var g = state.sel.group;
    if (g === 'upa3') return D.upa3.map(function (u) { return { code: 'upa' + u.n, n: u.n, title: u.title, upa: true }; });
    if (g === '60') return D.items60.map(function (i) { return { code: i.code, title: i.title, criterio: i.criterio, verificacion: i.verificacion, weight: i.weight, cycle: i.cycle, standard: i.standard, standardWeight: i.standardWeight, sub: i.sub, subWeight: i.subWeight }; });
    return D['g' + g].map(function (s) { return { code: s.code, n: s.n, title: s.title, criterio: s.criterio, verificacion: s.verificacion, weight: s.weight, art: s.art }; });
  }

  function itemHtml(it) {
    var a = state.answers[it.code] || '';
    var meta = it.upa ? 'Art. 7, numeral ' + it.n :
      (it.n ? 'Estándar ' + it.n + ' de ' + state.sel.count + ' (' + it.art + ') · ítem ' + it.code + ' de la tabla, valor ' + E.fmt(it.weight) : 'Ítem ' + it.code + ' · valor ' + E.fmt(it.weight));
    var h = '<div class="item ' + a + '" data-code="' + esc(it.code) + '"><div><p class="meta">' + esc(meta) + '</p><h3>' + esc(it.title) + '</h3>';
    if (it.criterio) h += '<p class="crit">' + esc(it.criterio) + '</p>';
    h += '</div><div class="yn" role="radiogroup" aria-label="' + esc(it.title) + '">' +
      '<label><input type="radio" name="r-' + esc(it.code) + '" value="si"' + (a === 'si' ? ' checked' : '') + '><span>Cumple</span></label>' +
      '<label><input type="radio" name="r-' + esc(it.code) + '" value="no"' + (a === 'no' ? ' checked' : '') + '><span>No cumple</span></label></div>';
    if (it.verificacion) h += '<details data-faq="verificacion"><summary>Modo de verificación</summary><p>' + esc(it.verificacion) + '</p></details>';
    return h + '</div>';
  }

  function renderList() {
    var items = itemsOfGroup(), html = '', lastStd = '', lastSub = '';
    items.forEach(function (it) {
      if (it.standard && it.cycle + it.standard !== lastStd) { html += '<p class="cyc">' + esc(it.cycle) + ' · ' + esc(it.standard) + ' (' + it.standardWeight + ' %)</p>'; lastStd = it.cycle + it.standard; }
      if (it.sub && it.sub !== lastSub) { html += '<p class="subh">' + esc(it.sub) + ' <span class="w">(' + E.fmt(it.subWeight) + ' %)</span></p>'; lastSub = it.sub; }
      html += itemHtml(it);
    });
    $('#lista').innerHTML = html;
    $('#paso2').hidden = false;
    updateProgress();
  }

  $('#lista').addEventListener('change', function (ev) {
    var t = ev.target; if (!t.name || t.name.indexOf('r-') !== 0) return;
    var code = t.name.slice(2); state.answers[code] = t.value;
    var box = t.closest('.item'); box.classList.remove('si', 'no'); box.classList.add(t.value);
    updateProgress();
  });

  function answeredCount() { return itemsOfGroup().filter(function (i) { return state.answers[i.code]; }).length; }
  function updateProgress() {
    var n = answeredCount(), total = itemsOfGroup().length;
    var txt = n + ' de ' + total + ' estándares calificados';
    $('#progreso').textContent = txt; $('#progreso2').textContent = txt;
  }

  $('#btn-resultado').addEventListener('click', function () {
    var items = itemsOfGroup(), missing = items.filter(function (i) { return !state.answers[i.code]; });
    if (missing.length) {
      var first = $('.item[data-code="' + missing[0].code + '"]');
      $('#progreso2').textContent = 'Faltan ' + missing.length + ': califique cada estándar con Cumple o No cumple.';
      if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); var inp = $('input', first); if (inp) inp.focus({ preventScroll: true }); }
      return;
    }
    renderResult();
    track('evaluar');
    $('#paso3').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Paso 3: resultado y plan ---------- */
  var current = null;

  function failedItems() {
    var g = state.sel.group;
    return itemsOfGroup().filter(function (i) { return state.answers[i.code] === 'no'; }).map(function (i) {
      return { code: i.upa ? 'Art. 7-' + i.n : i.code, title: i.title, criterio: i.criterio || i.title, verificacion: i.verificacion || '', weight: i.weight, n: i.n, key: i.code, g: g };
    });
  }

  function renderResult() {
    var g = state.sel.group, html = '<div class="step-head"><h2><span class="num">3</span> Resultado</h2></div><div class="result">';
    var fails = failedItems();
    if (g === 'upa3') {
      var met = 3 - fails.length;
      current = { upa: true, met: met, fails: fails };
      html += '<div class="score-row"><div class="tile ' + (met === 3 ? 'aceptable' : 'critico') + '"><p class="k">Estándares del art. 7 que cumple</p><p class="v">' + met + ' de 3</p></div></div>' +
        '<p class="note">La resolución no asigna valores a los 3 estándares de las unidades agropecuarias pequeñas, así que no calculamos un porcentaje. Todos son obligatorios (art. 23). Su ARL debe darle asesoría presencial para la identificación de peligros y las medidas de control (art. 6).</p>';
    } else {
      var r = E.score(D, g, state.answers);
      current = { upa: false, r: r, fails: fails };
      var v = r.valoracion;
      html += '<div class="score-row">' +
        '<div class="tile ' + (r.cumple === r.count ? 'aceptable' : 'critico') + '"><p class="k">Estándares que cumple</p><p class="v" id="res-cumple">' + r.cumple + ' de ' + r.count + '</p><p class="small">' + E.fmt(r.groupScore) + ' de ' + E.fmt(r.groupWeight) + ' puntos de su grupo</p></div>' +
        '<div class="tile ' + v.key + '"><p class="k">Calificación con la tabla del art. 27</p><p class="v" id="res-total">' + E.fmt(r.total) + ' %</p><p class="small" id="res-val">' + esc(v.label) + ' (art. 28)</p></div></div>';
      if (g !== '60') {
        html += '<p class="note">De los ' + E.fmt(r.total) + ' puntos, ' + E.fmt(r.noAplica) + ' vienen de los ítems de la tabla que no corresponden a su grupo: el art. 27 les da el valor máximo («No aplica»). ' +
          (r.cumple < r.count ? 'Por eso el porcentaje puede verse alto aunque falten estándares. Con ' + (r.count - r.cumple) + ' sin cumplir, la empresa incumple obligaciones: el art. 23 exige cumplir todos los estándares mínimos.' : 'Su empresa cumple todos los estándares de su grupo.') + '</p>';
      }
      var due = v.reportMonths ? E.addMonths(state.fecha, v.reportMonths) : '';
      var accion = v.key === 'critico' ? 'Haga ya el plan de mejoramiento y téngalo a disposición del Ministerio del Trabajo. Envíe a su ARL un reporte de avances a más tardar el ' + fechaLarga(due) + ' (3 meses). El Ministerio hace seguimiento anual y plan de visita a las empresas en valoración crítica.' :
        v.key === 'moderado' ? 'Haga el plan de mejoramiento y téngalo a disposición del Ministerio del Trabajo. Envíe a su ARL un reporte de avances a más tardar el ' + fechaLarga(due) + ' (6 meses). Habrá plan de visita del Ministerio.' :
        'Mantenga la calificación y las evidencias a disposición del Ministerio del Trabajo, e incluya en el plan anual de trabajo las mejoras que salgan de esta evaluación.';
      html += '<p><b>Qué pide el art. 28:</b> ' + esc(accion) + ' El plan se envía a la ARL por correo o en físico, y en julio se rinde informe de avance.</p>';
    }
    if (fails.length) {
      html += '<h3>Plan de mejoramiento</h3><p class="small">Escriba en cada fila la actividad concreta, el responsable, el plazo y los recursos: es el contenido mínimo del art. 28. Lo que escriba aparece en el informe impreso y en el CSV. No se envía a ningún servidor.</p>' +
        '<div class="table-scroll"><table class="plan" id="tabla-plan"><thead><tr><th scope="col">Ítem</th><th scope="col">Estándar y lo que exige</th><th scope="col">Actividad concreta</th><th scope="col">Responsable</th><th scope="col">Plazo</th><th scope="col">Recursos</th><th scope="col">Soporte de cumplimiento</th></tr></thead><tbody>';
      fails.forEach(function (f, k) {
        html += '<tr data-k="' + k + '"><td class="code">' + esc(f.code) + (f.weight ? '<br><span class="small">valor ' + E.fmt(f.weight) + '</span>' : '') + '</td><td><b>' + esc(f.title) + '</b><br><span class="small">' + esc(f.criterio.length > 320 ? f.criterio.slice(0, 317) + '…' : f.criterio) + '</span></td>' +
          '<td data-label="Actividad concreta"><textarea aria-label="Actividad para ' + esc(f.title) + '" data-f="act"></textarea></td>' +
          '<td data-label="Responsable"><input aria-label="Responsable" data-f="resp" maxlength="80"></td>' +
          '<td data-label="Plazo"><input type="date" aria-label="Plazo" data-f="plazo"></td>' +
          '<td data-label="Recursos"><input aria-label="Recursos" data-f="rec" maxlength="120"></td>' +
          '<td data-label="Soporte de cumplimiento"><span class="small">' + esc(f.verificacion || 'Evidencia documental del cumplimiento') + '</span></td></tr>';
      });
      html += '</tbody></table></div>';
    } else {
      html += '<p>No marcó estándares sin cumplir. Guarde las evidencias de cada uno; el informe impreso sirve como registro de la autoevaluación.</p>';
    }
    html += '<div class="actions"><button class="btn primary" type="button" id="btn-print">Imprimir o guardar en PDF</button><button class="btn" type="button" id="btn-csv">Descargar el plan (CSV para Excel)</button></div>' +
      '<p class="small">El resultado es una ayuda para su responsable del SG-SST. La autoevaluación oficial se registra en la aplicación del Ministerio del Trabajo (art. 26) y se envía a la ARL (art. 28, parágrafo 1).</p></div>';
    $('#paso3').innerHTML = html;
    $('#paso3').hidden = false;
    $('#btn-print').addEventListener('click', function () { buildReport(); track('imprimir'); window.print(); });
    $('#btn-csv').addEventListener('click', function () { downloadCsv(); track('csv'); });
  }

  function planRows() {
    return (current.fails || []).map(function (f, k) {
      var tr = $('#tabla-plan tr[data-k="' + k + '"]'), val = function (n) { var el = tr && $('[data-f="' + n + '"]', tr); return el ? el.value.trim() : ''; };
      return { code: f.code, title: f.title, criterio: f.criterio, verificacion: f.verificacion, weight: f.weight, act: val('act'), resp: val('resp'), plazo: val('plazo'), rec: val('rec') };
    });
  }

  function groupLabel() {
    var s = state.sel;
    return (s.group === 'upa3' ? '3 estándares (art. 7)' : s.count + ' estándares (' + (s.group === '60' && s.via !== 'art. 16' ? s.via + ' y art. 16' : s.articulo) + ')');
  }

  function buildReport() {
    var rows = planRows(), s = state.sel, h = '';
    h += '<h1>Autoevaluación de estándares mínimos del SG-SST y plan de mejoramiento</h1>';
    h += '<table class="meta"><tr><td><b>Empresa:</b> ' + esc(state.empresa || '________________') + '</td><td><b>NIT:</b> ' + esc(state.nit || '__________') + '</td><td><b>Fecha:</b> ' + esc(fechaLarga(state.fecha)) + '</td></tr>' +
      '<tr><td><b>Trabajadores:</b> ' + state.workers + ' · <b>Riesgo:</b> ' + riskRoman(state.risk) + (state.upa ? ' · unidad agropecuaria' : '') + '</td><td><b>Grupo:</b> ' + esc(groupLabel()) + '</td><td><b>Responsable SG-SST:</b> ' + esc(state.responsable || '________________') + '</td></tr></table>';
    if (current.upa) h += '<h2>Resultado: cumple ' + current.met + ' de 3 estándares del art. 7</h2>';
    else {
      var r = current.r;
      h += '<h2>Resultado: cumple ' + r.cumple + ' de ' + r.count + ' estándares · calificación con la tabla del art. 27: ' + E.fmt(r.total) + ' % · ' + esc(r.valoracion.label) + ' (art. 28)</h2>';
      if (s.group !== '60') h += '<p>Incluye ' + E.fmt(r.noAplica) + ' puntos de ítems «No aplica» con valor máximo (art. 27).</p>';
    }
    h += '<h2>Estándares calificados</h2><table><thead><tr><th>Ítem</th><th>Estándar</th><th>Valor</th><th>Resultado</th></tr></thead><tbody>';
    itemsOfGroup().forEach(function (i) {
      h += '<tr><td>' + esc(i.upa ? 'Art. 7-' + i.n : i.code) + '</td><td>' + esc(i.title) + '</td><td>' + (i.weight ? E.fmt(i.weight) : '') + '</td><td>' + (state.answers[i.code] === 'si' ? 'Cumple' : 'No cumple') + '</td></tr>';
    });
    h += '</tbody></table>';
    if (rows.length) {
      h += '<h2>Plan de mejoramiento (contenido mínimo del art. 28)</h2><table><thead><tr><th>Ítem</th><th>Estándar</th><th>Actividad concreta</th><th>Responsable</th><th>Plazo</th><th>Recursos</th><th>Soporte de cumplimiento</th></tr></thead><tbody>';
      rows.forEach(function (x) { h += '<tr><td>' + esc(x.code) + '</td><td>' + esc(x.title) + '</td><td>' + esc(x.act) + '</td><td>' + esc(x.resp) + '</td><td>' + esc(x.plazo) + '</td><td>' + esc(x.rec) + '</td><td>' + esc(x.verificacion) + '</td></tr>'; });
      h += '</tbody></table>';
    }
    h += '<div class="firmas"><div>Firma del empleador o contratante</div><div>Firma del responsable de la ejecución del SG-SST</div></div>';
    h += '<p class="pie">Elaborado con Puntal SST (READ FRANCE SAS, octave@vread.fr), herramienta de apoyo sin vínculo con el Ministerio del Trabajo ni las ARL. Fuente: Resolución 0312 de 2019, arts. 3, 7, 9, 16, 27 y 28; tabla de valores del Diario Oficial No. 50.872. No sustituye el diseño del SG-SST por una persona con licencia en SST.</p>';
    $('#informe').innerHTML = h;
  }
  window.addEventListener('beforeprint', function () { if (current) buildReport(); });

  function downloadCsv() {
    var q = function (v) { return '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [['Empresa', state.empresa, 'NIT', state.nit, 'Fecha', state.fecha].map(q).join(';'),
      ['Grupo', groupLabel(), 'Trabajadores', state.workers, 'Riesgo', riskRoman(state.risk)].map(q).join(';')];
    if (!current.upa) lines.push(['Cumple', current.r.cumple + ' de ' + current.r.count, 'Calificación art. 27', E.fmt(current.r.total) + ' %', 'Valoración art. 28', current.r.valoracion.label].map(q).join(';'));
    lines.push('');
    lines.push(['Ítem', 'Estándar', 'Lo que exige', 'Actividad', 'Responsable', 'Plazo', 'Recursos', 'Soporte de cumplimiento'].map(q).join(';'));
    planRows().forEach(function (x) { lines.push([x.code, x.title, x.criterio, x.act, x.resp, x.plazo, x.rec, x.verificacion].map(q).join(';')); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'plan-mejoramiento-sg-sst-' + state.fecha + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- Correspondencia 7/21 con la tabla (sección «Cómo calculamos») ---------- */
  (function () {
    var byCode = {}; D.items60.forEach(function (i) { byCode[i.code] = i; });
    var t = function (g, label) {
      var h = '<div class="table-scroll"><table><caption>' + label + '</caption><thead><tr><th>N.º</th><th>Estándar</th><th>Ítem de la tabla</th><th>Valor</th></tr></thead><tbody>';
      D[g].forEach(function (s) { h += '<tr><td>' + s.n + '</td><td>' + esc(s.title) + '</td><td>' + s.code + ' ' + esc(byCode[s.code].label) + '</td><td>' + E.fmt(s.weight) + '</td></tr>'; });
      return h + '</tbody></table></div>';
    };
    $('#tabla-map').innerHTML = t('g7', '7 estándares (art. 3): suman 12,5') + t('g21', '21 estándares (art. 9): suman 37,75');
  })();

  /* ---------- Preventa ---------- */
  var price = cop(PRICES[variant]);
  $('#precio-kit').textContent = price;
  $$('.precio-kit-2').forEach(function (el) { el.textContent = price; });
  var pv = $('#preventa');
  var syncPerfil = function () {
    var perfil = ($('input[name=perfil]:checked', pv) || {}).value;
    $('#pv-empresas-w').hidden = perfil !== 'consultor';
    $('#pv-resp-w').hidden = perfil === 'consultor';
  };
  $$('[data-oferta]').forEach(function (b) {
    b.addEventListener('click', function () {
      var o = b.getAttribute('data-oferta');
      $('input[name=oferta][value=' + o + ']', pv).checked = true;
      if (o === 'consultor') $('input[name=perfil][value=consultor]', pv).checked = true;
      syncPerfil();
      pv.hidden = false; trackOnce('preventa_abrir');
      pv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { $('#pv-razon').focus({ preventScroll: true }); }, 400);
    });
  });
  $$('input[name=perfil]', pv).forEach(function (r) { r.addEventListener('change', syncPerfil); });

  var ERRORS = {
    bad_razon_social: 'Escriba la razón social (mínimo 3 caracteres).', bad_nit: 'Escriba el NIT, solo números, sin el dígito de verificación.',
    bad_dv: 'El dígito de verificación no corresponde al NIT. Revíselo en el RUT.', bad_email: 'Revise el correo.',
    consent_required: 'Para guardar la reserva necesitamos su autorización de tratamiento de datos.', rate_limited: 'Hay muchas solicitudes en este momento. Intente en un minuto.',
  };
  pv.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = $('#pv-err'), ok = $('#pv-ok'); err.hidden = true; ok.hidden = true;
    var data = {
      action: 'preventa', oferta: ($('input[name=oferta]:checked', pv) || {}).value, perfil: ($('input[name=perfil]:checked', pv) || {}).value,
      razon_social: $('#pv-razon').value.trim(), nit: $('#pv-nit').value.replace(/\D/g, ''), dv: $('#pv-dv').value.replace(/\D/g, ''),
      email: $('#pv-email').value.trim(), empresas: $('#pv-empresas').value, responsable_sst: $('#pv-resp').value, hp: $('#pv-hp').value,
      consent: $('#pv-consent').checked, consent_version: 'v1-2026-10-13', variant: variant, page: location.pathname,
      ref_domain: document.referrer.split('/')[2] || '', device: innerWidth < 768 ? 'mobile' : 'desktop',
    };
    var q = new URLSearchParams(location.search); ['source', 'medium', 'campaign'].forEach(function (k) { data['utm_' + k] = q.get('utm_' + k); });
    var fail = function (code) {
      err.textContent = ERRORS[code] || 'No pudimos guardar la reserva.'; err.hidden = false; track('preventa_error');
    };
    if (data.razon_social.length < 3) return fail('bad_razon_social');
    if (data.nit.length < 6 || data.nit.length > 15) return fail('bad_nit');
    if (data.dv === '' || Number(data.dv) !== E.nitDv(data.nit)) return fail('bad_dv');
    if (!/^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/.test(data.email)) return fail('bad_email');
    if (!data.consent) return fail('consent_required');
    var btn = $('button[type=submit]', pv); btn.disabled = true; btn.textContent = 'Enviando…';
    var mailto = 'mailto:octave@vread.fr?subject=' + encodeURIComponent('Preventa Puntal SST: ' + data.oferta) + '&body=' +
      encodeURIComponent('Razón social: ' + data.razon_social + '\nNIT: ' + data.nit + '-' + data.dv + '\nCorreo: ' + data.email + '\nOferta: ' + data.oferta + ' (' + (data.oferta === 'kit' ? price + ' al año' : 'COP 99.000 al mes') + ')\nAutorizo el tratamiento de estos datos según la política de Puntal SST (Ley 1581 de 2012).');
    fetch(window.PUNTAL_API || 'https://script.google.com/macros/s/AKfycbyr5CPMm54351x_oo3r92A5MfE0AfJGVtgzZNDXoKC2mbYCgMdsOiw1Mkbfeg4CB4uw/exec', {
      method: 'POST', credentials: 'omit', body: JSON.stringify(data),
    }).then(function (r) { return r.text(); }).then(function (t) {
      var j; try { j = JSON.parse(t); } catch (x) { j = null; }
      if (j && j.ok) {
        ok.textContent = j.already ? 'Ya teníamos su reserva para este NIT. No hace falta enviarla otra vez.' : 'Reserva guardada. Le escribiremos a ' + data.email + ' cuando el producto esté listo. No se cobró nada.';
        ok.hidden = false; pv.reset(); syncPerfil();
        if (window.octaveCro) window.octaveCro.goal(data.oferta === 'kit' ? 'preorder' : 'waitlist');
      } else if (j && j.error && ERRORS[j.error]) fail(j.error);
      else throw new Error('backend');
    }).catch(function () {
      err.innerHTML = 'No pudimos guardar la reserva desde esta página. Puede enviarla por correo: <a href="' + esc(mailto) + '">escribir a octave@vread.fr con sus datos</a>.';
      err.hidden = false; track('preventa_error');
    }).then(function () { btn.disabled = false; btn.textContent = 'Enviar reserva'; });
  });
})();
