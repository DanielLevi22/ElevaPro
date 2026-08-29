import { lerRespostaNumerica } from "@elevapro/shared";

/**
 * A Escala de um Body scan: a altura e o peso que calibram a estimativa.
 *
 * Sem eles o modelo voltaria a chutar, que é exatamente o que o `ADR-0010`
 * removeu — por isso a recusa é um resultado legítimo desta função, e não um
 * caso de erro.
 *
 * Puro de propósito: a precedência é a regra que o portão de elegibilidade e a
 * própria análise precisam responder igual. Com ela dentro de um carregador,
 * afirmar essa igualdade exigiria subir o banco, e o defeito que ela evita é o
 * aluno passar pelo portão para ser recusado depois de tirar três fotos.
 */

/** De onde vieram altura e peso. O scan grava isto: o número sozinho mentiria. */
export type FonteDaEscala = "assessment" | "anamnese";

/**
 * Por que não há Escala. Cada motivo leva a uma ação diferente do aluno, e um
 * motivo só para todos faria a tela mandar responder de novo quem já respondeu.
 */
export type MotivoSemEscala = "sem_anamnese" | "altura_invalida" | "peso_invalido";

export type Escala =
  | { ok: true; heightCm: number; weightKg: number; fonte: FonteDaEscala }
  | { ok: false; motivo: MotivoSemEscala };

export interface Avaliacao {
  height_cm: number;
  weight_kg: number;
}

export interface EntradaDaEscala {
  /** Última avaliação física do aluno, ou `null` quando não há nenhuma. */
  avaliacao: Avaliacao | null;
  /** As respostas da anamnese, já achatadas. */
  anamnese: Record<string, unknown> | null;
}

export function resolverEscala({ avaliacao, anamnese }: EntradaDaEscala): Escala {
  // Fonte única, inteira. Misturar a altura medida com o peso declarado produz
  // um IMC que não é nem uma coisa nem outra — e a origem gravada no scan não
  // conseguiria descrever o que aconteceu.
  if (avaliacao) {
    return {
      ok: true,
      heightCm: avaliacao.height_cm,
      weightKg: avaliacao.weight_kg,
      fonte: "assessment",
    };
  }

  const respostas = anamnese ?? {};

  // Nada respondido é situação diferente de respondido errado: aqui o aluno
  // precisa preencher a anamnese, ali precisa corrigir um campo dela.
  if (Object.keys(respostas).length === 0) return { ok: false, motivo: "sem_anamnese" };

  // Altura antes do peso, de propósito: recusar os dois de uma vez esconde qual
  // deles a tela deve destacar.
  const altura = lerRespostaNumerica(respostas.height, "height");
  if (!altura.ok) return { ok: false, motivo: "altura_invalida" };

  const peso = lerRespostaNumerica(respostas.weight, "weight");
  if (!peso.ok) return { ok: false, motivo: "peso_invalido" };

  return { ok: true, heightCm: altura.valor, weightKg: peso.valor, fonte: "anamnese" };
}
