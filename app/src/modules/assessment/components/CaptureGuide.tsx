import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, View } from 'react-native';
import { type Cores, comOpacidade, useBrilho, useCores, useEscala } from '@/shared/design';
import type { Proximidade } from '../services/portao';

/**
 * O guia da câmera: o quadro de enquadramento e a linha de varredura (#316, tela 4).
 *
 * O quadro é lido de longe — o aluno está a três metros do telefone. Por isso a
 * borda é grossa, os cantos são reforçados e a cor é cheia e saturada: cor cheia
 * atravessa a distância e ainda diz **onde** ficar. O redesenho da #316 afinou a
 * borda para 1px a 18% e o estado sumiu, sobrando só a voz.
 *
 * A altura é fixa: é ela que governa a distância e faz dois scans serem
 * comparáveis (`ADR-0010`). E o corpo precisa caber aqui dentro — um quadro que
 * não precisa ser respeitado é um quadro que mente.
 *
 * @example <CaptureGuide top={0.1} bottom={0.9} proximity="quase" />
 */
interface CaptureGuideProps {
  /** Onde a cabeça e os pés devem ficar, em fração da altura da tela. */
  top: number;
  bottom: number;
  proximity: Proximidade;
}

/** Margem lateral do quadro: 62% de largura cabe corpo largo sem encostar nas bordas. */
const FRAME_SIDE = '19%';
// Borda e cantos em pixel: são espessura de traço, e precisam ser grossos em qualquer tela.
const FRAME_BORDER = 5;
const CORNER_BORDER = 8;
const CORNER_OFFSET = -3;
const CORNER_SIZE = 34;

const TONE: Record<Proximidade, (cores: Cores) => string> = {
  longe: (cores) => cores.enquadramentoLonge,
  quase: (cores) => cores.enquadramentoQuase,
  pronto: (cores) => cores.enquadramentoPronto,
};

type CornerEdges = Partial<
  Record<
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'borderTopWidth'
    | 'borderBottomWidth'
    | 'borderLeftWidth'
    | 'borderRightWidth',
    number
  >
>;

const CORNERS: CornerEdges[] = [
  {
    top: CORNER_OFFSET,
    left: CORNER_OFFSET,
    borderTopWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
  },
  {
    top: CORNER_OFFSET,
    right: CORNER_OFFSET,
    borderTopWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
  },
  {
    bottom: CORNER_OFFSET,
    left: CORNER_OFFSET,
    borderBottomWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
  },
  {
    bottom: CORNER_OFFSET,
    right: CORNER_OFFSET,
    borderBottomWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
  },
];

export function CaptureGuide({ top, bottom, proximity }: CaptureGuideProps) {
  const cores = useCores();
  const brilho = useBrilho();
  const escalar = useEscala();
  const { height: screen } = useWindowDimensions();
  const span = (bottom - top) * screen;
  const color = TONE[proximity](cores);
  const corner = escalar(CORNER_SIZE);

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <View
        testID="capture-guide-frame"
        className="absolute rounded"
        style={{
          top: top * screen,
          height: span,
          left: FRAME_SIDE,
          right: FRAME_SIDE,
          borderWidth: FRAME_BORDER,
          borderColor: color,
        }}
      >
        {/* Cantos reforçados: dão a forma do quadro sem fechar a imagem com
            moldura pesada, que atrapalharia enxergar o próprio corpo. */}
        {CORNERS.map((edges) => (
          <View
            key={Object.keys(edges).join('-')}
            className="absolute"
            style={{ width: corner, height: corner, borderColor: color, ...edges }}
          />
        ))}
      </View>
      {/* A linha acompanha o estado: verde fixo dizia "pronto" com o aluno longe. */}
      <LinearGradient
        colors={[comOpacidade(color, 0), color, comOpacidade(color, 0)]}
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
