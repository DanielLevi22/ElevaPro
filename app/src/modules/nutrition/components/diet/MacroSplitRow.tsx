import { Text, View } from 'react-native';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { StepButton } from './StepButton';

/**
 * Um macro na "Distribuição de macros" do kit: nome, gramas e percentual na cor
 * do macro, e a barra. Proteína e gordura têm "−"/"+"; o carbo fecha a conta.
 *
 * @example <MacroSplitRow macro="protein" grams={168} percent={30} onStep={ajustar} />
 */
export type MacroKind = 'protein' | 'carbs' | 'fat';

interface MacroSplitRowProps {
  macro: MacroKind;
  grams: number;
  percent: number;
  /** Sem ele, a linha só mostra: é o carbo, que fecha em 100%. */
  onStep?: (delta: number) => void;
}

const NAME: Record<MacroKind, string> = {
  protein: 'Proteína',
  carbs: 'Carboidrato',
  fat: 'Gordura',
};
const TEXT: Record<MacroKind, string> = {
  protein: 'text-primary-text dark:text-primary',
  carbs: 'text-foreground dark:text-secondary',
  fat: 'text-foreground dark:text-accent',
};
const BAR = { protein: 'proteina', carbs: 'carboidrato', fat: 'gordura' } as const;

const STEP = 5;
// O kit desenha a barra no dobro do percentual: 30% enche 60% do trilho.
const BAR_SCALE = 2;

export function MacroSplitRow({ macro, grams, percent, onStep }: MacroSplitRowProps) {
  return (
    <Vidro classeExterna="mb-[0.5625rem]" className="p-[0.8125rem]">
      <View className="mb-2 flex-row items-center justify-between gap-2">
        <Text className="text-[0.8125rem] font-bold text-foreground">{NAME[macro]}</Text>
        <View className="flex-row items-center gap-2">
          {onStep && (
            <StepButton
              direction="down"
              label={`Menos ${NAME[macro]}`}
              onPress={() => onStep(-STEP)}
            />
          )}
          <Text className="text-[0.78125rem] text-muted-foreground">
            <Text className={cn('font-bold', TEXT[macro])}>{`${grams} g`}</Text>
            {` · ${percent}%`}
          </Text>
          {onStep && (
            <StepButton direction="up" label={`Mais ${NAME[macro]}`} onPress={() => onStep(STEP)} />
          )}
        </View>
      </View>
      <BarraDeProgresso percentual={percent * BAR_SCALE} tom={BAR[macro]} />
    </Vidro>
  );
}
