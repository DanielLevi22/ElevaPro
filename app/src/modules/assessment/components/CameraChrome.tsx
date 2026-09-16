import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import X from 'lucide-react-native/icons/x';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { comOpacidade, illustration, useBrilho, useCores, useEscala } from '@/shared/design';
import type { CameraChip } from '../services/captureProgress';

/**
 * Os controles da câmera guiada (#316, tela 4), sobre a imagem da câmera.
 *
 *     vidro escuro: branco a 10–12%, borda branca a 18–20%
 *     chips: 5 × 10, 10 / 700; ok verde a 20% com borda a 45%; pendente âmbar a 22% / 50%
 *     anel: 76 com borda 4 na primária e brilho 0 0 30px -4px; miolo 58 com o número 23 / 800
 *
 * A câmera é escura nos dois temas, então nada aqui segue o tema: é o branco
 * de `sobreImagem` e a primária, como o kit desenha.
 */
const GLASS_FILL = 0.12;
const GLASS_BORDER = 0.2;

function useDarkGlass() {
  const cores = useCores();
  return {
    backgroundColor: comOpacidade(cores.sobreImagem, GLASS_FILL),
    borderColor: comOpacidade(cores.sobreImagem, GLASS_BORDER),
  };
}

const ROUND = 38;
const ROUND_ICON = ROUND * 0.47;

/** O botão redondo do cabeçalho sobre a câmera: fechar e a voz. */
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

const CHIP_ICON = 11;

/** Nível, distância e corpo inteiro: o chip apagado é o que falta resolver. */
export function StatusChips({ chips }: { chips: CameraChip[] }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="mt-3.5 flex-row justify-center gap-2">
      {chips.map((chip) => (
        <View
          key={chip.label}
          className={cn(
            'flex-row items-center gap-[0.3125rem] rounded-full border px-2.5 py-[0.3125rem]',
            chip.ok
              ? 'border-metrica-passos/45 bg-metrica-passos/20'
              : 'border-metrica-gordura/50 bg-metrica-gordura/20'
          )}
        >
          <Ionicons
            name={chip.ok ? 'checkmark' : 'ellipsis-horizontal'}
            size={escalar(CHIP_ICON)}
            color={chip.ok ? cores.metricaPassos : cores.metricaGordura}
          />
          <Text className="text-[0.625rem] font-bold text-sobre-imagem">{chip.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** A instrução do portão, a mesma frase que a voz diz. Some quando está tudo certo. */
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

interface CaptureBarProps {
  photosDone: number;
  /** O número da contagem, ou `null` fora dela. */
  countdown: number | null;
  measuring: boolean;
  onSwitchLens: () => void;
  lensLabel: string;
  lensLocked: boolean;
}

/**
 * O rodapé: quantas fotos já saíram, o anel da contagem e a troca de lente.
 *
 * O anel **não é botão**. O disparo é automático, porque o aluno está a metros
 * do celular (`ADR-0022`); o anel só acende quando a contagem começa.
 */
export function CaptureBar(props: CaptureBarProps) {
  const cores = useCores();
  const escalar = useEscala();
  const glass = useDarkGlass();
  return (
    <View className="mt-4 flex-row items-center justify-between px-1.5">
      <View
        className="h-12 w-12 items-center justify-center rounded-xl border"
        style={glass}
        accessibilityLabel={`${props.photosDone} de 3 fotos feitas`}
      >
        <Text className="font-display-black text-[1rem] text-sobre-imagem">{props.photosDone}</Text>
      </View>
      <CountdownRing countdown={props.countdown} measuring={props.measuring} />
      <TouchableOpacity
        onPress={props.onSwitchLens}
        disabled={props.lensLocked}
        accessibilityRole="button"
        accessibilityLabel={props.lensLabel}
        className="h-12 w-12 items-center justify-center rounded-full border"
        style={glass}
      >
        <Ionicons name="camera-reverse-outline" size={escalar(20)} color={cores.sobreImagem} />
      </TouchableOpacity>
    </View>
  );
}

function CountdownRing({ countdown, measuring }: { countdown: number | null; measuring: boolean }) {
  const cores = useCores();
  const brilho = useBrilho();
  const lit = countdown !== null;
  return (
    <View
      accessibilityLiveRegion="assertive"
      accessibilityLabel={lit ? `Foto em ${countdown}` : 'Aguardando a posição'}
      className={cn(
        'h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border-4',
        lit ? 'border-primary' : null
      )}
      style={
        lit
          ? { boxShadow: brilho({ blur: 30, espalhamento: -4 }) }
          : { borderColor: comOpacidade(cores.sobreImagem, 0.3) }
      }
    >
      <View
        className={cn(
          'h-[3.625rem] w-[3.625rem] items-center justify-center rounded-full',
          lit ? 'bg-primary' : null
        )}
      >
        {measuring ? <ActivityIndicator color={cores.sobreImagem} /> : null}
        {lit ? (
          <Text className="font-display-black text-[1.4375rem] text-primary-foreground">
            {countdown}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const SHADE_STOPS = [0, 0.22, 0.62, 1] as const;

/**
 * O véu do kit: escurece o topo e o pé da imagem para o texto branco ler. É
 * preto nos dois temas, porque a câmera é escura nos dois.
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

export function CameraPermission({
  onAllow,
  onClose,
}: {
  onAllow: () => void;
  onClose: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-black px-8">
      <View className="absolute left-[1.125rem] top-14">
        <CameraRoundButton icon={X} label="Fechar" onPress={onClose} />
      </View>
      <Text className="text-center text-[0.9375rem] leading-[1.4rem] text-sobre-imagem">
        Preciso da câmera para te posicionar e medir o enquadramento. A imagem é analisada no
        aparelho e não é gravada.
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
