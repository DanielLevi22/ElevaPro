import { POLICY_VERSION } from '@elevapro/shared';
import { type HealthCheckInput, healthChecklist } from '../healthChecklist';

const ALL_GOOD: HealthCheckInput = {
  platform: 'health_connect',
  consent: { state: 'granted', givenAt: '2026-09-14T10:00:00Z', policyVersion: POLICY_VERSION },
  platformAvailable: true,
  capabilities: {
    dailyActivity: 'available',
    sleepAndRestingHr: 'available',
    workoutHeartRate: 'available',
  },
  background: 'granted',
  historyDays: 7,
};

function check(input: HealthCheckInput, id: string) {
  const found = healthChecklist(input).checks.find((item) => item.id === id);
  if (!found) throw new Error(`verificação "${id}" ausente; esperado uma das seis do health check`);
  return found;
}

describe('health check', () => {
  it('com tudo certo, as seis verificações passam no Android', () => {
    const result = healthChecklist(ALL_GOOD);
    expect(result.okCount).toBe(6);
    expect(result.total).toBe(6);
    expect(result.checks.every((item) => item.state === 'ok')).toBe(true);
  });

  // O iPhone não separa a leitura em segundo plano: contar uma verificação que o
  // Student não tem como resolver deixaria o diagnóstico eternamente pendente.
  it('no iPhone não há verificação de segundo plano', () => {
    const result = healthChecklist({
      ...ALL_GOOD,
      platform: 'healthkit',
      background: 'not_applicable',
    });
    expect(result.total).toBe(5);
    expect(result.checks.map((item) => item.id)).not.toContain('background');
  });

  it('o aceite diz a versão e a data; pendente e retirado pedem ação', () => {
    expect(check(ALL_GOOD, 'consent').detail).toBe(`Versão ${POLICY_VERSION} aceita em 14 set`);

    const outdated = check(
      {
        ...ALL_GOOD,
        consent: { state: 'outdated', givenAt: '2026-08-01T10:00:00Z', policyVersion: '1.6' },
      },
      'consent'
    );
    expect(outdated).toMatchObject({ state: 'attention', fix: 'consent' });

    const revoked = check(
      {
        ...ALL_GOOD,
        consent: {
          state: 'revoked',
          givenAt: '2026-08-01T10:00:00Z',
          policyVersion: POLICY_VERSION,
        },
      },
      'consent'
    );
    expect(revoked).toMatchObject({ state: 'attention', fix: 'consent' });
  });

  // "Sem leitura ainda" não é defeito: o relógio novo ainda não mandou nada. Dizer
  // "negado" ali mandaria o Student mexer numa permissão que está certa.
  it('capacidade ainda desconhecida fica pendente, e não com defeito', () => {
    const unknown = check(
      { ...ALL_GOOD, capabilities: { ...ALL_GOOD.capabilities, workoutHeartRate: 'unknown' } },
      'workoutHeartRate'
    );
    expect(unknown).toMatchObject({ state: 'pending', fix: 'none' });
  });

  it('capacidade ausente diz o que deixa de funcionar e leva às permissões', () => {
    const noSleep = check(
      { ...ALL_GOOD, capabilities: { ...ALL_GOOD.capabilities, sleepAndRestingHr: 'unavailable' } },
      'sleep'
    );
    expect(noSleep).toMatchObject({ state: 'attention', fix: 'permissions' });
    expect(noSleep.detail).toContain('prontidão');
  });

  it('sem o Health Connect instalado, o relógio pede para abrir o sistema', () => {
    expect(check({ ...ALL_GOOD, platformAvailable: false }, 'watch')).toMatchObject({
      state: 'attention',
      fix: 'settings',
    });
  });

  it('sem leitura em segundo plano, avisa que os dados só chegam com o app aberto', () => {
    expect(check({ ...ALL_GOOD, background: 'denied' }, 'background')).toMatchObject({
      state: 'attention',
      fix: 'permissions',
      detail: 'Os dados só chegam quando você abre o app',
    });
  });

  it('histórico curto é pendência que o tempo resolve, com a contagem', () => {
    const history = check({ ...ALL_GOOD, historyDays: 2 }, 'history');
    expect(history).toMatchObject({
      state: 'pending',
      detail: '2 de 7 dias coletados',
      fix: 'none',
    });
    expect(healthChecklist({ ...ALL_GOOD, historyDays: 2 }).okCount).toBe(5);
  });
});
