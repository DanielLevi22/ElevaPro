import { POLICY_VERSION } from '@elevapro/shared';
import { gravarSessaoDeCardio, gravarSessaoDeForca } from '../registroDaSessao';

// Mock global de jest.setup.ts: o serviço do `shared` recebe este cliente.
const { mockSupabase } = global as unknown as {
  mockSupabase: jest.Mock & { from: jest.Mock };
};

const DO_ALUNO = { mascarado: false };

/**
 * Um Supabase falso que registra cada insert por tabela e responde ao
 * consentimento com o valor pedido.
 */
function supabaseQueRegistra({ consentiu }: { consentiu: boolean }) {
  const tabelas: string[] = [];
  const gravados: { tabela: string; payload: unknown }[] = [];

  mockSupabase.from.mockImplementation((tabela: string) => {
    tabelas.push(tabela);
    if (tabela === 'student_consents') return consentimento(consentiu);

    return {
      insert: jest.fn((payload: unknown) => {
        gravados.push({ tabela, payload });
        const linhas = Array.isArray(payload) ? payload.map((_, i) => ({ id: `se-${i}` })) : null;
        return {
          select: jest.fn(() =>
            linhas
              ? Promise.resolve({ data: linhas, error: null })
              : { single: jest.fn().mockResolvedValue({ data: { id: 'sessao-1' }, error: null }) }
          ),
          // biome-ignore lint/suspicious/noThenProperty: insert sem select é awaitado direto
          then: (aceita: (v: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(aceita),
        };
      }),
    };
  });

  const gravadoEm = (tabela: string) => gravados.find((g) => g.tabela === tabela)?.payload;
  return { tabelas, gravadoEm };
}

function consentimento(consentiu: boolean) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: consentiu
        ? { given_at: '2026-08-01T00:00:00Z', revoked_at: null, policy_version: POLICY_VERSION }
        : null,
      error: null,
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('gravarSessaoDeForca', () => {
  const sessao = {
    workoutId: 'w1',
    studentId: 's1',
    startedAt: '2026-09-13T10:00:00Z',
    completedAt: '2026-09-13T11:00:00Z',
    perceivedExertion: 7,
    items: [
      {
        workoutExerciseId: 'we-1',
        exerciseId: 'ex-remada',
        sets: [
          { reps_actual: 10, weight_actual: 40, completed: true },
          { reps_actual: 8, weight_actual: 42.5, completed: true },
        ],
      },
    ],
  };

  it('grava a PSE pelo nome da coluna', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeForca(sessao, DO_ALUNO);

    expect(gravadoEm('workout_sessions')).toMatchObject({
      perceived_exertion: 7,
      session_type: 'strength',
    });
  });

  // Até a 0023 a sessão terminava num JSON invisível para as métricas: o aluno
  // treinava e o gráfico não mexia.
  it('grava uma linha por série executada, com carga e repetição', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeForca(sessao, DO_ALUNO);

    const series = gravadoEm('workout_session_sets') as Record<string, unknown>[];
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ set_index: 0, reps_actual: 10, weight_actual: 40 });
    expect(series[1]).toMatchObject({ set_index: 1, weight_actual: 42.5 });
  });

  // Regressão: a tela antiga gravava só o exercício da prescrição, e a análise
  // de carga do Progresso — que agrupa pelo do catálogo — ficava vazia.
  it('grava o exercício do catálogo junto do da prescrição', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeForca(sessao, DO_ALUNO);

    expect(gravadoEm('workout_session_exercises')).toEqual([
      expect.objectContaining({ workout_exercise_id: 'we-1', exercise_id: 'ex-remada' }),
    ]);
  });

  it('não grava nada quando o especialista está na visão do aluno', async () => {
    supabaseQueRegistra({ consentiu: true });

    const id = await gravarSessaoDeForca(sessao, { mascarado: true });

    expect(id).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('descarta as observações sem consentimento e grava o resto', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: false });

    await gravarSessaoDeForca({ ...sessao, notes: 'senti o ombro' }, DO_ALUNO);

    expect(gravadoEm('workout_sessions')).toMatchObject({ notes: null, perceived_exertion: 7 });
  });

  it('propaga a falha para a tela dizer que não salvou', async () => {
    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
    }));

    await expect(gravarSessaoDeForca(sessao, DO_ALUNO)).rejects.toThrow();
  });
});

