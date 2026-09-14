import type { SugestaoDoAssistente } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

interface CartaoDaSugestaoProps {
  sugestao: SugestaoDoAssistente;
  onAdicionar: () => void;
}

/**
 * O cartão "Adicionar ao jantar" do kit: a sugestão aplicável que veio com a
 * resposta do assistente, com a refeição, os itens e as gramas.
 *
 * O título é "Adicionar ao diário", e a refeição vai na linha de baixo: o nome
 * vem do plano ("Ceia", "Café da manhã"), e "ao" antes dele erra o gênero.
 *
 * "Adicionar" leva ao diálogo do registro, com a refeição citada já escolhida;
 * "Ver macros" abre as calorias e os macros de cada item.
 *
 * @example
 * <CartaoDaSugestao sugestao={mensagem.sugestao} onAdicionar={() => registrar(mensagem.sugestao)} />
 */
export function CartaoDaSugestao({ sugestao, onAdicionar }: CartaoDaSugestaoProps) {
  const cores = useCores();
  const escalar = useEscala();
  const [verMacros, setVerMacros] = useState(false);
  const resumo = sugestao.itens.map((item) => `${item.nome} ${item.gramas} g`).join(' · ');

  return (
    <Vidro classeExterna="mt-1" className="flex-row items-start gap-3 p-3.5">
      <View className="h-8 w-8 shrink-0 items-center justify-center rounded-[0.6875rem] bg-metrica-proteina/20">
        <Ionicons name="clipboard-outline" size={escalar(15)} color={cores.textoProteina} />
      </View>
      <View className="flex-1">
        <Text className="text-[0.84375rem] font-bold text-foreground">Adicionar ao diário</Text>
        <Text className="mt-0.5 text-[0.75rem] text-muted-foreground">{`${sugestao.refeicao} · ${resumo}`}</Text>
        {verMacros ? <MacrosDosItens sugestao={sugestao} /> : null}
        <View className="mt-[0.6875rem] flex-row gap-2">
          <TouchableOpacity
            onPress={onAdicionar}
            accessibilityRole="button"
            className="h-[2.375rem] flex-1 items-center justify-center rounded-[0.8125rem] bg-primary"
          >
            <Text className="text-[0.71875rem] font-extrabold uppercase tracking-wide text-primary-foreground">
              Adicionar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setVerMacros((atual) => !atual)}
            accessibilityRole="button"
            accessibilityState={{ expanded: verMacros }}
            className="h-[2.375rem] flex-1 items-center justify-center rounded-[0.8125rem] border border-glass-border bg-glass-strong"
          >
            <Text className="text-[0.71875rem] font-extrabold uppercase tracking-wide text-foreground">
              {verMacros ? 'Esconder' : 'Ver macros'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Vidro>
  );
}

function MacrosDosItens({ sugestao }: { sugestao: SugestaoDoAssistente }) {
  return (
    <View className="mt-2 gap-1">
      {sugestao.itens.map((item) => (
        <Text key={item.nome} className="text-[0.71875rem] text-muted-foreground">
          {`${item.nome}: ${Math.round(item.calorias)} kcal · P ${Math.round(item.proteina)} g · C ${Math.round(item.carboidrato)} g · G ${Math.round(item.gordura)} g`}
        </Text>
      ))}
    </View>
  );
}
