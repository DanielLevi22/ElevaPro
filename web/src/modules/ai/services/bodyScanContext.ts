import {
  type BodyScanDelta,
  type BodyScanRecord,
  createBodyScanService,
  linhasMedidas,
  ressalvasDoScan,
} from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * O índice que vai no contexto de todo turno: quantas análises existem e a data
 * da mais recente. Nada além disso — o corpo vem por `query_body_scan`.
 *
 * Sem essa linha o modelo não sabe que a ferramenta tem o que devolver e nunca
 * a chama. Foi o mesmo defeito dos ids de fase: a ferramenta existia e o
 * contexto não a anunciava.
 */
/**
 * A frase que apresenta `query_body_scan` ao modelo.
 *
 * Fica aqui, e não no roteiro, de propósito: só aparece quando existem
 * análises. Anunciar uma ferramenta que voltaria vazia gasta contexto em todo
 * turno e convida a chamada inútil.
 *
 * Exportada porque é ela que o contrato das ferramentas aponta ao verificar que
 * nenhuma ferramenta registrada é invisível para o modelo.
 */
export const CONVITE_DA_ANALISE_CORPORAL =
  "Use 'query_body_scan' se a composição corporal ou a postura importarem para o que você vai prescrever.";

export async function formatBodyScanIndex(studentId: string): Promise<string> {
  const scans = await createBodyScanService(supabaseAdmin).list(studentId, 10);

  if (scans.length === 0) {
    return "--- ANÁLISE CORPORAL ---\nNenhuma análise por imagem registrada.";
  }

  const ultima = new Date(scans[0].scanned_at).toLocaleDateString("pt-BR");

  return [
    "--- ANÁLISE CORPORAL ---",
    `${scans.length} ${scans.length === 1 ? "análise" : "análises"} por imagem. A mais recente em ${ultima}.`,
    CONVITE_DA_ANALISE_CORPORAL,
  ].join("\n");
}

/**
 * O corpo do resultado, para a ferramenta devolver.
 *
 * A comparação vem antes das medidas porque é o número confiável: o erro
 * sistemático da estimativa se repete entre dois escaneamentos e se cancela na
 * diferença (`ADR-0010`).
 */
/**
 * O corpo da resposta, montado a partir do que já foi lido.
 *
 * Puro e separado da consulta de propósito: é a decisão de domínio — o que
 * quem prescreve vê, e com que ressalva —, e o projeto já trata esse tipo de
 * seam assim (`escala.ts`). Testar isto não exige banco, e é o que garante que
 * medida e estimativa não se misturem.
 */
export function descreverScanParaFerramenta(
  latest: BodyScanRecord | null,
  previous: BodyScanRecord | null,
  deltas: BodyScanDelta[],
): string {
  if (!latest) {
    return JSON.stringify({ erro: "Nenhuma análise corporal registrada para este aluno." });
  }

  return JSON.stringify({
    data: new Date(latest.scanned_at).toLocaleDateString("pt-BR"),
    aviso:
      "Circunferências ESTIMADAS a partir da altura como escala, erro de 5 a 10%. A variação é confiável; o valor absoluto não é medida.",
    variacao_desde_a_anterior: previous
      ? deltas.map((d) => ({ campo: d.field, de: d.previous, para: d.current, mudanca: d.change }))
      : "primeira análise — não há comparação",
    postura: {
      simetria: latest.posture_symmetry_score,
      muscular: latest.posture_muscle_score,
      geral: latest.posture_overall_score,
      observacoes: latest.recommendations,
    },
    medidas_estimadas: {
      peito: latest.circ_chest,
      cintura: latest.circ_waist,
      quadril: latest.circ_hips,
      braco: latest.circ_arms,
      coxa: latest.circ_thighs,
      gordura_pct: latest.body_fat_pct,
    },
    // Bloco separado das estimativas de propósito: estas saem de geometria da
    // foto, não de leitura do modelo, e são o que muda decisão de trabalho
    // unilateral e mobilidade. Misturadas com as circunferências, herdariam o
    // aviso de erro de 5 a 10% que não se aplica a elas.
    medido_no_aparelho: linhasMedidas(latest).map((linha) => ({
      medida: linha.rotulo,
      valor: linha.valor,
      unidade: linha.unidade,
      lado: linha.lado,
    })),
    // Vão junto, nunca depois: medida sem a ressalva faz quem prescreve decidir
    // em cima dela achando que está firme.
    ressalvas_da_captura: ressalvasDoScan(latest),
    como_usar:
      "Achado postural orienta unilateral e mobilidade. Não diagnostique a partir dele, e não atribua queixa do aluno a um achado sem ele relatar.",
  });
}

/**
 * O corpo do resultado, para a ferramenta devolver.
 *
 * A comparação vem antes das medidas porque é o número confiável: o erro
 * sistemático da estimativa se repete entre dois escaneamentos e se cancela na
 * diferença (`ADR-0010`).
 */
export async function queryBodyScan(studentId: string): Promise<string> {
  const { latest, previous, deltas } =
    await createBodyScanService(supabaseAdmin).latestWithComparison(studentId);

  return descreverScanParaFerramenta(latest, previous, deltas);
}
