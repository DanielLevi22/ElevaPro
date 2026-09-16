import { View } from 'react-native';

/**
 * A aderência contra a meta de 90% (#298), com o fio da meta sobre a barra.
 *
 * Sem marcador de ritmo: a janela do relatório são os últimos 90 dias, sempre
 * inteiramente vividos, e o ritmo esperado cairia em cima da própria meta (#312).
 *
 * @example <AdherenceGoalBar value={88} goal={90} />
 */
interface AdherenceGoalBarProps {
  /** A aderência do período, de 0 a 100. */
  value: number;
  goal: number;
}

const FULL = 100;

export function AdherenceGoalBar({ value, goal }: AdherenceGoalBarProps) {
  const clamp = (percent: number) => Math.min(Math.max(percent, 0), FULL);
  return (
    <View
      accessible
      accessibilityLabel={`Aderência de ${value}%, meta de ${goal}%`}
      className="mt-3 h-2.5 justify-center rounded-full bg-glass-strong"
    >
      <View className="h-2.5 rounded-full bg-primary" style={{ width: `${clamp(value)}%` }} />
      {/* O fio da meta por cima da barra: dentro dela, some no trecho preenchido. */}
      <View
        className="absolute h-4 w-0.5 rounded-full bg-hero"
        style={{ left: `${clamp(goal)}%` }}
      />
    </View>
  );
}
