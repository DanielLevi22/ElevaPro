import { buildWorkoutSheet, type SetPrescription } from '@elevapro/shared';
import { htmlDoTreino } from '../treinoPdf';

const serie = (campos: Partial<SetPrescription>): SetPrescription => ({
  methods: ['working'],
  reps: { mode: 'range', min: 8, max: 12 },
  weight_kg: 80,
  rest_seconds: 90,
  target_rir: null,
  segments: [],
  ...campos,
});

const folha = buildWorkoutSheet({
  title: 'Treino A',
  exercises: [
    {
      order_index: 0,
      notes: 'Joelho <alinhado>',
      set_plan: [
        serie({ methods: ['warmup'], reps: { mode: 'count', value: 15 }, weight_kg: 40 }),
        serie({
          methods: ['rest_pause'],
          reps: { mode: 'failure' },
          segments: [{ reps: { mode: 'count', value: 4 }, weight_kg: 80, pause_seconds: 15 }],
        }),
      ],
      exercise: { name: 'Agachamento', muscle_group: 'Pernas' },
    },
  ],
});

const CABECALHO = { aluno: 'Ana Souza', especialista: 'Daniel L.', vigencia: null };

describe('htmlDoTreino — o treino no papel do protocolo', () => {
  const html = htmlDoTreino(folha, CABECALHO, '21 out 2026, 10:31');

  it('leva o treino série a série, com técnicas e blocos', () => {
    expect(html).toContain('TREINO A');
    expect(html).toContain('AGACHAMENTO');
    expect(html).toContain('Aquecimento');
    expect(html).toContain('Rest-pause');
    expect(html).toContain('até a falha');
    expect(html).toContain('Pausa 15 s → 4 reps · 80 kg');
    expect(html).toContain('90 s');
  });

  it('traz o aluno e quem prescreveu, no cabeçalho do protocolo', () => {
    expect(html).toContain('[ ANA SOUZA ]');
    expect(html).toContain('DESENVOLVIDO POR // DANIEL L.');
  });

  it('no plano próprio do Praticante, diz que o plano é dele', () => {
    const proprio = htmlDoTreino(folha, { ...CABECALHO, especialista: null }, 'agora');
    expect(proprio).toContain('DESENVOLVIDO POR // PLANO PRÓPRIO');
  });

  // LGPD Art. 6°, III e VII. O arquivo sai do aparelho e pode chegar a qualquer
  // pessoa: carrega o que a tela mostra, e nenhum identificador interno.
  it('não carrega e-mail nem identificador interno', () => {
    if (/[\w.+-]+@[\w-]+\.[\w.]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(html)) {
      throw new Error('DADO A MAIS NO PDF: o treino exportado saiu com e-mail ou id interno');
    }
  });

  it('escapa o que veio de texto livre', () => {
    expect(html).toContain('Joelho &lt;alinhado&gt;');
    expect(html).not.toContain('<alinhado>');
  });

  it('avisa, no próprio arquivo, que quem receber poderá lê-lo', () => {
    expect(html).toContain('Quem receber este arquivo poderá lê-lo');
  });
});
