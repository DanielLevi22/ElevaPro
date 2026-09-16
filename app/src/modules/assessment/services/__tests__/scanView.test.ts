import type { BodyScanRecord } from '@elevapro/shared';
import {
  previousScan,
  riskTag,
  scanHistoryView,
  scanMeasures,
  scanReading,
  scanSummary,
} from '../scanView';

const VAZIO: BodyScanRecord = {
  id: 'scan',
  student_id: 'aluno-1',
  scanned_at: '2026-08-12T15:00:00Z',
  height_cm: 178,
  weight_kg: 78.4,
  scale_source: 'assessment',
  body_fat_pct: 17.2,
  lean_mass_kg: 64.9,
  bmi: 24.1,
  circ_chest: 104.2,
  circ_waist: 81.6,
  circ_hips: 98.4,
  circ_arms: 38.1,
  circ_thighs: 59.8,
  circ_calves: null,
  circ_neck: null,
  circ_shoulders: 121,
  posture_symmetry_score: 78,
  posture_muscle_score: 85,
  posture_overall_score: 64,
  posture_feedback: null,
  recommendations: null,
  framing_mark_top: 0.1,
  framing_mark_bottom: 0.9,
  framing_pitch: 8,
  framing_roll: 0.8,
  framing_level_sensor: true,
  framing_camera: 'back',
  px_per_cm_front: null,
  px_per_cm_back: null,
  px_per_cm_side: null,
  shoulder_drop_cm: null,
  shoulder_tilt_deg: null,
  hip_drop_cm: null,
  hip_tilt_deg: null,
  axis_deviation_cm: null,
  trunk_rotated: false,
  plumb_shoulder_cm: null,
  plumb_hip_cm: null,
  plumb_knee_cm: null,
  quality_backlit: false,
  quality_low_light: false,
  quality_blown_out: false,
  framing_confirmed: true,
};

function scan(parcial: Partial<BodyScanRecord>): BodyScanRecord {
  return { ...VAZIO, ...parcial };
}

describe('riskTag', () => {
  it.each([
    ['ÓTIMO', 'ok'],
    ['BOM', 'ok'],
    ['NORMAL', 'ok'],
    ['MODERADO', 'attention'],
    ['ALTO', 'bad'],
  ])('%s vira o tom %s', (risco, tom) => {
    expect(riskTag(risco).tone).toBe(tom);
  });

  it('rótulo fora da lista aparece como veio, em tom neutro', () => {
    expect(riskTag('LEVE')).toEqual({ label: 'LEVE', tone: 'neutral' });
  });
});

describe('scanReading', () => {
  it('junta os achados das três vistas numa lista só, na ordem das vistas', () => {
    const leitura = scanReading(
      scan({
        posture_feedback: {
          side: [{ title: 'Lordose', risk: 'NORMAL', text: 'Curva dentro do esperado.' }],
          front: [{ title: 'Ombro direito mais baixo', risk: 'MODERADO', text: 'Desnível.' }],
        },
      })
    );
    expect(leitura.findings.map((achado) => achado.title)).toEqual([
      'Ombro direito mais baixo',
      'Lordose',
    ]);
    expect(leitura.findings[0].tag.tone).toBe('attention');
  });

  it('sem achados, a lista vem vazia', () => {
    expect(scanReading(scan({ posture_feedback: null })).findings).toEqual([]);
  });

  it.each([
    ['assessment', 'altura medida'],
    ['self', 'altura declarada'],
    ['anamnese', 'altura declarada'],
  ] as const)('a escala %s aparece como %s', (fonte, texto) => {
    expect(scanReading(scan({ scale_source: fonte })).subtitle).toContain(texto);
  });

  it('altura declarada pesa no selo, como a informada pesava', () => {
    expect(scanReading(scan({ scale_source: 'self' })).confidence.nivel).toBe('media');
    expect(scanReading(scan({ scale_source: 'assessment' })).confidence.nivel).toBe('alta');
  });

  it('nota ausente sai da lista e nota fora da faixa é cortada', () => {
    const notas = scanReading(
      scan({ posture_symmetry_score: null, posture_muscle_score: 104, posture_overall_score: 64 })
    ).scores;
    expect(notas).toEqual([
      { label: 'Muscular', value: 100 },
      { label: 'Postura', value: 64 },
    ]);
  });
});

