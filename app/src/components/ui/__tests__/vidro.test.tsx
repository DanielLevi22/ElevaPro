import { render, screen } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { coresDoTema } from '@/shared/design';
import { hostOfType } from '@/testing/hostByType';
import { AlvoDoVidro } from '../AlvoDoVidro';
import { Anel } from '../Anel';
import {
  BRILHO_DA_NUTRICAO,
  BrilhoAmbiente,
  CARDIO_GLOW,
  paradasDoBrilho,
} from '../BrilhoAmbiente';
import { reducaoParaOSigma, Vidro } from '../Vidro';

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

/**
 * Os nativos viram `View` com `testID`, para as consultas serem por id e não
 * por tipo — tipo em string exigia um cast em cada consulta.
 */
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
// Só o `Circle`: o nativo dele recebe as props já convertidas (`stroke` vira
// número, o tracejado vira lista), e o anel é conferido pelo que desenha.
jest.mock('react-native-svg', () => {
  const svg = jest.requireActual('react-native-svg');
  return { ...svg, __esModule: true, default: svg.default, Circle: mockNativo('circulo') };
});

/** Blur e gradiente ficam atrás do conteúdo, fora da árvore de acessibilidade. */
const OCULTOS = { includeHiddenElements: true };

const escuro = coresDoTema('escuro');
const OPACIDADE_DO_KIT_NO_ESCURO = 0.14;
const claro = coresDoTema('claro');

beforeEach(() => {
  mockEsquema = 'dark';
});

/** O traço preenchido é o primeiro número do `strokeDasharray`. */
/**
 * Cada círculo do anel achado pelo papel, e não pela posição: o brilho são
 * camadas empilhadas antes do trilho, e contar índice quebra a cada ajuste nelas.
 */
function circulos() {
  const todos = screen.getAllByTestId('circulo', OCULTOS);
  const trilho = todos.find((c) => c.props.strokeDasharray === undefined);
  const tracejados = todos.filter((c) => c.props.strokeDasharray !== undefined);
  const arco = tracejados.find((c) => c.props.strokeOpacity === undefined);
  const brilho = tracejados.filter((c) => c.props.strokeOpacity !== undefined);
  if (!trilho || !arco) throw new Error('Anel sem trilho ou sem arco');
  return { todos, trilho, arco, brilho };
}

function traçoPreenchido(): number {
  const [preenchido] = String(circulos().arco.props.strokeDasharray).split(' ');
  return Number.parseFloat(preenchido);
}

function perimetro(): number {
  const [, volta] = String(circulos().arco.props.strokeDasharray).split(' ');
  return Number.parseFloat(volta);
}

