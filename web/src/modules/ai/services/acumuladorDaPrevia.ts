import { type Agendador, proximoQuadro } from "./acumuladorDeTexto";
import { type Previa, resumoDaPrevia } from "./previaDaProposta";

/**
 * Junta os pedaços do JSON da proposta e relê o incompleto uma vez por quadro.
 *
 * Mesmo motivo do [acumuladorDeTexto]: o modelo manda dezenas de pedaços por
 * segundo, e reparsear o JSON inteiro a cada um é trabalho que não vira pixel
 * nenhum. Um quadro é o teto útil.
 *
 * A ferramenta pode trocar no meio do turno — o modelo propõe o plano e, no
 * turno seguinte, as refeições. Quando o nome muda, o acumulado anterior é
 * descartado: são dois JSONs diferentes, e concatená-los não parseia.
 *
 * @example
 * const previa = criarAcumuladorDaPrevia(setPrevia);
 * previa.empurrar("propose_workouts", '{"phase_name":"Base"');
 * previa.limpar(); // ao fim do stream, quando o cartão de verdade chega
 */
export interface AcumuladorDaPrevia {
  /** Guarda o pedaço e agenda a releitura. */
  empurrar(tool: string, pedaco: string): void;
  /** Esquece o que foi acumulado e apaga a prévia da tela. */
  limpar(): void;
}

export function criarAcumuladorDaPrevia(
  aplicar: (previa: Previa | null) => void,
  agendar: Agendador = proximoQuadro,
): AcumuladorDaPrevia {
  let ferramenta = "";
  let cru = "";
  let agendado = false;

  function descarregar(): void {
    agendado = false;
    if (ferramenta.length === 0) return;
    aplicar(resumoDaPrevia(ferramenta, cru));
  }

  return {
    empurrar(tool: string, pedaco: string): void {
      if (tool !== ferramenta) {
        ferramenta = tool;
        cru = "";
      }
      cru += pedaco;
      if (agendado) return;
      agendado = true;
      agendar(descarregar);
    },
    limpar(): void {
      ferramenta = "";
      cru = "";
      aplicar(null);
    },
  };
}
