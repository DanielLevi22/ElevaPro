import { INJURY_REGIONS, type InjuryRegion } from '@elevapro/shared/data/anamnesisAdaptive';
import { View } from 'react-native';
import { ChipMulti } from '@/components/ui/ChipMulti';
import { OnboardingLabel } from './OnboardingFrame';

interface InjuryRegionPickerProps {
  selected: readonly InjuryRegion[];
  onChange: (regions: InjuryRegion[]) => void;
}

/**
 * Onde dói: aparece quando a pessoa diz que tem lesão ou dor, em O5. A lesão é
 * guardada por região (#365), como na anamnese longa.
 *
 * @example <InjuryRegionPicker selected={regioes} onChange={setRegioes} />
 */
export function InjuryRegionPicker({ selected, onChange }: InjuryRegionPickerProps) {
  const toggle = (region: InjuryRegion) =>
    onChange(
      selected.includes(region) ? selected.filter((item) => item !== region) : [...selected, region]
    );
  return (
    <>
      <OnboardingLabel>Onde?</OnboardingLabel>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="list">
        {INJURY_REGIONS.map((region) => (
          <ChipMulti
            key={region}
            label={region}
            selected={selected.includes(region)}
            onPress={() => toggle(region)}
          />
        ))}
      </View>
    </>
  );
}
