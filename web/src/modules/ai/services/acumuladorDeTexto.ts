/**
 * Junta os pedaços de texto do stream e aplica uma vez por quadro.
 *
 * O modelo manda dezenas de pedaços por segundo, e cada um virava um `setState`
 * com `.map()` sobre a conversa inteira — mais um `scrollIntoView` animado, que
 * o navegador reiniciava antes de terminar o anterior. O texto chegava aos
 * solavancos, e piorava conforme a conversa crescia.
 *
 * O que muda aqui é a frequência com que o texto vira render, não o consumo do
 * SSE: nada é descartado, e a ordem é a de chegada. Um quadro é o teto útil —
 * aplicar mais vezes que isso não produz nenhum pixel a mais.
 *
 * @example
 * const texto = criarAcumuladorDeTexto((pedaco) => setContent((c) => c + pedaco));
 * texto.empurrar("Olá");
 * texto.empurrar(", mundo");
 * // no fim do stream, para não perder o que chegou depois do último quadro:
 * texto.liberar();
 */
export interface AcumuladorDeTexto {
  /** Guarda o pedaço para o próximo quadro. */
  empurrar(pedaco: string): void;
  /** Aplica agora o que estiver pendente. Obrigatório ao fim do stream. */
  liberar(): void;
}

/** Agendador de quadro. Injetável porque `requestAnimationFrame` não existe em teste. */
export type Agendador = (aplicar: () => void) => void;

export const proximoQuadro: Agendador = (aplicar) => {
  // Fora do navegador (SSR, teste sem DOM) não há quadro para esperar: aplicar
  // direto preserva o comportamento em vez de engolir o texto.
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(aplicar);
  else aplicar();
};

export function criarAcumuladorDeTexto(
  aplicar: (pedaco: string) => void,
  agendar: Agendador = proximoQuadro,
): AcumuladorDeTexto {
  let pendente = "";
  let agendado = false;

  function descarregar(): void {
    agendado = false;
    if (pendente.length === 0) return;
    const acumulado = pendente;
    // Zerar antes de aplicar: `aplicar` renderiza, e um pedaço que chegue
    // durante isso pertence ao próximo quadro, não a este.
    pendente = "";
    aplicar(acumulado);
  }

  return {
    empurrar(pedaco: string): void {
      pendente += pedaco;
      if (agendado) return;
      agendado = true;
      agendar(descarregar);
    },
    liberar: descarregar,
  };
}
