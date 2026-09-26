import type { ServiceType } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * O "Tipo de acompanhamento" do kit: as combinações de serviço como escolha
 * única — "Treino + Nutrição", "Somente treino", "Somente nutrição".
 *
 * Só aparece a combinação que o especialista presta inteira: quem só dá treino
 * vê "Somente treino", e o BFF recusaria qualquer outra (#332).
 *
 * @example <ServiceChoice offered={['personal_training']} selected={sel} onSelect={setSel} />
 */
interface ServiceOption {
  services: ServiceType[];
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: ServiceOption[] = [
  {
    services: ['personal_training', 'nutrition_consulting'],
    title: 'Treino + Nutrição',
    sub: 'Plano completo, 2 serviços',
    icon: 'barbell-outline',
  },
  {
    services: ['personal_training'],
    title: 'Somente treino',
    sub: 'Periodização e execução',
    icon: 'pulse-outline',
  },
  {
    services: ['nutrition_consulting'],
    title: 'Somente nutrição',
    sub: 'Dieta e macros',
    icon: 'nutrition-outline',
  },
];

const ICON_SIZE = 17;
const MARK_SIZE = 19;

function sameServices(a: readonly ServiceType[], b: readonly ServiceType[]): boolean {
  return a.length === b.length && a.every((service) => b.includes(service));
}

interface ServiceChoiceProps {
  offered: readonly ServiceType[];
  selected: readonly ServiceType[];
  onSelect: (services: ServiceType[]) => void;
}

export function ServiceChoice({ offered, selected, onSelect }: ServiceChoiceProps) {
  const available = OPTIONS.filter((option) => option.services.every((s) => offered.includes(s)));
  if (available.length === 0) {
    return (
      <Text className="text-legenda text-muted-foreground">
        Nenhum serviço configurado no seu perfil ainda.
      </Text>
    );
  }
  return (
    <>
      {available.map((option) => (
        <OptionRow
          key={option.title}
          option={option}
          active={sameServices(option.services, selected)}
          onPress={() => onSelect(option.services)}
        />
      ))}
    </>
  );
}

function OptionRow({
  option,
  active,
  onPress,
}: {
  option: ServiceOption;
  active: boolean;
  onPress: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Vidro
        classeExterna="mb-[0.5625rem]"
        className={cn(
          'flex-row items-center gap-3 p-[0.8125rem]',
          active ? 'border-primary/50' : null
        )}
      >
        <View
          className={cn(
            'h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.6875rem]',
            active ? 'bg-primary' : 'bg-glass-strong'
          )}
        >
          <Ionicons
            name={option.icon}
            size={escalar(ICON_SIZE)}
            color={active ? cores.primaryForeground : cores.mutedForeground}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.84375rem] font-bold text-foreground">{option.title}</Text>
          <Text className="text-[0.71875rem] text-muted-foreground">{option.sub}</Text>
        </View>
        <Ionicons
          name={active ? 'checkmark-circle-outline' : 'ellipse-outline'}
          size={escalar(MARK_SIZE)}
          color={active ? cores.primaryText : cores.placeholder}
        />
      </Vidro>
    </TouchableOpacity>
  );
}
