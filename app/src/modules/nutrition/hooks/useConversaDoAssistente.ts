import { useState } from 'react';
import { mensagemDeErroBff } from '@/shared/bff';
import { type ChatMessage, NutriBotService } from '../services/NutriBotService';
import { type PlanoDoDia, usePlanoDoDia } from './usePlanoDoDia';

export interface ConversaDoAssistente {
  mensagens: ChatMessage[];
  respondendo: boolean;
  enviar: (texto: string) => void;
}

interface OpcoesDaConversa {
  primeiroNome: string;
  /** O token da sessão na hora do envio: a rota o lê do login. */
  obterToken: () => string;
}

/**
 * A conversa do aluno com o assistente de nutrição.
 *
 * A conversa vive só na tela: não é gravada, e sai da memória quando o aluno
 * volta. A primeira mensagem é montada aqui, com o que falta do dia, e não
 * pedida à IA — não há o que perguntar ao modelo para dizer uma conta. Por
 * isso ela também não vai no histórico enviado: leva o nome do aluno.
 *
 * @example
 * const conversa = useConversaDoAssistente(user.id, { primeiroNome: 'Daniel', obterToken });
 */
export function useConversaDoAssistente(
  alunoId: string,
  { primeiroNome, obterToken }: OpcoesDaConversa
): ConversaDoAssistente {
  const plano = usePlanoDoDia(alunoId, { somenteLeitura: true });
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [respondendo, setRespondendo] = useState(false);

  const saudacao = mensagemDoAssistente('saudacao', textoDaSaudacao(primeiroNome, plano));

  const enviar = async (texto: string) => {
    const pergunta = texto.trim();
    if (!pergunta || respondendo) return;
    // A saudação fica fora do histórico que vai ao provedor: ela tem o nome do
    // aluno, e o que atravessa a fronteira é o mínimo (LGPD, Art. 6°, III).
    const historico = mensagens;
    setMensagens((atuais) => [...atuais, mensagemDoAluno(pergunta)]);
    setRespondendo(true);
    const resposta = await responder(historico, pergunta, obterToken());
    setMensagens((atuais) => [...atuais, resposta]);
    setRespondendo(false);
  };

  return { mensagens: [saudacao, ...mensagens], respondendo, enviar };
}

function mensagemDoAssistente(id: string, conteudo: string): ChatMessage {
  return { id, role: 'assistant', content: conteudo, createdAt: Date.now() };
}

function mensagemDoAluno(conteudo: string): ChatMessage {
  return { id: `aluno-${Date.now()}`, role: 'user', content: conteudo, createdAt: Date.now() };
}

/** A resposta do assistente, ou a causa da falha dita no próprio chat. */
async function responder(historico: ChatMessage[], pergunta: string, token: string) {
  try {
    const resposta = await NutriBotService.sendMessage(historico, pergunta, token);
    return mensagemDoAssistente(`resposta-${Date.now()}`, resposta);
  } catch (erro) {
    return mensagemDoAssistente(`erro-${Date.now()}`, mensagemDeErroBff(erro));
  }
}

function textoDaSaudacao(primeiroNome: string, plano: PlanoDoDia): string {
  if (!plano.temPlano) {
    return `Oi, ${primeiroNome}! Você ainda não tem plano alimentar, mas posso tirar dúvidas de nutrição.`;
  }
  const calorias = Math.max(0, Math.round(plano.meta.calorias - plano.consumo.calorias));
  const proteina = Math.max(0, Math.round(plano.meta.proteina - plano.consumo.proteina));
  return `Oi, ${primeiroNome}! Faltam ${calorias} kcal e ${proteina} g de proteína para fechar sua meta de hoje.`;
}
