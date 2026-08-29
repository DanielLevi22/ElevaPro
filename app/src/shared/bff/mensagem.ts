/**
 * Traduz um erro do BFF na frase que o usuário lê.
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 *
 * O `client.ts` distingue com cuidado as causas de uma chamada de IA falhar —
 * segredo de bypass recusado, variável ausente, proteção de plataforma na
 * frente da rota, timeout. Nada disso chegava à tela: cada serviço e cada
 * screen tinha o seu `catch` devolvendo uma frase fixa, e as quatro causas
 * viravam a mesma palavra. Diagnosticar exigia depurador no APK.
 *
 * Uma função e não uma frase melhor em cada `catch` porque o problema é o
 * mesmo do `client.ts`: cópia do tratamento é como o ponto cego fica uniforme.
 * Aqui a tradução mora num lugar só, e quem chama só decide ONDE mostrar.
 *
 * ── O que ela não faz ────────────────────────────────────────────────────────
 *
 * Não engole. Quem chama já está num `catch`; esta função só nomeia o que
 * aconteceu. Erro que não é do BFF sai com a própria mensagem, e só o
 * desconhecido de verdade cai na frase genérica.
 */

import { BffConfigError, BffHttpError, BffNotJsonError, BffUnreachableError } from './client';

/** Última linha de defesa: nem `Error` era. */
const GENERICA = 'Não consegui falar com a IA agora. Tente de novo em instantes.';

/**
 * A frase para o usuário, carregando a causa.
 *
 * @example
 * try { await NutriBotService.sendMessage(...) }
 * catch (erro) { setErro(mensagemDeErroBff(erro)) }
 */
export function mensagemDeErroBff(erro: unknown): string {
  // A ordem importa: as três primeiras são subclasses de Error com informação
  // acionável. Checá-las antes do Error genérico é o que impede a mensagem boa
  // de ser trocada pela ruim.
  if (
    erro instanceof BffConfigError ||
    erro instanceof BffUnreachableError ||
    erro instanceof BffNotJsonError
  ) {
    return erro.message;
  }

  // O BFF respondeu e recusou. O `code` é o que a rota devolveu — `403
  // consent_required` é situação do produto, não falha de transporte, e merece
  // frase própria.
  if (erro instanceof BffHttpError) {
    if (erro.code === 'consent_required') {
      return 'Preciso do seu consentimento para usar seus dados de saúde antes de responder.';
    }
    return `A IA recusou a chamada (${erro.code}).`;
  }

  if (erro instanceof Error && erro.message) return erro.message;

  return GENERICA;
}
