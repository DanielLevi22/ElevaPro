import { act, renderHook } from '@testing-library/react-native';
import { mockSupabaseBuilder } from '../../../../../jest.setup';
import { useDietWizardStore } from '../../store/dietWizardStore';
import { useDietDraftCreation } from '../useDietDraftCreation';

beforeEach(() => {
  useDietWizardStore
    .getState()
    .startFor({ actorId: 'author', studentId: 'student', studentName: 'Aluno', ownPlan: false });
  mockSupabaseBuilder.insert.mockClear();
  mockSupabaseBuilder.single.mockResolvedValue({ data: { id: 'draft' }, error: null });
});

// Art. 6°, VII: RLS é a última defesa, não substitui a recusa de ação na UI.
it('sem permissão de criar dieta, não tenta gravar nem devolve destino', async () => {
  const { result } = await renderHook(() =>
    useDietDraftCreation({ userId: 'author', canCreate: false })
  );
  let destination: string | null = null;
  await act(async () => {
    destination = await result.current.createDraft();
  });
  if (mockSupabaseBuilder.insert.mock.calls.length || destination) {
    throw new Error('CRIAÇÃO SEM CASL: uma conta sem permissão disparou a gravação');
  }
});

it('dois toques criam um único rascunho', async () => {
  const { result } = await renderHook(() =>
    useDietDraftCreation({ userId: 'author', canCreate: true })
  );
  await act(async () => {
    const first = result.current.createDraft();
    expect(await result.current.createDraft()).toBeNull();
    expect(await first).toBe('draft');
  });
  expect(
    mockSupabaseBuilder.insert.mock.calls.filter(([row]) => row.student_id === 'student')
  ).toHaveLength(1);
  expect(useDietWizardStore.getState().planId).toBe('draft');
});

it('uma gravação atrasada não repopula o wizard de outra sessão', async () => {
  let finish!: (value: unknown) => void;
  mockSupabaseBuilder.single.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const { result } = await renderHook(() =>
    useDietDraftCreation({ userId: 'author', canCreate: true })
  );
  await act(async () => {
    const pending = result.current.createDraft();
    useDietWizardStore.getState().reset();
    finish({ data: { id: 'old-draft' }, error: null });
    expect(await pending).toBeNull();
  });
  expect(useDietWizardStore.getState().planId).toBeNull();
});
