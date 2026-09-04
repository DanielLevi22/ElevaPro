import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GRUPOS_DO_BANCO,
  GRUPOS_MUSCULARES,
  MALHA_NEUTRA,
  MALHAS_DO_GRUPO,
  volumePorMalha,
} from "../grupos";

/**
 * TRAVA: a lista de grupos e as malhas do modelo não podem divergir.
 *
 * O mapa muscular funciona por acordo de nome — `scripts/modelo/reagrupar.js`
 * emite uma malha `Peitoral` e a tela procura por `Peitoral`. É a ausência de
 * tradução entre os dois que consertou o mapa, mas ela cobra um preço: um
 * acordo por nome quebra **em silêncio**. Renomear um grupo aqui sem regerar o
 * modelo, ou regerar o modelo com faixas novas sem atualizar a lista, deixa o
 * grupo sem malha — e a tela pinta nada, sem erro e sem log.
 *
 * Este teste lê o GLB de verdade, do disco, e compara os dois lados. É a única
 * coisa entre o acordo e o silêncio.
 */

const MODELO = join(process.cwd(), "public", "models", "corpo-por-musculo.glb");

/** Nomes das malhas, lidos do bloco JSON do GLB. */
function malhasDoModelo(): string[] {
  const arquivo = readFileSync(MODELO);
  const tamanhoDoJson = arquivo.readUInt32LE(12);
  const gltf = JSON.parse(arquivo.subarray(20, 20 + tamanhoDoJson).toString("utf8"));
  return gltf.meshes.map((m: { name: string }) => m.name);
}

describe("grupos musculares e o modelo", () => {
  it("todo grupo da lista tem malha no modelo", () => {
    const malhas = new Set(malhasDoModelo());
    const semMalha = GRUPOS_MUSCULARES.filter((g) => !malhas.has(g));

    if (semMalha.length > 0) {
      throw new Error(
        `GRUPO SEM MALHA: ${semMalha.join(", ")} está na lista da tela e não existe no modelo — a lateral mostra o grupo, o clique não pinta nada, e nada acusa`,
      );
    }
  });

  // O par que dá sentido ao anterior: só afirmar que a lista está coberta
  // passaria com um modelo que trouxesse malhas a mais, e essas malhas seriam
  // geometria pintável que a tela nunca ofereceria a ninguém.
  it("toda malha do modelo está na lista, fora a neutra", () => {
    const orfas = malhasDoModelo().filter(
      (nome) => nome !== MALHA_NEUTRA && !GRUPOS_MUSCULARES.includes(nome as never),
    );

    if (orfas.length > 0) {
      throw new Error(
        `MALHA ÓRFÃ: ${orfas.join(", ")} existe no modelo e não na lista da tela — é músculo pintável que ninguém consegue selecionar`,
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

  // O defeito que passou despercebido por meses: o volume chegava com a chave
  // do banco e a tela procurava pelo nome da malha. "peito" nunca casou com
  // "Peitoral", então o mapa nunca pintou dado real — e o bug das malhas
  // produzia o mesmo sintoma, então um escondeu o outro.
  it("traduz a chave do banco para o nome da malha", () => {
    const traduzido = volumePorMalha([{ muscle: "peito", volume: 5000 }]);

    expect(traduzido).toEqual([{ muscle: "Peitoral", volume: 5000 }]);
  });

  // O banco tem `pernas` como valor único. As três malhas recebem o mesmo
  // número: repetir é honesto, repartir seria inventar uma divisão que o dado
  // não tem.
  it("espalha o valor grosso do banco pelas malhas que ele cobre", () => {
    const traduzido = volumePorMalha([{ muscle: "pernas", volume: 9000 }]);

    expect(traduzido.map((t) => t.muscle).sort()).toEqual([
      "Isquiotibiais",
      "Panturrilha",
      "Quadríceps",
    ]);
    expect(traduzido.every((t) => t.volume === 9000)).toBe(true);
  });

  it("descarta cardio, que é modalidade e não músculo", () => {
    expect(volumePorMalha([{ muscle: "cardio", volume: 4000 }])).toEqual([]);
  });

  // A trava que fecha o buraco: valor novo no banco que ninguém mapear some da
  // tela sem erro, e o músculo fica cinza como se ninguém tivesse treinado.
  it("todo valor do banco ou pinta uma malha, ou é recusado de propósito", () => {
    const NAO_SAO_MUSCULO = new Set(["cardio"]);
    const orfaos = GRUPOS_DO_BANCO.filter((g) => !MALHAS_DO_GRUPO[g] && !NAO_SAO_MUSCULO.has(g));

    if (orfaos.length > 0) {
      throw new Error(
        `VOLUME QUE SOME: ${orfaos.join(", ")} existe em exercises.muscle_group e não pinta malha nenhuma — o treino entra no banco e desaparece do mapa`,
      );
    }
  });

  it("toda malha que o de-para cita existe no modelo", () => {
    const malhas = new Set(malhasDoModelo());
    const inventadas = Object.values(MALHAS_DO_GRUPO)
      .flat()
      .filter((m) => m !== undefined && !malhas.has(m));

    expect(inventadas).toEqual([]);
  });
});
