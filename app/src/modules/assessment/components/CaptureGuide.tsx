import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, View } from 'react-native';
import { type Cores, comOpacidade, useBrilho, useCores } from '@/shared/design';
import type { Proximidade } from '../services/portao';

/**
 * O guia da câmera: marcas de enquadramento e a linha de varredura (#316, tela 4).
 *
 * O retângulo ainda marca cabeça e pés, cuja altura governa a distância e torna
 * os scans comparáveis (`ADR-0010`). Sem o boneco no centro, a pessoa vê a própria
 * imagem sem competir com uma segunda silhueta.
 *
 * @example <CaptureGuide top={0.1} bottom={0.9} proximity="quase" />
 */
interface CaptureGuideProps {
  /** Onde a cabeça e os pés devem ficar, em fração da altura da tela. */
  top: number;
  bottom: number;
  proximity: Proximidade;
}

/** Largura do quadro, em fração da tela: o `inset: 6% 12%` do kit. */
const FRAME_SIDE = '12%';
const FRAME_ALPHA = 0.18;

const TONE: Record<Proximidade, (cores: Cores) => string> = {
  longe: (cores) => cores.perigo,
  quase: (cores) => cores.metricaGordura,
  pronto: (cores) => cores.primary,
};

export function CaptureGuide({ top, bottom, proximity }: CaptureGuideProps) {
  const cores = useCores();
  const brilho = useBrilho();
  const { height: screen } = useWindowDimensions();
  const span = (bottom - top) * screen;
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
          borderColor: comOpacidade(color, FRAME_ALPHA),
        }}
      />
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
