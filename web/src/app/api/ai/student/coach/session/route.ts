import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeStudent } from "@/lib/api-auth";
import { getAiReadinessScore } from "@/modules/ai/services/aiReadiness";
import {
  buildProfileSummary,
  loadStudentCoachContext,
} from "@/modules/ai/services/studentCoachContextLoader";
import {
  getOrCreateStudentCoachSession,
  getStudentSessionMessages,
} from "@/modules/ai/services/studentCoachService";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

const handler = async (request: NextRequest) => {
  const auth = await authorizeStudent(request);
  if (!auth.ok) return auth.response;
  const studentId = auth.caller.id;

  const ctx = await loadStudentCoachContext(studentId);

  const [sessionId] = await Promise.all([getOrCreateStudentCoachSession(studentId)]);
  const [profileSummary, messages] = await Promise.all([
    Promise.resolve(buildProfileSummary(ctx)),
    getStudentSessionMessages(sessionId),
  ]);

  const readiness = getAiReadinessScore(ctx);

  return NextResponse.json({
    sessionId,
    coachMode: ctx.coachMode,
    personaTrack: ctx.personaTrack,
    profileSummary,
    readiness,
    messageCount: messages.length,
    messages,
    activePlan: ctx.activePlan,
  });
};

export const GET = rotaDeIA(handler);
