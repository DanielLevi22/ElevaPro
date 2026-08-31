import { describe, expect, it } from "vitest";
import {
  descreverFatosMedidos,
  type MedidaDaFoto,
  type MedidasPorPose,
  medidasParaOScan,
} from "../fatosMedidos";

/**
 * Uma foto de 900 px de corpo. Com 180 cm de altura, dá 5 px/cm exatos — número
 * redondo de propósito, para o teste falar de conversão e não de arredondamento.
 */
function fotoDe900px(sobrescreve: Partial<MedidaDaFoto> = {}): MedidaDaFoto {
  return {
    alturaPx: 900,
    larguraPescocoPx: null,
    larguraPeitoPx: null,
    larguraCinturaPx: null,
    larguraQuadrilPx: null,
    larguraCoxaPx: null,
    larguraPanturrilhaPx: null,
    larguraOmbrosPx: null,
    desnivelOmbrosPx: null,
    desnivelQuadrilPx: null,
    inclinacaoOmbrosGraus: null,
    inclinacaoQuadrilGraus: null,
    desvioDoEixoPx: null,
    rotacaoDoTronco: null,
    prumoOmbroPx: null,
    prumoQuadrilPx: null,
    prumoJoelhoPx: null,
    ...sobrescreve,
  };
}

const ALTURA = 180;

describe("os fatos medidos que vão para o prompt", () => {
  it("converte pixel em centímetro pela Escala", () => {
    const medidas: MedidasPorPose = { front: fotoDe900px({ larguraCinturaPx: 160 }) };

    // 900 px / 180 cm = 5 px/cm, então 160 px são 32 cm.
    expect(descreverFatosMedidos(medidas, ALTURA)).toContain("largura de cintura: 32.0 cm");
  });

  // Cada foto tem a sua escala: o aluno não para exatamente na mesma distância
  // nas três, e converter uma com a escala de outra desloca tudo em silêncio.
  it("usa a escala de cada foto, não a da primeira", () => {
    const medidas: MedidasPorPose = {
      front: fotoDe900px({ larguraCinturaPx: 160 }),
      side: fotoDe900px({ alturaPx: 450, larguraCinturaPx: 80 }),
    };

    const texto = descreverFatosMedidos(medidas, ALTURA);

    expect(texto).toContain("escala 5.0 px/cm");
    expect(texto).toContain("escala 2.5 px/cm");
    // Metade dos pixels com metade da escala é a mesma cintura.
    expect(texto?.match(/largura de cintura: 32\.0 cm/g)).toHaveLength(2);
  });

  // O laudo reporta lado. Trocar o sinal aqui faria o texto apontar o ombro
  // errado, e o modelo repetiria isso com toda a confiança.
  it("diz qual lado está mais alto, pelo sinal do desnível", () => {
    const direito = descreverFatosMedidos(
      { front: fotoDe900px({ desnivelOmbrosPx: 9, inclinacaoOmbrosGraus: 2.3 }) },
      ALTURA,
    );
    const esquerdo = descreverFatosMedidos(
      { front: fotoDe900px({ desnivelOmbrosPx: -9, inclinacaoOmbrosGraus: -2.3 }) },
      ALTURA,
    );

    expect(direito).toContain("ombro direito mais alto: 1.8 cm");
    expect(esquerdo).toContain("ombro esquerdo mais alto: 1.8 cm");
  });

  // Tronco rotacionado não é achado postural: é aviso de que a foto dita
  // frontal não era frontal. Sem ele o modelo lê perspectiva como assimetria.
  it("avisa quando o tronco estava rotacionado", () => {
    const torto = descreverFatosMedidos({ front: fotoDe900px({ rotacaoDoTronco: 0.2 }) }, ALTURA);
    const reto = descreverFatosMedidos({ front: fotoDe900px({ rotacaoDoTronco: 0.01 }) }, ALTURA);

    expect(torto).toContain("perspectiva");
    expect(reto).toBeNull();
  });

  it("descreve a postura sagital da lateral", () => {
    const medidas: MedidasPorPose = { side: fotoDe900px({ prumoOmbroPx: 25 }) };

    const texto = descreverFatosMedidos(medidas, ALTURA);

    expect(texto).toContain("ombro à frente do prumo do tornozelo: 5.0 cm");
  });

  // Cabeçalho sem conteúdo afirmaria que houve medida quando não houve, e o
  // prompt precisa cair no caminho antigo em vez de mentir.
  it("devolve null quando não há nada medido", () => {
    expect(descreverFatosMedidos({}, ALTURA)).toBeNull();
    expect(descreverFatosMedidos({ front: fotoDe900px() }, ALTURA)).toBeNull();
  });

  it("ignora foto sem altura medida, em vez de dividir por zero", () => {
    const medidas: MedidasPorPose = { front: fotoDe900px({ alturaPx: 0, larguraCinturaPx: 160 }) };

    expect(descreverFatosMedidos(medidas, ALTURA)).toBeNull();
  });

  // Largura de silhueta inclui a roupa e não é circunferência. Sem esta
  // ressalva o modelo trata o número como resultado final.
  it("avisa que largura não é circunferência", () => {
    const texto = descreverFatosMedidos({ front: fotoDe900px({ larguraCinturaPx: 160 }) }, ALTURA);

    expect(texto).toContain("largura não é circunferência");
    expect(texto).toContain("incluem a roupa");
  });
});

