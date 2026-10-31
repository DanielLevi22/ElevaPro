import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';

export function RecipeHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-center gap-3">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onBack} />
        <Text className="flex-1 text-[1.5rem] font-bold tracking-tight text-foreground">
          {title}
        </Text>
      </View>
      {subtitle ? <Text className="text-corpo text-muted-foreground">{subtitle}</Text> : null}
    </View>
  );
}
