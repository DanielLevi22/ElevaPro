import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * Um alimento em linha de vidro: ícone numa caixa, nome, porção e o que o call
 * site puser à direita — kcal no prato, "+" na busca.
 *
 * É a linha que o kit repete nos alimentos da refeição e nos resultados da
 * busca, mudando só o ícone e a ponta direita.
 *
 * @example
 * <LinhaDoAlimento icone="restaurant-outline" nome="Arroz integral" sub="150 g · 4 g proteína"
 *   direita={<Text>186</Text>} />
 */
interface LinhaDoAlimentoProps {
  icone: keyof typeof Ionicons.glyphMap;
  /** A cor do ícone. Sem ela, o tom secundário do texto. */
  corDoIcone?: string;
  nome: string;
  sub: string;
  direita?: ReactNode;
  onPress?: () => void;
  rotuloDeAcessibilidade?: string;
}

const TAMANHO_DO_ICONE = 16;

export function LinhaDoAlimento({
  icone,
  corDoIcone,
  nome,
  sub,
  direita,
  onPress,
  rotuloDeAcessibilidade,
}: LinhaDoAlimentoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={rotuloDeAcessibilidade}
      className="mb-[0.5625rem]"
    >
      <Vidro className="flex-row items-center gap-3 p-3">
        <View className="h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-[0.6875rem] bg-glass-strong">
          <Ionicons
            name={icone}
            size={escalar(TAMANHO_DO_ICONE)}
            color={corDoIcone ?? cores.mutedForeground}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[0.875rem] font-semibold text-foreground">
            {nome}
          </Text>
          <Text numberOfLines={1} className="mt-px text-[0.71875rem] text-muted-foreground">
            {sub}
          </Text>
        </View>
        {direita}
      </Vidro>
    </TouchableOpacity>
  );
}
