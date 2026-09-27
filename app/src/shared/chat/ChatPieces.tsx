import type { ChatMessage } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';

/**
 * As peças da conversa com um assistente de IA, no desenho do kit: o cabeçalho
 * com o selo do assistente, os balões, os três pontos e o campo de mensagem.
 * Saíram da tela do assistente de treino (#335) quando o de nutrição (#337)
 * precisou das mesmas.
 */

/** O topo do chat: voltar, o selo e "Assistente" com o assunto embaixo. */
export function CabecalhoDoAssistente({
  assunto,
  onVoltar,
}: {
  assunto: string;
  onVoltar: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="flex-row items-center gap-3 pt-1.5">
      <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onVoltar} />
      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full border-[0.09375rem] border-primary bg-primary/20">
          <Ionicons name="sparkles" size={escalar(17)} color={cores.primary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.96875rem] font-bold tracking-tight text-hero">Assistente</Text>
          <Text className="text-[0.71875rem] font-semibold text-muted-foreground" numberOfLines={1}>
            {assunto}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function Baloes({ mensagens }: { mensagens: ChatMessage[] }) {
  return (
    <View className="mt-[1.375rem] gap-3">
      {mensagens.map((mensagem) => (
        <Balao key={mensagem.id} mensagem={mensagem} />
      ))}
    </View>
  );
}

function Balao({ mensagem }: { mensagem: ChatMessage }) {
  if (mensagem.role === 'user') {
    return (
      <View className="items-end">
        <View className="max-w-[84%] rounded-[1.25rem] rounded-br-md bg-primary px-3.5 py-3">
          <Text className="text-[0.84375rem] font-semibold leading-[1.22rem] text-primary-foreground">
            {mensagem.content}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View className="items-start">
      <Vidro
        classeExterna="max-w-[84%] rounded-[1.25rem] rounded-bl-md"
        className="rounded-[1.25rem] rounded-bl-md px-3.5 py-3"
      >
        <Text className="text-[0.84375rem] leading-[1.22rem] text-foreground">
          {mensagem.content || '…'}
        </Text>
      </Vidro>
    </View>
  );
}

/** Os três pontos do kit enquanto a resposta não chega. */
export function Digitando() {
  return (
    <View className="mt-3 items-start" accessibilityLabel="O assistente está respondendo">
      <Vidro
        classeExterna="rounded-[1.25rem] rounded-bl-md"
        className="flex-row gap-[0.3125rem] rounded-[1.25rem] rounded-bl-md px-3.5 py-3"
      >
        {['a', 'b', 'c'].map((ponto) => (
          <View key={ponto} className="h-1.5 w-1.5 rounded-full bg-placeholder" />
        ))}
      </Vidro>
    </View>
  );
}

/** Mesma altura da barra de duas ações do kit, no mesmo lugar acima da tab bar. */
const ACIMA_DO_INSET = 84;
const BRILHO_DO_ENVIO = { y: 10, blur: 26, espalhamento: -10 } as const;

export function CampoDaConversa({
  respondendo,
  onEnviar,
}: {
  respondendo: boolean;
  onEnviar: (texto: string) => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const podeEnviar = texto.trim().length > 0 && !respondendo;

  const enviar = () => {
    if (!podeEnviar) return;
    onEnviar(texto);
    setTexto('');
  };

  return (
    <View
      className="absolute left-[1.125rem] right-[1.125rem] flex-row gap-[0.5625rem]"
      style={{ bottom: insets.bottom + escalar(ACIMA_DO_INSET) }}
    >
      <View className="h-[2.625rem] flex-1 justify-center overflow-hidden rounded-[0.8125rem] border border-glass-border bg-background px-3.5">
        <View className="absolute inset-0 bg-glass-strong" />
        <TextInput
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={enviar}
          placeholder="Pergunte ao assistente…"
          placeholderTextColor={cores.placeholder}
          returnKeyType="send"
          editable={!respondendo}
          accessibilityLabel="Mensagem para o assistente"
          className="text-[0.84375rem] text-foreground"
        />
      </View>
      <TouchableOpacity
        onPress={enviar}
        disabled={!podeEnviar}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        accessibilityState={{ disabled: !podeEnviar }}
        className={cn(
          'h-[2.625rem] w-[2.625rem] items-center justify-center rounded-[0.8125rem]',
          podeEnviar ? 'bg-primary' : 'border border-glass-border bg-background'
        )}
        style={podeEnviar ? { boxShadow: brilho(BRILHO_DO_ENVIO, { alfa: 0.8 }) } : undefined}
      >
        <Ionicons
          name="send"
          size={escalar(15)}
          color={podeEnviar ? cores.primaryForeground : cores.placeholder}
        />
      </TouchableOpacity>
    </View>
  );
}
