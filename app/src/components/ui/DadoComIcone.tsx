import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

/**
 * Um dado curto com o ícone dele: "6 exercícios", "60 s", "Daniel L.".
 *
 * O kit repete esse par em todo cartão do fluxo de treino, e ele tinha nascido
 * três vezes com nomes diferentes (`Dado`, `Metadado`), mudando só a cor. O
 * tom diz onde ele está: sobre foto com véu, ou sobre o vidro.
 *
 * @example
 * <DadoComIcone icone="barbell" texto="6 exercícios" tom="sobreImagem" />
 */
interface DadoComIconeProps {
  icone: keyof typeof Ionicons.glyphMap;
  texto: string;
  tom?: 'vidro' | 'sobreImagem';
}

const TAMANHO_DO_ICONE = 13;

const TEXTO = {
  vidro: 'text-[0.71875rem] text-muted-foreground',
  sobreImagem: 'text-micro text-sobre-imagem-secundario',
} as const;

export function DadoComIcone({ icone, texto, tom = 'vidro' }: DadoComIconeProps) {
  const cores = useCores();
  const escalar = useEscala();
  const cor = tom === 'vidro' ? cores.placeholder : cores.sobreImagemSecundario;

  return (
    <View className="flex-row items-center gap-[0.3125rem]">
      <Ionicons name={icone} size={escalar(TAMANHO_DO_ICONE)} color={cor} />
      <Text className={TEXTO[tom]}>{texto}</Text>
    </View>
  );
}

export type { DadoComIconeProps };
