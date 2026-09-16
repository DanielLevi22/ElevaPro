import type { LoadRecord, PeriodPanel } from '@elevapro/shared';

/**
 * O relatório do período em PDF, gerado no aparelho (issue #312 §5).
 *
 * Nada passa pelo servidor: o `expo-print` monta o arquivo local e a folha de
 * compartilhar do sistema entrega. O arquivo temporário é apagado depois.
 *
 * **O PDF tem só o que a tela mostra.** Sem e-mail e sem identificador interno:
 * quem recebe o arquivo pode não ser quem o aluno imagina, e um `uuid` no rodapé
 * é um dado que a folha de papel não precisa carregar para lugar nenhum.
 */

export interface ReportPdfData {
  /** O nome que o aluno já vê no app; nunca o e-mail nem o id. */
  studentName: string;
  period: string;
  subtitle: string | null;
  panel: PeriodPanel;
  records: readonly LoadRecord[];
  streak: { current: number; best: number };
  composition: { weightDelta: number | null; fatDelta: number | null; source: string } | null;
  note: { body: string; author: string | null; date: string } | null;
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => {
    const named: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return named[char] ?? char;
  });

const signed = (value: number, unit: string): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toString().replace('.', ',')} ${unit}`;

/**
 * O HTML do relatório. Separado da impressão para o teste poder afirmar o que o
 * arquivo carrega — e o que ele não carrega.
 *
 * @example reportHtml({ studentName: 'Ana', … })
 */
export function reportHtml(data: ReportPdfData): string {
  const { panel } = data;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><style>
  body { font-family: -apple-system, Roboto, sans-serif; color: #111; padding: 32px; }
  h1 { font-size: 22px; margin: 0; }
  .sub { color: #666; font-size: 12px; margin-top: 4px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .card { border: 1px solid #ddd; border-radius: 12px; padding: 12px 16px; min-width: 130px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .value { font-size: 20px; font-weight: 700; margin-top: 2px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 28px 0 8px; }
  li { font-size: 13px; margin-bottom: 4px; }
  .note { border-left: 3px solid #999; padding-left: 12px; font-size: 13px; white-space: pre-wrap; }
  footer { margin-top: 32px; font-size: 10px; color: #888; }
</style></head><body>
  <h1>Relatório do período</h1>
  <div class="sub">${escapeHtml(data.studentName)} · ${escapeHtml(data.period)}</div>
  ${data.subtitle ? `<div class="sub">${escapeHtml(data.subtitle)}</div>` : ''}
  <div class="grid">
    <div class="card"><div class="label">Treinos</div><div class="value">${panel.workouts}</div></div>
    <div class="card"><div class="label">Aderência</div><div class="value">${
      panel.adherence === null ? '—' : `${panel.adherence}%`
    }</div><div class="label">meta de ${panel.goal}%</div></div>
    <div class="card"><div class="label">Cardio</div><div class="value">${panel.cardioSessions}</div></div>
    <div class="card"><div class="label">Medidas</div><div class="value">${panel.measurements}</div></div>
  </div>
  <h2>Destaques</h2>
  <ul>
    <li>Sequência atual de ${data.streak.current} dia(s), com recorde de ${data.streak.best}.</li>
    ${data.records
      .map(
        (record) =>
          `<li>Recorde em ${escapeHtml(record.name)}: ${record.weight} kg em ${escapeHtml(record.date)}.</li>`
      )
      .join('')}
    ${
      data.composition
        ? `<li>Variação (${escapeHtml(data.composition.source)}): ${
            data.composition.weightDelta === null
              ? 'peso sem registro'
              : `peso ${signed(data.composition.weightDelta, 'kg')}`
          }${
            data.composition.fatDelta === null
              ? ''
              : `, gordura ${signed(data.composition.fatDelta, 'pts')}`
          }.</li>`
        : ''
    }
  </ul>
  ${
    data.note
      ? `<h2>Nota do especialista</h2><div class="note">${escapeHtml(data.note.body)}</div>
         <div class="sub">${escapeHtml(data.note.author ?? 'Especialista')} · ${escapeHtml(data.note.date)}</div>`
      : ''
  }
  <footer>Documento com dados de saúde, gerado no aparelho pelo Eleva Pro. Quem receber este arquivo poderá lê-lo.</footer>
</body></html>`;
}
