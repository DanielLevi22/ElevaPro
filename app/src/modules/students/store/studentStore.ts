import {
  createStudentsService,
  PHYSICAL_ASSESSMENT_COLUMNS,
  type PhysicalAssessment,
  type ServiceType,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Alert } from 'react-native';
import { create } from 'zustand';

export type { PhysicalAssessment };

// App-specific Student extends the shared type with cached assessment data
export interface Student {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  account_status: 'active' | 'inactive' | 'invited';
  service_type: ServiceType;
  link_status: 'active' | 'inactive';
  link_created_at: string;
  assessment?: Partial<PhysicalAssessment>;
}

export interface CreateStudentData {
  specialist_id: string;
  full_name: string;
  email: string;
  password: string;
  service_type: ServiceType;
}

interface StudentState {
  students: Student[];
  totalCount: number;
  history: PhysicalAssessment[];
  isLoading: boolean;

  fetchStudents: (
    specialistId: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: 'full_name' | 'created_at';
      sortOrder?: 'asc' | 'desc';
      search?: string;
      append?: boolean;
    }
  ) => Promise<void>;

  generateLinkCode: (studentId: string) => Promise<string | null>;

  linkStudent: (
    specialistId: string,
    code: string
  ) => Promise<{ success: boolean; error?: string }>;

  removeStudent: (
    specialistId: string,
    studentId: string,
    serviceType: ServiceType
  ) => Promise<void>;

  fetchStudentHistory: (studentId: string) => Promise<void>;

  addPhysicalAssessment: (
    studentId: string,
    data: Partial<PhysicalAssessment>
  ) => Promise<{ success: boolean; error?: string }>;

  createStudent: (
    data: CreateStudentData
  ) => Promise<{ success: boolean; studentId?: string; error?: string }>;

  reset: () => void;
}

const initialState = {
  students: [],
  totalCount: 0,
  history: [],
  isLoading: false,
};

// O BFF precisa da URL absoluta: no mobile não existe origem relativa para
// resolver `/api/students`.
const service = createStudentsService(supabase, process.env.EXPO_PUBLIC_API_URL ?? '');

export const useStudentStore = create<StudentState>((set, get) => ({
  ...initialState,

  fetchStudents: async (specialistId, params = {}) => {
    const { append = false, ...serviceParams } = params;

    set({ isLoading: true });
    try {
      const { students } = await service.fetchStudents(specialistId, serviceParams);

      // Enrich with latest assessment — app-specific display optimization
      const studentIds = students.map((s) => s.id);
      const assessmentsMap = new Map<string, PhysicalAssessment>();

      if (studentIds.length > 0) {
        const { data: assessments } = await supabase
          .from('physical_assessments')
          .select(PHYSICAL_ASSESSMENT_COLUMNS)
          .in('student_id', studentIds)
          .order('created_at', { ascending: false });

        assessments?.forEach((a: PhysicalAssessment) => {
          if (!assessmentsMap.has(a.student_id)) assessmentsMap.set(a.student_id, a);
        });
      }

      const enriched: Student[] = students.map((s) => ({
        ...s,
        assessment: assessmentsMap.get(s.id),
      }));

      set((state) => ({
        students: append ? [...state.students, ...enriched] : enriched,
        totalCount: enriched.length,
      }));
    } catch (error) {
      console.error('Error fetching students:', error);
      if (!get().students.length) set({ students: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  generateLinkCode: async (studentId) => {
    try {
      return await service.generateLinkCode(studentId);
    } catch (error) {
      console.error('Error generating link code:', error);
      return null;
    }
  },

  linkStudent: async (specialistId, code) => {
    return service.linkStudent(specialistId, code);
  },

  removeStudent: async (specialistId, studentId, serviceType) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const endedBy = session.session?.user.id;
      if (!endedBy) throw new Error('Usuário não autenticado');

      await service.removeStudent(specialistId, studentId, serviceType, endedBy);

      set((state) => ({
        students: state.students.filter(
          (s) => !(s.id === studentId && s.service_type === serviceType)
        ),
      }));
    } catch (error) {
      console.error('Error removing student:', error);
      Alert.alert('Erro', 'Não foi possível remover o aluno. Tente novamente.');
    }
  },

  fetchStudentHistory: async (studentId) => {
    set({ isLoading: true });
    try {
      const history = await service.fetchStudentHistory(studentId);
      set({ history });
    } catch (error) {
      console.error('Error fetching student history:', error);
      set({ history: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addPhysicalAssessment: async (studentId, data) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const specialistId = session.session?.user.id;
      if (!specialistId) throw new Error('Usuário não autenticado');

      await service.addPhysicalAssessment(studentId, specialistId, data);
      await get().fetchStudentHistory(studentId);
      return { success: true };
    } catch (error: unknown) {
      console.error('Error adding assessment:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  createStudent: async (data) => {
    return service.createStudent(data);
  },

  reset: () => set(initialState),
}));
