import { router, Stack, Tabs } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { act } from 'react';
import { Text } from 'react-native';
import { ROUTES } from '@/navigation/types';

/**
 * A Nova periodização aberta a partir de um aluno fecha de volta na pilha de
 * Alunos (#437).
 *
 * A folha morava só na aba Treinos. Aberta do convite ou dos treinos do aluno,
 * ela subia por cima do que a aba Treinos guardava — a periodização de outro
 * aluno, aberta antes — e o Voltar caía lá.
 */

// O `jest.setup.ts` troca o expo-router por um mock de `useRouter`; aqui a
// navegação é o que está sob teste, e precisa ser a de verdade.
jest.unmock('expo-router');
// O mock global da área segura não tem os contextos que as abas do roteador leem.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

async function openApp() {
  await renderRouter(
    {
      '(tabs)/_layout': () => (
        <Tabs tabBar={() => null}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="students" />
          <Tabs.Screen name="workouts" />
        </Tabs>
      ),
      '(tabs)/index': () => <Text>painel</Text>,
      '(tabs)/students/_layout': {
        default: () => <Stack />,
        unstable_settings: { anchor: 'index' },
      },
      '(tabs)/students/index': () => <Text>lista de alunos</Text>,
      '(tabs)/students/create': () => <Text>convite enviado</Text>,
      '(tabs)/students/[id]/workouts/index': () => <Text>treinos do aluno</Text>,
      '(tabs)/students/[id]/workouts/new': () => <Text>nova periodização</Text>,
      '(tabs)/workouts/_layout': () => <Stack />,
      '(tabs)/workouts/index': () => <Text>aba treinos</Text>,
      '(tabs)/workouts/periodization-form': () => <Text>nova periodização</Text>,
      '(tabs)/workouts/periodizations/[id]/index': () => <Text>periodização de outro aluno</Text>,
    },
    { initialUrl: '/' }
  );
  // O que reproduz o bug: a aba Treinos já guarda o treino de outro aluno.
  await act(() => router.push(ROUTES.WORKOUTS.PERIODIZATION('outro-ciclo')));
  expect(screen.getByText('periodização de outro aluno')).toBeTruthy();
}

describe('Nova periodização aberta a partir do aluno', () => {
  it('pelo Montar treino do convite, voltar chega aos Alunos', async () => {
    await openApp();
    // O cadastro sempre tem a lista por baixo: pela aba, ou pelo Painel com âncora.
    await act(() => router.navigate(ROUTES.STUDENTS.ROOT));
    await act(() => router.push(ROUTES.STUDENTS.CREATE));
    await act(() => router.replace(ROUTES.STUDENTS.PERIODIZATION_NEW('aluno-1', 'Ana')));
    expect(screen.getByText('nova periodização')).toBeTruthy();

    await act(() => router.back());
    expect(screen.getByText('lista de alunos')).toBeTruthy();
  });

  it('pelo + dos treinos do aluno, voltar chega aos treinos dele', async () => {
    await openApp();
    await act(() => router.push(ROUTES.STUDENTS.WORKOUTS('aluno-1')));
    await act(() => router.push(ROUTES.STUDENTS.PERIODIZATION_NEW('aluno-1', 'Ana')));
    expect(screen.getByText('nova periodização')).toBeTruthy();

    await act(() => router.back());
    expect(screen.getByText('treinos do aluno')).toBeTruthy();
  });
});
