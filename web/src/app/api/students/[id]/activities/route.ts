import type { ActivityAuthorFilter } from "@elevapro/shared";
import { createActivityService } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Atividades de um aluno, agrupadas por dia.
 *
 * Substitui `/api/students/[id]/history`, que listava três tipos de evento
 * soltos e não lia a PSE (`perceived_exertion`, antes `intensity`) nem `notes` — as duas colunas que o app coletava
 * a cada sessão e ninguém exibia.
 *
 * A rota agrega tabelas sensíveis com `service_role`, que **ignora RLS por
 * definição**: aqui a política do banco não participa e a única barreira é
 * `authorizeLinkedSpecialist`. Ela vem antes de qualquer SELECT, e
 * `scripts/check-api-auth.js` falha se o import sumir.
 */

const AUTORIAS: ActivityAuthorFilter[] = ["student", "specialist", "all"];

/**
 * O default é `student` porque a pergunta que traz o especialista a esta tela é
 * "o aluno está fazendo o combinado?". O que ele mesmo fez, ele já sabe.
 */
function autoriaDe(request: NextRequest): ActivityAuthorFilter {
  const bruto = request.nextUrl.searchParams.get("author");
  return AUTORIAS.find((a) => a === bruto) ?? "student";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;

    const days = await createActivityService(supabaseAdmin).fetchStudentActivities(
      studentId,
      autoriaDe(request),
    );

    return NextResponse.json({ days });
  } catch {
    // Sem capturar o objeto: o erro do PostgREST pode carregar o payload, e `notes` é
    // dado sensível de saúde.
    logger.error("students.activities.load_failed");
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
