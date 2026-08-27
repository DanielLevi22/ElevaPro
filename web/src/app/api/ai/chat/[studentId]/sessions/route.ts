import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import {
  archiveSession,
  createSession,
  listSessions,
  sessionOwnedBy,
} from "@/modules/ai/services/chatService";

/**
 * As conversas do especialista com o coach sobre este aluno.
 *
 * Todas as operações passam por `authorizeLinkedSpecialist`: estas rotas usam
 * `service_role`, que não consulta RLS, então o vínculo é verificado aqui ou
 * não é verificado em lugar nenhum.
 */

/** Lista as conversas não arquivadas, mais recente primeiro. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;

  const module =
    request.nextUrl.searchParams.get("module") === "nutrition" ? "nutrition" : "workout";

  const sessions = await listSessions(studentId, auth.caller.id, module);
  return NextResponse.json({ sessions });
}

/** Abre uma conversa nova, mesmo havendo outras. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const module = body?.module === "nutrition" ? "nutrition" : "workout";

  const sessionId = await createSession(studentId, auth.caller.id, module);
  return NextResponse.json({ sessionId });
}

/** Arquiva: sai da lista, permanece no banco. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body?.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // O id vem do cliente. Sem confirmar o dono, arquivar viraria um jeito de
  // mexer na conversa de outro especialista — a mesma classe do IDOR da
  // dívida 27, por uma porta diferente.
  const owned = await sessionOwnedBy(body.sessionId, studentId, auth.caller.id);
  if (!owned) {
    return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  }

  await archiveSession(owned);
  return NextResponse.json({ success: true });
}
