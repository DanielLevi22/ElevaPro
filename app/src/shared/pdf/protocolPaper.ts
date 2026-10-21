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

export const PROTOCOL_CSS = `
  @page { margin: 0; }
  body { font-family: Helvetica, Arial, sans-serif; color: #282828; margin: 0; }
  .top { background: #0e0e0e; color: #fff; padding: 22px 40px; display: flex; justify-content: space-between; align-items: center; }
  .brand { font-size: 28px; font-weight: 700; }
  .brand .eleva { color: ${NEON}; }
  .brand .pro { font-weight: 400; margin-left: 4px; }
  .document { font-size: 9px; font-weight: 700; color: #969696; margin-top: 4px; letter-spacing: 1px; }
  .rows { text-align: right; max-width: 55%; }
  .row { font-size: 12px; font-weight: 700; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row .label { font-size: 8.5px; font-weight: 400; color: #8c8c8c; letter-spacing: 1px; margin-right: 6px; }
  .row.validity { color: ${NEON}; }
  .neon-line { height: 3px; background: ${NEON}; }
  .phase { background: #141414; color: ${NEON}; font-weight: 700; font-size: 12px; padding: 9px 12px; margin: 26px 0 14px; display: flex; justify-content: space-between; }
  .phase .dates { color: #c8c8c8; font-weight: 400; font-size: 10px; }
  .objective { font-size: 11px; color: #787878; margin: -8px 0 6px; }
  h2 { font-size: 13px; margin: 18px 0 8px; }
  .empty { font-style: italic; color: #969696; font-size: 11px; }
  main { padding: 26px 40px 40px; }
  h1 { font-size: 16px; margin: 0 0 14px; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #282828; color: #fff; text-align: left; padding: 8px; font-size: 9.5px; }
  td { border: 0.5px solid #e6e6e6; padding: 8px; vertical-align: middle; }
  td.exercise { background: #fcfcfc; font-weight: 700; width: 28%; }
  td.exercise small { display: block; font-weight: 400; color: #969696; margin-top: 2px; }
  td.set small { display: block; color: #969696; }
  td.rest { text-align: center; width: 12%; }
  td.notes { font-style: italic; color: #646464; }
  .segment { color: #646464; display: block; }
  footer { font-size: 7px; color: #969696; text-align: center; padding: 0 40px 24px; }
`;

const NAMED_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Texto livre (nome, observação) seguro dentro do HTML.
 *
 * @example escapeHtml('<b>') // "&lt;b&gt;"
 */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => NAMED_ENTITIES[char] ?? char);

export interface ProtocolHeader {
  /** O tipo do documento, sob a marca: "Protocolo de treino". */
  document: string;
  /**
   * O nome que o app já mostra; nunca e-mail nem id. Sem nome preenchido a
   * linha não aparece: "Aluno" seria errado para o Praticante (ADR-0028).
   */
  student: string | null;
  /** "Daniel L.", ou nulo no plano próprio do Praticante: a linha não aparece. */
  specialist: string | null;
  /** "1 out 2026 – 24 dez 2026", ou nulo sem período. */
  validity: string | null;
}

/**
 * O topo do protocolo: a marca e o tipo do documento à esquerda; aluno,
 * profissional e vigência à direita, cada um com o seu rótulo; a linha neon.
 *
 * @example protocolHeader({ document: 'Protocolo de treino', student: 'Ana', specialist: null, validity: null })
 */
export function protocolHeader(header: ProtocolHeader): string {
  return `<div class="top">
    <div>
      <div class="brand"><span class="eleva">ELEVA</span><span class="pro">PRO</span></div>
      <div class="document">${escapeHtml(header.document.toUpperCase())}</div>
    </div>
    <div class="rows">
      ${labeledRow('ALUNO', header.student)}
      ${labeledRow('PROFISSIONAL', header.specialist)}
      ${labeledRow('VIGÊNCIA', header.validity, 'validity')}
    </div>
  </div>
  <div class="neon-line"></div>`;
}

/** Uma linha do topo com o seu rótulo; sem valor, a linha some. */
function labeledRow(label: string, value: string | null, modifier = ''): string {
  if (!value) return '';
  return `<div class="row ${modifier}"><span class="label">${label}</span>${escapeHtml(value)}</div>`;
}

/**
 * O rodapé do protocolo, com a data de geração e o aviso de quem recebe lê.
 *
 * @example protocolFooter('21 out 2026, 10:31')
 */
export function protocolFooter(generatedAt: string): string {
  return `<footer>PROTOCOLO OFICIAL // AUTENTICADO POR ELEVA PRO // ${escapeHtml(generatedAt)}<br />
  Gerado no aparelho pelo Eleva Pro. Quem receber este arquivo poderá lê-lo.</footer>`;
}