describe('gravarSessaoDeCardio', () => {
  const corrida = {
    studentId: 's1',
    exerciseName: 'Corrida',
    durationSeconds: 1800,
    calories: 300.4,
    startedAt: '2026-09-13T10:00:00Z',
    completedAt: '2026-09-13T10:30:00Z',
  };

  // Antes da `0035` o cardio criava uma linha em `workouts` com o id do ALUNO
  // em `specialist_id`, e a prescrição órfã sumia das telas do especialista.
  it('grava cardio sem tocar em `workouts` e sem prescrição', async () => {
    const { tabelas, gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeCardio(corrida, DO_ALUNO);

    expect(tabelas).not.toContain('workouts');
    expect(gravadoEm('workout_sessions')).toMatchObject({
      workout_id: null,
      session_type: 'cardio',
      activity_name: 'Corrida',
      duration_seconds: 1800,
      active_calories: 300,
    });
  });

  // `notes || <resumo gerado>` fazia os dois nunca coexistirem.
  it('guarda em `notes` só o que o aluno digitou, nunca o resumo gerado', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeCardio({ ...corrida, notes: 'senti dor no joelho' }, DO_ALUNO);

    expect(gravadoEm('workout_sessions')).toMatchObject({
      notes: 'senti dor no joelho',
      duration_seconds: 1800,
    });
  });

  it('grava distância, ritmo e cadência da corrida na própria sessão', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeCardio(
      { ...corrida, distanceMeters: 9620, avgPaceSecondsPerKm: 374, avgCadenceSpm: 179 },
      DO_ALUNO
    );

    expect(gravadoEm('workout_sessions')).toMatchObject({
      distance_meters: 9620,
      avg_pace_seconds_per_km: 374,
      avg_cadence_spm: 179,
    });
  });

  // Zero diria que o aluno ficou parado; sem leitura de GPS é nulo.
  it('grava a corrida sem as medidas quando não houve leitura de GPS', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeCardio(corrida, DO_ALUNO);

    expect(gravadoEm('workout_sessions')).toMatchObject({
      distance_meters: null,
      avg_pace_seconds_per_km: null,
      avg_cadence_spm: null,
    });
  });

  // A FC é Art. 11 e a sessão é execução de contrato: por isso ela vai para a
  // tabela cuja política soma vínculo e consentimento (migration `0049`).
  it('grava a frequência cardíaca em tabela própria, não na sessão', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeCardio({ ...corrida, avgHeartRate: 164 }, DO_ALUNO);

    expect(gravadoEm('workout_session_vitals')).toEqual({
      session_id: 'sessao-1',
      avg_heart_rate: 164,
    });
    expect(gravadoEm('workout_sessions')).not.toHaveProperty('avg_heart_rate');
  });

  it('não perde a corrida quando a gravação do batimento falha', async () => {
    const { tabelas } = supabaseQueRegistra({ consentiu: true });
    const registrar = mockSupabase.from.getMockImplementation();
    if (!registrar) throw new Error('o supabase falso não instalou a implementação do from');
    mockSupabase.from.mockImplementation((tabela: string) =>
      tabela === 'workout_session_vitals'
        ? { insert: jest.fn().mockResolvedValue({ error: { message: 'boom' } }) }
        : registrar(tabela)
    );

    await expect(
      gravarSessaoDeCardio({ ...corrida, avgHeartRate: 164 }, DO_ALUNO)
    ).resolves.toBeUndefined();
    expect(tabelas).toContain('workout_sessions');
  });

  // A RLS impede o especialista de LER; este portão impede o app de GRAVAR.
  it('não grava a frequência cardíaca sem consentimento vigente', async () => {
    const { tabelas, gravadoEm } = supabaseQueRegistra({ consentiu: false });

    await gravarSessaoDeCardio({ ...corrida, avgHeartRate: 164 }, DO_ALUNO);

    expect(tabelas).not.toContain('workout_session_vitals');
    expect(gravadoEm('workout_sessions')).toMatchObject({ session_type: 'cardio' });
  });

  it('não grava linha de batimento quando o relógio não mediu', async () => {
    const { tabelas } = supabaseQueRegistra({ consentiu: true });

    await gravarSessaoDeCardio({ ...corrida, avgHeartRate: null }, DO_ALUNO);

    expect(tabelas).not.toContain('workout_session_vitals');
  });

  // Sem esta asserção, o "Agora não" do `HealthDataConsentGate` seria um botão
  // que não muda nada.
  it('descarta as observações quando não há consentimento vigente', async () => {
    const { gravadoEm } = supabaseQueRegistra({ consentiu: false });

    await gravarSessaoDeCardio({ ...corrida, notes: 'voltei da cirurgia' }, DO_ALUNO);

    expect(gravadoEm('workout_sessions')).toMatchObject({
      notes: null,
      session_type: 'cardio',
      duration_seconds: 1800,
    });
  });
});
