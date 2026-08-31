import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useAssessmentStore } from '../../store/assessmentStore';
import PostureAnalysis from '../PostureAnalysis';

/**
 * Teste de caracterização, escrito ANTES da extração dos componentes.
 *
 * A tela passou de 785 para 720 linhas ao perder o modo demo, e ainda está
 * acima do teto de 500 que o `check-file-size` cobra de todo arquivo que um PR
 * toca. Extrair o radar e o esqueleto resolve — mas refatorar UI sem rede é
 * trocar dívida conhecida por regressão desconhecida, que é o que o próprio
 * guarda avisa.
 *
 * Estes testes descrevem o comportamento de HOJE. Se continuarem verdes depois
 * da extração, ela preservou o que importa.
 */

// O desenho não é o alvo: estes testes afirmam o que a tela DIZ. Mockar o SVG
// na borda mantém a asserção sobre o conteúdo e sobrevive à extração do
// esqueleto para componente próprio.
// O mock padrão do reanimated não traz os helpers de `entering`. Sem isto o
// teste falha em `ZoomIn.duration(600)`, que é animação — não comportamento.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const entering = { duration: () => entering, delay: () => entering, springify: () => entering };
  return {
    __esModule: true,
    default: { View },
    View,
    FadeIn: entering,
    FadeInDown: entering,
    FadeInUp: entering,
    ZoomIn: entering,
  };
});

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const Icone = () => <View />;
  return { Ionicons: Icone, MaterialCommunityIcons: Icone };
});

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  const Stub = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Circle: Stub,
    Line: Stub,
    Polygon: Stub,
    Text: Stub,
  };
});

jest.mock('../../store/assessmentStore', () => ({
  useAssessmentStore: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ studentId: 'aluno-1' }),
}));

const RESULTADO = {
  postureAnalysis: {
    scores: { symmetry: 62, muscle: 74, posture: 88 },
    feedback: {
      front: [{ title: 'Ombros', risk: 'ATENÇÃO', text: 'Leve elevação à direita.' }],
      back: [],
      side: [],
    },
    recommendations: 'Priorize trabalho unilateral por seis semanas.',
  },
};

function comStore(overrides: Record<string, unknown> = {}) {
  (useAssessmentStore as unknown as jest.Mock).mockReturnValue({
    capturedImages: {},
    lastResult: null,
    studentId: 'aluno-1',
    scanDeltas: [],
    scanHistory: [],
    loadHistory: jest.fn().mockResolvedValue(undefined),
    deleteScan: jest.fn(),
    ...overrides,
  });
}

describe('PostureAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  /**
   * A tela abre num spinner de 2,5s que simula um processamento já concluído.
   * Sem adiantar o relógio, todo teste afirmaria sobre o spinner.
   */
  function passarOCarregamento() {
    act(() => {
      jest.advanceTimersByTime(3000);
    });
  }

  // O modo demo saiu: sem resultado, a tela dizia "análise de demonstração" e
  // desenhava um corpo escoliótico fabricado. Agora diz que não há análise.
  it('sem resultado, não inventa análise', () => {
    comStore();
    render(<PostureAnalysis />);
    passarOCarregamento();

    expect(screen.getByText(/nenhuma análise ainda/i)).toBeTruthy();
  });

  // Este teste mudou de lado de propósito. Antes afirmava o "Athletic Score":
  // a média de 62, 74 e 88 — 75 —, no maior destaque da tela, com um selo
  // EXCELENTE/REGULAR sempre verde. Nada ali era medido: ninguém avaliou
  // performance atlética, e somar simetria com postura não produz uma quarta
  // grandeza. Agora a tela não pode mostrar índice inventado nenhum.
  it('não inventa um índice a partir das notas da análise', () => {
    comStore({ lastResult: RESULTADO });
    render(<PostureAnalysis />);

    passarOCarregamento();

    expect(screen.queryByText('75')).toBeNull();
    expect(screen.queryByText(/athletic score/i)).toBeNull();
    expect(screen.queryByText(/excelente|regular/i)).toBeNull();
  });

  // A tela produz número sobre o corpo de alguém e texto que parece prescrição
  // ("Recomendação de Treino"). Sem dizer o que ela não é, o aluno decide treino
  // e dieta em cima de estimativa de foto.
  it('diz que não substitui avaliação profissional', () => {
    comStore({ lastResult: RESULTADO });
    render(<PostureAnalysis />);

    passarOCarregamento();

    expect(screen.getByText(/não substitui avaliação física presencial/i)).toBeTruthy();
    expect(screen.getByText(/não é diagnóstico/i)).toBeTruthy();
  });

  // As três notas continuam: são o que a análise devolveu de fato. O que muda é
  // o rótulo dizer que são estimativa, e não medida.
  it('diz que as notas são estimativa da análise, não medida', () => {
    comStore({ lastResult: RESULTADO });
    render(<PostureAnalysis />);

    passarOCarregamento();

    expect(screen.getByText(/não são medidas/i)).toBeTruthy();
  });

  it('mostra a recomendação da análise, e não um texto fixo', () => {
    comStore({ lastResult: RESULTADO });
    render(<PostureAnalysis />);

    passarOCarregamento();

    expect(screen.getByText(/trabalho unilateral por seis semanas/i)).toBeTruthy();
  });

  it('mostra o feedback da vista atual', () => {
    comStore({ lastResult: RESULTADO });
    render(<PostureAnalysis />);

    passarOCarregamento();

    expect(screen.getByText(/leve elevação à direita/i)).toBeTruthy();
  });

  // Regressão. A lista de vistas passou a ter uma lateral só, com id `side`,
  // mas a busca da foto continuou tratando `side_r` e `side_l` — os ids de
  // quando havia duas. Caía no default e a tela mostrava o holograma de
  // placeholder no lugar do corpo do aluno, só na lateral. Passava despercebido
  // porque as outras duas vistas funcionavam.
  it('mostra a foto do aluno em todas as três vistas, inclusive a lateral', () => {
    comStore({
      lastResult: RESULTADO,
      capturedImages: {
        front: 'file:///frente.jpg',
        back: 'file:///costas.jpg',
        side: 'file:///lado.jpg',
      },
    });
    render(<PostureAnalysis />);

    passarOCarregamento();

    for (const rotulo of ['Vista Frontal', 'Vista Posterior', 'Vista Lateral']) {
      // Aparece duas vezes: subtítulo do cabeçalho e badge sobre a foto.
      expect(screen.getAllByText(rotulo).length).toBeGreaterThan(0);
      expect(screen.getByTestId('foto-da-vista')).toBeTruthy();
      expect(screen.queryByTestId('sem-foto-da-vista')).toBeNull();

      if (rotulo !== 'Vista Lateral') {
        fireEvent.press(screen.getByLabelText('Próxima vista'));
      }
    }
  });

  // O placeholder continua existindo para quem chega sem foto no store.
  it('cai no placeholder quando não há foto daquela vista', () => {
    comStore({ lastResult: RESULTADO, capturedImages: {} });
    render(<PostureAnalysis />);

    passarOCarregamento();

    expect(screen.getByTestId('sem-foto-da-vista')).toBeTruthy();
    expect(screen.queryByTestId('foto-da-vista')).toBeNull();
  });
});
