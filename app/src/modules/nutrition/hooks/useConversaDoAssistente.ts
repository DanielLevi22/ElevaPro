import type { AnaliseDoPrato } from '@elevapro/shared';
import { useState } from 'react';
import { mensagemDeErroBff } from '@/shared/bff';
import { FoodRecognitionService } from '../services/FoodRecognitionService';
import { fotoDoPrato } from '../services/fotoDoPrato';
import { type ChatMessage, NutriBotService } from '../services/NutriBotService';
import type { PlanoDoDia } from './usePlanoDoDia';

export interface ConversaDoAssistente {
  mensagens: ChatMessage[];
  respondendo: boolean;
  enviar: (texto: string) => void;
  /** Escolhe a foto de um prato, reconhece e pergunta sobre o resultado. */
  anexarFoto: () => void;
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
 * A foto anexada passa pelo reconhecimento do scan, e **só o resultado** entra
 * na conversa. A imagem nunca vai para o histórico do chat (issue #298).
 *
 * @example
 * const conversa = useConversaDoAssistente(registro.plano, { primeiroNome: 'Daniel', obterToken });
 */
export function useConversaDoAssistente(
  plano: PlanoDoDia,
  { primeiroNome, obterToken }: OpcoesDaConversa
): ConversaDoAssistente {
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

  const anexarFoto = async () => {
    if (respondendo) return;
    const uri = await fotoDoPrato('galeria');
    if (!uri) return;
    setRespondendo(true);
    try {
      const analise = await FoodRecognitionService.analyzeFoodImage(uri, obterToken());
      setRespondendo(false);
      enviar(perguntaSobreOPrato(analise));
    } catch (erro) {
      setMensagens((atuais) => [
        ...atuais,
        mensagemDoAssistente(`erro-${Date.now()}`, mensagemDeErroBff(erro)),
      ]);
      setRespondendo(false);
    }
  };

  return { mensagens: [saudacao, ...mensagens], respondendo, enviar, anexarFoto };
}

function mensagemDoAssistente(
  id: string,
  conteudo: string,
  sugestao: ChatMessage['sugestao'] = null
): ChatMessage {
  return { id, role: 'assistant', content: conteudo, createdAt: Date.now(), sugestao };
}

function mensagemDoAluno(conteudo: string): ChatMessage {
  return { id: `aluno-${Date.now()}`, role: 'user', content: conteudo, createdAt: Date.now() };
}

/** A resposta do assistente, ou a causa da falha dita no próprio chat. */
async function responder(historico: ChatMessage[], pergunta: string, token: string) {
  try {
    const { reply, sugestao } = await NutriBotService.perguntar(historico, pergunta, token);
    return mensagemDoAssistente(`resposta-${Date.now()}`, reply, sugestao);
  } catch (erro) {
    return mensagemDoAssistente(`erro-${Date.now()}`, mensagemDeErroBff(erro));
  }
}

/** O que a foto vira na conversa: o prato reconhecido, em texto, e a pergunta. */
function perguntaSobreOPrato(analise: AnaliseDoPrato): string {
  const macros = `${Math.round(analise.protein)} g de proteína, ${Math.round(analise.carbs)} g de carboidrato e ${Math.round(analise.fat)} g de gordura`;
  return `Fotografei meu prato: ${analise.name}, cerca de ${Math.round(analise.calories)} kcal (${macros}). Cabe no meu plano de hoje?`;
}

function textoDaSaudacao(primeiroNome: string, plano: PlanoDoDia): string {
  if (!plano.temPlano) {
    return `Oi, ${primeiroNome}! Você ainda não tem plano alimentar, mas posso tirar dúvidas de nutrição.`;
  }
  const calorias = Math.max(0, Math.round(plano.meta.calorias - plano.consumo.calorias));
  const proteina = Math.max(0, Math.round(plano.meta.proteina - plano.consumo.proteina));
  return `Oi, ${primeiroNome}! Faltam ${calorias} kcal e ${proteina} g de proteína para fechar sua meta de hoje.`;
}
