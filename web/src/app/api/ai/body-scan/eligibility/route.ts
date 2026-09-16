import { createHealthService } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeStudent } from "@/lib/api-auth";
import { clienteDoTitular } from "@/lib/supabase-titular";
import { decideScanEligibility } from "@/modules/ai/services/escala";
import { loadScaleSources } from "@/modules/ai/services/scaleSources";

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
      decideScanEligibility({
        temConsentimento: false,
        specialistAssessment: null,
        declaredAssessment: null,
        anamnese: null,
      }),
    );
  }

  const loaded = await loadScaleSources(client, userId);
  if (!loaded.ok) return NextResponse.json({ error: "scale_lookup_failed" }, { status: 503 });

  return NextResponse.json(decideScanEligibility({ temConsentimento: true, ...loaded.sources }));
}
