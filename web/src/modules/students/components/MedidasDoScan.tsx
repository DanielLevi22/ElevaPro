import type { BodyScanRecord } from "@elevapro/shared";
import { DataTable } from "@/shared/components/ui/DataTable";

/**
 * O que o aparelho mediu, para quem prescreve em cima disso.
 *
 * A diferença entre esta tela e a do aluno é o propósito, não o dado: o aluno
 * exerce acesso ao que foi tratado (Art. 18, II), o especialista decide o que
 * fazer. Por isso aqui as ressalvas vêm **antes** dos números — saber que a
 * foto estava em contraluz muda como se lê a tabela inteira, e depois dela já
 * é tarde.
 *
 * Nenhum número daqui é do modelo. São conta sobre a geometria da foto, e é
 * essa procedência que os torna acompanháveis ao longo do tempo — "ombro
 * direito elevado" não dá para comparar com nada.
 */

interface Linha {
  campo: string;
  rotulo: string;
  valor: number;
  unidade: string;
  /** O sinal vira palavra, e o número perde o sinal. */
  lado: string | null;
}

const MEDIDAS: Array<{
  campo: keyof BodyScanRecord;
  rotulo: string;
  unidade: string;
  lados?: [string, string];
}> = [
  {
    campo: "shoulder_drop_cm",
    rotulo: "Desnível dos ombros",
    unidade: "cm",
    lados: ["direito mais alto", "esquerdo mais alto"],
  },
  { campo: "shoulder_tilt_deg", rotulo: "Inclinação dos ombros", unidade: "°" },
  {
    campo: "hip_drop_cm",
    rotulo: "Desnível do quadril",
    unidade: "cm",
    lados: ["direito mais alto", "esquerdo mais alto"],
  },
  { campo: "hip_tilt_deg", rotulo: "Inclinação do quadril", unidade: "°" },
  { campo: "axis_deviation_cm", rotulo: "Desvio do eixo cabeça-tornozelos", unidade: "cm" },
  { campo: "craniovertebral_angle_deg", rotulo: "Ângulo craniovertebral", unidade: "°" },
  { campo: "plumb_shoulder_cm", rotulo: "Ombro à frente do prumo", unidade: "cm" },
  { campo: "plumb_hip_cm", rotulo: "Quadril à frente do prumo", unidade: "cm" },
  { campo: "plumb_knee_cm", rotulo: "Joelho à frente do prumo", unidade: "cm" },
];

/** As linhas que têm valor. Campo não medido some, em vez de virar zero. */
export function linhasMedidas(scan: BodyScanRecord): Linha[] {
  return MEDIDAS.flatMap((medida) => {
    const bruto = scan[medida.campo];
    if (typeof bruto !== "number") return [];

    return [
      {
        campo: medida.campo,
        rotulo: medida.rotulo,
        valor: Math.abs(bruto),
        unidade: medida.unidade,
        lado: medida.lados ? (bruto > 0 ? medida.lados[0] : medida.lados[1]) : null,
      },
    ];
  });
}

/** As ressalvas daquela captura, na ordem em que mudam a leitura. */
export function ressalvasDoScan(scan: BodyScanRecord): string[] {
  const ressalvas: string[] = [];

  if (scan.trunk_rotated) {
    ressalvas.push(
      "O tronco estava rotacionado na foto frontal — assimetria aqui pode ser perspectiva.",
    );
  }
  if (scan.framing_confirmed === false) {
    ressalvas.push(
      "O enquadramento não foi confirmado: o aluno capturou pela saída manual, e a escala pode estar deslocada.",
    );
  }
  if (scan.quality_backlit) ressalvas.push("Contraluz na captura.");
  if (scan.quality_low_light) ressalvas.push("Cômodo escuro na captura.");
  if (scan.quality_blown_out) ressalvas.push("Luz estourada na captura.");

  return ressalvas;
}

export function MedidasDoScan({ scan }: { scan: BodyScanRecord }) {
  const linhas = linhasMedidas(scan);
  const ressalvas = ressalvasDoScan(scan);

  // Sem medida não há seção. Cabeçalho vazio afirmaria que houve medição.
  if (linhas.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
        Medido no aparelho
      </h2>
      <p className="text-muted-foreground text-xs mt-1 mb-4">
        Geometria da foto, não estimativa do modelo. A escala vem da altura do aluno.
      </p>

      {ressalvas.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          {ressalvas.map((ressalva) => (
            <li className="text-amber-500 text-xs leading-5" key={ressalva}>
              {ressalva}
            </li>
          ))}
        </ul>
      )}

      <DataTable
        columns={[
          { key: "rotulo", header: "Medida", keepOnMobile: true, render: (l) => l.rotulo },
          {
            key: "valor",
            header: "Valor",
            width: "md:w-32",
            keepOnMobile: true,
            render: (l) => (
              <span className="font-bold text-foreground">
                {l.valor.toFixed(1)}
                <span className="text-muted-foreground font-normal"> {l.unidade}</span>
              </span>
            ),
          },
          {
            key: "lado",
            header: "Lado",
            width: "md:w-44",
            render: (l) => l.lado ?? "—",
          },
        ]}
        rowKey={(l) => l.campo}
        rows={linhas}
      />
    </section>
  );
}
