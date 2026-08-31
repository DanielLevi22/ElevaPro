import type { BodyScanDelta, ComparableField } from '@elevapro/shared';
import { Text, View } from 'react-native';

const LABELS: Record<ComparableField, string> = {
  weight_kg: 'Peso',
  body_fat_pct: 'Gordura',
  lean_mass_kg: 'Massa magra',
  bmi: 'IMC',
  circ_chest: 'Peito',
  circ_waist: 'Cintura',
  circ_hips: 'Quadril',
  circ_arms: 'Braço',
  circ_thighs: 'Coxa',
  circ_calves: 'Panturrilha',
  circ_neck: 'Pescoço',
  circ_shoulders: 'Ombro',
  shoulder_drop_cm: 'Desnível de ombro',
  craniovertebral_angle_deg: 'Ângulo craniovertebral',
};

const UNITS: Partial<Record<ComparableField, string>> = {
  weight_kg: 'kg',
  body_fat_pct: '%',
  lean_mass_kg: 'kg',
  bmi: '',
  craniovertebral_angle_deg: '°',
};

function unitFor(field: ComparableField): string {
  return UNITS[field] ?? 'cm';
}

interface ScanComparisonProps {
  deltas: BodyScanDelta[];
}

/**
 * A comparação entre dois escaneamentos.
 *
 * Vem antes do valor absoluto de propósito. Uma foto isolada dá um número
 * discutível; duas na mesma pose dão uma diferença confiável, porque o erro
 * sistemático da estimativa se repete nas duas e se cancela (`ADR-0010`).
 *
 * Não pinta variação de verde ou vermelho: se perder cintura é bom ou ruim
 * depende do objetivo, e quem sabe isso é o especialista, não este componente.
 */
export function ScanComparison({ deltas }: ScanComparisonProps) {
  if (deltas.length === 0) {
    return (
      <View className="mx-6 mt-6 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
        <Text className="text-zinc-400 text-xs leading-relaxed">
          Esta é a primeira análise. A partir da próxima, aqui aparece o que mudou — que é o número
          mais confiável desta tela.
        </Text>
      </View>
    );
  }

  return (
    <View className="mx-6 mt-6">
      <Text className="text-white text-xs font-black uppercase tracking-[0.2em] mb-1">
        O que mudou
      </Text>
      <Text className="text-zinc-500 text-[10px] mb-4">
        Desde a análise anterior. Estimativas — a diferença é mais confiável que o valor.
      </Text>

      <View className="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden">
        {deltas.map((delta, index) => {
          const unit = unitFor(delta.field);
          const sinal = delta.change > 0 ? '+' : '';

          return (
            <View
              key={delta.field}
              className={`flex-row items-center justify-between px-4 py-3 ${
                index > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <Text className="text-zinc-300 text-sm">{LABELS[delta.field]}</Text>

              <View className="flex-row items-baseline gap-2">
                <Text className="text-zinc-600 text-[11px]">
                  {delta.previous}
                  {unit} →
                </Text>
                <Text className="text-white text-sm font-bold">
                  {delta.current}
                  {unit}
                </Text>
                <Text className="text-primary text-xs font-black w-16 text-right">
                  {sinal}
                  {delta.change}
                  {unit}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
