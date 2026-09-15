/**
 * "O que é armazenado" no consentimento de saúde: a lista que o aluno aceita.
 *
 * Mora fora do componente para ser a interface testada: cada linha é uma promessa
 * sobre o que o app grava, e a versão da política sobe quando uma linha entra.
 *
 * @example storedItems(hasSpecialist).map((item) => <Bullet key={item}>{item}</Bullet>)
 */
const ITEMS = [
  'Passos e calorias do dia',
  // A 1.7 existe por esta linha: a prontidão é inferência gravada (ADR-0029). O
  // sono e a FC de repouso, da 1.3, faltavam na lista e entram junto.
  'Duração do sono e frequência cardíaca de repouso, e a prontidão do dia calculada deles contra a sua própria média',
  'Treinos executados, com séries e cargas',
  // A 1.6 existe por esta linha: as zonas passaram a ser guardadas, e a idade da
  // anamnese passou a calculá-las.
  'Das suas corridas, a frequência cardíaca média e o tempo em cada zona de esforço, calculadas com a idade da sua anamnese',
  // A 1.8 existe por esta linha e pela das notas: o próprio aluno passou a registrar
  // medida (0056), e a lista nunca tinha dito que a medida corporal é guardada.
  'Peso, gordura e medidas corporais, registradas por você ou pelo seu especialista',
  'Refeições registradas do seu plano',
  'A água que você registra no dia',
  'O que você escreve no feedback de fim de treino',
];

/** Só o Aluno: ao Praticante ninguém escreve nota, e a linha descreveria o que não acontece. */
const SPECIALIST_NOTES = 'As notas que o seu especialista escreve sobre o seu progresso';

export function storedItems(hasSpecialist: boolean): string[] {
  return hasSpecialist ? [...ITEMS, SPECIALIST_NOTES] : [...ITEMS];
}