describe('Anel', () => {
  const anel = (props: Partial<React.ComponentProps<typeof Anel>> = {}) =>
    render(<Anel valor={68} meta={100} rotulo="68%" {...props} />);

  it('anuncia o progresso ao leitor de tela, e não só à vista', async () => {
    // O `ProgressCard` tinha o papel sem `accessible` e não era anunciado; o
    // teste só achou porque procurou o papel. Aqui a lição já vem aplicada.
    const { getByRole } = await anel({ sub: 'Meta do dia' });

    expect(getByRole('progressbar').props.accessibilityValue).toMatchObject({
      min: 0,
      max: 100,
      now: 68,
      text: '68% Meta do dia',
    });
  });

  it('preenche o traço na fração do valor', async () => {
    await anel({ valor: 25, meta: 100 });

    expect(traçoPreenchido() / perimetro()).toBeCloseTo(0.25, 4);
  });

  it('trata meta zerada como cumprida, e não como divisão por zero', async () => {
    await anel({ valor: 0, meta: 0 });

    expect(traçoPreenchido() / perimetro()).toBeCloseTo(1, 4);
  });

  it('não passa da volta completa quando a pessoa excede a meta', async () => {
    await anel({ valor: 180, meta: 100 });

    expect(traçoPreenchido() / perimetro()).toBeCloseTo(1, 4);
  });

  it('começa no topo, e não às três horas', async () => {
    // Sem o giro de um quarto de volta o progresso nasceria na direita, o que
    // lê como se já houvesse 25% feito.
    await anel();

    expect(JSON.stringify(hostOfType('RNSVGSvgView').props.style)).toContain('-90deg');
  });

  it('usa o trilho do vidro no arco de fundo, que muda com o tema', async () => {
    await anel();
    expect(circulos().trilho.props.stroke).toBe(escuro.glassStrong);

    mockEsquema = 'light';
    await anel();
    expect(circulos().trilho.props.stroke).toBe(claro.glassStrong);
  });

  it('aceita cor de métrica no arco, para o anel de calorias não ser lime', async () => {
    await anel({ cor: escuro.metricaCalorias });

    expect(circulos().arco.props.stroke).toBe(escuro.metricaCalorias);
  });

  it('brilha só onde há progresso, na cor do arco e por baixo dele', async () => {
    // O `drop-shadow` do kit é sombra do que está desenhado: o brilho segue o
    // arco, e não a volta inteira. E fica por baixo, ou apagaria o traço.
    await anel({ valor: 25, meta: 100, cor: escuro.metricaCalorias });
    const { todos, arco, brilho } = circulos();

    expect(brilho.length).toBeGreaterThan(0);
    for (const camada of brilho) {
      expect(camada.props.stroke).toBe(escuro.metricaCalorias);
      expect(camada.props.strokeDasharray).toBe(arco.props.strokeDasharray);
      expect(todos.indexOf(camada)).toBeLessThan(todos.indexOf(arco));
    }
  });

  it('esmaece o brilho para fora, sem camada mais forte que a de dentro', async () => {
    await anel();
    const { brilho } = circulos();
    const deFora = [...brilho].sort((a, b) => b.props.strokeWidth - a.props.strokeWidth);
    const opacidades = deFora.map((c) => c.props.strokeOpacity);

    // A mais externa é a exceção admitida: ela carrega a cauda que sobra além
    // dela, e por isso sai um pouco acima da vizinha.
    expect(opacidades.slice(1)).toEqual([...opacidades.slice(1)].sort((a, b) => a - b));
  });

  it('mostra o rótulo que recebeu, e não um derivado do valor', async () => {
    // "7h20" de sono não é "7,33"; quem formata é quem sabe a grandeza.
    const { queryByText } = await anel({ valor: 440, meta: 480, rotulo: '7h20' });

    expect(queryByText('7h20')).not.toBeNull();
  });
});

