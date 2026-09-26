import type { Student } from '../store/studentStore';

/**
 * O estado de um aluno na lista do especialista e os filtros dela, sem React.
 *
 * Mora fora do hook para ser testado sozinho: a expiração do convite e o risco
 * decidem se a linha abre, e erro aqui esconde aluno do especialista.
 */
export type StudentRowState = 'ok' | 'atRisk' | 'pending' | 'expired';
export type StudentFilter = 'all' | 'atRisk' | 'pending';

/** Convite sem resposta há mais de uma semana deixa de valer. */
const INVITE_VALID_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * @example isInviteExpired('2026-09-01T10:00:00Z', Date.parse('2026-09-26')) // true
 */
export function isInviteExpired(createdAt: string | undefined, now: number): boolean {
  if (!createdAt) return false;
  return (now - new Date(createdAt).getTime()) / DAY_MS > INVITE_VALID_DAYS;
}

/**
 * Convite primeiro (pendente ou expirado), depois o sinal de risco do briefing.
 *
 * @example studentRowState(aluno, new Set(['a1']), Date.now()) // 'atRisk'
 */
export function studentRowState(
  student: Student,
  atRiskIds: ReadonlySet<string>,
  now: number
): StudentRowState {
  if (student.account_status === 'invited') {
    return isInviteExpired(student.link_created_at, now) ? 'expired' : 'pending';
  }
  return atRiskIds.has(student.id) ? 'atRisk' : 'ok';
}

/**
 * O recorte do chip. "Em risco" é o sinal de inatividade do briefing (#332), o
 * mesmo número do painel, e não uma régua de aderência nova.
 *
 * @example filterStudents(alunos, 'pending', new Set()) // só os convidados
 */
export function filterStudents(
  students: readonly Student[],
  filter: StudentFilter,
  atRiskIds: ReadonlySet<string>
): Student[] {
  if (filter === 'atRisk') return students.filter((s) => atRiskIds.has(s.id));
  if (filter === 'pending') return students.filter((s) => s.account_status === 'invited');
  return [...students];
}
