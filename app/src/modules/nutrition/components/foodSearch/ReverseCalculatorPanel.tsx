import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors as brandColors } from '@/constants/colors';
import { useCores, useEscala } from '@/shared/design';
import type { ReverseCalculator } from '../../hooks/useReverseCalculator';
import type { MacroType } from '../../types';

const MACROS: MacroType[] = ['protein', 'carbs', 'fat', 'calories'];

const MACRO_LABEL: Record<MacroType, string> = {
  protein: 'PROT',
  carbs: 'CARB',
  fat: 'GORD',
  calories: 'KCAL',
};

const ICON_SIZE = 20;

/**
 * A calculadora reversa: liga cada macro e digita o alvo dele. Recolhe para
 * deixar mais lista à vista.
 *
 * @example
 * <ReverseCalculatorPanel calculator={useReverseCalculator(substitutionTarget)} />
 */
export function ReverseCalculatorPanel({ calculator }: { calculator: ReverseCalculator }) {
  const cores = useCores();
  const escalar = useEscala();
  const [open, setOpen] = useState(true);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between bg-background-primary p-3 rounded-xl border border-zinc-800"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="calculator-outline"
            size={escalar(ICON_SIZE)}
            color={brandColors.secondary.main}
          />
          <Text className="text-zinc-300 font-bold text-sm">Calculadora Reversa</Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={escalar(ICON_SIZE)}
          color={cores.mutedForeground}
        />
      </TouchableOpacity>

      {open && (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {MACROS.map((macro) => (
            <MacroTarget key={macro} macro={macro} calculator={calculator} />
          ))}
        </View>
      )}
    </>
  );
}

function MacroTarget({ macro, calculator }: { macro: MacroType; calculator: ReverseCalculator }) {
  const cores = useCores();
  const isActive = calculator.activeMacros.includes(macro);

  return (
    <View
      className={`flex-row items-center rounded-xl border overflow-hidden h-12 w-[48%] ${
        isActive ? 'bg-zinc-900' : 'bg-transparent border-zinc-800'
      }`}
      style={isActive ? { borderColor: brandColors.primary.start } : undefined}
    >
      <TouchableOpacity
        className={`h-full px-3 justify-center items-center flex-1 ${isActive ? 'border-r border-zinc-800' : ''}`}
        onPress={() => calculator.toggle(macro)}
      >
        <Text
          className={`text-[0.625rem] font-black uppercase tracking-widest ${
            isActive ? 'text-white' : 'text-zinc-600'
          }`}
        >
          {MACRO_LABEL[macro]}
        </Text>
      </TouchableOpacity>

      {isActive && (
        <View className="w-16 h-full justify-center">
          <TextInput
            className="h-full w-full text-center text-sm p-0 text-white font-black italic"
            placeholder="0"
            placeholderTextColor={cores.placeholder}
            keyboardType="numeric"
            value={calculator.targets[macro] || ''}
            onChangeText={(value) => calculator.setTarget(macro, value)}
            style={{ textAlignVertical: 'center', includeFontPadding: false }}
          />
        </View>
      )}
    </View>
  );
}
