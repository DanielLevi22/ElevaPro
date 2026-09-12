import { render } from '@testing-library/react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native';
import { coresDoTema } from '@/shared/design';
import { Button } from '../Button';
import { Group } from '../Group';
import { Input } from '../Input';

/**
 * Contrato das primitivas do design system.
 *
 * ## O que este arquivo pode provar, e o que não pode
 *
 * O NativeWind **não resolve o CSS sob o Jest**: `className` é consumido e o
 * `style` que sobra vem vazio. Então cor que chega por classe não é observável
 * aqui — e afirmar que ela está certa seria um teste que passa sem olhar nada.
 *
 * Quem garante essa metade é o seam do módulo de tokens: `global.css` é gerado
 * de `tokens.ts` e o teste de lá falha se os dois divergirem, nos dois temas.
 *
 * O que sobra para cá é a metade que aquele teste não alcança e onde o defeito
 * de tema realmente mora: a cor que o componente resolve **à mão**, via
 * `useCores`, para as props que não aceitam classe — `placeholderTextColor`,
 * `color` de ícone, cor do `ActivityIndicator`. Cada uma dessas é uma decisão
 * escrita no componente, e cada uma pode estar presa no tema errado.
 */

let mockEsquema: 'light' | 'dark' = 'dark';

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: mockEsquema }),
  colorScheme: { set: jest.fn() },
}));

/**
 * A janela fica fixa na largura do desenho (390pt) para o teste afirmar as
 * medidas do desenho, e não o resultado do fator de escala do aparelho de quem
 * roda a suíte. O fator em si tem teste próprio, em `tokens.test.ts`.
 */
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 800, scale: 3, fontScale: 1 }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const escuro = coresDoTema('escuro');
const claro = coresDoTema('claro');

beforeEach(() => {
  mockEsquema = 'dark';
});

describe('Button', () => {
  it('anuncia o próprio rótulo, sem pedir o texto duas vezes ao call site', () => {
    const { getByRole } = render(<Button label="Entrar" onPress={jest.fn()} />);

    expect(getByRole('button').props.accessibilityLabel).toBe('Entrar');
  });

  it('troca o rótulo pelo indicador enquanto carrega, e marca `busy`', () => {
    const { queryByText, getByRole } = render(
      <Button label="Entrar" onPress={jest.fn()} isLoading />
    );

    expect(queryByText('Entrar')).toBeNull();
    expect(getByRole('button').props.accessibilityState).toMatchObject({ busy: true });
  });

  it('bloqueia o toque quando carrega, e não só quando está desabilitado', () => {
    const aoTocar = jest.fn();
    const { getByRole } = render(<Button label="Entrar" onPress={aoTocar} isLoading />);

    expect(getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it.each([
    ['primary', 'primaryForeground'],
    ['secondary', 'secondaryForeground'],
    ['destructive', 'destructiveForeground'],
    ['tinted', 'foreground'],
  ] as const)('pinta o indicador de %s com a cor de contraste da variante', (variant, token) => {
    const { UNSAFE_getByType } = render(
      <Button label="Entrar" onPress={jest.fn()} variant={variant} isLoading />
    );
    const indicador = UNSAFE_getByType(ActivityIndicator);

    expect(indicador.props.color).toBe(escuro[token]);
  });

  it('acompanha o tema na cor do indicador', () => {
    mockEsquema = 'light';
    const { UNSAFE_getByType } = render(<Button label="Entrar" onPress={jest.fn()} isLoading />);
    const indicador = UNSAFE_getByType(ActivityIndicator);

    expect(indicador.props.color).toBe(claro.primaryForeground);
    expect(indicador.props.color).not.toBe(escuro.primaryForeground);
  });
});

describe('Group', () => {
  const tresLinhas = (
    <Group>
      <Text>uma</Text>
      <Text>duas</Text>
      <Text>três</Text>
    </Group>
  );

  it('mostra cabeçalho e rodapé só quando recebe cada um', () => {
    const { queryByText, rerender } = render(<Group>{<Text>linha</Text>}</Group>);
    expect(queryByText('Dados pessoais')).toBeNull();

    rerender(
      <Group header="Dados pessoais" footer="Mínimo 8 caracteres.">
        <Text>linha</Text>
      </Group>
    );
    expect(queryByText('Dados pessoais')).not.toBeNull();
    expect(queryByText('Mínimo 8 caracteres.')).not.toBeNull();
  });

  it('mantém as linhas na ordem em que chegaram', () => {
    const { getAllByText } = render(tresLinhas);

    expect(getAllByText(/uma|duas|três/).map((no) => no.props.children)).toEqual([
      'uma',
      'duas',
      'três',
    ]);
  });
});

describe('Input', () => {
  it('usa a cor de placeholder do tema, e não a de texto', () => {
    const { UNSAFE_getByType } = render(<Input placeholder="seu@email.com" />);
    const campo = UNSAFE_getByType(TextInput);

    expect(campo.props.placeholderTextColor).toBe(escuro.placeholder);
    expect(campo.props.placeholderTextColor).not.toBe(escuro.foreground);
  });

  it('acompanha o tema no placeholder', () => {
    mockEsquema = 'light';
    const { UNSAFE_getByType } = render(<Input placeholder="seu@email.com" />);
    const campo = UNSAFE_getByType(TextInput);

    expect(campo.props.placeholderTextColor).toBe(claro.placeholder);
  });

  it('pinta o ícone com a cor secundária de texto, como no desenho', () => {
    const { UNSAFE_getByType } = render(<Input icon="mail" placeholder="seu@email.com" />);
    const icone = UNSAFE_getByType('Ionicons' as never);

    expect(icone.props.color).toBe(escuro.mutedForeground);
    expect(icone.props.size).toBe(19);
  });

  it('renderiza a ação à direita que o call site passar', () => {
    const { queryByText } = render(<Input trailing={<Text>olho</Text>} />);

    expect(queryByText('olho')).not.toBeNull();
  });

  it('mostra o erro quando recebe, e nada quando não recebe', () => {
    const { queryByText, rerender } = render(<Input />);
    expect(queryByText('E-mail inválido')).toBeNull();

    rerender(<Input error="E-mail inválido" />);
    expect(queryByText('E-mail inválido')).not.toBeNull();
  });
});
