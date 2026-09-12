import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { coresDoTema } from '@/shared/design';
import { AlvoDoVidro } from '../AlvoDoVidro';
import { Anel } from '../Anel';
import { Vidro } from '../Vidro';

/**
 * Contrato das primitivas de vidro.
 *
 * Vale a divisão de `primitivas.test.tsx`: cor por `className` não é observável
 * sob o Jest. O que se prova aqui é a geometria do anel — que é aritmética, não
 * estilo — e as cores que os componentes resolvem à mão.
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

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
  BlurTargetView: 'BlurTargetView',
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

const escuro = coresDoTema('escuro');
const claro = coresDoTema('claro');

beforeEach(() => {
  mockEsquema = 'dark';
});

/** O traço preenchido é o primeiro número do `strokeDasharray`. */
function traçoPreenchido(arvore: ReturnType<typeof render>): number {
  const arcos = arvore.UNSAFE_getAllByType(Circle);
  const [preenchido] = String(arcos[1].props.strokeDasharray).split(' ');
  return Number.parseFloat(preenchido);
}

function perimetro(arvore: ReturnType<typeof render>): number {
  const arcos = arvore.UNSAFE_getAllByType(Circle);
  const [, volta] = String(arcos[1].props.strokeDasharray).split(' ');
  return Number.parseFloat(volta);
}

describe('Anel', () => {
  const anel = (props: Partial<React.ComponentProps<typeof Anel>> = {}) =>
    render(<Anel valor={68} meta={100} rotulo="68%" {...props} />);

  it('anuncia o progresso ao leitor de tela, e não só à vista', () => {
    // O `ProgressCard` tinha o papel sem `accessible` e não era anunciado; o
    // teste só achou porque procurou o papel. Aqui a lição já vem aplicada.
    const { getByRole } = anel({ sub: 'Meta do dia' });

    expect(getByRole('progressbar').props.accessibilityValue).toMatchObject({
      min: 0,
      max: 100,
      now: 68,
      text: '68% Meta do dia',
    });
  });

  it('preenche o traço na fração do valor', () => {
    const arvore = anel({ valor: 25, meta: 100 });

    expect(traçoPreenchido(arvore) / perimetro(arvore)).toBeCloseTo(0.25, 4);
  });

  it('trata meta zerada como cumprida, e não como divisão por zero', () => {
    const arvore = anel({ valor: 0, meta: 0 });

    expect(traçoPreenchido(arvore) / perimetro(arvore)).toBeCloseTo(1, 4);
  });

  it('não passa da volta completa quando a pessoa excede a meta', () => {
    const arvore = anel({ valor: 180, meta: 100 });

    expect(traçoPreenchido(arvore) / perimetro(arvore)).toBeCloseTo(1, 4);
  });

  it('começa no topo, e não às três horas', () => {
    // Sem o giro de um quarto de volta o progresso nasceria na direita, o que
    // lê como se já houvesse 25% feito.
    const { UNSAFE_getByType } = anel();

    expect(JSON.stringify(UNSAFE_getByType(Svg).props.style)).toContain('-90deg');
  });

  it('usa o trilho do vidro no arco de fundo, que muda com o tema', () => {
    const arvore = anel();
    expect(arvore.UNSAFE_getAllByType(Circle)[0].props.stroke).toBe(escuro.glassStrong);

    mockEsquema = 'light';
    const noClaro = anel();
    expect(noClaro.UNSAFE_getAllByType(Circle)[0].props.stroke).toBe(claro.glassStrong);
  });

  it('aceita cor de métrica no arco, para o anel de calorias não ser lime', () => {
    const arvore = anel({ cor: escuro.metricaCalorias });

    expect(arvore.UNSAFE_getAllByType(Circle)[1].props.stroke).toBe(escuro.metricaCalorias);
  });

  it('mostra o rótulo que recebeu, e não um derivado do valor', () => {
    // "7h20" de sono não é "7,33"; quem formata é quem sabe a grandeza.
    const { queryByText } = anel({ valor: 440, meta: 480, rotulo: '7h20' });

    expect(queryByText('7h20')).not.toBeNull();
  });
});

describe('Vidro', () => {
  it('preenche com um gradiente vertical, para os dois lados ficarem iguais', () => {
    // O kit usa 160°, e as duas tentativas anteriores de reproduzir a
    // inclinação e o brilho de canto deixaram a lateral direita visivelmente
    // diferente da esquerda — numa lista de dez linhas a assimetria vira o
    // defeito que se vê antes do efeito.
    const { UNSAFE_getAllByType } = render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const preenchimento = UNSAFE_getAllByType('LinearGradient' as never)[0];

    expect(preenchimento.props.start).toEqual({ x: 0.5, y: 0 });
    expect(preenchimento.props.end).toEqual({ x: 0.5, y: 1 });
  });

  it('acompanha o tema no tom do blur', () => {
    const { UNSAFE_getByType, rerender } = render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    expect(UNSAFE_getByType('BlurView' as never).props.tint).toBe('dark');

    mockEsquema = 'light';
    rerender(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    expect(UNSAFE_getByType('BlurView' as never).props.tint).toBe('light');
  });

  it('no modo forte troca o gradiente de três paradas pelo trilho chapado', () => {
    // É o que o kit usa em trilho de progresso e fundo de ícone neutro.
    const { UNSAFE_getAllByType } = render(
      <Vidro forte>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const preenchimento = UNSAFE_getAllByType('LinearGradient' as never)[0];

    expect(preenchimento.props.colors).toEqual([escuro.glassStrong, escuro.glassStrong]);
  });

  it('só põe a linha inferior no escuro, onde o desenho a declara', () => {
    const { rerender, toJSON } = render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const noEscuro = JSON.stringify(toJSON());

    mockEsquema = 'light';
    rerender(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );

    expect(noEscuro.length).toBeGreaterThan(JSON.stringify(toJSON()).length);
  });

  it('entrega o alvo ao blur quando a tela declara um', () => {
    // Sem alvo o `expo-blur` não desfoca nada no Android e volta para
    // `blurMethod: 'none'` — foi assim que o vidro ficou sem blur sem ninguém
    // perceber. O alvo é o contrato que faltava.
    const { UNSAFE_getByType } = render(
      <AlvoDoVidro>
        <Vidro>
          <Text>conteúdo</Text>
        </Vidro>
      </AlvoDoVidro>
    );

    expect(UNSAFE_getByType('BlurView' as never).props.blurTarget).toBeTruthy();
  });

  it('renderiza o conteúdo por cima das camadas', () => {
    const { queryByText } = render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );

    expect(queryByText('conteúdo')).not.toBeNull();
  });
});
