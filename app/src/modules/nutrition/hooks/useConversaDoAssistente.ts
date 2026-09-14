import { useState } from 'react';
import { mensagemDeErroBff } from '@/shared/bff';
import { type ChatMessage, NutriBotService } from '../services/NutriBotService';
import { usePlanoDoDia } from './usePlanoDoDia';

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
 * pedida à IA — não há o que perguntar ao modelo para dizer uma conta.
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

  const faltam = {
    calorias: Math.max(0, Math.round(plano.meta.calorias - plano.consumo.calorias)),
    proteina: Math.max(0, Math.round(plano.meta.proteina - plano.consumo.proteina)),
  };
  const saudacao = mensagemDoAssistente(
    'saudacao',
    plano.temPlano
      ? `Oi, ${primeiroNome}! Faltam ${faltam.calorias} kcal e ${faltam.proteina} g de proteína para fechar sua meta de hoje.`
      : `Oi, ${primeiroNome}! Você ainda não tem plano alimentar, mas posso tirar dúvidas de nutrição.`
  );

  const enviar = async (texto: string) => {
    const pergunta = texto.trim();
    if (!pergunta || respondendo) return;
    const doAluno: ChatMessage = {
      id: `aluno-${Date.now()}`,
      role: 'user',
      content: pergunta,
      createdAt: Date.now(),
    };
    const historico = [saudacao, ...mensagens];
    setMensagens((atuais) => [...atuais, doAluno]);
    setRespondendo(true);
    try {
      const resposta = await NutriBotService.sendMessage(historico, pergunta, obterToken());
      setMensagens((atuais) => [
        ...atuais,
        mensagemDoAssistente(`resposta-${Date.now()}`, resposta),
      ]);
    } catch (erro) {
      setMensagens((atuais) => [
        ...atuais,
        mensagemDoAssistente(`erro-${Date.now()}`, mensagemDeErroBff(erro)),
      ]);
    } finally {
      setRespondendo(false);
    }
  };

  return { mensagens: [saudacao, ...mensagens], respondendo, enviar };
}

function mensagemDoAssistente(id: string, conteudo: string): ChatMessage {
  return { id, role: 'assistant', content: conteudo, createdAt: Date.now() };
}
