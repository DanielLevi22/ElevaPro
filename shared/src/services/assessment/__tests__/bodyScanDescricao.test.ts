import { describe, expect, it } from "vitest";
import type { BodyScanRecord } from "../../../types/bodyScan.types";
import { linhasMedidas, ressalvasDoScan } from "../bodyScanDescricao";

function scan(sobrescreve: Partial<BodyScanRecord> = {}): BodyScanRecord {
  return {
    id: "scan-1",
    student_id: "aluno-1",
    scanned_at: "2026-08-31T12:00:00Z",
    shoulder_drop_cm: null,
    shoulder_tilt_deg: null,
    hip_drop_cm: null,
    hip_tilt_deg: null,
    axis_deviation_cm: null,
    plumb_shoulder_cm: null,
    plumb_hip_cm: null,
    plumb_knee_cm: null,
    trunk_rotated: null,
    framing_confirmed: null,
    quality_backlit: null,
    quality_low_light: null,
    quality_blown_out: null,
    ...sobrescreve,
  } as BodyScanRecord;
}

describe("a descrição de um scan corporal", () => {
  // "Ombro direito elevado" não dá para comparar com nada. Estas linhas existem
  // para virar evidência acompanhável entre dois scans.
  it("lista só o que foi medido, com unidade", () => {
    const linhas = linhasMedidas(scan({ shoulder_drop_cm: 1.8, hip_tilt_deg: 2.3 }));

    expect(linhas.map((linha) => linha.rotulo)).toEqual([
      "Desnível dos ombros",
      "Inclinação do quadril",
    ]);
    expect(linhas[0].unidade).toBe("cm");
    expect(linhas[1].unidade).toBe("°");
  });

  // O laudo nomeia lado. Perder o sinal aqui apontaria o ombro errado com toda
  // a aparência de estar certo.
  it("traduz o sinal em lado e mostra o valor sem sinal", () => {
    const esquerdo = scan({ shoulder_drop_cm: -1.8, shoulder_tilt_deg: -2.3 });
    const direito = scan({ shoulder_drop_cm: 1.8, shoulder_tilt_deg: 2.3 });

    expect(linhasMedidas(esquerdo)[0]).toMatchObject({ valor: 1.8, lado: "esquerdo mais alto" });
    expect(linhasMedidas(direito)[0].lado).toBe("direito mais alto");
  });

  it("não inventa lado onde a medida não tem", () => {
    expect(linhasMedidas(scan({ hip_tilt_deg: 2.3 }))[0].lado).toBeNull();
  });

  // Zero é achado: significaria ombros perfeitamente nivelados. Não medido tem
  // de sumir da tabela.
  it("devolve vazio quando nada foi medido", () => {
    expect(linhasMedidas(scan())).toEqual([]);
  });

  // Sem esta ressalva o especialista lê perspectiva como assimetria — o mesmo
  // erro que o prompt do BFF é instruído a evitar.
  it("avisa sobre rotação de tronco antes dos números", () => {
    expect(ressalvasDoScan(scan({ trunk_rotated: true }))[0]).toContain("perspectiva");
    expect(ressalvasDoScan(scan({ trunk_rotated: false }))).toEqual([]);
  });

  // A saída manual do portão é o caso em que a escala pode estar deslocada, e é
  // o que separa este scan dos outros da série.
  it("avisa quando o enquadramento não foi confirmado", () => {
    expect(ressalvasDoScan(scan({ framing_confirmed: false })).join(" ")).toContain("saída manual");
    expect(ressalvasDoScan(scan({ framing_confirmed: true }))).toEqual([]);
  });

  it("junta as ressalvas de luz sem inventar nenhuma", () => {
    expect(ressalvasDoScan(scan({ quality_backlit: true, quality_low_light: true }))).toHaveLength(
      2,
    );
    expect(ressalvasDoScan(scan())).toEqual([]);
  });

  /**
   * O roll tolerado pelo portão entra 1:1 na inclinação medida, então abaixo
   * dele a medida não sabe de que lado o desnível cai. Nomear lado ali seria
   * afirmar uma certeza que a torção do aparelho consome inteira — dois scans
   * seguidos com roll de sinais opostos trocaram o lado reportado sem o corpo
   * mudar.
   */
  it("não nomeia lado quando a inclinação está abaixo da resolução", () => {
    const linha = linhasMedidas(scan({ shoulder_drop_cm: 0.6, shoulder_tilt_deg: 0.7 }))[0];

    expect(linha.valor).toBe(0.6);
    expect(linha.lado).toBeNull();
    expect(linha.nota).toContain("método resolva");
  });

  it("nomeia o lado assim que a inclinação passa da resolução", () => {
    const linha = linhasMedidas(scan({ shoulder_drop_cm: 1.2, shoulder_tilt_deg: 1.5 }))[0];

    expect(linha.lado).toBe("direito mais alto");
    expect(linha.nota).toBeNull();
  });

  // Sem o ângulo não dá para afirmar que o desnível é resolvível, e presumir
  // que sim devolveria justamente o lado que não se sabe.
  it("não nomeia lado quando o ângulo companheiro não foi medido", () => {
    expect(linhasMedidas(scan({ shoulder_drop_cm: 1.8 }))[0].lado).toBeNull();
  });

  // A regra é só para desnível: prumo e desvio de eixo não afirmam lado nenhum,
  // e não podem herdar a supressão.
  it("não mexe nas medidas que nunca tiveram lado", () => {
    const linha = linhasMedidas(scan({ plumb_shoulder_cm: 5 }))[0];

    expect(linha.rotulo).toBe("Ombro à frente do prumo");
    expect(linha.nota).toBeNull();
  });
});
