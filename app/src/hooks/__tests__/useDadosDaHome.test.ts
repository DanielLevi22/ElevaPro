import { renderHook, waitFor } from '@testing-library/react-native';
import { sugerirTreino, useDadosDaHome } from '@/hooks/useDadosDaHome';
import type { Workout } from '@/modules/workout';

/**
 * Comportamento da composição da tela inicial.
 *
 * As fontes são outros módulos e o banco; o que se prova aqui é o que o hook
 * decide sobre elas: quem busca o quê conforme o papel, que o perfil vem pelo
 * serviço compartilhado com as colunas mínimas, e qual treino vira sugestão.
 */

const mockPapel = { atual: 'student' as 'student' | 'specialist' };
const mockTreinos = { atual: [] as unknown[] };

const mockBuscarDoDia = jest.fn().mockResolvedValue(undefined);
const mockBuscarTreinos = jest.fn().mockResolvedValue(undefined);
const mockBuscarAlunos = jest.fn().mockResolvedValue(undefined);
const mockRecarregarSaude = jest.fn().mockResolvedValue(undefined);
const mockReloadActivity = jest.fn().mockResolvedValue(undefined);
const mockActivityOf = jest.fn();
const mockResumoDoPerfil = jest
  .fn()
  .mockResolvedValue({ id: 'u1', full_name: 'Ana Souza', avatar_url: null });
const mockBuscarBriefing = jest.fn().mockResolvedValue({
  signals: [],
  stats: { activeStudents: 0, workoutTemplates: 0, activeDietPlans: 0, aiSessions: 0 },
});
const mockBuscarAderencia = jest.fn().mockResolvedValue(null);

jest.mock('@elevapro/supabase', () => ({ supabase: {} }));

// O hook cria o serviço na importação, antes deste arquivo inicializar o mock:
// a chamada precisa ler os mocks na hora, e não capturá-los.
jest.mock('@elevapro/shared', () => ({
  // As regras puras (contagem de exercícios) valem de verdade; só o serviço,
  // que falaria com o banco, é trocado.
  ...jest.requireActual('@elevapro/shared'),
  createAuthService: () => ({
    getProfileSummary: (id: string) => mockResumoDoPerfil(id),
  }),
  createBriefingService: () => ({
    fetchBriefing: (id: string) => mockBuscarBriefing(id),
  }),
  createAdherenceService: () => ({
    fetchAdherence: (id: string, hoje: string) => mockBuscarAderencia(id, hoje),
  }),
}));

// O foco dispara na montagem; no teste, montar é focar.
jest.mock('expo-router', () => ({
  useFocusEffect: (efeito: () => void) => require('react').useEffect(efeito, [efeito]),
}));

jest.mock('@/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'u1' },
    accountType: mockPapel.atual,
    isMasquerading: false,
  }),
}));

jest.mock('@/modules/gamification', () => ({
  useGamificationStore: () => ({
    dailyGoal: null,
    streak: null,
    showConfetti: false,
    isLoading: false,
    fetchDailyData: mockBuscarDoDia,
  }),
}));

jest.mock('@/modules/students', () => ({
  useStudentStore: () => ({ students: [], fetchStudents: mockBuscarAlunos, isLoading: false }),
}));

jest.mock('@/modules/workout', () => ({
  useWorkoutStore: () => ({
    workouts: mockTreinos.atual,
    fetchWorkouts: mockBuscarTreinos,
    isLoading: false,
  }),
}));

jest.mock('@/modules/assessment', () => ({
  useAssessmentStore: () => ({
    anamnesisResponses: { idade: 30, objetivo: 'hipertrofia' },
    isAnamnesisSubmitted: false,
  }),
}));

jest.mock('@/hooks/useHealthData', () => ({
  useHealthData: () => ({
    steps: 0,
    calories: 0,
    sleepMinutes: null,
    source: 'mock',
    refetch: mockRecarregarSaude,
  }),
}));

jest.mock('@/hooks/useDailyActivity', () => ({
  useDailyActivity: (studentId: string | undefined) => {
    mockActivityOf(studentId);
    return { streak: { current: 7, best: 9, toTie: 2 }, reload: mockReloadActivity };
  },
}));

