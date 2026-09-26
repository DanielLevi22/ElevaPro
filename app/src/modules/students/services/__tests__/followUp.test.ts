import type { ActivityDay, ActivityEvent, ActivityKind } from '@elevapro/shared';
import { timelineEntries } from '../followUp';

const TODAY = '2026-09-26';

function event(kind: ActivityKind, overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: `${kind}-${Math.random()}`,
    kind,
    author: 'student',
    at: '2026-09-26T10:12:00',
    title: kind,
    detail: null,
    pse: null,
    studentNote: null,
    noteEditedAt: null,
    ...overrides,
  };
}

function day(date: string, events: ActivityEvent[]): ActivityDay {
  return { date, summary: null, events };
}

describe('timelineEntries', () => {
  const days = [
    day(TODAY, [event('workout', { title: 'Treino A', detail: '52 min', pse: 7 })]),
    day('2026-09-25', [event('meal', { at: '2026-09-25' })]),
    day('2026-09-10', [event('assessment', { at: '2026-09-10T08:00:00' })]),
  ];

  it('mostra tudo no filtro Histórico, do mais recente ao mais antigo', () => {
    expect(timelineEntries(days, 'all', TODAY).map((e) => e.kind)).toEqual([
      'workout',
      'meal',
      'assessment',
    ]);
  });

  it('filtra por grupo de tipo', () => {
    expect(timelineEntries(days, 'training', TODAY).map((e) => e.kind)).toEqual(['workout']);
    expect(timelineEntries(days, 'nutrition', TODAY).map((e) => e.kind)).toEqual(['meal']);
    expect(timelineEntries(days, 'measures', TODAY).map((e) => e.kind)).toEqual(['assessment']);
  });

  it('escreve o dia relativo, e a hora só quando o evento tem horário', () => {
    const [workout, meal, assessment] = timelineEntries(days, 'all', TODAY);
    expect(workout.when).toBe('Hoje · 10:12');
    expect(meal.when).toBe('Ontem');
    expect(assessment.when).toBe('10 set · 08:00');
  });

  it('junta o detalhe e a PSE na linha secundária', () => {
    expect(timelineEntries(days, 'training', TODAY)[0].detail).toBe('52 min · PSE 7 — Puxado');
  });

  // Art. 11 da LGPD: `workout_sessions.notes` é o relato livre do aluno ("senti
  // dor no ombro") e a RLS não o separa do resto da sessão (pendência em
  // docs/LGPD_COMPLIANCE.md). O app do especialista não exibe a nota, então
  // ela não pode sobreviver ao mapeamento — o que sai daqui vai para o estado
  // da tela e dali para qualquer log ou crash report que o capture.
  it('o acompanhamento nunca carrega a nota do aluno', () => {
    const note = 'senti dor no ombro depois da cirurgia';
    const withNote = [day(TODAY, [event('workout', { studentNote: note })])];

    const serialized = JSON.stringify(timelineEntries(withNote, 'all', TODAY));

    if (serialized.includes(note)) {
      throw new Error('NOTA DO ALUNO VAZOU: o relato de saúde chegou à linha do tempo');
    }
  });
});
