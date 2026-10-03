import type { SupabaseClient } from "@supabase/supabase-js";
import { passwordValidationError } from "../../auth/password-policy";
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

/**
 * @param apiBaseUrl Origem do BFF, para o registro de auditoria de
 *   `completeAccountInvite`. Vazio no web (mesma origem); no mobile é o
 *   `EXPO_PUBLIC_API_URL`, mesmo padrão de `createStudentsService`.
 */
export const createAuthService = (supabase: SupabaseClient, apiBaseUrl = "") => ({
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

  /**
   * Troca a sessão de convite/recuperação por uma senha definitiva (ADR-0035).
   *
   * A sessão vem do link do e-mail, criada por `sessionFromInviteLink` quando
   * a tela abre. Aqui só falta a senha.
   *
   * A evidência `identity.invite.accepted` nasce no banco quando o Auth muda a
   * senha. A chamada ao BFF permanece para clientes antigos, sem gerar evento.
   *
   * @example
   * const resultado = await authService.completeAccountInvite(novaSenha);
   * if (resultado.success) router.replace(ROUTES.TABS.ROOT);
   */
  /**
   * Cria a sessão que o link do convite traz, antes de pedir a senha (#359).
   *
   * O convite é gerado no servidor e chega no fluxo implícito, com os tokens
   * depois do `#`. O cliente do web é PKCE e recusa essa URL sozinho, e a
   * tela abria sem sessão. `setSession` faz o Auth validar os tokens no
   * servidor: token adulterado volta como falha. Com `?code=` (fluxo PKCE),
   * troca o código.
   *
   * @example
   * const { success, error } = await authService.sessionFromInviteLink(window.location.href);
   */
  sessionFromInviteLink: async (url: string): Promise<{ success: boolean; error?: string }> => {
    const { searchParams, hash } = new URL(url);
    const fragment = new URLSearchParams(hash.replace(/^#/, ""));

    const linkError = fragment.get("error_description") ?? searchParams.get("error_description");
    if (linkError) return { success: false, error: linkError };

    const outcome = ({ error }: { error: { message: string } | null }) =>
      error ? { success: false, error: error.message } : { success: true };

    const code = searchParams.get("code");
    if (code) return outcome(await supabase.auth.exchangeCodeForSession(code));

    const access_token = fragment.get("access_token");
    const refresh_token = fragment.get("refresh_token");
    if (access_token && refresh_token) {
      return outcome(await supabase.auth.setSession({ access_token, refresh_token }));
    }
    return { success: false, error: "O link não trouxe a sessão do convite." };
  },

  completeAccountInvite: async (
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const passwordError = passwordValidationError(newPassword);
    if (passwordError) return { success: false, error: passwordError };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${apiBaseUrl}/api/auth/accept-invite`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch {
      // A confirmação de compatibilidade não pode desfazer a senha já salva.
    }

    return { success: true };
  },
});

export type AuthService = ReturnType<typeof createAuthService>;
