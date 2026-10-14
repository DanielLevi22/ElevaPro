import {
  type BlockReport,
  type BlockVerdict,
  contagem,
  daysBetween,
  formatarDecimal,
  shortDateRange,
} from '@elevapro/shared';

export interface BlockHeadline {
  eyebrow: string;
  title: string;
  sub: string;
}

const HEADLINES: Record<Exclude<BlockVerdict, 'no_promise'>, { title: string; sub: string }> = {
  ahead: {
    title: 'À frente do combinado',
    sub: 'Seu peso andou mais do que a gente prometeu no primeiro dia.',
  },
  on_track: {
    title: 'Dentro do combinado',
    sub: 'Seu peso andou como a gente prometeu no primeiro dia.',
  },
  behind: {
    title: 'Um pouco atrás do combinado',
    sub: 'Acontece. O próximo bloco parte de onde você está.',
  },
};

const weeksOf = (report: BlockReport) =>
  contagem(Math.max(1, Math.round(daysBetween(report.start, report.end) / 7)), 'semana', 'semanas');

/**
 * O título do relatório do bloco (B4) pelo prometido × real. Atrás do
 * combinado não leva bronca: o próximo bloco parte de onde a pessoa está.
 *
 * O bloco encerrado antes do fim (C2) não é "concluído": diz até onde foi.
 *
 * @example blockHeadline(relatorio, 'Meu primeiro plano').title // "À frente do combinado"
 */
export function blockHeadline(
  report: BlockReport,
  name: string,
  endedEarly = false
): BlockHeadline {
  // "Bloco 2 · Hipertrofia · 4x por semana" vira "Bloco 2": a linha é curta.
  const [shortName] = name.split(' · ');
  const eyebrow = `${shortName} · ${shortDateRange(report.start, report.end)}`;
  if (endedEarly) {
    return {
      eyebrow,
      title: 'Encerrado antes do fim',
      sub: `${weeksOf(report)} de treino até você mudar o plano.`,
    };
  }
  if (report.verdict === 'no_promise') {
    return {
      eyebrow,
      title: 'Bloco concluído',
      sub: `${weeksOf(report)} de treino. Veja o que mudou.`,
    };
  }
  return { eyebrow, ...HEADLINES[report.verdict] };
}

const kg = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatarDecimal(Math.abs(value))} kg`;

/**
 * A linha do prometido e do real, ou nada sem promessa.
 *
 * @example promiseLine(relatorio) // "Prometido no 1º dia: −1,2 a −2 kg · Real: −1,5 kg"
 */
export function promiseLine(report: BlockReport): string | null {
  if (!report.promisedKg || report.realKg === null) return null;
  const { from, to } = report.promisedKg;
  return `Prometido no 1º dia: ${kg(from).replace(' kg', '')} a ${kg(to)} · Real: ${kg(report.realKg)}`;
}

/**
 * "Seu plano mudou N vezes com você", com o que mudou.
 *
 * @example changesLine({ loads: 5, swaps: 1, targets: 1 })
 * // { title: 'Seu plano mudou 7 vezes com você', sub: '5 cargas subiram, 1 exercício trocado e a meta revista 1 vez.' }
 */
export function changesLine(changes: BlockReport['changes']): { title: string; sub: string } {
  const total = changes.loads + changes.swaps + changes.targets;
  if (total === 0) {
    return {
      title: 'Seu plano seguiu como estava',
      sub: 'Nenhuma carga, troca ou meta mudou neste bloco.',
    };
  }
  const parts = [
    changes.loads > 0 ? `${contagem(changes.loads, 'carga subiu', 'cargas subiram')}` : null,
    changes.swaps > 0
      ? `${contagem(changes.swaps, 'exercício trocado', 'exercícios trocados')}`
      : null,
    changes.targets > 0 ? `a meta revista ${contagem(changes.targets, 'vez', 'vezes')}` : null,
  ].filter((part): part is string => part !== null);
  const sentence =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0];
  return {
    title:
      total === 1 ? 'Seu plano mudou 1 vez com você' : `Seu plano mudou ${total} vezes com você`,
    sub: `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`,
  };
}
