import { createHealthService } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeStudent } from "@/lib/api-auth";
import { clienteDoTitular } from "@/lib/supabase-titular";
import { decidirElegibilidade } from "@/modules/ai/services/escala";

/**
 * O aluno pode escanear? — perguntado ANTES da câmera.
 *
 * Existe porque a resposta chegava tarde demais: o aluno tirava três fotos,
 * esperava a análise e só então descobria que faltava a altura — numa tela que
 * oferecia "tentar de novo", num caminho que nunca podia funcionar.
 *
 * Responde **se** e **de onde viria a Escala**, nunca **quanto**. O app não
 * precisa da medida para abrir a câmera, e mandá-la seria dado de saúde
 * atravessando a fronteira sem finalidade (Art. 6º, III).
 *
 * A precedência não é reimplementada aqui: é a mesma função que a análise usa.
 * Com a regra em dois lugares, o portão libera e a análise recusa — que é o
 * defeito de origem, com outro nome.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeStudent(request);
  if (!auth.ok) return auth.response;

  // Sem `studentId` de parâmetro, de propósito: o aluno analisa a si mesmo, e um
  // id no query seria uma superfície para perguntar pela escala de outro.
  const userId = auth.caller.id;
  const client = clienteDoTitular(request);

  let temConsentimento: boolean;
  try {
    temConsentimento = await createHealthService(client).hasCollectionConsent(userId);
  } catch {
    return NextResponse.json({ error: "consent_check_failed" }, { status: 503 });
  }

  // Sem consentimento nada de saúde é lido — nem para decidir se pode escanear.
  if (!temConsentimento) {
    return NextResponse.json(
      decidirElegibilidade({ temConsentimento: false, avaliacao: null, anamnese: null }),
    );
  }

  const [avaliacaoRes, anamneseRes] = await Promise.all([
    client
      .from("physical_assessments")
      .select("height_cm, weight_kg")
      .eq("student_id", userId)
      .order("assessed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Os dois campos extraídos NO BANCO, e não `responses` inteiro: a coluna
    // guarda lesão, medicação e histórico clínico completo, e carregar tudo
    // isso para ler altura é o oposto da minimização (Art. 6º, III).
    client
      .from("student_anamnesis")
      .select("responses->height, responses->weight")
      .eq("student_id", userId)
      .maybeSingle(),
  ]);

  if (avaliacaoRes.error)
    return NextResponse.json({ error: "scale_lookup_failed" }, { status: 503 });
  if (anamneseRes.error)
    return NextResponse.json({ error: "scale_lookup_failed" }, { status: 503 });

  const avaliacao = avaliacaoRes.data
    ? {
        height_cm: Number(avaliacaoRes.data.height_cm),
        weight_kg: Number(avaliacaoRes.data.weight_kg),
      }
    : null;

  return NextResponse.json(
    decidirElegibilidade({
      temConsentimento: true,
      avaliacao,
      anamnese: anamneseRes.data as Record<string, unknown> | null,
    }),
  );
}
