import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, View } from 'react-native';
import { ReferenceBody } from '@/components/ui/ReferenceBody';
import { REFERENCE_BODY_VIEWBOX } from '@/components/ui/referenceBodyPaths';
import { type Cores, comOpacidade, useBrilho, useCores } from '@/shared/design';
import type { Proximidade, Vista } from '../services/portao';

/**
 * O guia da câmera: o corpo de referência da pose entre as marcas do
 * Enquadramento, o quadro e a linha de varredura do kit (#316, tela 4).
 *
 * O corpo toma o lugar do retângulo grosso que marcava o alvo, e herda dele o
 * que importava: a cabeça fica na marca de cima e os pés na de baixo — é essa
 * altura que governa a distância e faz dois scans serem comparáveis
 * (`ADR-0010`) —, e a cor diz a proximidade. A três metros o aluno não lê frase
 * nem enxerga traço fino; percebe cor em área grande, e o corpo preenchido é
 * área maior que a moldura era.
 *
 * @example <CaptureGuide pose="side" top={0.1} bottom={0.9} proximity="quase" />
 */
interface CaptureGuideProps {
  pose: Vista;
  /** Onde a cabeça e os pés devem ficar, em fração da altura da tela. */
  top: number;
  bottom: number;
  proximity: Proximidade;
}

/** Onde o contorno começa e termina dentro da caixa do desenho (y de 12 a 514). */
const BODY_TOP = 12;
const BODY_BOTTOM = 514;

/** Largura do quadro, em fração da tela: o `inset: 6% 12%` do kit. */
const FRAME_SIDE = '12%';
const FRAME_ALPHA = 0.18;

const TONE: Record<Proximidade, (cores: Cores) => string> = {
  longe: (cores) => cores.perigo,
  quase: (cores) => cores.metricaGordura,
  pronto: (cores) => cores.primary,
};

export function CaptureGuide({ pose, top, bottom, proximity }: CaptureGuideProps) {
  const cores = useCores();
  const brilho = useBrilho();
  const { height: screen } = useWindowDimensions();
  const span = (bottom - top) * screen;
  const box = (span * REFERENCE_BODY_VIEWBOX.height) / (BODY_BOTTOM - BODY_TOP);
  const offset = top * screen - (box * BODY_TOP) / REFERENCE_BODY_VIEWBOX.height;
  const color = TONE[proximity](cores);

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <View
        className="absolute rounded-[1.125rem] border"
        style={{
          top: top * screen,
          height: span,
          left: FRAME_SIDE,
          right: FRAME_SIDE,
          // O token é literal e não aceita `/18` na classe.
          borderColor: comOpacidade(cores.sobreImagem, FRAME_ALPHA),
        }}
      />
      <View className="absolute left-0 right-0 items-center" style={{ top: offset }}>
        <ReferenceBody pose={pose} height={box} absolute color={color} opacity={0.85} />
      </View>
      <LinearGradient
        colors={[comOpacidade(cores.primary, 0), cores.primary, comOpacidade(cores.primary, 0)]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        className="absolute left-0 right-0 h-0.5"
        style={{
          top: (top + (bottom - top) / 2) * screen,
          boxShadow: brilho({ y: 0, blur: 18, espalhamento: 0 }),
        }}
      />
    </View>
  );
}
