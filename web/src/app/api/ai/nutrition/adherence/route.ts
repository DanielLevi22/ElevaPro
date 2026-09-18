import { type NextRequest, NextResponse } from "next/server";
import { withAiRoute } from "@/lib/ai-route";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { responderEmUmTurno } from "@/modules/ai/providers/turnoUnico";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

const handler = async (request: NextRequest) => {
  // Antes: `getAuthenticatedUserId`, uma cópia local que fazia
  // `const { data } = await client.auth.getUser(token)` — descartando o erro — e
  // devolvia só "existe um usuário". Nunca dizia qual papel ele tem, e o
  // `check-api-auth.js` não pegava porque a rota não toca `supabaseAdmin`.
  // `authorizeUser` deixava qualquer autenticado pedir análise de log
  // alimentar de quem mandasse o corpo. Quem chama é o app do aluno, pelo
  // próprio aluno logado — e `diet_logs` é dado de saúde (Art. 11).
  const auth = await authorizeStudentWithHealthConsent(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    planName: string;
    adherenceData: {
      totalMeals: number;
      completedMeals: number;
      logs: Record<string, unknown>[];
    };
  };

  const { planName, adherenceData } = body;

  if (!planName || !adherenceData) {
    return NextResponse.json({ error: "planName, adherenceData are required" }, { status: 400 });
  }

  const prompt = `Você é um assistente nutricionista esportivo sênior.
Analise a aderência semanal com base nos logs fornecidos.

CONTEXTO:
Plano: ${planName}
Logs dos últimos 7 dias: ${adherenceData.logs.length} entradas.
Refeições Completas: ${adherenceData.completedMeals} de ${adherenceData.totalMeals}.
Logs Brutos (Amostra): ${JSON.stringify(adherenceData.logs.slice(0, 10))}

TAREFA:
Escreva um resumo semanal conciso (máx. 3 pontos) para o nutricionista.
Foque em padrões (ex: "Consistente dias de semana mas errou no fds").
Se houver poucos dados, mencione que o aluno precisa registrar mais.
Tom: Profissional, direto e útil. Idioma: Português (Brasil).`;

  const { texto } = await responderEmUmTurno(aiProviders.fast, {
    systemBlocks: [],
    messages: [{ role: "user", content: prompt }],
    tools: [],
    maxTokens: 512,
  });

  return NextResponse.json({ summary: texto || "Sem dados suficientes para análise." });
};

export const POST = withAiRoute(handler);
