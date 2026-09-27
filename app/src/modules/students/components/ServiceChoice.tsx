import type { ServiceType } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { GlassChoice } from '@/components/ui/GlassChoice';

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
        <GlassChoice
          key={option.title}
          icon={option.icon}
          title={option.title}
          sub={option.sub}
          active={sameServices(option.services, selected)}
          onPress={() => onSelect(option.services)}
        />
      ))}
    </>
  );
}
