import type { Briefing } from '@elevapro/shared';
import { router, Stack, Tabs } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { act } from 'react';
import { Text } from 'react-native';
import { SpecialistDashboard } from '@/modules/dashboard/components/SpecialistDashboard';

/**
 * Do Painel para a aba Alunos, voltar chega à lista (#357).
 *
 * O alerta do dia abria o aluno vindo da aba Início, e a pilha da aba Alunos
 * nascia só com a página dele: voltar saía da aba para a tela inicial, e a aba
 * guardava a pilha sem a lista para a próxima visita.
 */

// O `jest.setup.ts` troca o expo-router por um mock de `useRouter`; aqui a
// navegação é o que está sob teste, e precisa ser a de verdade.
jest.unmock('expo-router');
// O mock global da área segura não tem os contextos que as abas do roteador leem.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

const BRIEFING: Briefing = {
  signals: [
    {
      studentId: 'aluno-1',
      studentName: 'Ana Souza',
      kind: 'pending_invite',
      tone: 'warning',
      message: 'Convite aguardando há 3 dias',
      days: 3,
    },
  ],
  stats: { activeStudents: 1, workoutTemplates: 0, activeDietPlans: 0, aiSessions: 0 },
};

function Painel() {
  return (
    <SpecialistDashboard
      profile={{ full_name: 'Bia' }}
      students={[]}
      briefing={BRIEFING}
      averageAdherence={null}
      isLoading={false}
      onRefresh={jest.fn()}
    />
  );
}

async function abrirPainel() {
  await renderRouter(
    {
      // A barra é a do app (`TabBar`), fora do que está sob teste.
      // No expo-router 58, aba não declarada no layout não aparece.
      '(tabs)/_layout': () => (
        <Tabs tabBar={() => null}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="students" />
        </Tabs>
      ),
      '(tabs)/index': Painel,
      // A mesma âncora do layout real: a lista fica por baixo do aluno.
      '(tabs)/students/_layout': {
        default: () => <Stack />,
        unstable_settings: { anchor: 'index' },
      },
      '(tabs)/students/index': () => <Text>lista de alunos</Text>,
      '(tabs)/students/[id]/index': () => <Text>página do aluno</Text>,
      '(tabs)/students/create': () => <Text>cadastro de aluno</Text>,
    },
    { initialUrl: '/' }
  );
}

describe('do Painel para a aba Alunos', () => {
  it.each([
    ['o alerta do dia', 'Ana Souza', 'página do aluno'],
    ['o atalho Novo aluno', 'Novo aluno', 'cadastro de aluno'],
  ])('por %s, voltar chega à lista e não à tela inicial', async (_entrada, toque, destino) => {
    await abrirPainel();

    await fireEvent.press(await screen.findByText(toque));
    expect(screen.getByText(destino)).toBeTruthy();

    await act(() => router.back());
    expect(screen.getByText('lista de alunos')).toBeTruthy();
  });
});