describe('scanMeasures', () => {
  const ANTERIOR = scan({
    id: 'antes',
    scanned_at: '2026-05-12T15:00:00Z',
    circ_shoulders: 119.4,
    circ_waist: 84.4,
  });

  it('as circunferências seguem a ordem do kit, e a linha sem valor some', () => {
    const { circumferences } = scanMeasures(scan({ circ_calves: 38 }), null);
    expect(circumferences.map((linha) => linha.label)).toEqual([
      'Ombro',
      'Peito',
      'Cintura',
      'Quadril',
      'Braço',
      'Coxa',
      'Panturrilha',
    ]);
  });

  it('a diferença é contra a análise anterior', () => {
    const medidas = scanMeasures(scan({}), ANTERIOR);
    expect(medidas.comparedWith).toBe('12 mai');
    expect(medidas.circumferences.find((linha) => linha.label === 'Cintura')?.delta).toBe(-2.8);
    expect(medidas.circumferences.find((linha) => linha.label === 'Ombro')?.delta).toBe(1.6);
  });

  it('a primeira análise não tem diferença nem "vs."', () => {
    const medidas = scanMeasures(scan({}), null);
    expect(medidas.comparedWith).toBeNull();
    expect(medidas.circumferences.every((linha) => linha.delta === null)).toBe(true);
  });

  it('lentes diferentes não se comparam', () => {
    const medidas = scanMeasures(scan({ framing_camera: 'front' }), ANTERIOR);
    expect(medidas.comparedWith).toBeNull();
  });

  it('a composição mantém os quatro quadros, com traço no que falta', () => {
    const { composition } = scanMeasures(scan({ lean_mass_kg: null }), null);
    expect(composition.map((linha) => linha.value)).toEqual(['78,4', '17,2', '—', '24,1']);
  });

  it('a análise anterior é a seguinte na lista', () => {
    expect(previousScan([scan({}), ANTERIOR], 'scan')).toBe(ANTERIOR);
    expect(previousScan([scan({}), ANTERIOR], 'antes')).toBeNull();
  });
});

describe('scanHistoryView', () => {
  const HISTORICO = [
    scan({ id: 'a', scanned_at: '2026-08-12T15:00:00Z', body_fat_pct: 17.2 }),
    scan({ id: 'b', scanned_at: '2026-05-12T15:00:00Z', body_fat_pct: 18.3 }),
    scan({ id: 'c', scanned_at: '2026-02-10T15:00:00Z', body_fat_pct: 20.4 }),
    scan({ id: 'd', scanned_at: '2025-11-04T15:00:00Z', body_fat_pct: null }),
  ];

  it('o gráfico usa só a gordura presente, da mais antiga para a mais recente', () => {
    const { chart } = scanHistoryView(HISTORICO);
    expect(chart.values).toEqual([20.4, 18.3, 17.2]);
    expect(chart.labels).toEqual(['fev', 'mai', 'ago']);
  });

  it('mostra no máximo as seis mais recentes', () => {
    const muitas = Array.from({ length: 9 }, (_, i) =>
      scan({ id: `s${i}`, body_fat_pct: 10 + i, scanned_at: `2026-0${9 - i}-01T15:00:00Z` })
    );
    expect(scanHistoryView(muitas).chart.values).toEqual([15, 14, 13, 12, 11, 10]);
  });

  it('a diferença do período sai sem julgamento', () => {
    expect(scanHistoryView(HISTORICO).change).toBe(
      'Gordura estimada: −3,2 pontos entre 10 fev e 12 ago.'
    );
    expect(scanHistoryView(HISTORICO.slice(0, 1)).change).toBeNull();
  });

  it('cada linha leva a confiança da própria captura', () => {
    const linhas = scanHistoryView([
      scan({ id: 'limpa' }),
      scan({ id: 'contraluz', quality_backlit: true }),
      scan({ id: 'manual', framing_confirmed: false }),
    ]).rows;
    expect(linhas.map((linha) => linha.tag.label)).toEqual([
      'Captura confiável',
      'Confiança parcial',
      'Melhor repetir',
    ]);
  });

  // LGPD, Art. 18, VI. A lixeira mora na leitura de cada análise; se uma linha
  // some da lista, a análise dela fica sem caminho para ser apagada.
  it('toda análise da lista vira uma linha que abre', () => {
    const ids = scanHistoryView(HISTORICO).rows.map((linha) => linha.id);
    const semLinha = HISTORICO.filter((item) => !ids.includes(item.id)).map((item) => item.id);
    if (semLinha.length > 0) {
      throw new Error(`ANÁLISE SEM CAMINHO PARA APAGAR: ${semLinha.join(', ')}`);
    }
  });

  it('o resumo marca a gordura como estimativa', () => {
    expect(scanSummary(scan({}))).toBe('78,4 kg · ~17,2% gordura (est.)');
    expect(scanSummary(scan({ weight_kg: null, body_fat_pct: null }))).toBe('');
  });
});
