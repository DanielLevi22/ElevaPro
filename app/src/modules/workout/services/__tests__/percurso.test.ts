import { medirPercurso, type Posicao } from '../percurso';

/** 0,001° de latitude ≈ 111,19 m na esfera de raio 6371 km. */
const GRAU_MILESIMO_EM_METROS = 111.19;

function posicao(latitude: number, segundos: number, accuracy = 5): Posicao {
  return { latitude, longitude: 0, timestamp: segundos * 1000, accuracy };
}

describe('medirPercurso', () => {
  it('mede a distância entre duas posições', () => {
    const { distanceMeters } = medirPercurso([posicao(0, 0), posicao(0.001, 60)]);

    expect(distanceMeters).toBeCloseTo(GRAU_MILESIMO_EM_METROS, 1);
  });

  it('soma os trechos de uma sequência', () => {
    const { distanceMeters } = medirPercurso([
      posicao(0, 0),
      posicao(0.001, 60),
      posicao(0.002, 120),
    ]);

    expect(distanceMeters).toBeCloseTo(GRAU_MILESIMO_EM_METROS * 2, 1);
  });

  it('não acrescenta distância quando a posição se repete', () => {
    const parado = [posicao(0, 0), posicao(0, 30), posicao(0, 60)];

    expect(medirPercurso(parado).distanceMeters).toBe(0);
  });

  // O GPS urbano salta: o aparelho troca de satélite e devolve um ponto a
  // quilômetros dali, no segundo seguinte. Sem este corte a corrida de 9 km
  // vira 40 km, e o ritmo médio vira ficção.
  it('descarta o salto que exigiria velocidade impossível', () => {
    const comSalto = [
      posicao(0, 0),
      posicao(0.001, 60),
      posicao(5, 61), // ~555 km em 1 s
      posicao(0.002, 120),
    ];

    expect(medirPercurso(comSalto).distanceMeters).toBeCloseTo(GRAU_MILESIMO_EM_METROS * 2, 1);
  });

  it('descarta a posição de precisão ruim', () => {
    const comRuido = [posicao(0, 0), posicao(0.5, 30, 400), posicao(0.001, 60)];

    expect(medirPercurso(comRuido).distanceMeters).toBeCloseTo(GRAU_MILESIMO_EM_METROS, 1);
  });

  it('calcula o ritmo como tempo por quilômetro percorrido', () => {
    // 1 km em 5 min → 300 s/km.
    const umQuilometroEmCincoMinutos = [posicao(0, 0), posicao(0.0089932, 300)];

    const { paceSecondsPerKm } = medirPercurso(umQuilometroEmCincoMinutos);

    expect(paceSecondsPerKm).toBeCloseTo(300, 0);
  });

  it('não inventa ritmo com uma posição só', () => {
    expect(medirPercurso([posicao(0, 0)])).toEqual({
      distanceMeters: 0,
      paceSecondsPerKm: null,
    });
  });

  it('não inventa ritmo sem posição nenhuma', () => {
    expect(medirPercurso([])).toEqual({ distanceMeters: 0, paceSecondsPerKm: null });
  });

  // Dividir 40 min por 3 m dá um ritmo de 13 dias por quilômetro. O número
  // existe, é aritmeticamente correto e não significa nada.
  it('não inventa ritmo quando a distância é desprezível', () => {
    const quaseParado = [posicao(0, 0), posicao(0.00002, 2400)];

    expect(medirPercurso(quaseParado).paceSecondsPerKm).toBeNull();
  });

  // O CHECK da `0049` recusa ritmo fora de 60..3600 s/km, e o INSERT recusado
  // derruba a gravação da sessão inteira — a corrida some, não só o ritmo.
  // Quem produz o número é quem tem de respeitar a faixa.
  it('não devolve ritmo mais lento que o mínimo fisiológico', () => {
    // 60 m de deriva ao longo de 40 minutos: passa do corte de distância e
    // daria 40000 s/km.
    const arrastando = [posicao(0, 0), posicao(0.00054, 2400)];

    const { distanceMeters, paceSecondsPerKm } = medirPercurso(arrastando);

    expect(distanceMeters).toBeGreaterThan(50);
    expect(paceSecondsPerKm).toBeNull();
  });

  it('não devolve ritmo mais rápido que o teto fisiológico', () => {
    // 1 km em 30 s são 120 km/h, abaixo do corte de velocidade por trecho mas
    // impossível como média.
    const rapidoDemais = [posicao(0, 0), posicao(0.0089932, 30)];

    expect(medirPercurso(rapidoDemais).paceSecondsPerKm).toBeNull();
  });
});
