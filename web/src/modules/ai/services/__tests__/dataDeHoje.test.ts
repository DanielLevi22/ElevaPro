import { describe, expect, it } from "vitest";
import { blocoDaDataDeHoje } from "../dataDeHoje";

/**
 * O assistente perguntava que dia era hoje quando o especialista respondia
 * "hoje". Não era teimosia: a data nunca entrava no contexto, então "hoje" era
 * uma palavra sem referente.
 *
 * O fuso é a parte que quebra em silêncio: a rota roda na Vercel, em UTC, e
 * entre as 21h e a meia-noite no Brasil o UTC já está no dia seguinte.
 */

describe("data de hoje", () => {
  it("diz a data no formato de quem lê e no das ferramentas", () => {
    const bloco = blocoDaDataDeHoje(new Date("2026-09-05T14:00:00Z"));

    expect(bloco).toContain("05/09/2026");
    expect(bloco).toContain("2026-09-05");
  });

  it("diz o dia da semana, que é o que resolve 'segunda que vem'", () => {
    expect(blocoDaDataDeHoje(new Date("2026-09-05T14:00:00Z"))).toContain("sábado");
  });

  // 22h de Brasília é 01h do dia seguinte em UTC. Sem o fuso, a periodização
  // começaria amanhã com o assistente achando que é hoje.
  it("22h de Brasília ainda é hoje", () => {
    const bloco = blocoDaDataDeHoje(new Date("2026-09-06T01:00:00Z"));

    expect(bloco).toContain("05/09/2026");
    expect(bloco).not.toContain("06/09/2026");
  });

  it("meia-noite e meia de Brasília já é o novo dia", () => {
    expect(blocoDaDataDeHoje(new Date("2026-09-06T03:30:00Z"))).toContain("06/09/2026");
  });

  // A proibição de inventar continua valendo — o que muda é ela deixar de
  // alcançar a palavra "hoje", que o especialista de fato disse.
  it("manda resolver 'hoje' sem perguntar, e mantém a proibição de inventar", () => {
    const bloco = blocoDaDataDeHoje(new Date("2026-09-05T14:00:00Z"));

    expect(bloco).toContain("não pergunte que dia é hoje");
    expect(bloco).toContain("inventar data");
  });
});
