import { render } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassScreen } from '../GlassScreen';
import { TelaDeVidroComFoto } from '../TelaDeVidroComFoto';

/**
 * O fim da rolagem das telas de vidro acompanha a faixa do sistema.
 *
 * A tab bar cresce com o `inset` do aparelho, e o espaço no fim da rolagem era
 * classe fixa. Com os três botões do Android (inset ~48) o último cartão ficava
 * atrás da barra; com gestos a sobra escondia o defeito (#351).
 */

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'dark' }),
  colorScheme: { set: jest.fn() },
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 800, scale: 3, fontScale: 1 }),
}));

function mockNativo(testID: string) {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return (props: object) => createElement(View, { ...props, testID });
}
jest.mock('expo-blur', () => ({
  BlurView: mockNativo('blur'),
  BlurTargetView: mockNativo('alvo-do-blur'),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: mockNativo('gradiente') }));

const INSET_DOS_TRES_BOTOES = 48;
const FOTO = { uri: 'https://exemplo.test/foto.jpg' };

function fimDaRolagem(tela: React.ReactElement, insetDoSistema: number): number {
  jest.mocked(useSafeAreaInsets).mockReturnValue({
    top: 0,
    right: 0,
    left: 0,
    bottom: insetDoSistema,
  });
  const { UNSAFE_getByType } = render(tela);
  return UNSAFE_getByType(ScrollView).props.contentContainerStyle.paddingBottom;
}

function crescimento(tela: React.ReactElement): number {
  return fimDaRolagem(tela, INSET_DOS_TRES_BOTOES) - fimDaRolagem(tela, 0);
}

describe('fim da rolagem das telas de vidro', () => {
  it.each([
    ['tab', 'tab'],
    ['barra de duas ações', 'actionBar'],
  ] as const)('a GlassScreen com %s cresce o inset dos três botões', (_, bottomSpace) => {
    const tela = (
      <GlassScreen bottomSpace={bottomSpace}>
        <Text>cartão</Text>
      </GlassScreen>
    );

    expect(crescimento(tela)).toBe(INSET_DOS_TRES_BOTOES);
  });

  it.each([
    ['tab', 'tab'],
    ['botão fixo', 'fixedButton'],
  ] as const)('a TelaDeVidroComFoto com %s cresce o inset dos três botões', (_, bottomSpace) => {
    const tela = (
      <TelaDeVidroComFoto image={FOTO} bottomSpace={bottomSpace}>
        <Text>cartão</Text>
      </TelaDeVidroComFoto>
    );

    expect(crescimento(tela)).toBe(INSET_DOS_TRES_BOTOES);
  });

  it('o botão fixo pede mais espaço que a tab bar sozinha', () => {
    const soAbas = fimDaRolagem(<GlassScreen bottomSpace="tab">{null}</GlassScreen>, 0);
    const comBarra = fimDaRolagem(<GlassScreen bottomSpace="actionBar">{null}</GlassScreen>, 0);

    expect(comBarra).toBeGreaterThan(soAbas);
  });
});
