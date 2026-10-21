import {
  type PeriodizationSheet,
  shortDateRange,
  type WorkoutSheet,
  type WorkoutSheetExercise,
  type WorkoutSheetSet,
} from '@elevapro/shared';
import { compartilharPdf } from '@/shared/pdf/compartilharPdf';
import {
  type CabecalhoDoProtocolo,
  CSS_DO_PROTOCOLO,
  cabecalhoDoProtocolo,
  escaparHtml,
  rodapeDoProtocolo,
} from '@/shared/pdf/papelDoProtocolo';

/**
 * O treino em PDF, no papel do protocolo — o mesmo desenho do PDF da dieta e do
 * treino no web. Gerado no aparelho e apagado depois de compartilhado (#431).
 *
 * **O PDF tem só o que a tela mostra.** Sem e-mail e sem identificador interno:
 * quem recebe o arquivo pode não ser quem o aluno imagina.
 */

/**
 * O HTML do treino. Separado da impressão para o teste afirmar o que o arquivo
 * carrega — e o que não carrega.
 *
 * @example htmlDoTreino(buildWorkoutSheet(treino), { aluno: 'Ana', especialista: null, vigencia: null }, agora)
 */
export function htmlDoTreino(
  folha: WorkoutSheet,
  cabecalho: CabecalhoDoProtocolo,
  geradoEm: string
): string {
  return documento(
    cabecalho,
    `<h1>${escaparHtml(folha.title.toUpperCase())}</h1>${tabelaDoTreino(folha)}`,
    geradoEm
  );
}

/**
 * O HTML do plano completo: a periodização, e para cada fase uma faixa com nome
 * e datas seguida dos treinos dela, na tabela do treino avulso.
 *
 * @example htmlDoPlano(buildPeriodizationSheet(plano), cabecalho, agora)
 */
export function htmlDoPlano(
  plano: PeriodizationSheet,
  cabecalho: CabecalhoDoProtocolo,
  geradoEm: string
): string {
  const objetivo = plano.objective
    ? `<div class="objetivo">Objetivo: ${escaparHtml(plano.objective)}</div>`
    : '';
  const fases = plano.phases
    .map((fase) => {
      const treinos =
        fase.workouts.length > 0
          ? fase.workouts
              .map((t) => `<h2>${escaparHtml(t.title.toUpperCase())}</h2>${tabelaDoTreino(t)}`)
              .join('')
          : '<div class="vazio">Sem treinos nesta fase</div>';
      return `<div class="fase"><span>FASE ${fase.order} // ${escaparHtml(fase.name.toUpperCase())}</span><span class="datas">${escaparHtml(
        faixaDoPeriodo(fase.startDate, fase.endDate)
      )}</span></div>${treinos}`;
    })
    .join('');
  return documento(
    cabecalho,
    `<h1>${escaparHtml(plano.name.toUpperCase())}</h1>${objetivo}${fases}`,
    geradoEm
  );
}

/**
 * Um período no papel: "28 set a 4 out 2026". Lido da string, sem `Date`, que
 * leria "2026-10-01" em UTC e voltaria um dia no Brasil.
 *
 * @example faixaDoPeriodo("2026-09-28", "2026-10-04") // "28 set a 4 out 2026"
 */
export function faixaDoPeriodo(inicio: string, fim: string): string {
  return `${shortDateRange(inicio, fim)} ${fim.slice(0, 4)}`;
}

function documento(cabecalho: CabecalhoDoProtocolo, corpo: string, geradoEm: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><style>${CSS_DO_PROTOCOLO}</style></head><body>
  ${cabecalhoDoProtocolo(cabecalho)}
  <main>${corpo}</main>
  ${rodapeDoProtocolo(geradoEm)}
</body></html>`;
}

function tabelaDoTreino(folha: WorkoutSheet): string {
  return `<table>
      <thead><tr><th>ORDEM / EXERCÍCIO</th><th>SÉRIE</th><th>PRESCRIÇÃO</th><th>DESCANSO</th></tr></thead>
      <tbody>${folha.exercises.map(linhasDoExercicio).join('')}</tbody>
    </table>`;
}

/** O exercício ocupa as linhas das suas séries; a observação fecha o bloco. */
function linhasDoExercicio(exercicio: WorkoutSheetExercise): string {
  const extensao = exercicio.sets.length + (exercicio.notes ? 1 : 0);
  const nome = `<td class="exercicio" rowspan="${Math.max(extensao, 1)}">${String(exercicio.order).padStart(2, '0')}. ${escaparHtml(exercicio.name.toUpperCase())}${
    exercicio.muscleGroup ? `<small>${escaparHtml(exercicio.muscleGroup)}</small>` : ''
  }</td>`;
  if (exercicio.sets.length === 0) {
    return `<tr>${nome}<td>—</td><td>Sem séries</td><td class="descanso">—</td></tr>`;
  }
  const series = exercicio.sets.map(
    (serie, indice) => `<tr>${indice === 0 ? nome : ''}${celulasDaSerie(serie)}</tr>`
  );
  const obs = exercicio.notes
    ? `<tr><td class="obs" colspan="3">Obs.: ${escaparHtml(exercicio.notes)}</td></tr>`
    : '';
  return series.join('') + obs;
}

function celulasDaSerie(serie: WorkoutSheetSet): string {
  const tecnicas = serie.methods.map((m) => `<small>${escaparHtml(m)}</small>`).join('');
  const principal = [serie.reps, serie.weight, serie.rir].filter(Boolean).join(' · ');
  const blocos = serie.segments.map((b) => `<span class="bloco">${escaparHtml(b)}</span>`).join('');
  return `<td class="serie">${escaparHtml(serie.label)}${tecnicas}</td><td>${escaparHtml(principal)}${blocos}</td><td class="descanso">${escaparHtml(serie.rest ?? '—')}</td>`;
}

/**
 * Gera o PDF do treino e abre a folha de compartilhar do sistema.
 *
 * @example await compartilharTreino(folha, cabecalho, '21 out 2026, 10:31')
 */
export function compartilharTreino(
  folha: WorkoutSheet,
  cabecalho: CabecalhoDoProtocolo,
  geradoEm: string
): Promise<boolean> {
  return compartilharPdf({
    html: htmlDoTreino(folha, cabecalho, geradoEm),
    nomeDoArquivo: 'treino.pdf',
    tituloDaFolha: folha.title,
    eventoDeFalha: 'workout.share_pdf',
    eventoDeDescarte: 'workout.discard_pdf',
  });
}

/**
 * Gera o PDF do plano completo e abre a folha de compartilhar do sistema.
 *
 * @example await compartilharPlano(plano, cabecalho, agora)
 */
export function compartilharPlano(
  plano: PeriodizationSheet,
  cabecalho: CabecalhoDoProtocolo,
  geradoEm: string
): Promise<boolean> {
  return compartilharPdf({
    html: htmlDoPlano(plano, cabecalho, geradoEm),
    nomeDoArquivo: 'plano-de-treino.pdf',
    tituloDaFolha: plano.name,
    eventoDeFalha: 'workout.share_plan_pdf',
    eventoDeDescarte: 'workout.discard_plan_pdf',
  });
}
