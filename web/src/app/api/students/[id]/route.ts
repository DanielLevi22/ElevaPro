import {
  CIRCUMFERENCE_FIELDS,
  type PhysicalAssessmentInput,
  SKINFOLD_FIELDS,
} from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    const body = await request.json();
    const { full_name, measurements } = body as {
      full_name?: string;
      measurements?: Record<string, string | number | null>;
    };

    // profiles only has: id, email, full_name, avatar_url, account_type, account_status, created_at
    if (full_name !== undefined) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ full_name })
        .eq("id", studentId);
      if (error) throw error;
    }

    // Upsert measurements into physical_assessments
    if (measurements && Object.values(measurements).some((v) => v !== null && v !== "")) {
      // O corpo da requisição não escolhe coluna. Só as chaves da ficha
      // passam; qualquer outra é descartada em vez de seguir para o banco.
      const camposPermitidos = new Set<string>([
        ...CIRCUMFERENCE_FIELDS.map((f) => f.key),
        ...SKINFOLD_FIELDS.map((f) => f.key),
        "weight_kg",
        "height_cm",
        "body_fat_pct",
        "muscle_mass_kg",
      ]);

      const numeric: PhysicalAssessmentInput = {};
      for (const [key, val] of Object.entries(measurements)) {
        if (!camposPermitidos.has(key)) continue;
        Object.assign(numeric, { [key]: val !== null && val !== "" ? Number(val) : null });
      }

      // Sem `as unknown as AssessmentInsert`. O cast existia para calar o tipo
      // gerado do schema — que teria acusado, um a um, os catorze nomes de
      // coluna que não existiam. Com ele fora, o compilador volta a ser a
      // guarda que impede esta rota de gravar em campo inventado.
      // Sempre INSERT, nunca UPDATE.
      //
      // A avaliação física é imutável por política — `LGPD_COMPLIANCE.md`
      // seção 12 e a RLS da migration `0017`, que concede ao especialista
      // apenas INSERT. Esta rota fazia UPDATE pelo `service_role`, que ignora
      // RLS: o que a política proibia ao cliente, o servidor fazia assim mesmo.
      //
      // O motivo da regra é de dado, não de burocracia: corrigir uma medida
      // antiga reescreve o histórico clínico do aluno. Medida errada se corrige
      // com avaliação nova — e é essa sequência que a evolução mostra.
      // Altura e peso não são medidas entre outras: são a Escala que calibra o
      // Body scan do aluno (`0037`). Avaliação sem os dois não serve de fonte, e
      // aceitar em silêncio devolvia o problema ao aluno três telas depois —
      // barrado na análise, com um "tente de novo" que nunca podia funcionar.
      const alturaCm = Number(numeric.height_cm);
      const pesoKg = Number(numeric.weight_kg);

      if (!Number.isFinite(alturaCm) || !Number.isFinite(pesoKg)) {
        return NextResponse.json({ error: "height_and_weight_required" }, { status: 422 });
      }

      const { error: writeError } = await supabaseAdmin.from("physical_assessments").insert({
        student_id: studentId,
        specialist_id: caller.id,
        ...numeric,
        // Depois do spread: o `numeric` carrega os dois como opcionais, e sem
        // esta ordem o tipo gerado do schema não sabe que eles chegaram.
        height_cm: alturaCm,
        weight_kg: pesoKg,
      });

      // O resultado do insert e do update era descartado: a gravação falhava e
      // a rota respondia `success: true`.
      if (writeError) throw writeError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/students/:id]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    // Soft delete — status → inactive (preserva histórico)
    const { error } = await supabaseAdmin
      .from("student_specialists")
      .update({
        status: "inactive",
        ended_by: caller.id,
        ended_at: new Date().toISOString(),
      })
      .eq("specialist_id", caller.id)
      .eq("student_id", studentId)
      .eq("status", "active");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/students/:id]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
