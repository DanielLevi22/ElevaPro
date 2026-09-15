import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { CartaoDaSugestao } from '../../components/aluno/CartaoDaSugestao';
import { ConfirmacaoDoRegistro } from '../../components/aluno/ConfirmacaoDoRegistro';
import {
  type ConversaDoAssistente,
  useConversaDoAssistente,
} from '../../hooks/useConversaDoAssistente';
import { type RegistroNoDiario, useRegistroNoDiario } from '../../hooks/useRegistroNoDiario';
import { pedidoDaSugestao } from '../../services/itensEstimados';
import type { ChatMessage } from '../../services/NutriBotService';

/**
 * Tela 6 do fluxo de nutrição do kit: a conversa com o assistente, as perguntas
 * rápidas e o envio.
 *
 * Três diferenças do kit, por decisão da #298:
 * - "NutriBot" vira "Assistente", com "nutrição" embaixo: é o mesmo assistente
 *   do app, em outra superfície (`CONTEXT.md`);
 * - o kit desenha a barra "Anexar foto · Enviar mensagem" sem campo para
 *   escrever. Aqui a barra é anexar, o campo e enviar;
 * - "online" vira "nutrição": o assistente não fica offline, e o status diria
 *   uma coisa que não significa nada.
 *
 * @example
 * <AssistenteDeNutricaoScreen alunoId={user.id} primeiroNome="Daniel" somenteLeitura={false} obterToken={() => token} />
 */
interface AssistenteDeNutricaoScreenProps {
  alunoId: string;
  primeiroNome: string;
  somenteLeitura: boolean;
  obterToken: () => string;
}

const PERGUNTAS_RAPIDAS = ['Trocar o lanche', 'Receita rápida', 'Quanto de água?'];

export function AssistenteDeNutricaoScreen({
  alunoId,
  primeiroNome,
  somenteLeitura,
  obterToken,
}: AssistenteDeNutricaoScreenProps) {
  const router = useRouter();
  const registro = useRegistroNoDiario(alunoId, { somenteLeitura });
  const conversa = useConversaDoAssistente(registro.plano, { primeiroNome, obterToken });
  const rolagem = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassScreen
        bottomSpace="actionBar"
        scrollRef={rolagem}
        overlay={
          <CampoDaConversa
            respondendo={conversa.respondendo}
            onEnviar={conversa.enviar}
            onAnexar={conversa.anexarFoto}
          />
        }
      >
        <CabecalhoDoAssistente onVoltar={router.back} />
        <Baloes conversa={conversa} registro={registro} />
        <TituloDeSecao estilo="rotulo">Perguntas rápidas</TituloDeSecao>
        <View className="flex-row flex-wrap gap-2">
          {PERGUNTAS_RAPIDAS.map((pergunta) => (
            <TouchableOpacity
              key={pergunta}
              onPress={() => conversa.enviar(pergunta)}
              disabled={conversa.respondendo}
              accessibilityRole="button"
            >
              <Vidro classeExterna="rounded-full" className="rounded-full px-3.5 py-[0.5625rem]">
                <Text className="text-[0.78125rem] font-semibold text-muted-foreground">
                  {pergunta}
                </Text>
              </Vidro>
            </TouchableOpacity>
          ))}
        </View>
        <ConfirmacaoDoRegistro registro={registro} />
      </GlassScreen>
    </KeyboardAvoidingView>
  );
}

function CabecalhoDoAssistente({ onVoltar }: { onVoltar: () => void }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="flex-row items-center gap-3 pt-1.5">
      <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={onVoltar} />
      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full border-[0.09375rem] border-primary bg-primary/20">
          <Ionicons name="sparkles" size={escalar(17)} color={cores.primary} />
        </View>
        <View>
          <Text className="text-[0.96875rem] font-bold tracking-tight text-hero">Assistente</Text>
          <View className="flex-row items-center gap-[0.3125rem]">
            <View className="h-1.5 w-1.5 rounded-full bg-metrica-proteina" />
            <Text className="text-[0.71875rem] font-semibold text-texto-macro-proteina">
              nutrição
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Baloes({
  conversa,
  registro,
}: {
  conversa: ConversaDoAssistente;
  registro: RegistroNoDiario;
}) {
  return (
    <View className="mt-[1.375rem] gap-3">
      {conversa.mensagens.map(({ sugestao, ...mensagem }) => (
        <View key={mensagem.id} className="gap-2">
          <Balao mensagem={mensagem} />
          {sugestao ? (
            <CartaoDaSugestao
              sugestao={sugestao}
              onAdicionar={() => registro.pedir(pedidoDaSugestao(sugestao), sugestao.refeicao)}
            />
          ) : null}
        </View>
      ))}
      {conversa.respondendo ? <Digitando /> : null}
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
          {mensagem.content}
        </Text>
      </Vidro>
    </View>
  );
}

/** Os três pontos do kit enquanto a resposta não chega. */
function Digitando() {
  return (
    <View className="items-start" accessibilityLabel="O assistente está respondendo">
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

interface CampoDaConversaProps {
  respondendo: boolean;
  onEnviar: (texto: string) => void;
  /** A foto do prato passa pelo reconhecimento, e só o resultado vai à conversa. */
  onAnexar: () => void;
}

function CampoDaConversa({ respondendo, onEnviar, onAnexar }: CampoDaConversaProps) {
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
      <TouchableOpacity
        onPress={onAnexar}
        disabled={respondendo}
        accessibilityRole="button"
        accessibilityLabel="Anexar foto do prato"
        className="h-[2.625rem] w-[2.625rem] items-center justify-center overflow-hidden rounded-[0.8125rem] border border-glass-border bg-background"
      >
        <View className="absolute inset-0 bg-glass-strong" />
        <Ionicons name="image-outline" size={escalar(17)} color={cores.foreground} />
      </TouchableOpacity>
      {/* Vidro forte sobre a cor da tela, como a secundária da barra de ações:
          a conversa rola por baixo e não pode atravessar o que se digita. */}
      <View className="h-[2.625rem] flex-1 justify-center overflow-hidden rounded-[0.8125rem] border border-glass-border bg-background px-3.5">
        <View className="absolute inset-0 bg-glass-strong" />
        <TextInput
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={enviar}
          placeholder="Pergunte ao assistente…"
          placeholderTextColor={cores.placeholder}
          returnKeyType="send"
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
