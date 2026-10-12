#!/usr/bin/env python3
"""Builds docs/assets/estandares.js from the official sources.

- Codes, item labels, weights and groupings: "Tabla de valores y calificación", Resolución 0312 de 2019,
  art. 27, Diario Oficial No. 50.872 (19 Feb 2019), page 15 (image kept in sources/). Typed by hand below
  and checked by the asserts (60 items, total 100, group totals).
- Criteria and "modo de verificación" text of arts. 3, 9 and 16: SENA legal compilation
  (normograma.sena.edu.co/compilacion/docs/resolucion_mtra_0312_2019.htm), parsed into
  sources/res0312-arts-sena.json. Art. 16 rows are in the same order as the table codes.
- Art. 7 (agricultural units with 10 or fewer permanent workers): three standards, quoted verbatim.

Run: python3 -I scripts/build-data.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (code, label in the table of values, weight). Groups: (cycle, standard, standard weight, sub-standard, sub weight)
TABLE = [
    ('I. PLANEAR', 'RECURSOS', 10, 'Recursos financieros, técnicos, humanos y de otra índole requeridos para coordinar y desarrollar el Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST)', 4, [
        ('1.1.1', 'Responsable del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST', 0.5),
        ('1.1.2', 'Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST', 0.5),
        ('1.1.3', 'Asignación de recursos para el Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST', 0.5),
        ('1.1.4', 'Afiliación al Sistema General de Riesgos Laborales', 0.5),
        ('1.1.5', 'Identificación de trabajadores de alto riesgo y cotización de pensión especial', 0.5),
        ('1.1.6', 'Conformación COPASST', 0.5),
        ('1.1.7', 'Capacitación COPASST', 0.5),
        ('1.1.8', 'Conformación Comité de Convivencia', 0.5),
    ]),
    ('I. PLANEAR', 'RECURSOS', 10, 'Capacitación en el Sistema de Gestión de la Seguridad y Salud en el Trabajo', 6, [
        ('1.2.1', 'Programa Capacitación Promoción y Prevención PyP', 2),
        ('1.2.2', 'Inducción y reinducción en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST, actividades de Promoción y Prevención PyP', 2),
        ('1.2.3', 'Responsables del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST con curso virtual de 50 horas', 2),
    ]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Política de Seguridad y Salud en el Trabajo', 1, [
        ('2.1.1', 'Política del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST firmada, fechada y comunicada al COPASST', 1)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Objetivos del Sistema de Gestión de la Seguridad y Salud en el Trabajo SG-SST', 1, [
        ('2.2.1', 'Objetivos definidos, claros, medibles, cuantificables, con metas, documentados, revisados del SG-SST', 1)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Evaluación inicial del SG-SST', 1, [
        ('2.3.1', 'Evaluación e identificación de prioridades', 1)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Plan Anual de Trabajo', 2, [
        ('2.4.1', 'Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado', 2)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Conservación de la documentación', 2, [
        ('2.5.1', 'Archivo o retención documental del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST', 2)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Rendición de cuentas', 1, [
        ('2.6.1', 'Rendición sobre el desempeño', 1)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Normatividad nacional vigente y aplicable en materia de seguridad y salud en el trabajo', 2, [
        ('2.7.1', 'Matriz legal', 2)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Comunicación', 1, [
        ('2.8.1', 'Mecanismos de comunicación, auto reporte en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST', 1)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Adquisiciones', 1, [
        ('2.9.1', 'Identificación, evaluación para adquisición de productos y servicios en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST', 1)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Contratación', 2, [
        ('2.10.1', 'Evaluación y selección de proveedores y contratistas', 2)]),
    ('I. PLANEAR', 'GESTIÓN INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO', 15, 'Gestión del cambio', 1, [
        ('2.11.1', 'Evaluación del impacto de cambios internos y externos en el Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST', 1)]),
    ('II. HACER', 'GESTIÓN DE LA SALUD', 20, 'Condiciones de salud en el trabajo', 9, [
        ('3.1.1', 'Descripción sociodemográfica. Diagnóstico de condiciones de salud', 1),
        ('3.1.2', 'Actividades de Promoción y Prevención en Salud', 1),
        ('3.1.3', 'Información al médico de los perfiles de cargo', 1),
        ('3.1.4', 'Realización de evaluaciones médicas ocupacionales: peligros, periodicidad, comunicación al trabajador', 1),
        ('3.1.5', 'Custodia de historias clínicas', 1),
        ('3.1.6', 'Restricciones y recomendaciones médico laborales', 1),
        ('3.1.7', 'Estilos de vida y entornos saludables (controles tabaquismo, alcoholismo, farmacodependencia y otros)', 1),
        ('3.1.8', 'Agua potable, servicios sanitarios y disposición de basuras', 1),
        ('3.1.9', 'Eliminación adecuada de residuos sólidos, líquidos o gaseosos', 1),
    ]),
    ('II. HACER', 'GESTIÓN DE LA SALUD', 20, 'Registro, reporte e investigación de las enfermedades laborales, los incidentes y accidentes del trabajo', 5, [
        ('3.2.1', 'Reporte de los accidentes de trabajo y enfermedad laboral a la ARL, EPS y Dirección Territorial del Ministerio del Trabajo', 2),
        ('3.2.2', 'Investigación de incidentes, accidentes y enfermedades laborales', 2),
        ('3.2.3', 'Registro y análisis estadístico de accidentes y enfermedades laborales', 1),
    ]),
    ('II. HACER', 'GESTIÓN DE LA SALUD', 20, 'Mecanismos de vigilancia de las condiciones de salud de los trabajadores', 6, [
        ('3.3.1', 'Medición de la frecuencia de la accidentalidad', 1),
        ('3.3.2', 'Medición de la severidad de la accidentalidad', 1),
        ('3.3.3', 'Medición de la mortalidad por accidentes de trabajo', 1),
        ('3.3.4', 'Medición de la prevalencia de enfermedad laboral', 1),
        ('3.3.5', 'Medición de la incidencia de enfermedad laboral', 1),
        ('3.3.6', 'Medición del ausentismo por causa médica', 1),
    ]),
    ('II. HACER', 'GESTIÓN DE PELIGROS Y RIESGOS', 30, 'Identificación de peligros, evaluación y valoración de los riesgos', 15, [
        ('4.1.1', 'Metodología para la identificación de peligros, evaluación y valoración de los riesgos', 4),
        ('4.1.2', 'Identificación de peligros con participación de todos los niveles de la empresa', 4),
        ('4.1.3', 'Identificación de sustancias catalogadas como carcinógenas o con toxicidad aguda', 3),
        ('4.1.4', 'Realización mediciones ambientales, químicos, físicos y biológicos', 4),
    ]),
    ('II. HACER', 'GESTIÓN DE PELIGROS Y RIESGOS', 30, 'Medidas de prevención y control para intervenir los peligros/riesgos', 15, [
        ('4.2.1', 'Implementación de medidas de prevención y control frente a peligros/riesgos identificados', 2.5),
        ('4.2.2', 'Verificación de aplicación de medidas de prevención y control por parte de los trabajadores', 2.5),
        ('4.2.3', 'Elaboración de procedimientos, instructivos, fichas, protocolos', 2.5),
        ('4.2.4', 'Realización de inspecciones a instalaciones, maquinaria o equipos con participación del COPASST', 2.5),
        ('4.2.5', 'Mantenimiento periódico de instalaciones, equipos, máquinas, herramientas', 2.5),
        ('4.2.6', 'Entrega de Elementos de Protección Personal EPP, se verifica con contratistas y subcontratistas', 2.5),
    ]),
    ('II. HACER', 'GESTIÓN DE AMENAZAS', 10, 'Plan de prevención, preparación y respuesta ante emergencias', 10, [
        ('5.1.1', 'Se cuenta con el Plan de Prevención, Preparación y Respuesta ante Emergencias', 5),
        ('5.1.2', 'Brigada de prevención conformada, capacitada y dotada', 5),
    ]),
    ('III. VERIFICAR', 'VERIFICACIÓN DEL SG-SST', 5, 'Gestión y resultados del SG-SST', 5, [
        ('6.1.1', 'Definición de indicadores del SG-SST de acuerdo con las condiciones de la empresa', 1.25),
        ('6.1.2', 'La empresa adelanta auditoría por lo menos una vez al año', 1.25),
        ('6.1.3', 'Revisión anual de la alta dirección, resultados de la auditoría', 1.25),
        ('6.1.4', 'Planificación auditorías con el COPASST', 1.25),
    ]),
    ('IV. ACTUAR', 'MEJORAMIENTO', 10, 'Acciones preventivas y correctivas con base en los resultados del SG-SST', 10, [
        ('7.1.1', 'Definición de acciones preventivas y correctivas con base en resultados del SG-SST', 2.5),
        ('7.1.2', 'Acciones de mejora conforme a revisión de la alta dirección', 2.5),
        ('7.1.3', 'Acciones de mejora con base en investigaciones de accidentes de trabajo y enfermedades laborales', 2.5),
        ('7.1.4', 'Elaboración plan de mejoramiento, implementación de medidas y acciones correctivas solicitadas por autoridades y ARL', 2.5),
    ]),
]

# Each standard of arts. 3 and 9 maps to the art. 16 item that carries the same name (our method; the
# resolution publishes no mapping). Order = order of the rows in arts. 3 and 9.
MAP_7 = ['1.1.1', '1.1.4', '1.2.1', '2.4.1', '3.1.4', '4.1.2', '4.2.1']
MAP_21 = ['1.1.1', '1.1.3', '1.1.4', '1.1.6', '1.1.8', '1.2.1', '2.1.1', '2.4.1', '2.5.1', '3.1.1', '3.1.2',
          '3.1.4', '3.1.6', '3.2.1', '3.2.2', '4.1.2', '4.2.5', '4.2.6', '5.1.1', '5.1.2', '6.1.3']

UPA_3 = [
    'Identificar los peligros en el marco de los procesos productivos de la unidad de producción agropecuaria, evaluar y valorar los riesgos y establecer los respectivos controles.',
    'Desarrollar actividades enfocadas a prevenir la presencia de accidentes de trabajo o enfermedades laborales.',
    'Proteger la seguridad y salud de todas las personas que desarrollan actividades productivas en la unidad de producción agropecuaria.',
]


def main():
    arts = json.load(open(os.path.join(ROOT, 'sources', 'res0312-arts-sena.json'), encoding='utf-8'))
    a3, a9, a16 = arts['a3'], arts['a9'], arts['a16']
    assert len(a3) == 7 and len(a9) == 21 and len(a16) == 60, (len(a3), len(a9), len(a16))

    items = []
    for cycle, std, std_w, sub, sub_w, rows in TABLE:
        assert abs(sum(r[2] for r in rows) - sub_w) < 1e-9, sub
        for code, label, w in rows:
            items.append({'code': code, 'label': label, 'weight': w, 'cycle': cycle, 'standard': std,
                          'standardWeight': std_w, 'sub': sub, 'subWeight': sub_w})
    assert len(items) == 60
    assert abs(sum(i['weight'] for i in items) - 100) < 1e-9
    for std in {i['standard'] for i in items}:
        ws = {i['standardWeight'] for i in items if i['standard'] == std}
        subs = {(i['sub'], i['subWeight']) for i in items if i['standard'] == std}
        assert len(ws) == 1 and abs(sum(s[1] for s in subs) - ws.pop()) < 1e-9, std
    assert len({i['code'] for i in items}) == 60

    for i, row in zip(items, a16):
        i['title'] = row[0].replace('\n', ' ')
        i['criterio'] = row[1]
        i['verificacion'] = row[2]

    by_code = {i['code']: i for i in items}

    def group(rows, mapping, art):
        out = []
        for n, (row, code) in enumerate(zip(rows, mapping), 1):
            out.append({'n': n, 'code': code, 'title': row[0].replace('\n', ' ').rstrip('.'), 'criterio': row[1],
                        'verificacion': row[2], 'weight': by_code[code]['weight'], 'art': art})
        return out

    data = {
        'version': '2026-10-13',
        'source': {
            'norma': 'Resolución 0312 del 13 de febrero de 2019, Ministerio del Trabajo, Diario Oficial No. 50.872 del 19 de febrero de 2019',
            'texto': 'https://normograma.sena.edu.co/compilacion/docs/resolucion_mtra_0312_2019.htm',
            'diario': 'http://svrpubindc.imprenta.gov.co/diario/ (edición 50.872, pp. 9-15)',
            'consultado': '2026-10-13',
        },
        'items60': items,
        'g7': group(a3, MAP_7, 'art. 3'),
        'g21': group(a9, MAP_21, 'art. 9'),
        'upa3': [{'n': n, 'title': t} for n, t in enumerate(UPA_3, 1)],
    }
    assert len(set(MAP_7)) == 7 and len(set(MAP_21)) == 21
    js = '/* Generado por scripts/build-data.py a partir del texto oficial de la Resolución 0312 de 2019. No editar a mano. */\n'
    js += 'globalThis.PUNTAL_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n'
    open(os.path.join(ROOT, 'docs', 'assets', 'estandares.js'), 'w', encoding='utf-8').write(js)
    w7 = sum(by_code[c]['weight'] for c in MAP_7)
    w21 = sum(by_code[c]['weight'] for c in MAP_21)
    print('ok: 60 items, total 100; weight of the 7 =', w7, '; weight of the 21 =', w21)


if __name__ == '__main__':
    main()
