import {
  estimateCalories,
  formatKilometers,
  formatMet,
  formatPace,
  formatShortDuration,
  gpsSignal,
  speedKmh,
} from '../cardioMetrics';

describe('medidas do cardio', () => {
  it('estima as calorias por MET × peso × horas', () => {
    // O kit: 30 min de bicicleta a 6,0 MET para 74 kg dão ≈ 222 kcal.
    expect(estimateCalories(6, 74, 30 * 60_000)).toBe(222);
  });

  it('calcula a velocidade média em km/h', () => {
    expect(speedKmh(7400, 18.6 * 60_000)).toBeCloseTo(23.87, 1);
  });

  // Nos primeiros segundos, 20 m de deriva do GPS viram 70 km/h. Sem um minuto
  // e sem distância a velocidade não significa nada, e a tela mostra traço.
  it('não inventa velocidade sem distância ou antes de um minuto', () => {
    expect(speedKmh(0, 10 * 60_000)).toBeNull();
    expect(speedKmh(20, 20_000)).toBeNull();
  });

  it('escreve quilômetros com vírgula, na casa pedida', () => {
    expect(formatKilometers(7400)).toBe('7,4');
    expect(formatKilometers(5420, 2)).toBe('5,42');
    expect(formatKilometers(11_800)).toBe('11,8');
  });

  it('escreve o ritmo como minuto e segundo por km', () => {
    expect(formatPace(338)).toBe('5:38');
    expect(formatPace(302.6)).toBe('5:03');
  });

  it('escreve durações curtas em minutos e, a partir de uma hora, em horas', () => {
    expect(formatShortDuration(28 * 60)).toBe('28 min');
    expect(formatShortDuration(6 * 3600 + 10 * 60)).toBe('6 h 10');
    expect(formatShortDuration(3600 + 5 * 60)).toBe('1 h 05');
  });

  it('escreve o MET sempre com uma casa', () => {
    expect(formatMet(6)).toBe('6,0');
    expect(formatMet(3.5)).toBe('3,5');
  });

  it('diz a força do GPS pela precisão do último ponto', () => {
    expect(gpsSignal(false, 5)).toBe('Sem GPS');
    expect(gpsSignal(true, null)).toBe('Buscando GPS');
    expect(gpsSignal(true, 6)).toBe('GPS forte');
    expect(gpsSignal(true, 22)).toBe('GPS médio');
    expect(gpsSignal(true, 45)).toBe('GPS fraco');
  });
});
