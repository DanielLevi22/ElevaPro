import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';
import { Vidro } from './Vidro';

/**
 * A nota de vidro dos fluxos do kit: ícone na primária num quadrado de vidro forte
 * e o texto ao lado — "Como funciona" no cardio, "Cada tipo é liberado separadamente"
 * na saúde.
 *
 * @example
 * <InfoNote icon="notifications-outline">Avisamos com vibração ao bater a meta.</InfoNote>
 */
interface InfoNoteProps {
  icon: keyof typeof Ionicons.glyphMap;
  children: string;
  className?: string;
}

const ICON_SIZE = 15;

export function InfoNote({ icon, children, className }: InfoNoteProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro classeExterna={className} className="flex-row items-start gap-3 p-[0.9375rem]">
      <View className="h-8 w-8 shrink-0 items-center justify-center rounded-[0.6875rem] bg-glass-strong">
        <Ionicons name={icon} size={escalar(ICON_SIZE)} color={cores.primaryText} />
      </View>
      <Text className="flex-1 text-[0.78125rem] leading-[1.1rem] text-muted-foreground">
        {children}
      </Text>
    </Vidro>
  );
}
