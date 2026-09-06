import { memo } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

const PRESETS = [15, 30, 45, 60] as const;

interface MetaDeTempoProps {
  metaEmMinutos: number | null;
  minutosDigitados: string;
  onEscolherPreset: (minutos: number) => void;
  onDigitar: (texto: string) => void;
}

/**
 * Escolha da meta de tempo, antes de a sessão começar.
 *
 * Some assim que o cronômetro anda: mudar a meta no meio da corrida faria o
 * aviso de "meta atingida" disparar retroativamente, ou nunca mais.
 */
export const MetaDeTempo = memo(function MetaDeTempo({
  metaEmMinutos,
  minutosDigitados,
  onEscolherPreset,
  onDigitar,
}: MetaDeTempoProps) {
  return (
    <View className="mb-4 w-full">
      <Text className="text-zinc-400 text-xs font-bold uppercase mb-3 text-center">
        Definir Meta de Tempo
      </Text>

      <View className="flex-row flex-wrap justify-center gap-3 mb-4">
        {PRESETS.map((minutos) => {
          const escolhido = metaEmMinutos === minutos;
          return (
            <TouchableOpacity
              key={minutos}
              onPress={() => onEscolherPreset(minutos)}
              accessibilityRole="button"
              accessibilityState={{ selected: escolhido }}
              // As classes aparecem literais no fonte: montar `bg-${cor}` em
              // runtime produz classe que não existe no CSS do NativeWind.
              className={
                escolhido
                  ? 'px-5 py-2 rounded-xl border bg-orange-500 border-orange-500'
                  : 'px-5 py-2 rounded-xl border bg-zinc-800 border-zinc-700'
              }
            >
              <Text className={escolhido ? 'font-bold text-white' : 'font-bold text-zinc-400'}>
                {minutos} min
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row items-center justify-center mt-2">
        <View
          className={
            minutosDigitados
              ? 'flex-row items-center bg-zinc-800 rounded-xl border border-orange-500 px-5 py-3'
              : 'flex-row items-center bg-zinc-800 rounded-xl border border-zinc-700 px-5 py-3'
          }
        >
          <TextInput
            keyboardType="number-pad"
            accessibilityLabel="Meta de tempo em minutos"
            className="text-white font-bold text-2xl w-20 text-center p-0"
            placeholder="00"
            placeholderTextColor="#52525B"
            value={minutosDigitados}
            onChangeText={onDigitar}
            maxLength={3}
          />
          <Text className="text-zinc-500 font-bold text-base ml-2">min</Text>
        </View>
      </View>
    </View>
  );
});
