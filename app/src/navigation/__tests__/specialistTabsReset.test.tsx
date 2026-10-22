import type { Session } from '@supabase/supabase-js';
import { router, Stack } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { act } from 'react';
import { Text } from 'react-native';
import TabLayout from '@/app/(tabs)/_layout';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';

/**
 * Na barra do especialista, voltar a uma aba abre a lista dela, e não a tela
 * funda em que ele saiu (#437).
 *
 * Cada aba guardava a própria pilha: do detalhe do aluno ao Painel e de volta,
 * a aba Alunos reabria no detalhe; o mesmo na fase do treino e no plano de
 * dieta.
 */

// O `jest.setup.ts` troca o expo-router por um mock de `useRouter`; aqui a
// navegação é o que está sob teste, e precisa ser a de verdade.
jest.unmock('expo-router');
// O mock global da área segura não tem os contextos que as abas do roteador leem.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

// A barra do app tem desenho, gesto e ícone, fora do que está sob teste: aqui ela
// só troca de aba pelo nome da rota. O que está sob teste é o layout das abas.
jest.mock('@/components/navigation/TabBar', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    TabBar: ({ state, navigateToTab }: BottomTabBarProps) => (
      <View>
        {state.routes.map((route) => (
          <Pressable key={route.key} onPress={() => navigateToTab(route.key)}>
            <Text>{`aba ${route.name}`}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

/** A pilha da aba que sai só desce ao topo quando a transição de aba termina. */
async function leaveTab() {
  await fireEvent.press(screen.getByText('aba index'));
  // O `renderRouter` liga o relógio falso: a animação só termina com ele andando.
  await act(() => jest.runAllTimers());
}

function stackWithAnchor() {
  return { default: () => <Stack />, unstable_settings: { anchor: 'index' } };
}

async function openAs(accountType: 'specialist' | 'member') {
  useAuthStore.setState({
    accountType,
    isMasquerading: false,
    user: { id: 'u1' } as Session['user'],
  });
  await renderRouter(
    {
      '(tabs)/_layout': TabLayout,
      '(tabs)/index': () => <Text>tela do painel</Text>,
      '(tabs)/students/_layout': stackWithAnchor(),
      '(tabs)/students/index': () => <Text>lista de alunos</Text>,
      '(tabs)/students/[id]/index': () => <Text>detalhe do aluno</Text>,
      '(tabs)/workouts/_layout': stackWithAnchor(),
      '(tabs)/workouts/index': () => <Text>lista de treinos</Text>,
      '(tabs)/workouts/periodizations/[id]/index': () => <Text>fase do treino</Text>,
      '(tabs)/nutrition/_layout': stackWithAnchor(),
      '(tabs)/nutrition/index': () => <Text>lista de planos</Text>,
      '(tabs)/nutrition/[id]': () => <Text>plano de dieta</Text>,
    },
    { initialUrl: '/' }
  );
}

describe('barra do especialista', () => {
  it.each([
    ['aba students', ROUTES.STUDENTS.DETAILS('aluno-1'), 'detalhe do aluno', 'lista de alunos'],
    [
      'aba workouts',
      ROUTES.WORKOUTS.PERIODIZATION('ciclo-1'),
      'fase do treino',
      'lista de treinos',
    ],
    ['aba nutrition', ROUTES.NUTRITION.PLAN('plano-1'), 'plano de dieta', 'lista de planos'],
  ])('sair de %s pelo Painel e voltar abre a lista', async (aba, funda, telaFunda, lista) => {
    await openAs('specialist');
    await fireEvent.press(screen.getByText(aba));
    await act(() => router.push(funda));
    expect(screen.getByText(telaFunda)).toBeTruthy();

    await leaveTab();
    await fireEvent.press(screen.getByText(aba));

    expect(screen.getByText(lista)).toBeTruthy();
    expect(screen.queryByText(telaFunda)).toBeNull();
  });
});

describe('barra do aluno', () => {
  // A sessão de treino mora na pilha de Treinos e segura a saída: trocar de aba
  // no meio dela não pode derrubá-la.
  it('sair de Treinos e voltar mantém a tela em que estava', async () => {
    await openAs('member');
    await fireEvent.press(screen.getByText('aba workouts'));
    await act(() => router.push(ROUTES.WORKOUTS.PERIODIZATION('ciclo-1')));

    await leaveTab();
    await fireEvent.press(screen.getByText('aba workouts'));

    expect(screen.getByText('fase do treino')).toBeTruthy();
  });
});
