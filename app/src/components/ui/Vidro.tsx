import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { Platform, View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * A superfície de vidro fosco do kit.
 *
 * No CSS do desenho isso é uma declaração de sete propriedades. Em React Native
 * nenhuma das três principais existe, então a superfície é uma composição:
 *
 * | no desenho                      | aqui                                   |
 * |---------------------------------|----------------------------------------|
 * | `backdrop-filter: blur(26px)`   | `BlurView` do expo-blur                |
 * | `saturate(140%)`                | não tem equivalente — não reproduzido  |
 * | `linear-gradient(160deg, …)`    | `LinearGradient` com o vetor de 160°   |
 * | `::before` radial de brilho     | removido — quebrava a simetria         |
 * | `inset 0 1px 0` (topo)          | uma linha de 1px no topo               |
 * | `inset 0 -1px 0` (base)         | uma linha de 1px na base               |
 * | duas sombras externas           | uma só — RN não empilha sombra         |
 *
 * Por isso ela é **um componente**, e não uma classe repetida: são cinco
 * camadas, e repeti-las à mão em cada cartão seria errar em pelo menos uma.
 *
 * @example
 * <Vidro className="p-3.5">
 *   <Text className="text-foreground">…</Text>
 * </Vidro>
 */
interface VidroProps extends ViewProps {
  children: ReactNode;
  /** Mais opaco: o kit usa isso em trilho de progresso e fundo de ícone. */
  forte?: boolean;
  /**
   * Layout **de dentro**: o arranjo dos filhos e o preenchimento.
   *
   * São duas camadas porque no iOS `overflow: hidden` corta a sombra — a de
   * fora carrega o relevo e a de dentro recorta as camadas de vidro.
   */
  className?: string;
  /** Layout **do próprio cartão** na fila onde ele está: `flex-1`, largura. */
  classeExterna?: string;
}

/**
 * O blur fica fora do Android, e isto foi **medido**, não estimado.
 *
 * `adb shell dumpsys gfxinfo`, rolando a tela inicial de ponta a ponta:
 *
 *     | frames perdidos | p90    | p95    | p99
 *     |-----------------|--------|--------|-------
 *     app chapado       |  3,85% |  23 ms |  26 ms |  38 ms
 *     com blur          | 44,44% |  42 ms |  48 ms |  61 ms
 *
 * Onze vezes mais frames perdidos e o p90 quase dobrado. `BlurView` no Android
 * é redesenhado a cada frame, e vidro em cada cartão de uma lista que rola é o
 * caso conhecidamente caro — a medição confirmou com folga. Junto vinha
 * artefato visível: uma mancha escura e borrada na lateral direita dos cartões.
 *
 * Sem o blur a superfície continua sendo o gradiente, a borda, o brilho de
 * canto e a sombra; o que se perde é o fundo aparecendo desfocado através dela.
 * É a troca que a #281 previu — "se custar frame, aquela tela vira superfície
 * opaca e eu aviso" — aplicada por plataforma, porque o custo é da plataforma.
 *
 * No iOS o `BlurView` é nativo e barato, e lá ele fica. Vale remedir quando
 * o `expo-blur` mudar de implementação no Android.
 */
const COM_BLUR = Platform.OS === 'ios';

/** Intensidade do `BlurView` equivalente ao `blur(26px)` do desenho. */
const INTENSIDADE = 26;

/**
 * O relevo do vidro.
 *
 * O desenho empilha duas sombras — uma larga que levanta o cartão e uma curta
 * de contato. React Native aceita uma só, então fica a larga, que é a que dá o
 * relevo; a de contato se perde.
 *
 * `shadowRadius` é metade do blur do CSS: `blur(26px)` espalha 13 para cada
 * lado. No Android a sombra vem de `elevation`, que precisa de fundo pintado
 * para ter contorno — e o fundo aqui é translúcido de propósito. Por isso a
 * elevação é menor: sem ela o Android não desenha nada, e alta demais ela
 * aparece como um retângulo duro atrás do vidro.
 *
 * **Eu havia esquecido esta camada inteira.** O comentário da tabela acima
 * dizia "uma só" e o código não tinha nenhuma — era o que faltava para o
 * cartão parecer vidro em vez de painel chapado.
 */
/**
 * O relevo, e o fundo que o Android exige para desenhá-lo.
 *
 * `elevation` no Android só produz sombra se a View tiver **fundo pintado** —
 * com fundo transparente ele não tem contorno de onde tirar a sombra e não
 * desenha nada. Foi o que deixou o cartão branco sobre cinza-claro parecendo
 * uma caixa chapada no tema claro: o vidro estava certo, a profundidade não
 * existia.
 *
 * Pintar o invólucro com a cor de fundo da tela resolve, e custa pouco
 * justamente onde o blur já não existe: o preenchimento do vidro no claro é
 * 86% de branco, então o que estava atrás já não aparecia. No iOS, onde o blur
 * fica, o invólucro segue transparente — lá a sombra não depende de fundo.
 */
function relevo(cor: string, opacidade: number, fundo: string) {
  return Platform.select({
    ios: {
      shadowColor: cor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: opacidade,
      shadowRadius: 13,
    },
    default: { elevation: 6, backgroundColor: fundo },
  });
}

/**
 * A sombra do desenho não é só mais fraca no claro: é de outra cor. No escuro é
 * preto a 55%, no claro é o azulado `rgba(16,18,24,.22)` — sombra de objeto
 * claro sobre fundo claro não pode ser preta, ou lê como sujeira.
 */
const OPACIDADE_DA_SOMBRA = { escuro: 0.55, claro: 0.22 } as const;

/**
 * O preenchimento desce reto, e o kit usa 160°.
 *
 * São 20° de diferença, e eles são deliberados: qualquer inclinação faz um lado
 * do cartão ficar mais claro que o outro, e numa lista de dez linhas a assimetria
 * vira o defeito que se vê antes do efeito. O mesmo motivo tirou o brilho de
 * canto — no kit ele é um radial a 14% no canto superior esquerdo, imperceptível
 * sobre vidro translúcido em CSS e visível demais aqui.
 *
 * O que o vidro é, então: o gradiente vertical, a borda, as duas linhas de
 * brilho e a sombra de relevo. Simétrico da esquerda para a direita.
 */
const INICIO_DO_GRADIENTE = { x: 0.5, y: 0 };
const FIM_DO_GRADIENTE = { x: 0.5, y: 1 };

export function Vidro({ children, forte = false, className, classeExterna, ...props }: VidroProps) {
  const cores = useCores();
  const { colorScheme } = useColorScheme();
  const escuro = colorScheme === 'dark';

  return (
    <View
      style={relevo(
        cores.sombra,
        escuro ? OPACIDADE_DA_SOMBRA.escuro : OPACIDADE_DA_SOMBRA.claro,
        cores.background
      )}
      className={cn('rounded-xl', classeExterna)}
    >
      <View
        className={cn('overflow-hidden rounded-xl border border-glass-border', className)}
        {...props}
      >
        {COM_BLUR ? (
          <BlurView
            intensity={INTENSIDADE}
            tint={escuro ? 'dark' : 'light'}
            className="absolute inset-0"
          />
        ) : null}

        <LinearGradient
          colors={
            forte
              ? [cores.glassStrong, cores.glassStrong]
              : [cores.glassTop, cores.glass, cores.glassBottom]
          }
          locations={forte ? [0, 1] : [0, 0.55, 1]}
          start={INICIO_DO_GRADIENTE}
          end={FIM_DO_GRADIENTE}
          className="absolute inset-0"
        />

        {/* As duas linhas que no desenho são `inset box-shadow`. */}
        <View className="absolute left-0 right-0 top-0 h-px bg-specular" />
        {escuro ? (
          <View className="absolute bottom-0 left-0 right-0 h-px bg-specular-bottom" />
        ) : null}

        {children}
      </View>
    </View>
  );
}

export type { VidroProps };
