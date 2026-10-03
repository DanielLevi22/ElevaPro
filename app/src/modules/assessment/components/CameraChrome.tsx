import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useDarkGlass } from '@/components/ui/CameraChrome';
import { cn } from '@/lib/utils';
import { comOpacidade, useBrilho, useCores, useEscala } from '@/shared/design';

/**
 * O que só a câmera guiada do body scan tem (#316, tela 4): o contador de
 * fotos, o anel da contagem e o aviso de medição.
 *
 *     anel: 76 com borda 4 na primária e brilho 0 0 30px -4px; miolo 58 com o número 23 / 800
 *
 * As peças que a Análise de Técnica também usa (botão redondo, chips, véu,
 * instrução, permissão) moram em `components/ui/CameraChrome` (#361).
 */
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

/** Retorno enquanto o aparelho mede a foto, sem esconder a câmera por completo. */
export function CameraMeasuringOverlay() {
  const glass = useDarkGlass();
  const cores = useCores();
  return (
    <View pointerEvents="auto" className="absolute inset-0 items-center justify-center bg-black/45">
      <View className="items-center rounded-[1.375rem] border px-6 py-5" style={glass}>
        <ActivityIndicator color={cores.primary} />
        <Text className="mt-3 font-display-black text-2xl text-sobre-imagem">Foto tirada</Text>
        <Text className="mt-2 text-base text-sobre-imagem-secundario">Medindo…</Text>
      </View>
    </View>
  );
}
