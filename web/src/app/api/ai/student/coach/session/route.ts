import { type NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
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
}
