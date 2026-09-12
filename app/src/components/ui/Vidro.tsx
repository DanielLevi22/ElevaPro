import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
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
 * | `::before` radial de brilho     | gradiente diagonal, aproximação        |
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
  className?: string;
}

/**
 * Se o blur entra, e onde.
 *
 * `BlurView` no Android é redesenhado a cada frame, e vidro em cada cartão de
 * uma lista que rola é o caso conhecidamente caro. **Está ligado nos dois
 * enquanto a medição não acontece**: a #289 abre medindo de propósito, e
 * decidir isto por estimativa seria trocar o número pelo palpite.
 *
 * Sem o blur a superfície continua sendo o gradiente, a borda, o brilho e a
 * sombra; o que se perde é o fundo aparecendo desfocado através dela. É a troca
 * que a #281 previu — "se custar frame, aquela tela vira superfície opaca e eu
 * aviso".
 *
 * Como medir: `adb shell dumpsys gfxinfo com.elevapro.app reset`, rolar a tela
 * inicial de ponta a ponta, e ler o percentil. O baseline do app chapado neste
 * aparelho é p50 18ms / p90 23ms / 3,85% janky — já acima do orçamento de
 * 16,7ms, então a comparação é contra ele e não contra o ideal.
 */
const COM_BLUR: boolean = true;

/** Intensidade do `BlurView` equivalente ao `blur(26px)` do desenho. */
const INTENSIDADE = 26;

/**
 * O vetor de `160deg` do CSS, em coordenadas de 0 a 1.
 *
 * `160deg` aponta 160° no sentido do relógio a partir de "para cima", ou seja
 * quase para baixo e um pouco para a direita: `(sin 160°, −cos 160°)`.
 */
const INICIO_DO_GRADIENTE = { x: 0.329, y: 0.03 };
const FIM_DO_GRADIENTE = { x: 0.671, y: 0.97 };

export function Vidro({ children, forte = false, className, ...props }: VidroProps) {
  const cores = useCores();
  const { colorScheme } = useColorScheme();
  const escuro = colorScheme === 'dark';

  return (
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

      {/*
        O `::before` do desenho é um radial partindo de fora do canto superior
        esquerdo. `LinearGradient` não faz radial; a diagonal do mesmo canto é a
        aproximação mais próxima sem trazer Skia só para isto.
      */}
      <LinearGradient
        colors={[cores.specular, 'transparent']}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.8, y: 0.6 }}
        className="absolute inset-0 opacity-60"
      />

      {/* As duas linhas que no desenho são `inset box-shadow`. */}
      <View className="absolute left-0 right-0 top-0 h-px bg-specular" />
      {escuro ? (
        <View className="absolute bottom-0 left-0 right-0 h-px bg-specular-bottom" />
      ) : null}

      {children}
    </View>
  );
}

export type { VidroProps };
