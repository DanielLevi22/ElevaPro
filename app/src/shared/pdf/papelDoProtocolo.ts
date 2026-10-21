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
  .topo { background: #0e0e0e; color: #fff; padding: 22px 40px; display: flex; justify-content: space-between; align-items: center; }
  .marca { font-size: 28px; font-weight: 700; }
  .marca .eleva { color: ${NEON}; }
  .marca .pro { font-weight: 400; margin-left: 4px; }
  .documento { font-size: 9px; font-weight: 700; color: #969696; margin-top: 4px; letter-spacing: 1px; }
  .dados { text-align: right; max-width: 55%; }
  .dado { font-size: 12px; font-weight: 700; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dado .rotulo { font-size: 8.5px; font-weight: 400; color: #8c8c8c; letter-spacing: 1px; margin-right: 6px; }
  .dado.vigencia { color: ${NEON}; }
  .linha-neon { height: 3px; background: ${NEON}; }
  .fase { background: #141414; color: ${NEON}; font-weight: 700; font-size: 12px; padding: 9px 12px; margin: 26px 0 14px; display: flex; justify-content: space-between; }
  .fase .datas { color: #c8c8c8; font-weight: 400; font-size: 10px; }
  .objetivo { font-size: 11px; color: #787878; margin: -8px 0 6px; }
  h2 { font-size: 13px; margin: 18px 0 8px; }
  .vazio { font-style: italic; color: #969696; font-size: 11px; }
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
  /** O tipo do documento, sob a marca: "Protocolo de treino". */
  documento: string;
  /** O nome que o app já mostra; nunca e-mail nem id. */
  aluno: string;
  /** "Daniel L.", ou nulo no plano próprio do Praticante: a linha não aparece. */
  especialista: string | null;
  /** "1 out 2026 – 24 dez 2026", ou nulo sem período. */
  vigencia: string | null;
}

/**
 * O topo do protocolo: a marca e o tipo do documento à esquerda; aluno,
 * profissional e vigência à direita, cada um com o seu rótulo; a linha neon.
 *
 * @example cabecalhoDoProtocolo({ documento: 'Protocolo de treino', aluno: 'Ana', especialista: null, vigencia: null })
 */
export function cabecalhoDoProtocolo(cabecalho: CabecalhoDoProtocolo): string {
  const dado = (rotulo: string, valor: string, classe = '') =>
    `<div class="dado ${classe}"><span class="rotulo">${rotulo}</span>${escaparHtml(valor)}</div>`;
  return `<div class="topo">
    <div>
      <div class="marca"><span class="eleva">ELEVA</span><span class="pro">PRO</span></div>
      <div class="documento">${escaparHtml(cabecalho.documento.toUpperCase())}</div>
    </div>
    <div class="dados">
      ${dado('ALUNO', cabecalho.aluno)}
      ${cabecalho.especialista ? dado('PROFISSIONAL', cabecalho.especialista) : ''}
      ${cabecalho.vigencia ? dado('VIGÊNCIA', cabecalho.vigencia, 'vigencia') : ''}
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
