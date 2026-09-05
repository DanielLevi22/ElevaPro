import type { BodyScanRecord, PhysicalAssessment } from '@elevapro/shared';
import { medidaMaisRecente } from '../ultimaMedida';

/**
 * A aba Física dizia, no próprio vazio, "realize o escaneamento corporal pela
 * aba I.A. Vision" — e depois lia outra tabela. Quem obedecia fazia o scan,
 * voltava, e continuava vendo "nenhuma avaliação registrada".
 *
 * Estes testes fixam as duas coisas que isso exige: a medida mais recente
 * aparece venha de onde vier, e a origem nunca é escondida — medida estimada
 * por imagem e medida tirada com fita não são a mesma coisa.
 */

function scan(overrides: Partial<BodyScanRecord> = {}): BodyScanRecord {
  return {
    scanned_at: '2026-09-05T10:00:00Z',
    weight_kg: 82.4,
    body_fat_pct: 18.2,
    lean_mass_kg: 67.4,
    bmi: 24.1,
    circ_chest: 102,
    circ_waist: 84,
    ...overrides,
  } as BodyScanRecord;
}

function avaliacao(overrides: Partial<PhysicalAssessment> = {}): PhysicalAssessment {
  return {
    assessed_at: '2026-09-01T10:00:00Z',
    weight_kg: 80,
    height_cm: 178,
    body_fat_pct: 20,
    muscle_mass_kg: 64,
    skinfold_tricep: 12,
    circ_chest: 100,
    ...overrides,
  } as PhysicalAssessment;
}

const rotulos = (valores: { label: string }[]) => valores.map((v) => v.label);
const valorDe = (valores: { label: string; value: string }[], label: string) =>
  valores.find((v) => v.label === label)?.value;

describe('medida mais recente', () => {
  it('não inventa medida quando não há nenhuma', () => {
    expect(medidaMaisRecente(null, null)).toBeNull();
  });

  // O defeito original: o scan existia e a tela dizia que não havia nada.
  it('mostra o scan quando é a única medida', () => {
    const medida = medidaMaisRecente(null, scan());

    expect(medida?.origem).toBe('imagem');
    expect(valorDe(medida?.composicao ?? [], 'Peso')).toBe('82.4');
  });

  it('mostra a avaliação digitada quando é a única medida', () => {
    const medida = medidaMaisRecente(avaliacao(), null);

    expect(medida?.origem).toBe('fita');
    expect(valorDe(medida?.composicao ?? [], 'Peso')).toBe('80.0');
  });

  it('havendo as duas, vence a mais recente', () => {
    expect(medidaMaisRecente(avaliacao(), scan())?.origem).toBe('imagem');

    const digitadaDepois = avaliacao({ assessed_at: '2026-09-10T10:00:00Z' });
    expect(medidaMaisRecente(digitadaDepois, scan())?.origem).toBe('fita');
  });

  // Ver a medida antiga logo depois de escanear é o defeito que isto conserta.
  it('empate de data fica com a imagem', () => {
    const mesmaData = avaliacao({ assessed_at: '2026-09-05T10:00:00Z' });

    expect(medidaMaisRecente(mesmaData, scan())?.origem).toBe('imagem');
  });

  // Foto não produz prega de pele. Uma linha de dobra vinda de scan seria
  // número inventado com cara de medida.
  it('scan não traz dobra cutânea', () => {
    expect(medidaMaisRecente(null, scan())?.dobras).toEqual([]);
    expect(medidaMaisRecente(avaliacao(), null)?.dobras.length).toBeGreaterThan(0);
  });

  it('não lista o que não foi medido', () => {
    const medida = medidaMaisRecente(null, scan({ circ_waist: null }));

    expect(rotulos(medida?.circunferencias ?? [])).toContain('Tórax');
    expect(rotulos(medida?.circunferencias ?? [])).not.toContain('Cintura');
  });

  // `physical_assessments` não guarda IMC; o scan guarda. Calcular aqui é o que
  // deixa as duas origens mostrarem a mesma linha.
  it('calcula o IMC da avaliação digitada', () => {
    const medida = medidaMaisRecente(avaliacao({ weight_kg: 80, height_cm: 178 }), null);

    expect(valorDe(medida?.composicao ?? [], 'IMC')).toBe('25.2');
  });

  it('altura ausente não vira IMC infinito na tela', () => {
    const medida = medidaMaisRecente(avaliacao({ height_cm: null }), null);

    expect(rotulos(medida?.composicao ?? [])).not.toContain('IMC');
  });
});
