import type { Periodization } from '../../store/workoutStore';
import { rotuloDoFim } from '../PeriodizationHistoryRow';

const de = (status: Periodization['status'], end_reason: Periodization['end_reason'] = null) =>
  rotuloDoFim({ status, end_reason });

describe('como o plano acabou, no histórico (C3)', () => {
  it('fechado antes do fim e trocado não aparecem como concluídos', () => {
    expect(de('completed', 'changed_early')).toBe('Encerrada antes');
    expect(de('completed', 'replaced')).toBe('Trocada');
  });

  it('o fim do bloco, e o histórico de antes do motivo, ficam como concluídos', () => {
    expect(de('completed', 'block_completed')).toBe('Concluída');
    expect(de('completed')).toBe('Concluída');
    expect(de('planned')).toBe('Planejada');
  });
});
