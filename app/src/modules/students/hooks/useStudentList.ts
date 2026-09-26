import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/auth';
import {
  filterStudents,
  type StudentFilter,
  type StudentRowState,
  studentRowState,
} from '../services/studentListState';
import { type Student, useStudentStore } from '../store/studentStore';

export type { StudentFilter };
export type StudentSort = 'full_name' | 'created_at';
type SortOrder = 'asc' | 'desc';

const SEARCH_DEBOUNCE_MS = 500;

interface StudentQuery {
  search: string;
  setSearch: (search: string) => void;
  sortBy: StudentSort;
  setSortBy: (sort: StudentSort) => void;
  sortOrder: SortOrder;
  toggleSortOrder: () => void;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

export interface StudentListState extends StudentQuery {
  students: Student[];
  visible: Student[];
  totalCount: number;
  isLoading: boolean;
  adherenceByStudent: Record<string, number | null>;
  atRiskCount: number;
  pendingCount: number;
  filter: StudentFilter;
  setFilter: (filter: StudentFilter) => void;
  stateOf: (student: Student) => StudentRowState;
}

/**
 * A lista de alunos do especialista: busca, ordenação, página, filtro por risco e o
 * estado de cada linha. A regra de estado e de filtro mora em `studentListState`.
 *
 * @example const list = useStudentList(); list.setSearch('ana');
 */
export function useStudentList(): StudentListState {
  const store = useStudentStore();
  const [filter, setFilter] = useState<StudentFilter>('all');
  const query = useStudentQuery();
  const atRiskIds = useAtRiskIds();
  useAdherenceForPage();

  const stateOf = useCallback(
    (student: Student) => studentRowState(student, atRiskIds, Date.now()),
    [atRiskIds]
  );
  const visible = useMemo(
    () => filterStudents(store.students, filter, atRiskIds),
    [store.students, filter, atRiskIds]
  );

  return {
    ...query,
    students: store.students,
    visible,
    totalCount: store.totalCount,
    isLoading: store.isLoading,
    adherenceByStudent: store.adherenceByStudent,
    atRiskCount: atRiskIds.size,
    pendingCount: filterStudents(store.students, 'pending', atRiskIds).length,
    filter,
    setFilter,
    stateOf,
  };
}

/** Busca com espera, ordem e página — o que vai para `fetchStudents`. */
function useStudentQuery(): StudentQuery {
  const { user } = useAuthStore();
  const userId = user?.id;
  const { fetchStudents, isLoading, students, totalCount } = useStudentStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS);
  const [sortBy, setSortBy] = useState<StudentSort>('full_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const params = useMemo(
    () => ({ search: debouncedSearch, sortBy, sortOrder }),
    [debouncedSearch, sortBy, sortOrder]
  );

  const reload = useCallback(() => {
    if (!userId) return;
    fetchStudents(userId, { ...params, page: 1, append: false });
    setPage(1);
  }, [userId, params, fetchStudents]);
  useEffect(reload, [reload]);

  const hasMore = students.length < totalCount;
  const loadMore = () => {
    if (isLoading || !hasMore || !userId) return;
    fetchStudents(userId, { ...params, page: page + 1, append: true });
    setPage(page + 1);
  };
  const toggleSortOrder = () => setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'));

  return {
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    hasMore,
    loadMore,
    reload,
  };
}

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Os alunos com sinal de inatividade no briefing (#332), buscado uma vez por especialista. */
function useAtRiskIds(): ReadonlySet<string> {
  const { user } = useAuthStore();
  const { briefing, fetchBriefing } = useStudentStore();
  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando o especialista muda
  useEffect(() => {
    if (user?.id) fetchBriefing(user.id);
  }, [user?.id]);
  return useMemo(
    () =>
      new Set(
        (briefing?.signals ?? [])
          .filter((signal) => signal.kind === 'inactive')
          .map((signal) => signal.studentId)
      ),
    [briefing]
  );
}

/** A aderência de cada aluno da página que ainda não foi buscada. */
function useAdherenceForPage(): void {
  const { students, adherenceByStudent, fetchAdherenceFor } = useStudentStore();
  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando a página de alunos muda
  useEffect(() => {
    const missing = students.map((s) => s.id).filter((id) => !(id in adherenceByStudent));
    if (missing.length > 0) fetchAdherenceFor(missing);
  }, [students]);
}
