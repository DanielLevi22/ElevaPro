import { Text, TouchableOpacity, View } from 'react-native';

/**
 * Título de seção do kit de vidro, com uma ação opcional à direita.
 *
 * É maior e mais próximo do conteúdo que o rótulo maiúsculo das telas chapadas:
 * 19 em peso 700, alinhado pela linha de base com a ação. Toda tela de vidro
 * usa este par, e é por isso que ele é componente e não duas linhas repetidas.
 *
 * @example
 * <TituloDeSecao acao="Ver tudo" onAcao={verTreinos}>Treino do dia</TituloDeSecao>
 */
interface TituloDeSecaoProps {
  children: string;
  acao?: string;
  onAcao?: () => void;
}

export function TituloDeSecao({ children, acao, onAcao }: TituloDeSecaoProps) {
  return (
    <View className="mb-2.5 mt-5 flex-row items-baseline justify-between px-0.5">
      <Text className="text-h2 font-bold tracking-tight text-foreground">{children}</Text>
      {acao ? (
        <TouchableOpacity onPress={onAcao} disabled={!onAcao} accessibilityRole="button">
          <Text className="text-legenda font-semibold text-primary-text">{acao}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
