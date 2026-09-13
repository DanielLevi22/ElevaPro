import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useEscala } from '@/shared/design';
import { FireAnimation } from './FireAnimation';

/**
 * A ofensiva, na pílula que o kit de vidro põe sobre a foto do cabeçalho.
 *
 * O desenho mostra uma chama estática; aqui ela continua animada, que é o que o
 * app já tinha e é melhor — a ofensiva é justamente o que se quer que chame
 * atenção. O que mudou foi a superfície: era cor de marca a 20% escrita à mão,
 * e agora é o vidro do chip de hero, que funciona sobre foto nos dois temas.
 *
 * Congelada muda de cor porque muda de significado: a sequência não avançou,
 * mas também não caiu.
 */
interface StreakCounterProps {
  streak: number;
  frozen?: boolean;
}

const TAMANHO_DA_CHAMA = 20;

export function StreakCounter({ streak, frozen = false }: StreakCounterProps) {
  const escalar = useEscala();

  return (
    <View className="flex-row items-center gap-1.5 rounded-full border border-hero-chip-border bg-hero-chip px-3 py-1.5">
      <FireAnimation active={streak > 0} frozen={frozen} size={escalar(TAMANHO_DA_CHAMA)} />
      <Text
        className={cn(
          'font-display text-rotulo font-bold',
          frozen ? 'text-secondary' : 'text-hero'
        )}
      >
        {streak}
      </Text>
    </View>
  );
}
