import { fireEvent, render } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { TabBar } from '../TabBar';

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }),
  usePathname: jest.fn(() => '/workouts'),
  useGlobalSearchParams: () => ({}),
}));
// O wrapper do NativeWind para safe-area-context quebra ao envolver os ícones
// sob o mock de jest.setup. Nada aqui depende de como o ícone renderiza.
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MaterialCommunityIcons' }));
// Os ícones do Lucide desenham com os elementos do SVG que o desenho pede, e leem o
// pacote pelas chaves: o mock lista cada elemento como um componente com o nome dele.
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Path: 'Path',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  Line: 'Line',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Rect: 'Rect',
}));
jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => {
      const chain = {
        onStart: () => chain,
        onUpdate: () => chain,
        onEnd: () => chain,
        onFinalize: () => chain,
      };
      return chain;
    },
  },
  // biome-ignore lint/suspicious/noExplicitAny: test mock — passthrough de children
  GestureDetector: ({ children }: any) => children,
}));
jest.mock('../../../modules/auth/store/authStore', () => ({
  useAuthStore: () => ({ accountType: 'student', isMasquerading: false }),
}));

const buildProps = (): BottomTabBarProps => {
  const routes = [
    { key: 'index-1', name: 'index', params: undefined },
    { key: 'workouts-1', name: 'workouts', params: undefined },
    { key: 'progress-1', name: 'progress', params: undefined },
    { key: 'nutrition-1', name: 'nutrition', params: undefined },
    { key: 'saude-1', name: 'saude', params: undefined },
    { key: 'ranking-1', name: 'ranking', params: undefined },
  ];

  return {
    state: { index: 0, routes },
    descriptors: Object.fromEntries(routes.map((r) => [r.key, { options: {} }])),
    navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    // biome-ignore lint/suspicious/noExplicitAny: props reais do navigator têm superfície grande demais para o teste
  } as any;
};

/**
 * A barra é desenhada num container que ocupa a largura inteira da tela e a
 * faixa toda do rodapé, mas só os 92% centrais são visíveis. Sem
 * `pointerEvents="box-none"` esse container captura o toque na faixa inteira,
 * e qualquer botão flutuante que a tela ponha no rodapé fica visível e inerte
 * — foi o que aconteceu com o "Iniciar Treino" de `WorkoutDetailsScreen`.
 */
describe('TabBar', () => {
  beforeEach(() => {
    jest.requireMock('expo-router').usePathname.mockReturnValue('/workouts');
  });

  it('o aluno tem a aba Saúde, que abre a saúde e o relógio', () => {
    const props = buildProps();
    const { getByLabelText } = render(<TabBar {...props} />);

    fireEvent.press(getByLabelText('Saúde'));

    expect(props.navigation.navigate).toHaveBeenCalledWith('saude', undefined);
  });

  // As métricas ganharam aba própria (#312): antes só se chegava a elas pela tela inicial.
  it('o aluno tem a aba Progresso, que abre as métricas', () => {
    const props = buildProps();
    const { getByLabelText } = render(<TabBar {...props} />);

    fireEvent.press(getByLabelText('Progresso'));

    expect(props.navigation.navigate).toHaveBeenCalledWith('progress', undefined);
  });

  it('não captura toque fora da barra visível', () => {
    const tree = render(<TabBar {...buildProps()} />).toJSON();

    expect(tree).not.toBeNull();
    expect(Array.isArray(tree) ? tree[0].props : tree?.props).toMatchObject({
      pointerEvents: 'box-none',
    });
  });

  it('some nas telas antigas de detalhe, que desenham o próprio rodapé', () => {
    const { usePathname } = jest.requireMock('expo-router');
    usePathname.mockReturnValue('/students/aluno-1/workouts/details/abc-123');

    expect(render(<TabBar {...buildProps()} />).toJSON()).toBeNull();
  });

  // O kit desenha a sessão com a tab bar embaixo e o botão fixo acima dela.
  it('continua na sessão de treino do aluno, como no kit', () => {
    const { usePathname } = jest.requireMock('expo-router');
    usePathname.mockReturnValue('/workouts/execute/abc-123');

    expect(render(<TabBar {...buildProps()} />).toJSON()).not.toBeNull();
  });

  it('some quando a rota pede tabBarStyle display none', () => {
    const props = buildProps();
    // biome-ignore lint/suspicious/noExplicitAny: options do navigator
    (props.descriptors['index-1'] as any).options = { tabBarStyle: { display: 'none' } };

    expect(render(<TabBar {...props} />).toJSON()).toBeNull();
  });
});