jest.mock('@/utils/dateUtils', () => ({ getLocalDateISOString: () => '2026-09-12' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockPapel.atual = 'student';
  mockTreinos.atual = [];
});

describe('useDadosDaHome', () => {
  it('no aluno busca meta do dia na data local, treinos e saúde — e não alunos', async () => {
    const { result } = renderHook(() => useDadosDaHome());

    await waitFor(() => expect(result.current.aluno.perfil?.full_name).toBe('Ana Souza'));
    expect(mockBuscarDoDia).toHaveBeenCalledWith('2026-09-12');
    expect(mockBuscarTreinos).toHaveBeenCalledWith('u1');
    expect(mockRecarregarSaude).toHaveBeenCalled();
    expect(mockReloadActivity).toHaveBeenCalled();
    expect(mockBuscarAlunos).not.toHaveBeenCalled();
  });

  // A sequência sai da activity calculada, e não de `student_streaks`, que ninguém grava (#312).
  it('no aluno, a sequência é a da activity dele', async () => {
    const { result } = renderHook(() => useDadosDaHome());

    await waitFor(() => expect(result.current.aluno.perfil).not.toBeNull());
    expect(mockActivityOf).toHaveBeenCalledWith('u1');
    expect(result.current.aluno.streakDays).toBe(7);
  });

  it('no especialista busca alunos e treinos — e não a meta do dia de aluno', async () => {
    mockPapel.atual = 'specialist';
    const { result } = renderHook(() => useDadosDaHome());

    await waitFor(() => expect(result.current.especialista.perfil).not.toBeNull());
    expect(mockBuscarAlunos).toHaveBeenCalledWith('u1');
    expect(mockBuscarTreinos).toHaveBeenCalledWith('u1');
    expect(mockBuscarDoDia).not.toHaveBeenCalled();
    expect(mockActivityOf).not.toHaveBeenCalledWith('u1');
    expect(mockReloadActivity).not.toHaveBeenCalled();
  });

  it('pede o perfil ao serviço compartilhado, que traz só nome e avatar', async () => {
    const { result } = renderHook(() => useDadosDaHome());

    await waitFor(() => expect(result.current.aluno.perfil).not.toBeNull());
    expect(mockResumoDoPerfil).toHaveBeenCalledWith('u1');
  });

  it('conta respostas da anamnese sem expor o conteúdo delas', async () => {
    const { result } = renderHook(() => useDadosDaHome());

    await waitFor(() => expect(result.current.aluno.perfil).not.toBeNull());
    expect(result.current.aluno.anamnese).toEqual({ enviada: false, respostas: 2 });
  });

  // O painel precisa dos dois pra mostrar aderência e alertas de IA (issue #332).
  it('no especialista busca briefing e aderência do dia, com a data local', async () => {
    mockPapel.atual = 'specialist';
    mockBuscarAderencia.mockResolvedValueOnce(82);
    const { result } = renderHook(() => useDadosDaHome());

    await waitFor(() => expect(result.current.especialista.perfil).not.toBeNull());
    expect(mockBuscarBriefing).toHaveBeenCalledWith('u1');
    expect(mockBuscarAderencia).toHaveBeenCalledWith('u1', '2026-09-12');
    expect(result.current.especialista.aderenciaMedia).toBe(82);
  });

  it('não sugere treino ao especialista, mesmo com treinos carregados', async () => {
    mockPapel.atual = 'specialist';
    mockTreinos.atual = [{ id: 't1', title: 'Costas', exercises_count: 6 }];
    const { result } = renderHook(() => useDadosDaHome());

    await waitFor(() => expect(result.current.especialista.perfil).not.toBeNull());
    expect(result.current.aluno.treinoSugerido).toBeNull();
  });
});

describe('sugerirTreino', () => {
  /** Um treino completo no tipo, com só o que o caso muda. */
  const umTreino = (parcial: Partial<Workout> = {}): Workout => ({
    id: 't1',
    specialist_id: 'e1',
    student_id: 'u1',
    training_plan_id: null,
    title: 'Costas & Bíceps',
    description: null,
    muscle_group: 'Costas',
    difficulty: null,
    day_of_week: null,
    created_at: '2026-09-01',
    updated_at: '2026-09-01',
    ...parcial,
  });

  it('usa a contagem que a consulta trouxe', () => {
    expect(sugerirTreino([umTreino({ exercises_count: 6 })])?.exercicios).toBe(6);
  });

  it('conta a lista de exercícios quando veio a lista e não a contagem', () => {
    const exercicios = [{}, {}, {}] as Workout['exercises'];
    expect(sugerirTreino([umTreino({ exercises: exercicios })])?.exercicios).toBe(3);
  });

  it('não inventa zero quando não sabe quantos exercícios há', () => {
    expect(sugerirTreino([umTreino()])?.exercicios).toBeUndefined();
  });

  it('não sugere nada quando não há treino', () => {
    expect(sugerirTreino([])).toBeNull();
  });
});
