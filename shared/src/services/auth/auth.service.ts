import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountType,
  Profile,
  ProfileSummary,
  ProfileWithServices,
  ServiceType,
} from "../../types/auth.types";

export interface SignUpSpecialistParams {
  email: string;
  password: string;
  full_name: string;
  service_types: ServiceType[];
}

export interface CreateStudentParams {
  email: string;
  password: string;
  full_name: string;
  specialist_id: string;
  service_type: ServiceType;
}

export const createAuthService = (supabase: SupabaseClient) => ({
  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  },

  signOut: async () => {
    return supabase.auth.signOut();
  },

  getSession: async () => {
    return supabase.auth.getSession();
  },

  signUp: async (
    email: string,
    password: string,
    accountType: string,
    metadata: Record<string, unknown> = {},
  ): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { account_type: accountType, ...metadata } },
    });

    if (error) return { success: false, error: error.message };

    // O perfil nasce pelo trigger `handle_new_user`, que lê o mesmo metadata
    // enviado acima. O upsert que existia aqui era redundante com ele e, pior,
    // gravava o `account_type` escolhido pelo cliente — o caminho que a
    // migration 0040 fechou no banco.
    return { success: true };
  },

  resetPassword: async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email);
  },

  signUpSpecialist: async (params: SignUpSpecialistParams) => {
    return supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.full_name,
          account_type: "specialist",
          service_types: params.service_types,
        },
      },
    });
  },

  signUpStudent: async (params: { email: string; password: string; full_name: string }) => {
    return supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.full_name,
          account_type: "student",
        },
      },
    });
  },

  signUpMember: async (params: { email: string; password: string; full_name: string }) => {
    return supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.full_name,
          account_type: "member",
        },
      },
    });
  },

  // Criação de aluno via RPC SECURITY DEFINER — specialist não pode inserir em auth.users diretamente
  createStudent: async (params: CreateStudentParams) => {
    return supabase.rpc("create_student_account", {
      p_email: params.email,
      p_password: params.password,
      p_full_name: params.full_name,
      p_specialist_id: params.specialist_id,
      p_service_type: params.service_type,
    });
  },

  /**
   * Define o tipo de conta no onboarding.
   *
   * `admin` é recusado de propósito: contas administrativas nascem por convite,
   * nunca por escolha do usuário numa tela de onboarding. A recusa mora no
   * servidor (`set_own_account_type`, migration 0040) — aqui o tipo só a anuncia.
   *
   * Quem é o usuário sai de `auth.uid()` no banco, e não de um parâmetro: com o
   * id vindo de fora, quem chamasse escolheria de quem é o perfil que muda.
   *
   * @example
   * await authService.setAccountType({ accountType: "student", fullName });
   */
  setAccountType: async (params: {
    accountType: Exclude<AccountType, "admin">;
    fullName?: string;
  }): Promise<void> => {
    // Pela RPC, e não por UPDATE direto: desde a migration 0040 o papel não é
    // coluna que o dono da linha escreve. O `Exclude<..., "admin">` continua
    // aqui como documentação, mas quem recusa admin de verdade é o servidor —
    // tipo do TypeScript não alcança quem chama o PostgREST na mão.
    const { error } = await supabase.rpc("set_own_account_type", {
      p_account_type: params.accountType,
      p_full_name: params.fullName ?? null,
    });
    if (error) throw error;
  },

  getProfile: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) return null;
    return data as Profile;
  },

  /**
   * Só o que a tela desenha da identidade, para quem não precisa da linha toda.
   *
   * @example
   * const perfil = await createAuthService(supabase).getProfileSummary(user.id);
   */
  getProfileSummary: async (userId: string): Promise<ProfileSummary | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as ProfileSummary;
  },

  getProfileWithServices: async (userId: string): Promise<ProfileWithServices | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, specialist_services(*)")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data as ProfileWithServices;
  },

  // Usado no web — verifica account_status antes de confirmar login
  signInWithStatusCheck: async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", data.user.id)
        .single();

      if (profile?.account_status === "inactive") {
        await supabase.auth.signOut();
        return { success: false, error: "account_inactive" };
      }
    }

    return { success: true };
  },
});

export type AuthService = ReturnType<typeof createAuthService>;
