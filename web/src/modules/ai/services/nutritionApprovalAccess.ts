import { NextRequest, NextResponse } from "next/server";
import { NutritionChatError, resolveNutritionChat } from "./nutritionDraftChat";
import { type Acesso, acessoDoEspecialista } from "./rotaDeAprovacao";

/** Aprovação usa a mesma conversa/rascunho da tela e reconfirma consentimento.
 * @example acesso: nutritionApprovalAccess
 */
export const nutritionApprovalAccess: Acesso = async (request, params) => {
  const access = await acessoDoEspecialista("nutrition")(new NextRequest(request.clone()), params);
  if (!access.ok) return access;
  if (!access.specialistId)
    return {
      ok: false,
      response: NextResponse.json({ error: "Especialista não autorizado." }, { status: 403 }),
    };
  const body = await request.json().catch(() => null);
  try {
    await resolveNutritionChat({
      studentId: access.studentId,
      specialistId: access.specialistId,
      sessionId: access.sessionId,
      planId: typeof body?.planId === "string" ? body.planId : undefined,
    });
    return access;
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: error instanceof NutritionChatError ? error.code : undefined,
          error:
            error instanceof NutritionChatError
              ? error.message
              : "Não foi possível conferir a autorização.",
        },
        { status: error instanceof NutritionChatError ? error.status : 503 },
      ),
    };
  }
};
