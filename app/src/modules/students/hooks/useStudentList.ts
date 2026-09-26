import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/auth';
import type { StudentRowState } from '../components/StudentRow';
import { type Student, useStudentStore } from '../store/studentStore';

export type StudentFilter = 'all' | 'atRisk' | 'pending';
export type StudentSort = 'full_name' | 'created_at';

/** Convite sem resposta há mais de uma semana deixa de valer. */
const INVITE_VALID_DAYS = 7;
const DAY_MS = 86_400_000;
const SEARCH_DEBOUNCE_MS = 500;

function isExpired(createdAt?: string): boolean {
  if (!createdAt) return false;
  return (Date.now() - new Date(createdAt).getTime()) / DAY_MS > INVITE_VALID_DAYS;
}

/**
 * A lista de alunos do especialista: busca, ordenação, página, filtro por risco e o
 * estado de cada linha.
 *
 * O filtro "Em risco" usa o sinal de inatividade do briefing (#332), e não uma
 * régua de aderência nova: é o mesmo número do painel.
 *
 * @example const list = useStudentList(); list.setSearch('ana');
 */
export function useStudentList() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const store = useStudentStore();
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<StudentSort>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(
    () => ({ search: debouncedSearch, sortBy, sortOrder }),
    [debouncedSearch, sortBy, sortOrder]
  );

  const { fetchStudents } = store;
  const reload = useCallback(() => {
    if (!userId) return;
    fetchStudents(userId, { ...query, page: 1, append: false });
    setPage(1);
  }, [userId, query, fetchStudents]);

  useEffect(reload, [reload]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando o especialista muda
  useEffect(() => {
    if (userId) store.fetchBriefing(userId);
  }, [userId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando a página de alunos muda
  useEffect(() => {
    const missing = store.students
      .map((s) => s.id)
      .filter((id) => !(id in store.adherenceByStudent));
    if (missing.length > 0) store.fetchAdherenceFor(missing);
  }, [store.students]);

  const hasMore = store.students.length < store.totalCount;
  const loadMore = () => {
    if (store.isLoading || !hasMore || !userId) return;
    fetchStudents(userId, { ...query, page: page + 1, append: true });
    setPage(page + 1);
  };

  const atRiskIds = useMemo(
    () =>
      new Set(
        (store.briefing?.signals ?? [])
          .filter((signal) => signal.kind === 'inactive')
          .map((signal) => signal.studentId)
      ),
    [store.briefing]
  );

  const stateOf = useCallback(
    (student: Student): StudentRowState => {
      if (student.account_status === 'invited') {
        return isExpired(student.link_created_at) ? 'expired' : 'pending';
      }
      return atRiskIds.has(student.id) ? 'atRisk' : 'ok';
    },
    [atRiskIds]
  );

  const visible = useMemo(() => {
    if (filter === 'atRisk') return store.students.filter((s) => atRiskIds.has(s.id));
    if (filter === 'pending') return store.students.filter((s) => s.account_status === 'invited');
    return store.students;
  }, [store.students, filter, atRiskIds]);

  return {
    students: store.students,
    visible,
    totalCount: store.totalCount,
    isLoading: store.isLoading,
    adherenceByStudent: store.adherenceByStudent,
    atRiskCount: atRiskIds.size,
    pendingCount: store.students.filter((s) => s.account_status === 'invited').length,
    filter,
    setFilter,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder: () => setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc')),
    hasMore,
    loadMore,
    reload,
    stateOf,
  };
}
