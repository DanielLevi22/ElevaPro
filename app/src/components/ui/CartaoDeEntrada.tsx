import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCores } from '@/shared/design';

/**
 * O cartão que leva a uma seção, na Home.
 *
 * Nasceu porque a Home tinha cinco cópias do mesmo bloco — mesmo raio, mesma
 * borda, mesmo chevron, mesmo ícone em quadrado colorido —, e cada nova seção
 * significava copiar a quinta e trocar três palavras. O arquivo passou de 662
 * linhas, acima do limite do `CLAUDE.md`, e a #194 pedia mais um cartão.
 *
 * A cor entra como valor e não como classe montada em runtime: `bg-${tom}-500`
 * produz classe que o Tailwind não gera, porque ele lê o fonte e não o que o
 * código monta.
 */
interface CartaoDeEntradaProps {
  icone: keyof typeof Ionicons.glyphMap;
  /** Cor do ícone. O fundo e a borda derivam dela por opacidade. */
  cor: string;
  titulo: string;
  /** A linha miúda em maiúsculas. Carrega estado quando a seção tem estado. */
  legenda: string;
  /** Cor da legenda. Só a Anamnese usa: nela o estado é a informação principal. */
  corDaLegenda?: string;
  onPress: () => void;
  className?: string;
}

export function CartaoDeEntrada({
  icone,
  cor,
  titulo,
  legenda,
  corDaLegenda,
  onPress,
  className = 'mt-4',
}: CartaoDeEntradaProps) {
  const cores = useCores();
  return (
    <TouchableOpacity activeOpacity={0.8} className={className} onPress={onPress}>
      <View
        className="rounded-[24px] p-5 flex-row items-center justify-between border bg-card"
        style={{ borderColor: cores.border }}
      >
        <View className="flex-row items-center gap-4 flex-1">
          <View
            className="p-3 rounded-xl border"
            style={{ backgroundColor: `${cor}15`, borderColor: `${cor}30` }}
          >
            <Ionicons color={cor} name={icone} size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-lg font-black font-display tracking-tight">
              {titulo}
            </Text>
            <Text
              className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase font-sans"
              style={corDaLegenda === undefined ? undefined : { color: corDaLegenda }}
            >
              {legenda}
            </Text>
          </View>
        </View>
        <Ionicons color={cores.mutedForeground} name="chevron-forward" size={20} />
      </View>
    </TouchableOpacity>
  );
}
