import type { SugestaoDeRefeicao } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * "Sugestões do assistente" da busca: dois cartões com o nome, as kcal, os
 * minutos de preparo e o destaque.
 *
 * O kit desenha uma foto em cada cartão. A sugestão é texto do modelo e não
 * tem foto, então o lugar dela é um bloco com o ícone de refeição, e o
 * destaque continua sobre ele, no canto. Sem sugestão, a seção não aparece.
 *
 * @example
 * <SugestoesDoAssistente sugestoes={sugestoes} />
 */
export function SugestoesDoAssistente({ sugestoes }: { sugestoes: SugestaoDeRefeicao[] }) {
  if (sugestoes.length === 0) return null;

  return (
    <>
      <TituloDeSecao estilo="rotulo">Sugestões do assistente</TituloDeSecao>
      <View className="flex-row gap-2.5">
        {sugestoes.map((sugestao) => (
          <CartaoDeSugestao key={sugestao.nome} sugestao={sugestao} />
        ))}
      </View>
    </>
  );
}

function CartaoDeSugestao({ sugestao }: { sugestao: SugestaoDeRefeicao }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro classeExterna="flex-1" className="p-[0.5625rem]">
      <View className="h-[6.5rem] items-center justify-center rounded-[0.9375rem] bg-glass-strong">
        <Ionicons name="restaurant-outline" size={escalar(26)} color={cores.mutedForeground} />
        <View className="absolute bottom-2 left-2 rounded-full bg-primary px-2 py-[0.1875rem]">
          <Text
            numberOfLines={1}
            className="text-[0.5625rem] font-extrabold uppercase tracking-wide text-primary-foreground"
          >
            {sugestao.destaque}
          </Text>
        </View>
      </View>
      <Text
        numberOfLines={2}
        className="mt-2.5 text-[0.84375rem] font-bold tracking-tight text-foreground"
      >
        {sugestao.nome}
      </Text>
      <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">
        {`${Math.round(sugestao.calorias)} kcal · ${Math.round(sugestao.minutos)} min`}
      </Text>
    </Vidro>
  );
}
