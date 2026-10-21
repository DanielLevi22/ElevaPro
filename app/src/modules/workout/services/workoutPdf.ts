import {
  type PeriodizationSheet,
  type PeriodizationSheetPhase,
  shortDateRange,
  type WorkoutSheet,
  type WorkoutSheetExercise,
  type WorkoutSheetSet,
} from '@elevapro/shared';
import {
  escapeHtml,
  PROTOCOL_CSS,
  type ProtocolHeader,
  protocolFooter,
  protocolHeader,
} from '@/shared/pdf/protocolPaper';
import { sharePdf } from '@/shared/pdf/sharePdf';

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
 * @example workoutHtml(buildWorkoutSheet(workout), { document: 'Protocolo de treino', student: 'Ana', specialist: null, validity: null }, now)
 */
export function workoutHtml(
  sheet: WorkoutSheet,
  header: ProtocolHeader,
  generatedAt: string
): string {
  return page(
    header,
    `<h1>${escapeHtml(sheet.title.toUpperCase())}</h1>${workoutTable(sheet)}`,
    generatedAt
  );
}

/**
 * O HTML do plano completo: a periodização, e para cada fase uma faixa com nome
 * e datas seguida dos treinos dela, na tabela do treino avulso.
 *
 * @example planHtml(buildPeriodizationSheet(plan), header, now)
 */
export function planHtml(
  plan: PeriodizationSheet,
  header: ProtocolHeader,
  generatedAt: string
): string {
  const objective = plan.objective
    ? `<div class="objective">Objetivo: ${escapeHtml(plan.objective)}</div>`
    : '';
  const phases = plan.phases.map(phaseHtml).join('');
  return page(
    header,
    `<h1>${escapeHtml(plan.name.toUpperCase())}</h1>${objective}${phases}`,
    generatedAt
  );
}

/** A faixa da fase, com nome e datas, e os treinos dela — ou o aviso de vazia. */
function phaseHtml(phase: PeriodizationSheetPhase): string {
  const workouts =
    phase.workouts.length > 0
      ? phase.workouts
          .map((w) => `<h2>${escapeHtml(w.title.toUpperCase())}</h2>${workoutTable(w)}`)
          .join('')
      : '<div class="empty">Sem treinos nesta fase</div>';
  const title = `FASE ${phase.order} // ${escapeHtml(phase.name.toUpperCase())}`;
  const dates = escapeHtml(periodRange(phase.startDate, phase.endDate));
  return `<div class="phase"><span>${title}</span><span class="dates">${dates}</span></div>${workouts}`;
}

/**
 * Um período no papel: "28 set a 4 out 2026". Lido da string, sem `Date`, que
 * leria "2026-10-01" em UTC e voltaria um dia no Brasil.
 *
 * @example periodRange("2026-09-28", "2026-10-04") // "28 set a 4 out 2026"
 */
export function periodRange(start: string, end: string): string {
  return `${shortDateRange(start, end)} ${end.slice(0, 4)}`;
}

function page(header: ProtocolHeader, body: string, generatedAt: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><style>${PROTOCOL_CSS}</style></head><body>
  ${protocolHeader(header)}
  <main>${body}</main>
  ${protocolFooter(generatedAt)}
</body></html>`;
}

function workoutTable(sheet: WorkoutSheet): string {
  return `<table>
      <thead><tr><th>ORDEM / EXERCÍCIO</th><th>SÉRIE</th><th>PRESCRIÇÃO</th><th>DESCANSO</th></tr></thead>
      <tbody>${sheet.exercises.map(exerciseRows).join('')}</tbody>
    </table>`;
}

/** O exercício ocupa as linhas das suas séries; a observação fecha o bloco. */
function exerciseRows(exercise: WorkoutSheetExercise): string {
  const span = exercise.sets.length + (exercise.notes ? 1 : 0);
  const name = `<td class="exercise" rowspan="${Math.max(span, 1)}">${String(exercise.order).padStart(2, '0')}. ${escapeHtml(exercise.name.toUpperCase())}${
    exercise.muscleGroup ? `<small>${escapeHtml(exercise.muscleGroup)}</small>` : ''
  }</td>`;
  if (exercise.sets.length === 0) {
    return `<tr>${name}<td>—</td><td>Sem séries</td><td class="rest">—</td></tr>`;
  }
  const sets = exercise.sets.map(
    (set, index) => `<tr>${index === 0 ? name : ''}${setCells(set)}</tr>`
  );
  const notes = exercise.notes
    ? `<tr><td class="notes" colspan="3">Obs.: ${escapeHtml(exercise.notes)}</td></tr>`
    : '';
  return sets.join('') + notes;
}

function setCells(set: WorkoutSheetSet): string {
  const methods = set.methods.map((m) => `<small>${escapeHtml(m)}</small>`).join('');
  const main = [set.reps, set.weight, set.rir].filter(Boolean).join(' · ');
  const segments = set.segments
    .map((s) => `<span class="segment">${escapeHtml(s)}</span>`)
    .join('');
  return `<td class="set">${escapeHtml(set.label)}${methods}</td><td>${escapeHtml(main)}${segments}</td><td class="rest">${escapeHtml(set.rest ?? '—')}</td>`;
}

/**
 * Gera o PDF do treino e abre a folha de compartilhar do sistema.
 *
 * @example await shareWorkout(sheet, header, '21 out 2026, 10:31')
 */
export function shareWorkout(
  sheet: WorkoutSheet,
  header: ProtocolHeader,
  generatedAt: string
): Promise<boolean> {
  return sharePdf({
    html: workoutHtml(sheet, header, generatedAt),
    fileName: 'treino.pdf',
    sheetTitle: sheet.title,
    failureEvent: 'workout.share_pdf',
    discardEvent: 'workout.discard_pdf',
  });
}

/**
 * Gera o PDF do plano completo e abre a folha de compartilhar do sistema.
 *
 * @example await sharePlan(plan, header, now)
 */
export function sharePlan(
  plan: PeriodizationSheet,
  header: ProtocolHeader,
  generatedAt: string
): Promise<boolean> {
  return sharePdf({
    html: planHtml(plan, header, generatedAt),
    fileName: 'plano-de-treino.pdf',
    sheetTitle: plan.name,
    failureEvent: 'workout.share_plan_pdf',
    discardEvent: 'workout.discard_plan_pdf',
  });
}