describe("as medidas que vão para a coluna", () => {
  it("converte pela escala da própria pose", () => {
    const gravado = medidasParaOScan(
      {
        front: fotoDe900px({ desnivelOmbrosPx: 9 }),
        side: fotoDe900px({ alturaPx: 450, prumoOmbroPx: 12.5 }),
      },
      ALTURA,
    );

    expect(gravado.px_per_cm_front).toBe(5);
    expect(gravado.px_per_cm_side).toBe(2.5);
    expect(gravado.shoulder_drop_cm).toBe(1.8);
    // 12.5 px na escala da lateral são 5 cm; na da frontal seriam 2,5.
    expect(gravado.plumb_shoulder_cm).toBe(5);
  });

  // O texto do prompt transforma o lado em palavra e joga o sinal fora. A
  // coluna não pode fazer o mesmo: sem o sinal, o histórico aponta o ombro
  // errado e ninguém consegue perceber pelo número.
  it("preserva o sinal, que no texto vira palavra", () => {
    const esquerdo = medidasParaOScan({ front: fotoDe900px({ desnivelOmbrosPx: -9 }) }, ALTURA);
    const direito = medidasParaOScan({ front: fotoDe900px({ desnivelOmbrosPx: 9 }) }, ALTURA);

    expect(esquerdo.shoulder_drop_cm).toBe(-1.8);
    expect(direito.shoulder_drop_cm).toBe(1.8);
  });

  // O aviso no prompt e o veredito na coluna saem do mesmo limiar. Com dois
  // valores, o laudo alertaria sobre perspectiva enquanto a coluna dizia que a
  // foto estava reta.
  it("grava o veredito de rotação com o mesmo limiar do aviso", () => {
    const torto = { front: fotoDe900px({ rotacaoDoTronco: 0.2 }) };
    const reto = { front: fotoDe900px({ rotacaoDoTronco: 0.01 }) };

    expect(medidasParaOScan(torto, ALTURA).trunk_rotated).toBe(true);
    expect(medidasParaOScan(reto, ALTURA).trunk_rotated).toBe(false);
    expect(descreverFatosMedidos(torto, ALTURA)).toContain("perspectiva");
    expect(descreverFatosMedidos(reto, ALTURA)).toBeNull();
  });

  // Zero é uma medida: significaria ombros perfeitamente nivelados. "Não medido"
  // precisa chegar ao banco como null ou vira um achado que ninguém observou.
  it("devolve null onde não mediu, nunca zero", () => {
    const gravado = medidasParaOScan({ front: fotoDe900px() }, ALTURA);

    expect(gravado.shoulder_drop_cm).toBeNull();
    expect(gravado.trunk_rotated).toBeNull();
    expect(gravado.px_per_cm_side).toBeNull();
  });

  // Assimetria é da frontal: de costas os lados invertem e de perfil um ombro
  // esconde o outro. Ler da pose errada gravaria o lado trocado.
  it("tira assimetria só da frontal e postura sagital só da lateral", () => {
    const gravado = medidasParaOScan(
      {
        back: fotoDe900px({ desnivelOmbrosPx: 40 }),
        side: fotoDe900px({ prumoOmbroPx: 25 }),
        front: fotoDe900px({ desnivelOmbrosPx: 9 }),
      },
      ALTURA,
    );

    expect(gravado.shoulder_drop_cm).toBe(1.8);
    expect(gravado.plumb_shoulder_cm).toBe(5);
  });
});
