import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateStudentData,
  FetchStudentsParams,
  FetchStudentsResult,
  LinkStudentResult,
  PhysicalAssessment,
  Student,
} from "../types/students.types";

export const createStudentsService = (supabase: SupabaseClient) => ({
  fetchStudents: async (
    specialistId: string,
    params: FetchStudentsParams = {},
  ): Promise<FetchStudentsResult> => {
    const { page = 1, limit = 20, sortBy = "full_name", sortOrder = "asc", search = "" } = params;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("student_specialists")
      .select(
        `
        id,
        service_type,
        status,
        created_at,
        student:profiles!student_id (
          id,
          full_name,
          email,
          avatar_url,
          account_status
        )
      `,
        { count: "exact" },
      )
      .eq("specialist_id", specialistId)
      .eq("status", "active")
      .range(from, to);

    if (sortBy === "full_name") {
      query = query.order("student(full_name)", { ascending: sortOrder === "asc" });
    } else {
      query = query.order("created_at", { ascending: sortOrder === "asc" });
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const seen = new Set<string>();
    const students = (data ?? [])
      .map((item) => {
        const profile = Array.isArray(item.student) ? item.student[0] : item.student;
        if (!profile || seen.has(profile.id)) return null;
        if (search && !profile.full_name?.toLowerCase().includes(search.toLowerCase())) return null;
        seen.add(profile.id);

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          account_status: profile.account_status,
          service_type: item.service_type,
          link_status: item.status,
          link_created_at: item.created_at,
        } as Student;
      })
      .filter((s): s is Student => s !== null);

    return { students, total: count ?? students.length };
  },

  fetchStudentDetails: async (studentId: string): Promise<PhysicalAssessment | null> => {
    const { data, error } = await supabase
      .from("physical_assessments")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as PhysicalAssessment | null;
  },

  fetchStudentHistory: async (studentId: string): Promise<PhysicalAssessment[]> => {
    const { data, error } = await supabase
      .from("physical_assessments")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as PhysicalAssessment[];
  },

  generateLinkCode: async (studentId: string): Promise<string> => {
    const { error: deleteError } = await supabase
      .from("student_link_codes")
      .delete()
      .eq("student_id", studentId);
    if (deleteError) throw deleteError;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("student_link_codes")
      .insert({ student_id: studentId, code, expires_at: expiresAt });

    if (error) throw error;
    return code;
  },

  /**
   * Vincula um aluno pelo código, via RPC.
   *
   * Os cinco passos (ler código, ler serviço, checar duplicado, inserir, apagar
   * código) rodavam aqui no cliente. Validação no cliente não é validação: como
   * `student_specialists` aceitava INSERT direto, bastava falar com o PostgREST
   * para pular tudo e se vincular a qualquer aluno — verificado em 2026-08-11.
   *
   * Agora é uma transação em `public.link_student_by_code`, com o specialist
   * saindo de `auth.uid()` no servidor e não de um parâmetro do chamador.
   *
   * @param _specialistId mantido pela assinatura pública; o servidor ignora e
   *   usa `auth.uid()`. Aceitar quem é o specialist por parâmetro foi justamente
   *   o furo.
   */
  linkStudent: async (_specialistId: string, code: string): Promise<LinkStudentResult> => {
    const { data, error } = await supabase.rpc("link_student_by_code", { p_code: code });

    if (error) throw error;

    return data as LinkStudentResult;
  },

  removeStudent: async (
    specialistId: string,
    studentId: string,
    serviceType: string,
    endedBy: string,
  ): Promise<void> => {
    const { error } = await supabase
      .from("student_specialists")
      .update({ status: "inactive", ended_by: endedBy, ended_at: new Date().toISOString() })
      .eq("specialist_id", specialistId)
      .eq("student_id", studentId)
      .eq("service_type", serviceType)
      .eq("status", "active");

    if (error) throw error;
  },

  fetchStudentLinks: async (studentId: string) => {
    const { data, error } = await supabase
      .from("student_specialists")
      .select(
        "id, specialist_id, service_type, status, created_at, profiles!specialist_id(full_name)",
      )
      .eq("student_id", studentId)
      .eq("status", "active");

    if (error) throw error;
    return data ?? [];
  },

  endStudentLink: async (linkId: string, studentId: string): Promise<void> => {
    const { error } = await supabase
      .from("student_specialists")
      .update({ status: "inactive", ended_by: studentId, ended_at: new Date().toISOString() })
      .eq("id", linkId)
      .eq("student_id", studentId)
      .eq("status", "active");

    if (error) throw error;
  },

  addPhysicalAssessment: async (
    studentId: string,
    specialistId: string,
    data: Partial<PhysicalAssessment>,
  ): Promise<void> => {
    const { error } = await supabase
      .from("physical_assessments")
      .insert({ student_id: studentId, specialist_id: specialistId, ...data });

    if (error) throw error;
  },

  createStudent: async (
    data: CreateStudentData,
  ): Promise<{ success: boolean; studentId?: string; error?: string }> => {
    const { data: result, error } = await supabase.functions.invoke("create-student", {
      body: data,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, studentId: result?.student_id };
  },
});

export type StudentsService = ReturnType<typeof createStudentsService>;
