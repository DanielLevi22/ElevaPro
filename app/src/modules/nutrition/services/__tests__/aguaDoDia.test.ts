import { coposDoDia, mediaDeAguaDaSemana, metaDeAgua, totalAoTocarNoCopo } from '../aguaDoDia';

/**
 * A "Hidratação de hoje" do kit: oito copos, a meta e o que falta.
 *
 * O kit diz "7 de 8 copos · faltam 250 ml" com meta de 3 L, o que não fecha
 * (7/8 de 3 L deixa 375 ml). A issue decidiu: cada copo é 1/8 da meta.
 */

describe('meta de água', () => {
  it('é 35 ml por kg do último peso, arredondada a 250 ml', () => {
    // 72 kg × 35 = 2.520 ml, que arredonda para 2.500.
    expect(metaDeAgua(72)).toBe(2500);
    // 80 kg × 35 = 2.800 ml, que arredonda para 2.750.
    expect(metaDeAgua(80)).toBe(2750);
  });

  it('sem peso, a meta é 2 L', () => {
    expect(metaDeAgua(null)).toBe(2000);
  });

  // Peso zero ou negativo é leitura quebrada, e não pessoa: vale como sem peso.
  it('peso impossível vale como sem peso', () => {
    expect(metaDeAgua(0)).toBe(2000);
  });
});

describe('copos do dia', () => {
  it('oito copos, cada um 1/8 da meta', () => {
    expect(coposDoDia(0, 2000)).toMatchObject({
      total: 8,
      mlPorCopo: 250,
      cheios: 0,
      faltamMl: 2000,
    });
  });

  it('conta só o copo inteiro como cheio', () => {
    // 700 ml de uma meta de 2 L: dois copos de 250 inteiros.
    expect(coposDoDia(700, 2000)).toMatchObject({ cheios: 2, faltamMl: 1300 });
  });

  it('passar da meta enche os oito e não falta nada', () => {
    expect(coposDoDia(3100, 2000)).toMatchObject({ cheios: 8, faltamMl: 0 });
  });
});

describe('tocar num copo', () => {
  it('leva o total até aquele copo', () => {
    // Terceiro copo (índice 2) de uma meta de 2 L: 750 ml.
    expect(totalAoTocarNoCopo(2, 250, 2000)).toBe(750);
  });

  // Tocar no último copo cheio o esvazia: é o jeito de corrigir um toque a mais.
  it('tocar no último copo cheio volta um copo', () => {
    expect(totalAoTocarNoCopo(2, 750, 2000)).toBe(500);
  });

  it('o total nunca fica negativo', () => {
    expect(totalAoTocarNoCopo(0, 250, 2000)).toBe(0);
  });
});

describe('média de água da semana', () => {
  const semana = [
    { date: '2026-09-07', water_ml: 2000 },
    { date: '2026-09-08', water_ml: 3000 },
    { date: '2026-09-13', water_ml: 500 },
  ];

  // O copo tocado agora ainda não voltou do banco: a média usa o total ao vivo
  // de hoje no lugar do que a semana leu.
  it('usa o total de hoje que está na tela, e não o lido do banco', () => {
    expect(mediaDeAguaDaSemana(semana, '2026-09-13', 2500)).toBe(2500);
  });

  it('dia sem água não entra na média', () => {
    expect(mediaDeAguaDaSemana(semana, '2026-09-13', 0)).toBe(2500);
  });

  it('sem nenhum registro, a média não existe', () => {
    expect(mediaDeAguaDaSemana([], '2026-09-13', 0)).toBeNull();
  });
});

describe('copos com meta que não divide em ml inteiros', () => {
  // Meta de 2.750 ml dá copo de 343,75. Tocar no 3º grava 1.031 ml, arredondado:
  // dividindo por 343,75 dava 2,999… e a tela mostrava dois copos cheios.
  it('o copo tocado aparece cheio mesmo com o total arredondado para baixo', () => {
    const total = totalAoTocarNoCopo(2, 0, 2750);

    expect(coposDoDia(total, 2750).cheios).toBe(3);
  });

  it('o primeiro copo de uma meta de 2.250 aparece cheio', () => {
    expect(coposDoDia(totalAoTocarNoCopo(0, 0, 2250), 2250).cheios).toBe(1);
  });

  it('tocar de novo no copo que acabou de encher o esvazia', () => {
    const cheio = totalAoTocarNoCopo(2, 0, 2750);

    expect(coposDoDia(totalAoTocarNoCopo(2, cheio, 2750), 2750).cheios).toBe(2);
  });
});
