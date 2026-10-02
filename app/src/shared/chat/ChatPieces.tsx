import type { ChatMessage } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useBottomOffset, useBrilho, useCores, useEscala } from '@/shared/design';

/**
 * As peças da conversa com um assistente de IA, no desenho do kit: o cabeçalho
 * com o selo do assistente, os balões, os três pontos e o campo de mensagem.
 * Saíram da tela do assistente de treino (#335) quando o de nutrição (#337)
 * precisou das mesmas.
 */

/** O topo do chat: voltar, o selo e "Assistente" com o assunto embaixo. */
export function AssistantHeader({
  subject,
  onBack,
  history,
}: {
  subject: string;
  onBack: () => void;
  history?: ReactNode;
}) {
  const colors = useCores();
  const scale = useEscala();

  return (
    <View className="flex-row items-center gap-3 pt-1.5">
      <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onBack} />
      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full border-[0.09375rem] border-primary bg-primary/20">
          <Ionicons name="sparkles" size={scale(17)} color={colors.primary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.96875rem] font-bold tracking-tight text-hero">Assistente</Text>
          <Text className="text-[0.71875rem] font-semibold text-muted-foreground" numberOfLines={1}>
            {subject}
          </Text>
        </View>
      </View>
      {history}
    </View>
  );
}

export function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  return (
    <View className="mt-[1.375rem] gap-3">
      {messages.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}
    </View>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <View className="items-end">
        <View className="max-w-[84%] rounded-[1.25rem] rounded-br-md bg-primary px-3.5 py-3">
          <Text className="text-[0.84375rem] font-semibold leading-[1.22rem] text-primary-foreground">
            {message.content}
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
          {message.content || '…'}
        </Text>
      </Vidro>
    </View>
  );
}

/** Os três pontos do kit enquanto a resposta não chega. */
export function TypingIndicator() {
  return (
    <View className="mt-3 items-start" accessibilityLabel="O assistente está respondendo">
      <Vidro
        classeExterna="rounded-[1.25rem] rounded-bl-md"
        className="flex-row gap-[0.3125rem] rounded-[1.25rem] rounded-bl-md px-3.5 py-3"
      >
        {['a', 'b', 'c'].map((dot) => (
          <View key={dot} className="h-1.5 w-1.5 rounded-full bg-placeholder" />
        ))}
      </Vidro>
    </View>
  );
}

/** Mesma altura da barra de duas ações do kit, no mesmo lugar acima da tab bar. */
/** Medida do fundo da tela, com o indicador do kit. */
const FROM_BOTTOM = 118;
const SEND_GLOW = { y: 10, blur: 26, espalhamento: -10 } as const;

export function ChatComposer({ busy, onSend }: { busy: boolean; onSend: (text: string) => void }) {
  const colors = useCores();
  const scale = useEscala();
  const glow = useBrilho();
  const bottom = useBottomOffset(FROM_BOTTOM);
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !busy;

  const send = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <View
      className="absolute left-[1.125rem] right-[1.125rem] flex-row gap-[0.5625rem]"
      style={{ bottom }}
    >
      <View className="h-[2.625rem] flex-1 justify-center overflow-hidden rounded-[0.8125rem] border border-glass-border bg-background px-3.5">
        <View className="absolute inset-0 bg-glass-strong" />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder="Pergunte ao assistente…"
          placeholderTextColor={colors.placeholder}
          returnKeyType="send"
          editable={!busy}
          accessibilityLabel="Mensagem para o assistente"
          className="text-[0.84375rem] text-foreground"
        />
      </View>
      <TouchableOpacity
        onPress={send}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        accessibilityState={{ disabled: !canSend }}
        className={cn(
          'h-[2.625rem] w-[2.625rem] items-center justify-center rounded-[0.8125rem]',
          canSend ? 'bg-primary' : 'border border-glass-border bg-background'
        )}
        style={canSend ? { boxShadow: glow(SEND_GLOW, { alfa: 0.8 }) } : undefined}
      >
        <Ionicons
          name="send"
          size={scale(15)}
          color={canSend ? colors.primaryForeground : colors.placeholder}
        />
      </TouchableOpacity>
    </View>
  );
}
