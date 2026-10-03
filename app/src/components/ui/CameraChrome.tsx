import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import X from 'lucide-react-native/icons/x';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { comOpacidade, illustration, useCores, useEscala } from '@/shared/design';

/**
 * Os controles sobre a imagem da câmera, no kit de vidro (#316, tela 4).
 *
 *     vidro escuro: branco a 10–12%, borda branca a 18–20%
 *     chips: 5 × 10, 10 / 700; ok verde a 20% com borda a 45%; pendente âmbar a 22% / 50%
 *
 * A câmera é escura nos dois temas, então nada aqui segue o tema: é o branco
 * de `sobreImagem` e a primária, como o kit desenha. Nasceram no body scan e
 * vieram para cá quando a Análise de Técnica passou a usá-los (#361).
 */
const GLASS_FILL = 0.12;
const GLASS_BORDER = 0.2;

/**
 * O vidro escuro sobre a câmera, para o que não cabe nas peças abaixo.
 *
 * @example <View className="rounded-xl border" style={useDarkGlass()} />
 */
export function useDarkGlass() {
  const cores = useCores();
  return {
    backgroundColor: comOpacidade(cores.sobreImagem, GLASS_FILL),
    borderColor: comOpacidade(cores.sobreImagem, GLASS_BORDER),
  };
}

const ROUND = 38;
const ROUND_ICON = ROUND * 0.47;

/**
 * O botão redondo do cabeçalho sobre a câmera: fechar, a voz.
 *
 * @example <CameraRoundButton icon={X} label="Fechar a câmera" onPress={router.back} />
 */
export function CameraRoundButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-[2.375rem] w-[2.375rem] items-center justify-center rounded-full border"
      style={useDarkGlass()}
    >
      <Icon size={escalar(ROUND_ICON)} strokeWidth={1.5} color={cores.sobreImagem} />
    </TouchableOpacity>
  );
}

export interface CameraStatus {
  label: string;
  ok: boolean;
}

const CHIP_ICON = 11;

/** Classe literal por estado: o Tailwind só gera o que aparece escrito no fonte. */
const CHIP_TONE = {
  ok: 'border-metrica-passos/45 bg-metrica-passos/20',
  attention: 'border-metrica-gordura/45 bg-metrica-gordura/20',
} as const;

/**
 * O que a câmera já resolveu e o que falta: o chip apagado é o pendente.
 *
 * @example <CameraStatusChips chips={[{ label: 'Lendo você', ok: true }]} />
 */
export function CameraStatusChips({ chips }: { chips: CameraStatus[] }) {
  return (
    <View className="mt-3.5 flex-row justify-center gap-2">
      {chips.map((chip) => (
        <StatusChip key={chip.label} chip={chip} />
      ))}
    </View>
  );
}

function StatusChip({ chip }: { chip: CameraStatus }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View
      className={cn(
        'flex-row items-center gap-[0.3125rem] rounded-full border px-2.5 py-[0.3125rem]',
        chip.ok ? CHIP_TONE.ok : CHIP_TONE.attention
      )}
    >
      <Ionicons
        name={chip.ok ? 'checkmark' : 'ellipsis-horizontal'}
        size={escalar(CHIP_ICON)}
        color={chip.ok ? cores.textoPassos : cores.textoGordura}
      />
      <Text className="text-[0.625rem] font-bold text-sobre-imagem">{chip.label}</Text>
    </View>
  );
}

/**
 * A instrução do momento, a mesma frase que a voz diz. Some quando está tudo certo.
 *
 * @example {aviso !== null && <InstructionCard text={aviso} />}
 */
export function InstructionCard({ text }: { text: string }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View
      className="flex-row items-center gap-[0.6875rem] rounded-2xl border px-3.5 py-3"
      style={useDarkGlass()}
    >
      <Ionicons name="volume-high-outline" size={escalar(17)} color={cores.primary} />
      <Text className="flex-1 text-[0.8125rem] leading-[1.14rem] text-sobre-imagem">“{text}”</Text>
    </View>
  );
}

const SHADE_STOPS = [0, 0.22, 0.62, 1] as const;

/**
 * O véu do kit: escurece o topo e o pé da imagem para o texto branco ler. É
 * preto nos dois temas, porque a câmera é escura nos dois.
 *
 * @example <CameraShade />
 */
export function CameraShade() {
  const black = (alpha: number) => comOpacidade(illustration.black, alpha);
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[black(0.65), black(0), black(0), black(0.8)]}
      locations={SHADE_STOPS}
      className="absolute inset-0"
    />
  );
}

/**
 * O pedido da câmera, sobre o fundo escuro da própria câmera. A frase diz para
 * que a imagem serve e o que acontece com ela: cada fluxo trata a imagem de um
 * jeito.
 *
 * @example <CameraPermission message="…" onAllow={pedirPermissao} onClose={router.back} />
 */
export function CameraPermission({
  message,
  onAllow,
  onClose,
}: {
  message: string;
  onAllow: () => void;
  onClose: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-black px-8">
      <View className="absolute left-[1.125rem] top-14">
        <CameraRoundButton icon={X} label="Fechar" onPress={onClose} />
      </View>
      <Text className="text-center text-[0.9375rem] leading-[1.4rem] text-sobre-imagem">
        {message}
      </Text>
      <TouchableOpacity
        className="mt-6 h-[2.625rem] items-center justify-center rounded-[0.8125rem] bg-primary px-8"
        onPress={onAllow}
        accessibilityRole="button"
      >
        <Text className="text-[0.71875rem] font-extrabold uppercase tracking-wide text-primary-foreground">
          Permitir câmera
        </Text>
      </TouchableOpacity>
    </View>
  );
}
