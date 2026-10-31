import { router, Stack, Tabs } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { act, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { ROUTES } from '@/navigation/types';
import { useSessionSummaryExit } from '../useSessionSummaryExit';

/**
 * Do resumo do treino, Concluir cai no início da aba Treinos, venha a sessão
 * de onde vier (#440).
 *
 * A saída era `router.back`: do detalhe, voltava ao "Iniciar treino"; do
 * Início, à tela que a pilha de Treinos guardava; do widget, a lugar nenhum.
 */

// O `jest.setup.ts` troca o expo-router por um mock de `useRouter`; aqui a
// navegação é o que está sob teste, e precisa ser a de verdade.
jest.unmock('expo-router');
// O mock global da área segura não tem os contextos que as abas do roteador leem.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

/** A sessão já no resumo, com a tela de compartilhar: só a saída está sob teste. */
function SessionSummary() {
  const [sharing, setSharing] = useState(false);
  const finish = useSessionSummaryExit(sharing ? () => setSharing(false) : undefined);
  if (sharing) return <Text>tela de compartilhar</Text>;
  return (
    <>
      <Pressable onPress={finish}>
        <Text>Concluir</Text>
      </Pressable>
      <Pressable onPress={() => setSharing(true)}>
        <Text>Compartilhar</Text>
      </Pressable>
    </>
  );
}

async function openApp(initialUrl = '/') {
  await renderRouter(
    {
      '(tabs)/_layout': () => (
        <Tabs tabBar={() => null}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="workouts" />
        </Tabs>
      ),
      '(tabs)/index': () => <Text>tela inicial</Text>,
      '(tabs)/workouts/_layout': () => <Stack />,
      '(tabs)/workouts/index': () => <Text>início de treinos</Text>,
      '(tabs)/workouts/[id]': () => <Text>detalhe do treino</Text>,
      '(tabs)/workouts/periodizations/[id]/index': () => <Text>tela velha</Text>,
      '(tabs)/workouts/execute/[id]': SessionSummary,
    },
    { initialUrl }
  );
}

describe('Concluir no resumo do treino', () => {
  it('aberta pelo detalhe, cai no início de Treinos e não no "Iniciar treino"', async () => {
    await openApp();
    await act(() => router.navigate(ROUTES.TABS.WORKOUTS));
    await act(() => router.push(ROUTES.WORKOUTS.DETAILS('treino-a')));
    await act(() => router.push(ROUTES.WORKOUTS.EXECUTE('treino-a')));

    await fireEvent.press(screen.getByText('Concluir'));

    expect(screen.getByText('início de treinos')).toBeTruthy();
  });

  it('aberta pelo Início, cai no início de Treinos e não na tela velha da pilha', async () => {
    await openApp();
    await act(() => router.navigate(ROUTES.TABS.WORKOUTS));
    await act(() => router.push(ROUTES.WORKOUTS.PERIODIZATION('outro-ciclo')));
    await act(() => router.navigate(ROUTES.TABS.ROOT));
    await act(() => router.push(ROUTES.WORKOUTS.EXECUTE('treino-a')));

    await fireEvent.press(screen.getByText('Concluir'));

    expect(screen.getByText('início de treinos')).toBeTruthy();
  });

  it('aberta pelo widget, sem pilha embaixo, cai no início de Treinos', async () => {
    await openApp('/workouts/execute/treino-a');

    await fireEvent.press(screen.getByText('Concluir'));

    expect(screen.getByText('início de treinos')).toBeTruthy();
  });

  it('o voltar do sistema faz o mesmo que Concluir', async () => {
    await openApp();
    await act(() => router.navigate(ROUTES.TABS.WORKOUTS));
    await act(() => router.push(ROUTES.WORKOUTS.DETAILS('treino-a')));
    await act(() => router.push(ROUTES.WORKOUTS.EXECUTE('treino-a')));

    await act(() => router.back());

    expect(screen.getByText('início de treinos')).toBeTruthy();
  });

  it('na tela de compartilhar, o voltar do sistema volta ao resumo', async () => {
    await openApp();
    await act(() => router.navigate(ROUTES.TABS.WORKOUTS));
    await act(() => router.push(ROUTES.WORKOUTS.EXECUTE('treino-a')));
    await fireEvent.press(screen.getByText('Compartilhar'));

    await act(() => router.back());

    expect(screen.getByText('Concluir')).toBeTruthy();
  });
});
