import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GRUPOS_DO_BANCO,
  GRUPOS_MUSCULARES,
  MALHA_NEUTRA,
  MALHAS_DE_MUSCULO,
  MALHAS_DO_GRUPO,
  malhasAcesas,
  SUBMUSCULOS,
  volumePorMalha,
} from "../grupos";

/**
 * TRAVA: a taxonomia da tela e as malhas do modelo não podem divergir.
 *
 * O mapa muscular funciona por acordo de nome — `scripts/modelo/reagrupar.js`
 * emite uma malha `Vasto lateral` e a tela procura por `Vasto lateral`. É a
 * ausência de tradução entre os dois que consertou o mapa, mas ela cobra um
 * preço: acordo por nome quebra **em silêncio**. Mexer numa faixa do script sem
 * atualizar `SUBMUSCULOS`, ou o contrário, deixa músculo sem malha — e a tela
 * pinta nada, sem erro e sem log.
 *
 * Estes testes leem o GLB de verdade, do disco. Foram eles que pegaram a
 * divisão em sub-músculos quando ela entrou sem a taxonomia junto.
 */

const MODELO = join(process.cwd(), "public", "models", "corpo-por-musculo.glb");

/** Nomes das malhas, lidos do bloco JSON do GLB. */
function malhasDoModelo(): string[] {
  const arquivo = readFileSync(MODELO);
  const tamanhoDoJson = arquivo.readUInt32LE(12);
  const gltf = JSON.parse(arquivo.subarray(20, 20 + tamanhoDoJson).toString("utf8"));
  return gltf.meshes.map((m: { name: string }) => m.name);
}

describe("taxonomia muscular e o modelo", () => {
  it("toda malha da taxonomia existe no modelo", () => {
    const malhas = new Set(malhasDoModelo());
    const semMalha = MALHAS_DE_MUSCULO.filter((m) => !malhas.has(m));

    if (semMalha.length > 0) {
      throw new Error(
        `MÚSCULO SEM MALHA: ${semMalha.join(", ")} está na taxonomia da tela e não existe no modelo — a lateral mostra o item, o clique não pinta nada, e nada acusa`,
      );
    }
  });

  // O par que dá sentido ao anterior: só afirmar que a taxonomia está coberta
  // passaria com um modelo que trouxesse malhas a mais, e essas malhas seriam
  // geometria pintável que a tela nunca ofereceria a ninguém.
  it("toda malha do modelo está na taxonomia, fora a neutra", () => {
    const orfas = malhasDoModelo().filter(
      (nome) => nome !== MALHA_NEUTRA && !MALHAS_DE_MUSCULO.includes(nome),
    );

    if (orfas.length > 0) {
      throw new Error(
        `MALHA ÓRFÃ: ${orfas.join(", ")} existe no modelo e não na taxonomia — é músculo pintável que ninguém consegue selecionar`,
      );
    }
  });

  it("todo grupo tem ao menos um sub-músculo", () => {
    expect(GRUPOS_MUSCULARES.filter((g) => SUBMUSCULOS[g].length === 0)).toEqual([]);
  });

  // Regressão de 2026-09-03: nome de malha com espaço não sobrevive ao
  // carregamento. O `GLTFLoader` passa todo nome por `sanitizeNodeName`, que
  // troca `\s` por `_`, então "Vasto lateral" no arquivo vira "Vasto_lateral"
  // na cena — a busca por nome falha e o músculo não acende. O sintoma era
  // cruel: "Trapézio", de uma palavra só, funcionava, e os compostos não.
  it("nenhuma malha tem espaço no nome, que o three.js trocaria por underscore", () => {
    const comEspaco = malhasDoModelo().filter((n) => /\s/.test(n));

    if (comEspaco.length > 0) {
      throw new Error(
        `NOME QUE NÃO SOBREVIVE AO CARREGAMENTO: ${comEspaco.join(", ")} tem espaço, e o three.js entrega esse nome com underscore — o clique não acende e nada acusa`,
      );
    }
  });

  it("o modelo traz a malha neutra do corpo", () => {
    expect(malhasDoModelo()).toContain(MALHA_NEUTRA);
  });

  // A licença do écorché de origem é CC BY: derivar é permitido, creditar é
  // obrigatório. O crédito viaja dentro do arquivo para sobreviver a uma cópia
  // que deixe o NOTICE.md para trás.
  it("o modelo carrega a atribuição do original", () => {
    const arquivo = readFileSync(MODELO);
    const gltf = JSON.parse(arquivo.subarray(20, 20 + arquivo.readUInt32LE(12)).toString("utf8"));

    expect(gltf.asset.copyright).toContain("martinjario");
    expect(gltf.asset.copyright).toContain("CC BY");
  });
});

