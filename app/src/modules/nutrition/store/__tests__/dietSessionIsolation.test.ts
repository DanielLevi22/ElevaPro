import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from '@/auth';
import { useDietWizardStore } from '../dietWizardStore';

beforeEach(() => {
  jest.mocked(getUserContextJWT).mockResolvedValue({
    accountType: 'specialist',
    accountStatus: 'active',
  });
});

// Art. 6°, VII: metas e restrições em memória não podem passar à próxima conta.
it('sair da conta elimina o rascunho local de dieta', async () => {
  const wizard = useDietWizardStore.getState();
  wizard.startFor({
    actorId: 'account-a',
    studentId: 'student-a',
    studentName: 'Pessoa A',
    ownPlan: false,
  });
  wizard.setPreferences({ ...wizard.preferences, dietary_restrictions: ['vegan'] });
  wizard.setTargetCalories(2400);

  await useAuthStore.getState().signOut();

  const remaining = useDietWizardStore.getState();
  if (
    remaining.studentId ||
    remaining.studentName ||
    remaining.preferences.dietary_restrictions.length
  ) {
    throw new Error('DADO ENTRE CONTAS: o rascunho de dieta sobreviveu ao logout');
  }
  expect(remaining.targetCalories).toBe(2000);
});

// Art. 6°, VII: expiração e troca direta de sessão não passam pelo botão Sair.
it.each([
  null,
  { user: { id: 'account-b' } } as Session,
])('mudar a sessão elimina o rascunho antes de carregar o próximo perfil', async (session) => {
  useAuthStore.setState({ user: { id: 'account-a' } as Session['user'], isLoading: false });
  useDietWizardStore.getState().startFor({
    actorId: 'account-a',
    studentId: 'student-a',
    studentName: 'Pessoa A',
    ownPlan: false,
  });
  const transition = useAuthStore.getState().initializeSession(session);
  if (useDietWizardStore.getState().studentId !== null) {
    throw new Error('DADO ENTRE CONTAS: a transição de sessão manteve o rascunho');
  }
  await transition;
});

import { getUserContextJWT } from '@elevapro/supabase';
