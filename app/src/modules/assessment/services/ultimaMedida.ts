import type { BodyScanRecord, PhysicalAssessment } from '@elevapro/shared';

/**
 * A medida mais recente do aluno, venha da imagem ou da fita.
 *
 * A aba Física lia só `physical_assessments` e mandava, no próprio vazio,
 * "realize o escaneamento corporal pela aba I.A. Vision". Quem obedecia fazia o
 * scan, voltava, e continuava vendo "nenhuma avaliação registrada": o scan
 * grava em `body_scans`, e nada ligava as duas tabelas.
 *
 * A origem viaja junto de propósito. Medida estimada por imagem e medida tirada
 * com fita não são a mesma coisa, e quem lê um número de circunferência precisa
 * saber qual das duas está vendo antes de decidir carga ou dieta em cima dele.
 *
 * @example
 * const medida = medidaMaisRecente(avaliacao, scan);
 * if (!medida) mostrarVazio();
 * else cabecalho(medida.origem, medida.data);
 */
export type OrigemDaMedida = 'imagem' | 'fita';

export interface ValorMedido {
  label: string;
  /** Já formatado, com `—` quando não medido. Tela não decide casa decimal. */
  value: string;
}

export interface MedidaMaisRecente {
  origem: OrigemDaMedida;
  /** ISO. `scanned_at` no scan, `assessed_at` na avaliação digitada. */
  data: string;
  composicao: ValorMedido[];
  circunferencias: ValorMedido[];
  /** Vazio na imagem: nenhuma foto produz dobra cutânea. */
  dobras: ValorMedido[];
}

function fmt(valor: number | null | undefined, casas = 0): string {
  return valor === null || valor === undefined ? '—' : valor.toFixed(casas);
}

/** Fora as não medidas: linha com `—` ocupa espaço dizendo nada. */
function medidos(valores: ValorMedido[]): ValorMedido[] {
  return valores.filter((v) => v.value !== '—');
}

/**
 * IMC da avaliação digitada, que não guarda a coluna — o scan guarda.
 *
 * Calcular aqui é o que deixa as duas origens mostrarem a mesma linha. Altura
 * ausente ou zero devolve `null` em vez de `Infinity`, que chegaria à tela
 * parecendo medida.
 */
function imc(pesoKg: number | null, alturaCm: number | null): number | null {
  if (pesoKg === null || alturaCm === null || alturaCm <= 0) return null;
  const alturaM = alturaCm / 100;
  return pesoKg / (alturaM * alturaM);
}

function daImagem(scan: BodyScanRecord): MedidaMaisRecente {
  return {
    origem: 'imagem',
    data: scan.scanned_at,
    composicao: medidos([
      { label: 'Peso', value: fmt(scan.weight_kg, 1) },
      { label: 'Gordura', value: fmt(scan.body_fat_pct, 1) },
      { label: 'Massa magra', value: fmt(scan.lean_mass_kg, 1) },
      { label: 'IMC', value: fmt(scan.bmi, 1) },
    ]),
    circunferencias: medidos([
      { label: 'Pescoço', value: fmt(scan.circ_neck) },
      { label: 'Ombros', value: fmt(scan.circ_shoulders) },
      { label: 'Tórax', value: fmt(scan.circ_chest) },
      { label: 'Cintura', value: fmt(scan.circ_waist) },
      { label: 'Quadril', value: fmt(scan.circ_hips) },
      { label: 'Braços', value: fmt(scan.circ_arms) },
      { label: 'Coxas', value: fmt(scan.circ_thighs) },
      { label: 'Panturrilhas', value: fmt(scan.circ_calves) },
    ]),
    // Imagem não mede dobra: seria inventar prega de pele a partir de pixel.
    dobras: [],
  };
}

function daFita(avaliacao: PhysicalAssessment): MedidaMaisRecente {
  return {
    origem: 'fita',
    data: avaliacao.assessed_at,
    composicao: medidos([
      { label: 'Peso', value: fmt(avaliacao.weight_kg, 1) },
      { label: 'Gordura', value: fmt(avaliacao.body_fat_pct, 1) },
      { label: 'Massa magra', value: fmt(avaliacao.muscle_mass_kg, 1) },
      { label: 'IMC', value: fmt(imc(avaliacao.weight_kg, avaliacao.height_cm), 1) },
    ]),
    circunferencias: medidos([
      { label: 'Pescoço', value: fmt(avaliacao.circ_neck) },
      { label: 'Ombros', value: fmt(avaliacao.circ_shoulder) },
      { label: 'Tórax', value: fmt(avaliacao.circ_chest) },
      { label: 'Cintura', value: fmt(avaliacao.circ_waist) },
      { label: 'Abdômen', value: fmt(avaliacao.circ_abdomen) },
      { label: 'Quadril', value: fmt(avaliacao.circ_hip) },
      { label: 'Braço dir.', value: fmt(avaliacao.circ_right_arm) },
      { label: 'Braço esq.', value: fmt(avaliacao.circ_left_arm) },
      { label: 'Coxa dir.', value: fmt(avaliacao.circ_right_thigh) },
      { label: 'Coxa esq.', value: fmt(avaliacao.circ_left_thigh) },
      { label: 'Panturrilha dir.', value: fmt(avaliacao.circ_right_calf) },
      { label: 'Panturrilha esq.', value: fmt(avaliacao.circ_left_calf) },
    ]),
    dobras: medidos([
      { label: 'Tricipital', value: fmt(avaliacao.skinfold_tricep) },
      { label: 'Subescapular', value: fmt(avaliacao.skinfold_subscapular) },
      { label: 'Suprailíaca', value: fmt(avaliacao.skinfold_suprailiac) },
      { label: 'Abdominal', value: fmt(avaliacao.skinfold_abdomen) },
      { label: 'Coxa', value: fmt(avaliacao.skinfold_thigh) },
      { label: 'Peitoral', value: fmt(avaliacao.skinfold_chest) },
    ]),
  };
}

export function medidaMaisRecente(
  avaliacao: PhysicalAssessment | null,
  scan: BodyScanRecord | null
): MedidaMaisRecente | null {
  if (!avaliacao && !scan) return null;
  if (!scan) return daFita(avaliacao as PhysicalAssessment);
  if (!avaliacao) return daImagem(scan);

  // Empate fica com a imagem: é a que o vazio da tela mandou fazer, e ver a
  // medida antiga logo depois de escanear é o defeito que isto veio consertar.
  return new Date(scan.scanned_at) >= new Date(avaliacao.assessed_at)
    ? daImagem(scan)
    : daFita(avaliacao);
}
