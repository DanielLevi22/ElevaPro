import type { LucideIcon } from 'lucide-react-native';
import Apple from 'lucide-react-native/icons/apple';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Footprints from 'lucide-react-native/icons/footprints';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Plus from 'lucide-react-native/icons/plus';
import { type TextStyle, View, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { type AcaoRapida, useGestoDeAcoes } from './useGestoDeAcoes';

export type { AcaoRapida };

interface BotaoDeAcoesProps {
  comCardio: boolean;
  /** 1 enquanto o dedo arrasta: a barra esmaece junto. */
  arrastando: SharedValue<number>;
  onAcao: (acao: AcaoRapida) => void;
}

interface Atalho {
  acao: AcaoRapida;
  Icone: LucideIcon;
  rotulo: string;
  /** Posição no desenho, a partir do centro do botão. */
  x: number;
  y: number;
}

const ATALHOS: readonly Atalho[] = [
  { acao: 'treino', Icone: Dumbbell, rotulo: 'Treino', x: -60, y: -80 },
  { acao: 'menu', Icone: LayoutGrid, rotulo: 'Menu', x: 60, y: -80 },
  { acao: 'dieta', Icone: Apple, rotulo: 'Dieta', x: -100, y: -10 },
  { acao: 'cardio', Icone: Footprints, rotulo: 'Cardio', x: 100, y: -10 },
];

const TAMANHO_DO_MAIS = 32;
/** O traço do Lucide no kit: 1,5 nos ícones, e 2,25 no "+" para ele ler no disco lime. */
const TRACO = 1.5;
const TRACO_DO_MAIS = 2.25;
/** O brilho do `BotaoDeDestaque` no cartão: `0 10px 26px -8px`. */
const BRILHO_DO_MAIS = { y: 10, blur: 26, espalhamento: -8 } as const;

/**
 * O "+" no meio da tab bar: tocar abre o menu; arrastar escolhe um atalho —
 * treino em cima à esquerda, menu em cima à direita, dieta à esquerda e, para o
 * aluno, cardio à direita.
 *
 * O kit não desenha este botão. Ele ficou por decisão de produto (#295), e
 * ganhou a pele do kit: lime com o brilho do `BotaoDeDestaque`, e os atalhos em
 * vidro que acendem na primária.
 *
 * @example
 * <BotaoDeAcoes comCardio={ehAluno} arrastando={arrastando} onAcao={executar} />
 */
export function BotaoDeAcoes({ comCardio, arrastando, onAcao }: BotaoDeAcoesProps) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();
  const { gesto, escolhida, estiloDoBotao } = useGestoDeAcoes({ comCardio, arrastando, onAcao });
  const atalhos = comCardio ? ATALHOS : ATALHOS.filter((atalho) => atalho.acao !== 'cardio');

  return (
    <View
      pointerEvents="box-none"
      className="-mt-7 h-[4.25rem] w-[4.25rem] items-center justify-center"
    >
      <View pointerEvents="box-none" className="absolute">
        {atalhos.map((atalho) => (
          <IndicadorDeAcao
            key={atalho.acao}
            atalho={atalho}
            escolhida={escolhida}
            arrastando={arrastando}
          />
        ))}
      </View>

      <GestureDetector gesture={gesto}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ações rápidas"
          accessibilityHint="Toque para abrir o menu, ou arraste para treino, dieta ou cardio"
          className="h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-primary"
          style={[{ boxShadow: brilho(BRILHO_DO_MAIS) }, estiloDoBotao]}
        >
          <Plus
            size={escalar(TAMANHO_DO_MAIS)}
            strokeWidth={TRACO_DO_MAIS}
            color={cores.primaryForeground}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

interface IndicadorDeAcaoProps {
  atalho: Atalho;
  escolhida: SharedValue<AcaoRapida | null>;
  arrastando: SharedValue<number>;
}

/** Metade do lado do indicador (`2.75rem`), para centrá-lo no ponto do desenho. */
const MEIO_DO_INDICADOR = 22;
const TAMANHO_DO_ICONE = 20;
const SUBIDA_DO_ROTULO = -25;

/**
 * Um atalho: vidro enquanto o dedo arrasta, primária e maior quando escolhido.
 * O ícone troca de cor por dois ícones sobrepostos — cor de ícone não anima.
 *
 * @example
 * <IndicadorDeAcao atalho={ATALHOS[0]} escolhida={escolhida} arrastando={arrastando} />
 */
function IndicadorDeAcao({ atalho, escolhida, arrastando }: IndicadorDeAcaoProps) {
  const cores = useCores();
  const escalar = useEscala();
  const { estiloDoCirculo, estiloDoAceso, estiloDoRotulo } = useEstilosDoIndicador(
    atalho.acao,
    escolhida,
    arrastando
  );

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute h-[2.75rem] w-[2.75rem] items-center justify-center rounded-full border"
      style={[
        { left: escalar(atalho.x - MEIO_DO_INDICADOR), top: escalar(atalho.y) },
        estiloDoCirculo,
      ]}
    >
      <atalho.Icone size={escalar(TAMANHO_DO_ICONE)} strokeWidth={TRACO} color={cores.foreground} />
      <Animated.View className="absolute" style={estiloDoAceso}>
        <atalho.Icone
          size={escalar(TAMANHO_DO_ICONE)}
          strokeWidth={TRACO}
          color={cores.primaryForeground}
        />
      </Animated.View>
      <Animated.Text
        className="absolute w-20 text-center text-[0.625rem] font-bold uppercase tracking-wide text-foreground"
        style={estiloDoRotulo}
      >
        {atalho.rotulo}
      </Animated.Text>
    </Animated.View>
  );
}

/** Os três estilos animados do indicador, ligados ao atalho sob o dedo. */
function useEstilosDoIndicador(
  acao: AcaoRapida,
  escolhida: SharedValue<AcaoRapida | null>,
  arrastando: SharedValue<number>
) {
  const cores = useCores();
  const escalar = useEscala();
  // Medido fora do worklet: `escalar` é função do JavaScript, e chamá-la na
  // thread de UI derruba o app.
  const subida = escalar(SUBIDA_DO_ROTULO);

  const estiloDoCirculo = useAnimatedStyle<ViewStyle>(() => {
    const ativo = escolhida.value === acao;
    return {
      opacity: ativo ? 1 : withSpring(arrastando.value ? 1 : 0, { damping: 20 }),
      backgroundColor: withSpring(ativo ? cores.primary : cores.card),
      borderColor: ativo ? cores.primary : cores.glassBorder,
      transform: [{ scale: withSpring(ativo ? 1.6 : 1) }],
      zIndex: ativo ? 2 : 1,
    };
  });
  const estiloDoAceso = useAnimatedStyle<ViewStyle>(() => ({
    opacity: escolhida.value === acao ? 1 : 0,
  }));
  const estiloDoRotulo = useAnimatedStyle<TextStyle>(() => {
    const ativo = escolhida.value === acao;
    return {
      opacity: withSpring(ativo ? 1 : 0),
      transform: [{ translateY: withSpring(ativo ? subida : 0) }],
    };
  });

  return { estiloDoCirculo, estiloDoAceso, estiloDoRotulo };
}
