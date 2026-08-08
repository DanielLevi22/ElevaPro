import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountType, Profile, ProfileWithServices, ServiceType } from "../types/auth.types";

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { account_type: accountType, ...metadata } },
    });

    if (error) return { success: false, error: error.message };

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        account_type: accountType,
        full_name: metadata.full_name,
        ...metadata,
      });

      if (profileError) return { success: false, error: profileError.message };
    }

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
   * Define o tipo de conta no onboarding, criando o profile se ainda não existir.
   *
   * `admin` é recusado de propósito: contas administrativas nascem por convite,
   * nunca por escolha do usuário numa tela de onboarding.
   *
   * @example
   * await authService.setAccountType({ userId, email, accountType: "student", fullName });
   */
  setAccountType: async (params: {
    userId: string;
    email: string;
    accountType: Exclude<AccountType, "admin">;
    fullName?: string;
  }): Promise<void> => {
    const { error } = await supabase.from("profiles").upsert({
      id: params.userId,
      email: params.email,
      account_type: params.accountType,
      full_name: params.fullName ?? "",
    });
    if (error) throw error;
  },

  getProfile: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) return null;
    return data as Profile;
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
