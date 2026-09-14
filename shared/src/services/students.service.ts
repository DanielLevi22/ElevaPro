import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PhysicalAssessment,
  PhysicalAssessmentInput,
} from "../types/physicalAssessment.types";
import { PHYSICAL_ASSESSMENT_COLUMNS } from "../types/physicalAssessment.types";
import type {
  CreateStudentData,
  FetchStudentsParams,
  FetchStudentsResult,
  LinkStudentResult,
  Student,
} from "../types/students.types";

/**
 * @param apiBaseUrl Origem do BFF para as operações que passam por `/api/`.
 *   Vazio no web, onde a rota é servida pela mesma origem; no mobile é o
 *   `EXPO_PUBLIC_API_URL`, porque lá não existe origem relativa.
 */
export const createStudentsService = (supabase: SupabaseClient, apiBaseUrl = "") => ({
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

  /**
   * Um aluno, por id, para a tela que já sabe qual quer.
   *
   * A tela de detalhe procurava o aluno dentro da listagem, que pede uma página
   * de cada vez: com mais de 200 alunos, o de número 201 não abria — a tela
   * dizia "não encontrado" para um aluno que existe e é do especialista.
   *
   * São perguntas diferentes: "quais são meus alunos" pagina, "quem é este
   * aluno" não. O vínculo `active` é a mesma regra dos dois, então aluno de
   * outro especialista continua não abrindo.
   *
   * @example
   * const aluno = await studentsService.fetchStudentById(especialistaId, alunoId);
   * if (!aluno) mostrarNaoEncontrado();
   */
  fetchStudentById: async (specialistId: string, studentId: string): Promise<Student | null> => {
    const { data, error } = await supabase
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
      )
      .eq("specialist_id", specialistId)
      .eq("student_id", studentId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const profile = Array.isArray(data.student) ? data.student[0] : data.student;
    if (!profile) return null;

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      account_status: profile.account_status,
      service_type: data.service_type,
      link_status: data.status,
      link_created_at: data.created_at,
    } as Student;
  },

  fetchStudentDetails: async (studentId: string): Promise<PhysicalAssessment | null> => {
    const { data, error } = await supabase
      .from("physical_assessments")
      .select(PHYSICAL_ASSESSMENT_COLUMNS)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as PhysicalAssessment | null;
  },

  /**
   * As pesagens mais recentes do aluno, só peso e data — a variação de peso da
   * aderência. A avaliação inteira tem dobras e medidas que a tela não usa.
   *
   * @example const [ultima, anterior] = await students.fetchUltimasPesagens(alunoId, 2);
   */
  fetchUltimasPesagens: async (
    studentId: string,
    quantas = 2,
  ): Promise<Pick<PhysicalAssessment, "weight_kg" | "assessed_at">[]> => {
    const { data, error } = await supabase
      .from("physical_assessments")
      .select("weight_kg, assessed_at")
      .eq("student_id", studentId)
      .order("assessed_at", { ascending: false })
      .limit(quantas);

    if (error) throw error;
    return (data ?? []) as Pick<PhysicalAssessment, "weight_kg" | "assessed_at">[];
  },

  fetchStudentHistory: async (studentId: string): Promise<PhysicalAssessment[]> => {
    const { data, error } = await supabase
      .from("physical_assessments")
      .select(PHYSICAL_ASSESSMENT_COLUMNS)
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
    data: PhysicalAssessmentInput,
  ): Promise<void> => {
    const { error } = await supabase
      .from("physical_assessments")
      .insert({ student_id: studentId, specialist_id: specialistId, ...data });

    if (error) throw error;
  },

  /**
   * Cria o aluno pelo BFF.
   *
   * Antes isto chamava a Edge Function `create-student`, que não existe no
   * repositório — `supabase/functions/` nunca foi criado. A chamada falhava
   * sempre, então o cadastro de aluno pelo mobile nunca funcionou.
   *
   * `POST /api/students` é o caminho que o web já usa e que passa por
   * `authorizeSpecialist`. Ele deriva o especialista do token e os serviços de
   * `specialist_services`, então `specialist_id` e `service_type` do parâmetro
   * são ignorados de propósito: aceitar do cliente quem é o dono do vínculo
   * deixaria um especialista cadastrar aluno no nome de outro.
   *
   * @example
   * const { success, studentId } = await service.createStudent({
   *   specialist_id: user.id,
   *   full_name: "Ana",
   *   email: "ana@exemplo.com",
   *   password: "...",
   *   service_type: "personal_training",
   * });
   */
  createStudent: async (
    data: CreateStudentData,
  ): Promise<{ success: boolean; studentId?: string; error?: string }> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { success: false, error: "Usuário não autenticado" };

    const response = await fetch(`${apiBaseUrl}/api/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fullName: data.full_name,
        email: data.email,
        password: data.password,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.error ?? "Não foi possível criar o aluno" };
    }

    return { success: true, studentId: result.student_id };
  },
});

export type StudentsService = ReturnType<typeof createStudentsService>;
