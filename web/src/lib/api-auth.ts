import { type AccountType, createHealthService } from "@elevapro/shared";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  type AuthenticatorAssuranceLevel,
  assuranceLevelFromClaim,
  hasSecondFactor,
} from "./mfa/assurance";
import { supabaseAdmin } from "./supabase-admin";
import { clienteDoTitular } from "./supabase-titular";

/**
 * Autorização das rotas do BFF.
 *
 * As rotas usam `service_role`, que **ignora RLS por definição**. Aqui a RLS não
 * participa: a única barreira é a checagem que estas funções fazem. Por isso o
 * nome de cada uma carrega a garantia que ela dá.
 *
 * Existe porque a auditoria de 2026-08-11 encontrou doze cópias de autorização
 * espalhadas por `app/api/`, e duas funções chamadas `getCallerSpecialist` com
 * garantias diferentes: em `api/students/**` checavam tipo de conta e vínculo;
 * em `api/ai/chat/**` devolviam qualquer usuário autenticado. Como o `studentId`
 * vinha da URL, qualquer conta lia a anamnese de qualquer aluno.
 *
 * Regra: rota que toca `supabaseAdmin` importa daqui. `scripts/check-api-auth.js`
 * falha quando isso não acontece.
 *
 * @example
 * const auth = await authorizeLinkedSpecialist(request, studentId);
 * if (!auth.ok) return auth.response;
 * // auth.caller.id só existe depois do `if` — o tipo não deixa pular a checagem
 */

/** Quem está chamando, com o tipo de conta lido de `profiles`. */
export interface Caller {
  id: string;
  accountType: AccountType;
  assuranceLevel: AuthenticatorAssuranceLevel;
}

/**
 * Resultado em vez de exceção, de propósito: `caller` só é alcançável depois de
 * estreitar `ok`, então esquecer a checagem vira erro de tipo em vez de furo.
 */
export type AuthResult = { ok: true; caller: Caller } | { ok: false; response: NextResponse };

/** 401 é "não sei quem é você"; 403 é "sei, e não pode". */
function deny(status: 401 | 403 | 503, message: string): AuthResult {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
}

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Resolve somente a identidade autenticada, sem consultar papel ou perfil. */
export async function authenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  const {
    data: { user },
  } = await client.auth.getUser(token);
  return user?.id ?? null;
}

/**
 * Token válido. O `account_type` sai de `profiles`, nunca de `user_metadata` —
 * metadado de auth é escrito pelo próprio usuário via `updateUser`, então
 * confiar nele deixa o chamador escolher o próprio papel.
 */
export async function authorizeUser(request: NextRequest): Promise<AuthResult> {
  const token = bearerToken(request);
  if (!token) return deny(401, "Token ausente.");

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  const { data: claimsData, error: claimsError } = await client.auth.getClaims(token);
  const claims = claimsData?.claims;
  const userId = claims?.sub;
  if (claimsError || typeof userId !== "string") return deny(401, "Token inválido.");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return deny(403, "Perfil não encontrado.");

  return {
    ok: true,
    caller: {
      id: userId,
      accountType: profile.account_type as AccountType,
      assuranceLevel: assuranceLevelFromClaim(claims?.aal),
    },
  };
}

/** Especialista com segundo fator validado na sessão atual. */
export async function authorizeMfaSpecialist(request: NextRequest): Promise<AuthResult> {
  const auth = await authorizeSpecialist(request);
  if (!auth.ok) return auth;
  if (!hasSecondFactor(auth.caller.assuranceLevel)) return deny(403, "mfa_required");
  return auth;
}

/** Token válido e conta de especialista. */
export async function authorizeSpecialist(request: NextRequest): Promise<AuthResult> {
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth;
  if (auth.caller.accountType !== "specialist") return deny(403, "Apenas especialistas.");
  return auth;
}

/**
 * Token válido, conta de especialista e vínculo `active` com este aluno.
 *
 * Recebe `studentId` de propósito: rota que passa um aluno por parâmetro não
 * tem como esquecer a checagem sem que a chamada fique visivelmente diferente.
 */
export async function authorizeLinkedSpecialist(
  request: NextRequest,
  studentId: string,
): Promise<AuthResult> {
  const auth = await authorizeSpecialist(request);
  if (!auth.ok) return auth;

  const { data: link } = await supabaseAdmin
    .from("student_specialists")
    .select("id")
    .eq("specialist_id", auth.caller.id)
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!link) return deny(403, "Sem vínculo ativo com este aluno.");
  return auth;
}

/**
 * Token válido e conta de aluno. O id sai do token — quem chama nunca escolhe
 * de quem é o dado.
 */
export async function authorizeStudent(request: NextRequest): Promise<AuthResult> {
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth;
  const { accountType } = auth.caller;
  if (accountType !== "student" && accountType !== "member") return deny(403, "Apenas alunos.");
  return auth;
}

/**
 * Conta de aluno **e** consentimento vigente para dado de saúde.
 *
 * Cinco rotas mandavam anamnese, peso e percentual de gordura para a Anthropic
 * checando só autenticação. O `HealthDataConsentGate` do app não fecha isso: ele
 * é portão de cliente, e estas rotas usam `service_role`, então a RLS não
 * participa (`ADR-0015`). Um token de aluno válido alcançava a rota direto, sem
 * passar pela tela.
 *
 * O Art. 11, I pede consentimento no ponto em que o dado **sai do banco**, não
 * na interface — e é aqui que ele sai.
 *
 * A consulta roda sob a identidade do titular, não com `service_role`: quem
 * pergunta se pode tratar o dado de alguém não deveria estar usando a chave que
 * ignora as regras dele.
 *
 * @example
 * const auth = await authorizeStudentWithHealthConsent(request);
 * if (!auth.ok) return auth.response;
 */
export async function authorizeStudentWithHealthConsent(request: NextRequest): Promise<AuthResult> {
  const auth = await authorizeStudent(request);
  if (!auth.ok) return auth;

  let consentiu: boolean;
  try {
    consentiu = await createHealthService(clienteDoTitular(request)).hasCollectionConsent(
      auth.caller.id,
    );
  } catch {
    // "Não consegui perguntar" não é "pode": na dúvida, o dado não sai. E o
    // código separa a falha de infraestrutura da recusa, que pedem ações
    // diferentes de quem lê.
    return deny(503, "consent_check_failed");
  }

  // Código estável para o app distinguir "falta consentir" de "deu erro" e
  // oferecer o fluxo, em vez de mostrar falha genérica.
  return consentiu ? auth : deny(403, "consent_required");
}
