import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist, authorizeUser } from "@/lib/api-auth";

/** Autoriza o titular ou especialista vinculado; a consulta mantém a RLS. Ex.: authorizeAssessmentReader(request, studentId). */
export async function authorizeAssessmentReader(request: NextRequest, studentId: string) {
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth;
  if (auth.caller.accountType === "student" || auth.caller.accountType === "member") {
    if (auth.caller.id === studentId) return auth;
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Apenas seus próprios dados." }, { status: 403 }),
    };
  }
  return authorizeLinkedSpecialist(request, studentId);
}
