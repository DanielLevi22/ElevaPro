import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const summary = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ summary: summary || "Sem dados suficientes para análise." });
}
