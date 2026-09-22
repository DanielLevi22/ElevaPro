import { useWorkoutWizardStore } from '../workoutWizardStore';

describe('workoutWizardStore', () => {
  beforeEach(() => {
    useWorkoutWizardStore.getState().reset();
  });

  // Trocar de aluno no meio de um wizard aberto não pode herdar rascunho do
  // anterior — nome do plano, fase criada, sessão de IA, nada disso é do aluno novo.
  it('limpa o rascunho anterior ao começar para outro aluno', () => {
    const store = useWorkoutWizardStore.getState();
    store.setPlanName('Hipertrofia · Ciclo Verão');
    store.setAiSessionId('sessao-1');
    store.setCreatedStructure('per-1', 'fase-1');

    useWorkoutWizardStore.getState().startFor('aluno-2', 'Ana Rocha');

    const estado = useWorkoutWizardStore.getState();
    expect(estado.studentId).toBe('aluno-2');
    expect(estado.studentName).toBe('Ana Rocha');
    expect(estado.planName).toBe('');
    expect(estado.aiSessionId).toBeNull();
    expect(estado.periodizationId).toBeNull();
    expect(estado.phaseId).toBeNull();
  });

  it('reset volta ao estado inicial', () => {
    const store = useWorkoutWizardStore.getState();
    store.startFor('aluno-1', 'Ana');
    store.setDurationWeeks(16);

    useWorkoutWizardStore.getState().reset();

    const estado = useWorkoutWizardStore.getState();
    expect(estado.studentId).toBeNull();
    expect(estado.durationWeeks).toBe(8);
  });
});
