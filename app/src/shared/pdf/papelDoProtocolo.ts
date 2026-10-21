/**
 * O papel do protocolo: o desenho do PDF da dieta do web (cabeçalho escuro com
 * ELEVA PRO em neon, o aluno à direita, a linha neon, tabela em grade e o rodapé
 * do protocolo), em HTML para o `expo-print`.
 *
 * As cores são literais de propósito, e este é o arquivo da allowlist da
 * `check-hex-colors`: PDF é papel, sai do app sem tema claro nem escuro, e token
 * de interface levaria o fundo do app para uma folha A4.
 */

const NEON = '#ccff00';

export const CSS_DO_PROTOCOLO = `
  @page { margin: 0; }
  body { font-family: Helvetica, Arial, sans-serif; color: #282828; margin: 0; }
  .topo { background: #0f0f0f; color: #fff; padding: 22px 40px 18px; display: flex; justify-content: space-between; }
  .marca { font-size: 30px; font-weight: 700; letter-spacing: 1px; }
  .marca .eleva { color: ${NEON}; }
  .marca .pro { font-weight: 400; letter-spacing: 4px; margin-left: 4px; }
  .autor { font-size: 9px; font-weight: 700; color: #b4b4b4; margin-top: 6px; letter-spacing: 0.5px; }
  .aluno { text-align: right; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
  .vigencia { font-size: 9px; color: ${NEON}; margin-top: 8px; }
  .linha-neon { height: 4px; background: ${NEON}; }
  main { padding: 26px 40px 40px; }
  h1 { font-size: 16px; margin: 0 0 14px; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #282828; color: #fff; text-align: left; padding: 8px; font-size: 9.5px; }
  td { border: 0.5px solid #e6e6e6; padding: 8px; vertical-align: middle; }
  td.exercicio { background: #fcfcfc; font-weight: 700; width: 28%; }
  td.exercicio small { display: block; font-weight: 400; color: #969696; margin-top: 2px; }
  td.serie small { display: block; color: #969696; }
  td.descanso { text-align: center; width: 12%; }
  td.obs { font-style: italic; color: #646464; }
  .bloco { color: #646464; display: block; }
  footer { font-size: 7px; color: #969696; text-align: center; padding: 0 40px 24px; }
`;

const NOMEADOS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Texto livre (nome, observação) seguro dentro do HTML.
 *
 * @example escaparHtml('<b>') // "&lt;b&gt;"
 */
export const escaparHtml = (texto: string): string =>
  texto.replace(/[&<>"']/g, (char) => NOMEADOS[char] ?? char);

export interface CabecalhoDoProtocolo {
  /** O nome que o app já mostra; nunca e-mail nem id. */
  aluno: string;
  /** "Daniel L.", ou nulo no plano próprio do Praticante. */
  especialista: string | null;
  /** "VALOR DE VIGÊNCIA: 01 ago 2026 - 29 ago 2026", ou nulo sem fase. */
  vigencia: string | null;
}

/**
 * O topo do protocolo: marca, autor, aluno e vigência, com a linha neon.
 *
 * @example cabecalhoDoProtocolo({ aluno: 'Ana', especialista: 'Daniel L.', vigencia: null })
 */
export function cabecalhoDoProtocolo(cabecalho: CabecalhoDoProtocolo): string {
  const autor = cabecalho.especialista ? cabecalho.especialista.toUpperCase() : 'PLANO PRÓPRIO';
  return `<div class="topo">
    <div>
      <div class="marca"><span class="eleva">ELEVA</span><span class="pro">PRO</span></div>
      <div class="autor">DESENVOLVIDO POR // ${escaparHtml(autor)}</div>
    </div>
    <div>
      <div class="aluno">[ ${escaparHtml(cabecalho.aluno.toUpperCase())} ]</div>
      ${cabecalho.vigencia ? `<div class="vigencia">${escaparHtml(cabecalho.vigencia)}</div>` : ''}
    </div>
  </div>
  <div class="linha-neon"></div>`;
}

/**
 * O rodapé do protocolo, com a data de geração e o aviso de quem recebe lê.
 *
 * @example rodapeDoProtocolo('21 out 2026, 10:31')
 */
export function rodapeDoProtocolo(geradoEm: string): string {
  return `<footer>PROTOCOLO OFICIAL // AUTENTICADO POR ELEVA PRO // ${escaparHtml(geradoEm)}<br />
  Gerado no aparelho pelo Eleva Pro. Quem receber este arquivo poderá lê-lo.</footer>`;
}
