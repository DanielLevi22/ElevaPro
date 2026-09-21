import type { BriefingSignal } from '@elevapro/shared';
import { shouldShowRiskBanner, toSeenRiskSignal } from '../shouldShowRiskBanner';

const sinal: BriefingSignal = {
  studentId: 'aluno-1',
  studentName: 'João Vieira',
  kind: 'inactive',
  tone: 'danger',
  message: 'Não treina há 5 dias. Risco de abandono.',
  days: 5,
};

describe('toSeenRiskSignal', () => {
  // LGPD: a inferência de saúde ("não treina há N dias") não pode ficar
  // guardada em texto claro no dedupe local — só o suficiente pra comparar.
  it('não guarda a mensagem nem o nome do aluno, só kind e days', () => {
    const visto = toSeenRiskSignal(sinal);

    expect(Object.keys(visto).sort()).toEqual(['days', 'kind']);
    expect(visto).toEqual({ kind: 'inactive', days: 5 });
  });
});

describe('shouldShowRiskBanner', () => {
  it('mostra quando o especialista nunca viu este aluno em risco', () => {
    expect(shouldShowRiskBanner({ kind: 'inactive', days: 5 }, null)).toBe(true);
  });

  it('não repete o mesmo sinal já visto', () => {
    expect(shouldShowRiskBanner({ kind: 'inactive', days: 5 }, { kind: 'inactive', days: 5 })).toBe(
      false
    );
  });

  it('mostra de novo quando os dias do mesmo sinal mudaram', () => {
    expect(shouldShowRiskBanner({ kind: 'inactive', days: 8 }, { kind: 'inactive', days: 5 })).toBe(
      true
    );
  });

  it('não mostra quando não há sinal atual, mesmo com algo visto antes', () => {
    expect(shouldShowRiskBanner(null, { kind: 'inactive', days: 5 })).toBe(false);
  });
});
