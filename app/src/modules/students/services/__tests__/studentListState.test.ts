import type { Student } from '../../store/studentStore';
import { filterStudents, isInviteExpired, studentRowState } from '../studentListState';

const NOW = Date.parse('2026-09-26T12:00:00Z');

function student(overrides: Partial<Student>): Student {
  return {
    id: 'a1',
    full_name: 'Ana Rocha',
    email: 'ana@exemplo.com',
    avatar_url: null,
    account_status: 'active',
    service_type: 'personal_training',
    link_status: 'active',
    link_created_at: '2026-09-20T12:00:00Z',
    ...overrides,
  };
}

describe('isInviteExpired', () => {
  it('vale por sete dias', () => {
    expect(isInviteExpired('2026-09-20T12:00:00Z', NOW)).toBe(false);
    expect(isInviteExpired('2026-09-18T12:00:00Z', NOW)).toBe(true);
  });

  it('sem data não expira', () => {
    expect(isInviteExpired(undefined, NOW)).toBe(false);
  });
});

describe('studentRowState', () => {
  it('convite vem antes do risco', () => {
    const invited = student({ account_status: 'invited' });
    expect(studentRowState(invited, new Set(['a1']), NOW)).toBe('pending');
  });

  it('convite de mais de uma semana está expirado', () => {
    const old = student({ account_status: 'invited', link_created_at: '2026-09-01T12:00:00Z' });
    expect(studentRowState(old, new Set(), NOW)).toBe('expired');
  });

  it('aluno ativo com sinal de inatividade está em risco', () => {
    expect(studentRowState(student({}), new Set(['a1']), NOW)).toBe('atRisk');
    expect(studentRowState(student({}), new Set(), NOW)).toBe('ok');
  });
});

describe('filterStudents', () => {
  const students = [
    student({ id: 'a1' }),
    student({ id: 'a2', account_status: 'invited' }),
    student({ id: 'a3' }),
  ];

  it('recorta por risco e por convite pendente', () => {
    expect(filterStudents(students, 'atRisk', new Set(['a3'])).map((s) => s.id)).toEqual(['a3']);
    expect(filterStudents(students, 'pending', new Set()).map((s) => s.id)).toEqual(['a2']);
    expect(filterStudents(students, 'all', new Set())).toHaveLength(3);
  });
});