describe('Vidro', () => {
  it('preenche com um gradiente vertical, para os dois lados ficarem iguais', async () => {
    // O kit usa 160°, e as duas tentativas anteriores de reproduzir a
    // inclinação e o brilho de canto deixaram a lateral direita visivelmente
    // diferente da esquerda — numa lista de dez linhas a assimetria vira o
    // defeito que se vê antes do efeito.
    const { getByTestId } = await render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const preenchimento = getByTestId('gradiente', OCULTOS);

    expect(preenchimento.props.start).toEqual({ x: 0.5, y: 0 });
    expect(preenchimento.props.end).toEqual({ x: 0.5, y: 1 });
  });

  it('acompanha o tema no tom do blur', async () => {
    const { getByTestId, rerender } = await render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    expect(getByTestId('blur', OCULTOS).props.tint).toBe('dark');

    mockEsquema = 'light';
    await rerender(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    expect(getByTestId('blur', OCULTOS).props.tint).toBe('light');
  });

  it('no modo forte troca o gradiente de três paradas pelo trilho chapado', async () => {
    // É o que o kit usa em trilho de progresso e fundo de ícone neutro.
    const { getByTestId } = await render(
      <Vidro forte>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const preenchimento = getByTestId('gradiente', OCULTOS);

    expect(preenchimento.props.colors).toEqual([escuro.glassStrong, escuro.glassStrong]);
  });

  it('só põe a linha inferior no escuro, onde o desenho a declara', async () => {
    const { rerender, toJSON } = await render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const noEscuro = JSON.stringify(toJSON());

    mockEsquema = 'light';
    await rerender(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );

    expect(noEscuro.length).toBeGreaterThan(JSON.stringify(toJSON()).length);
  });

  it('entrega o alvo ao vidro que fica fora do fundo, como na tela', async () => {
    // Sem alvo o `expo-blur` não desfoca nada no Android. A primeira versão
    // deste teste punha o vidro dentro do alvo e passava; na tela o vidro mora
    // na rolagem, irmã do fundo, e ali o contexto chegava `null` nos vinte
    // cartões. O teste agora monta a forma da tela.
    const { getByTestId } = await render(
      <AlvoDoVidro fundo={<Text>foto</Text>}>
        <Vidro>
          <Text>conteúdo</Text>
        </Vidro>
      </AlvoDoVidro>
    );

    expect(getByTestId('blur', OCULTOS).props.blurTarget).toBeTruthy();
  });

  it('não põe o vidro dentro do alvo que ele desfoca', async () => {
    // A biblioteca nativa proíbe: o alvo não pode conter o vidro que o usa.
    const { getByTestId } = await render(
      <AlvoDoVidro fundo={<Text>foto</Text>}>
        <Vidro>
          <Text>conteúdo</Text>
        </Vidro>
      </AlvoDoVidro>
    );
    const alvo = getByTestId('alvo-do-blur', OCULTOS);

    expect(alvo.queryAll((no) => no.props.testID === 'blur')).toHaveLength(0);
  });

  it('não pinta fundo atrás do vidro, para o que está atrás atravessar', async () => {
    // Com `elevation` o Android exigia fundo pintado, e o invólucro levava a
    // cor da tela: o miolo de dois blocos saía no mesmo cinza enquanto a luz
    // ambiente só aparecia no vão entre eles. A sombra agora é `boxShadow`,
    // que não depende de fundo.
    const { toJSON } = await render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const involucro = toJSON() as unknown as { props: { style: Record<string, unknown> } };

    expect(involucro.props.style.backgroundColor).toBeUndefined();
    expect(involucro.props.style.elevation).toBeUndefined();
  });

  it('empilha as duas sombras do kit, larga e de contato', async () => {
    mockEsquema = 'dark';
    const { toJSON } = await render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );
    const involucro = toJSON() as unknown as { props: { style: { boxShadow: object[] } } };

    expect(involucro.props.style.boxShadow).toEqual([
      {
        offsetX: 0,
        offsetY: 10,
        blurRadius: 26,
        spreadDistance: -10,
        color: 'rgba(0, 0, 0, 0.55)',
      },
      { offsetX: 0, offsetY: 2, blurRadius: 6, spreadDistance: -2, color: 'rgba(0, 0, 0, 0.35)' },
    ]);
  });

  it('entrega ao Android o sigma do kit, e não o blur padrão seis vezes mais fraco', () => {
    // Com os padrões do expo-blur (26 / 4, vezes 4 no Dimezis) o raio era 26px:
    // sigma de ~5dp contra os ~30dp do `blur(26px)`, e a foto atravessava o
    // vidro quase nítida. A redução devolvida tem de fechar a conta inversa.
    const densidade = 3;
    const sigmaEmDp = 30;
    const raio = (1 / reducaoParaOSigma(sigmaEmDp, densidade)) * 4;

    expect(raio * 0.57735 + 0.5).toBeCloseTo(sigmaEmDp * densidade, 5);
  });

  describe('sem blur por trás, no Android', () => {
    // Fora de um alvo o Android não desfoca nada, e sobrava o `glass-strong`
    // a 11%: o balão de notificação (#351) mostrava a tela atravessando o texto.
    const plataformaOriginal = Platform.OS;
    const naPlataforma = (os: typeof Platform.OS) =>
      Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
    afterEach(() => naPlataforma(plataformaOriginal));

    it('assenta o vidro sobre a cor da tela', async () => {
      naPlataforma('android');
      const { queryByTestId } = await render(
        <Vidro>
          <Text>conteúdo</Text>
        </Vidro>
      );

      expect(queryByTestId('base-opaca', OCULTOS)).not.toBeNull();
    });

    it('continua translúcido dentro do alvo, onde o blur existe', async () => {
      naPlataforma('android');
      const { queryByTestId } = await render(
        <AlvoDoVidro fundo={<Text>foto</Text>}>
          <Vidro>
            <Text>conteúdo</Text>
          </Vidro>
        </AlvoDoVidro>
      );

      expect(queryByTestId('base-opaca', OCULTOS)).toBeNull();
    });

    it('não muda o iOS, que desfoca sem alvo', async () => {
      naPlataforma('ios');
      const { queryByTestId } = await render(
        <Vidro>
          <Text>conteúdo</Text>
        </Vidro>
      );

      expect(queryByTestId('base-opaca', OCULTOS)).toBeNull();
    });
  });

  it('renderiza o conteúdo por cima das camadas', async () => {
    const { queryByText } = await render(
      <Vidro>
        <Text>conteúdo</Text>
      </Vidro>
    );

    expect(queryByText('conteúdo')).not.toBeNull();
  });
});

describe('BrilhoAmbiente', () => {
  it('chega à borda com opacidade zero e sem degrau', () => {
    // A primeira versão reproduzia o gradiente do kit e ignorava o
    // `blur(40px)`: saiu uma mancha forte e com contorno. A rampa é o perfil
    // medido depois do blur, e tem de morrer em zero sem degrau.
    const paradas = paradasDoBrilho(OPACIDADE_DO_KIT_NO_ESCURO);
    const ultima = paradas[paradas.length - 1];
    const penultima = paradas[paradas.length - 2];

    expect(paradas[0].opacidade).toBe(OPACIDADE_DO_KIT_NO_ESCURO);
    expect(ultima.opacidade).toBe(0);
    expect(penultima.opacidade).toBeLessThan(OPACIDADE_DO_KIT_NO_ESCURO * 0.05);
  });

  it('decresce do centro para a borda', () => {
    const opacidades = paradasDoBrilho(OPACIDADE_DO_KIT_NO_ESCURO).map((p) => p.opacidade);

    expect([...opacidades].sort((a, b) => b - a)).toEqual(opacidades);
  });

  it('se centra junto ao topo dos blocos, e não numa fração da tela', async () => {
    // Por fração da tela, numa tela mais alta que a do kit, a metade de baixo
    // da luz caía no vão escuro antes de "Hoje" e virava mancha. No kit o
    // centro fica 4 abaixo do topo dos blocos (370 contra 366).
    const { getByTestId } = await render(<BrilhoAmbiente topoDosBlocos={366} />);
    const estilo = getByTestId('brilho-ambiente', { includeHiddenElements: true }).props.style;

    expect(estilo.top + estilo.height / 2).toBe(370);
  });

  // A nutrição não tem blocos nem foto: a luz do kit fica no topo, com centro a
  // 150 (top −60, altura 420), e não atrás dos blocos como na tela inicial.
  it('na nutrição, a luz fica no topo da tela, onde o kit a põe', async () => {
    const { getByTestId } = await render(<BrilhoAmbiente receita={BRILHO_DA_NUTRICAO} />);
    const estilo = getByTestId('brilho-ambiente', { includeHiddenElements: true }).props.style;

    expect(estilo.top + estilo.height / 2).toBe(150);
  });

  it('no cardio, a luz fica no topo, mais baixa que a da nutrição', async () => {
    // O kit do cardio põe o brilho a top −40 com altura 460: centro a 190.
    const { getByTestId } = await render(<BrilhoAmbiente receita={CARDIO_GLOW} />);
    const estilo = getByTestId('brilho-ambiente', { includeHiddenElements: true }).props.style;

    expect(estilo.top + estilo.height / 2).toBe(190);
  });

  it('não intercepta toque nem leitor de tela', async () => {
    const { getByTestId } = await render(<BrilhoAmbiente topoDosBlocos={366} />);
    // Oculto do leitor de tela de propósito, então a busca precisa incluí-lo.
    const brilho = getByTestId('brilho-ambiente', { includeHiddenElements: true });

    expect(brilho.props.pointerEvents).toBe('none');
    expect(brilho.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
