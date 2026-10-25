import { type AssessmentTransport, createPhysicalAssessmentClient } from '@elevapro/shared';
import { tokenDaSessao } from '@/auth';
import { BffHttpError, getBff, postBff } from '@/shared/bff';

/**
 * A mensagem que a rota escreveu para gente, ou a do cliente quando não escreveu.
 *
 * As rotas de avaliação devolvem `{ error: "Sem vínculo ativo com este aluno." }`,
 * e o `BffHttpError` guarda esse texto em `code`. Sem texto da rota — rede, proteção
 * da plataforma, 500 — vale a mensagem de quem chamou, e o erro original vai em
 * `cause` para o diagnóstico.
 */
function readableError(error: unknown, fallback: string): Error {
  if (error instanceof BffHttpError && !error.code.startsWith('http_')) {
    return new Error(error.code, { cause: error });
  }
  return new Error(fallback, { cause: error });
}

const appTransport: AssessmentTransport = {
  get: <T>(path: string, fallback: string) =>
    getBff<T>(path, { token: tokenDaSessao() }).catch((error: unknown) => {
      throw readableError(error, fallback);
    }),
  send: <T>(method: 'POST' | 'PATCH', path: string, body: unknown, fallback: string) =>
    postBff<T>(path, body, { method, token: tokenDaSessao() }).catch((error: unknown) => {
      throw readableError(error, fallback);
    }),
};

/**
 * As avaliações físicas pelo BFF — o mesmo cliente que o web usa.
 *
 * @example await assessmentClient.list(studentId);
 */
export const assessmentClient = createPhysicalAssessmentClient(appTransport);
