import { type AssessmentTransport, createPhysicalAssessmentClient } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";

async function sessionHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function readResult<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? fallback);
  return result as T;
}

/** O BFF pelo `fetch` relativo do web, com o token da sessão. */
const webTransport: AssessmentTransport = {
  get: async (path, fallback, signal) =>
    readResult(await fetch(path, { signal, headers: await sessionHeaders() }), fallback),
  send: async (method, path, body, fallback) =>
    readResult(
      await fetch(path, {
        method,
        headers: { "Content-Type": "application/json", ...(await sessionHeaders()) },
        body: JSON.stringify(body),
      }),
      fallback,
    ),
};

/**
 * As avaliações físicas pelo BFF — o mesmo cliente que o app usa.
 *
 * @example await assessmentClient.list(studentId);
 */
export const assessmentClient = createPhysicalAssessmentClient(webTransport);
