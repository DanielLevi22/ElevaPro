import { contagem, type StreakStanding } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Orb } from '@/components/ui/Orb';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * O cartão da sequência do hub: os dias seguidos, a esfera da chama e a frase do
 * recorde.
 *
 *     glass com borda e brilho da primária, padding 18
 *     rótulo 10,5 / 800 / .14em na primária; número 46 / 800; "dias" 18 / 700
 *     esfera 0,44 com a chama; nota em glass-strong, padding 12, raio 14
 *
 * A frase sai da sequência de verdade, de `student_streaks` (issue #312). A tela
 * antiga contava os dias da semana com meta batida e chamava isso de sequência.
 *
 * @example <StreakCard standing={streakStanding(streak)} />
 */
interface StreakCardProps {
  standing: StreakStanding;
}

const ORB_SCALE = 0.44;
const ORB_GLYPH = 20;
const NOTE_ICON_SIZE = 15;

export function StreakCard({ standing }: StreakCardProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro destaque classeExterna="mt-3.5" className="p-[1.125rem]">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[0.65625rem] font-extrabold uppercase tracking-[0.14em] text-primary-text">
            Sequência atual
          </Text>
          <View className="mt-1.5 flex-row items-baseline gap-[0.4375rem]">
            <Text className="font-display-black text-[2.875rem] leading-[2.875rem] tracking-tighter text-foreground">
              {standing.current}
            </Text>
            <Text className="text-[1.125rem] font-bold text-muted-foreground">
              {standing.current === 1 ? 'dia' : 'dias'}
            </Text>
          </View>
        </View>
        <Orb icon="flame" scale={ORB_SCALE} glyph={ORB_GLYPH} />
      </View>
      <View className="mt-3.5 flex-row items-center gap-[0.5625rem] rounded-[0.875rem] bg-glass-strong p-3">
        <Ionicons
          name="information-circle-outline"
          size={escalar(NOTE_ICON_SIZE)}
          color={cores.primaryText}
        />
        <Text className="flex-1 text-[0.71875rem] leading-[1rem] text-muted-foreground">
          {recordSentence(standing)}
        </Text>
      </View>
    </Vidro>
  );
}

/**
 * @example recordSentence({ current: 12, best: 18, toTie: 6 }) // "Seu melhor recorde é 18 dias. Faltam 6 para empatar."
 */
function recordSentence({ current, best, toTie }: StreakStanding): string {
  if (best === 0) return 'Treine ou registre suas refeições hoje para começar uma sequência.';
  if (toTie === 0) {
    return current === best
      ? `Esta é a sua melhor sequência: ${contagem(best, 'dia', 'dias')}.`
      : '';
  }
  return `Seu melhor recorde é ${contagem(best, 'dia', 'dias')}. ${toTie === 1 ? 'Falta 1' : `Faltam ${toTie}`} para empatar.`;
}
