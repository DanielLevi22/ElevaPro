import { healthConnectReadTypes, healthKitReadTypes } from '../permissions';
import type { Capability } from '../types';

const ALL: Capability[] = ['dailyActivity', 'sleepAndRestingHr', 'workoutHeartRate'];

describe('permissões pedidas por capacidade', () => {
  it('cada capacidade pede só os tipos que a prova dela lê, no Health Connect', () => {
    expect(healthConnectReadTypes(['dailyActivity'])).toEqual(['Steps', 'ActiveCaloriesBurned']);
    expect(healthConnectReadTypes(['sleepAndRestingHr'])).toEqual([
      'SleepSession',
      'RestingHeartRate',
    ]);
    expect(healthConnectReadTypes(['workoutHeartRate'])).toEqual(['HeartRate']);
  });

  it('cada capacidade pede só os tipos que a prova dela lê, no HealthKit', () => {
    expect(healthKitReadTypes(['dailyActivity'])).toEqual([
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
    ]);
    expect(healthKitReadTypes(['sleepAndRestingHr'])).toEqual([
      'HKCategoryTypeIdentifierSleepAnalysis',
      'HKQuantityTypeIdentifierRestingHeartRate',
    ]);
    expect(healthKitReadTypes(['workoutHeartRate'])).toEqual(['HKQuantityTypeIdentifierHeartRate']);
  });

  // LGPD, Art. 6°, III. A FC do treino é procurada na janela das sessões de cardio
  // do próprio app. Ler as sessões de exercício do relógio revelaria os treinos
  // feitos fora do app, com horário, para uma finalidade que não existe
  // (`LGPD_COMPLIANCE.md` §2.3). Quem precisar delas abre parecer próprio.
  it('nenhuma capacidade pede as sessões de exercício do relógio', () => {
    const requested = [...healthConnectReadTypes(ALL), ...healthKitReadTypes(ALL)];
    const exercise = requested.filter((type) => /exercise|workout/i.test(type));

    if (exercise.length > 0) {
      throw new Error(`EXERCÍCIOS FORA DO APP PEDIDOS: ${exercise.join(', ')} entrou na permissão`);
    }
  });

  it('pedir capacidades repetidas não duplica o tipo', () => {
    expect(healthConnectReadTypes(['workoutHeartRate', 'workoutHeartRate'])).toEqual(['HeartRate']);
  });
});
