import { buildPeriodizationSheet, buildWorkoutSheet, type SetPrescription } from '@elevapro/shared';
import { htmlDoPlano, htmlDoTreino } from '../treinoPdf';

const serie = (campos: Partial<SetPrescription>): SetPrescription => ({
  methods: ['working'],
  reps: { mode: 'range', min: 8, max: 12 },
  weight_kg: 80,
  rest_seconds: 90,
  target_rir: null,
  segments: [],
  ...campos,
});

const folhaDeOrigem = [
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
];

const folha = buildWorkoutSheet({ title: 'Treino A', exercises: folhaDeOrigem });

const CABECALHO = {
  documento: 'Protocolo de treino',
  aluno: 'Ana Souza',
  especialista: 'Daniel L.',
  vigencia: null,
};

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

  it('traz o aluno e o profissional, cada um com o seu rótulo', () => {
    expect(html).toContain('PROTOCOLO DE TREINO');
    expect(html).toMatch(/ALUNO<\/span>Ana Souza/);
    expect(html).toMatch(/PROFISSIONAL<\/span>Daniel L\./);
    expect(html).not.toContain('DESENVOLVIDO POR');
  });

  it('no plano próprio do Praticante, a linha do profissional não aparece', () => {
    const proprio = htmlDoTreino(folha, { ...CABECALHO, especialista: null }, 'agora');
    expect(proprio).not.toContain('PROFISSIONAL');
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

describe('htmlDoPlano — o plano completo no papel do protocolo', () => {
  const plano = buildPeriodizationSheet({
    periodization: {
      name: 'Hipertrofia',
      objective: 'Ganho de massa',
      start_date: '2026-10-01',
      end_date: '2026-11-30',
    },
    phases: [
      {
        plan: {
          name: 'Adaptação',
          order_index: 0,
          start_date: '2026-10-01',
          end_date: '2026-10-31',
        },
        workouts: [{ title: 'Treino A', exercises: folhaDeOrigem }],
      },
      {
        plan: { name: 'Choque', order_index: 1, start_date: '2026-11-01', end_date: '2026-11-30' },
        workouts: [],
      },
    ],
  });
  const html = htmlDoPlano(plano, { ...CABECALHO, documento: 'Plano de treino completo' }, 'agora');

  it('leva a periodização, cada fase com as datas e os treinos dela', () => {
    expect(html).toContain('HIPERTROFIA');
    expect(html).toContain('Objetivo: Ganho de massa');
    expect(html).toContain('FASE 1 // ADAPTAÇÃO');
    expect(html).toContain('1 a 31 out 2026');
    expect(html).toContain('TREINO A');
    expect(html).toContain('Pausa 15 s → 4 reps · 80 kg');
  });

  it('fase sem treino aparece vazia, sem sumir', () => {
    expect(html).toContain('FASE 2 // CHOQUE');
    expect(html).toContain('Sem treinos nesta fase');
  });
});