describe("o volume que vem do banco", () => {
  // O defeito que passou despercebido por meses: o volume chegava com a chave
  // do banco e a tela procurava pelo nome da malha. "peito" nunca casou com
  // "Peitoral", e o bug das malhas produzia o mesmo sintoma — corpo cinza —,
  // então um escondeu o outro.
  it("traduz a chave do banco para as malhas do grupo", () => {
    const traduzido = volumePorMalha([{ muscle: "peito", volume: 5000 }]);

    expect(traduzido.map((t) => t.muscle).sort()).toEqual(["Peitoral_maior", "Serrátil"]);
    expect(traduzido.every((t) => t.volume === 5000)).toBe(true);
  });

  // `pernas` é um valor só no banco, cobrindo três grupos e sete malhas. Todas
  // recebem o mesmo número: repetir é honesto, repartir seria inventar uma
  // divisão que o dado não tem.
  it("espalha o valor grosso do banco por todas as malhas que ele cobre", () => {
    const traduzido = volumePorMalha([{ muscle: "pernas", volume: 9000 }]);

    expect(traduzido.map((t) => t.muscle).sort()).toEqual([
      "Bíceps_femoral",
      "Gastrocnêmio",
      "Reto_femoral",
      "Semimembranoso",
      "Semitendinoso",
      "Sóleo",
      "Vasto_lateral",
      "Vasto_medial",
    ]);
    expect(traduzido.every((t) => t.volume === 9000)).toBe(true);
  });

  it("descarta cardio, que é modalidade e não músculo", () => {
    expect(volumePorMalha([{ muscle: "cardio", volume: 4000 }])).toEqual([]);
  });

  // A trava que fecha o buraco de origem: valor novo no banco que ninguém
  // mapear some da tela sem erro, e o músculo fica cinza como se ninguém
  // tivesse treinado.
  it("todo valor do banco ou pinta um grupo, ou é recusado de propósito", () => {
    const NAO_SAO_MUSCULO = new Set(["cardio"]);
    const orfaos = GRUPOS_DO_BANCO.filter((g) => !MALHAS_DO_GRUPO[g] && !NAO_SAO_MUSCULO.has(g));

    if (orfaos.length > 0) {
      throw new Error(
        `VOLUME QUE SOME: ${orfaos.join(", ")} existe em exercises.muscle_group e não pinta nada — o treino entra no banco e desaparece do mapa`,
      );
    }
  });

  it("todo grupo que o de-para cita existe na taxonomia", () => {
    const inventados = Object.values(MALHAS_DO_GRUPO)
      .flat()
      .filter((g) => g !== undefined && !GRUPOS_MUSCULARES.includes(g));

    expect(inventados).toEqual([]);
  });

  // Quem acende o quê. Ficou fora do viewer porque é regra de nome como o
  // resto do arquivo, e regra de nome quebra calada: uma seleção que não casa
  // com malha nenhuma não pinta nada e não reclama — foi assim que o clique em
  // "Vasto lateral" ficou mudo por causa do underscore.
  it("grupo acende todas as malhas dele", () => {
    expect(malhasAcesas("Ombros")).toEqual(
      new Set(["Deltoide_anterior", "Deltoide_lateral", "Deltoide_posterior"]),
    );
  });

  it("sub-músculo acende só a malha dele", () => {
    expect(malhasAcesas("Deltoide_lateral")).toEqual(new Set(["Deltoide_lateral"]));
  });

  it("seleção que não existe no modelo não acende nada", () => {
    expect(malhasAcesas("Deltoide médio")).toEqual(new Set());
  });

  it("sem seleção, nada acende", () => {
    expect(malhasAcesas(null)).toEqual(new Set());
  });
});
