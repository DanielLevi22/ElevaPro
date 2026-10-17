import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { clienteDoTitular } from "@/lib/supabase-titular";
import { attachTraceId, traceIdForRequest } from "@/lib/trace";
import {
  assessmentCorrectionSchema,
  authorizeAssessmentReader,
  correctAssessment,
  readAssessmentRevisions,
} from "@/modules/students/server";

type RouteContext = { params: Promise<{ id: string; assessmentId: string }> };
const correctionErrors: Record<string, [number, string]> = {
  "42501": [403, "Sem autorização para corrigir esta avaliação."],
  P0002: [404, "Avaliação não encontrada."],
  "40001": [
    409,
    "Esta avaliação foi corrigida em outra sessão. Feche e reabra a ficha para carregar a versão atual.",
  ],
  "22023": [422, "Valores inválidos: informe peso e altura positivos e medidas entre 0 e 999,99."],
  "22P02": [422, "Valores inválidos: informe medidas numéricas."],
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id: studentId, assessmentId } = await params;
  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const traceId = traceIdForRequest(request);
  const input = assessmentCorrectionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      {
        error:
          "Valores inválidos: envie medidas numéricas, peso e altura positivos e observações de até 10000 caracteres.",
      },
      { status: 422 },
    );
  try {
    const { data: assessment, error } = await correctAssessment({
      studentId,
      assessmentId,
      actorId: auth.caller.id,
      ...input.data,
      traceId,
    });
    if (error) {
      const [status, message] = correctionErrors[error.code] ?? [
        500,
        "Não foi possível corrigir a avaliação.",
      ];
      return attachTraceId(NextResponse.json({ error: message }, { status }), traceId);
    }
    return attachTraceId(NextResponse.json({ assessment }), traceId);
  } catch {
    return attachTraceId(
      NextResponse.json({ error: "Não foi possível corrigir a avaliação." }, { status: 500 }),
      traceId,
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id: studentId, assessmentId } = await params;
  const auth = await authorizeAssessmentReader(request, studentId);
  if (!auth.ok) return auth.response;
  const traceId = traceIdForRequest(request);
  try {
    const { data: revisions, error } = await readAssessmentRevisions(
      clienteDoTitular(request),
      studentId,
      assessmentId,
    );
    if (error)
      return NextResponse.json(
        { error: "Não foi possível consultar as correções." },
        { status: 500 },
      );
    if (revisions?.length)
      await recordSecurityAuditEvent({
        eventType: "health.assessment.read",
        outcome: "succeeded",
        actorId: auth.caller.id,
        subjectId: studentId,
        resourceType: "physical_assessment_collection",
        traceId,
      });
    return attachTraceId(NextResponse.json({ revisions }), traceId);
  } catch {
    return attachTraceId(
      NextResponse.json({ error: "Não foi possível consultar as correções." }, { status: 500 }),
      traceId,
    );
  }
}
