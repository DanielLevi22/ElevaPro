import type { AccountType } from '@elevapro/shared';
import type { Href } from 'expo-router';

/**
 * O modo com que a rota foi aberta: `execute` é o membro abrindo o próprio
 * plano para treinar, e não para editar.
 */
export type ModoDaRota = 'execute' | undefined;

/**
 * Quem vê as telas de treino como aluno.
 *
 * O aluno, sempre. O membro — quem monta o próprio plano — só quando abre o
 * plano para **treinar** (`mode=execute`): fora disso ele é o autor do plano e
 * precisa das telas de edição. O especialista nunca; quando ele olha o plano de
 * um aluno, entra por `(tabs)/students/`, que continua nas telas dele.
 *
 * @example ehVisaoDoAluno(accountType, modoDaRota(params.mode)) // true para o aluno
 */
export function ehVisaoDoAluno(tipo: AccountType | null, modo: ModoDaRota): boolean {
  return tipo === 'student' || (tipo === 'member' && modo === 'execute');
}

/**
 * A rota com o modo de quem veio, para o membro treinando não cair na edição
 * no meio do caminho.
 *
 * @example router.push(comModo(ROUTES.WORKOUTS.DETAILS(id), modo))
 */
export function comModo(rota: string, modo: ModoDaRota): Href {
  // A rota sempre sai de `ROUTES`, a lista que já espelha as telas; o tipo
  // gerado pelo Expo só não reconhece o texto depois de montado pela função.
  return (modo ? { pathname: rota, params: { mode: modo } } : rota) as Href;
}

/** O parâmetro de rota como texto, venha ele único ou repetido na URL. */
export function primeiroValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** O modo que a rota trouxe, se for um que o fluxo reconhece. */
export function modoDaRota(valor: string | string[] | undefined): ModoDaRota {
  return primeiroValor(valor) === 'execute' ? 'execute' : undefined;
}
