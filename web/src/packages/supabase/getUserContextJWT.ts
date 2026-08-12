import type { Session } from "@supabase/supabase-js";
import type { UserContext } from "./abilities";
import { supabase } from "./client";
import type { AccountStatus, AccountType, ServiceType } from "./types";

export async function getUserContextJWT(userId: string, session?: Session): Promise<UserContext> {
  const activeSession = session ?? (await supabase.auth.getSession()).data.session;
  const jwtClaims = activeSession?.user?.app_metadata || {};

  if (jwtClaims.account_type === "admin") {
    return { accountType: "admin" as AccountType };
  }

  let user = null;
  let userError = null;

  for (let attempts = 0; attempts < 3; attempts++) {
    const result = await supabase
      .from("profiles")
      .select("account_type, account_status")
      .eq("id", userId)
      .single();

    user = result.data;
    userError = result.error;

    if (user) break;
    if (attempts < 2) await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (userError || !user) {
    console.error("[getUserContextJWT] DB error after retries:", userError);

    // Aqui havia um fallback para `user_metadata.account_type`. O usuário
    // escreve o próprio `user_metadata` com `updateUser`, então bastava gravar
    // 'admin' e derrubar a leitura de `profiles` para o CASL montar as
    // permissões de admin. Só concedia UI — o dado segue protegido por RLS e
    // pelas rotas do BFF —, mas privilégio nunca sai de campo que o titular
    // edita.
    throw new Error("User profile not found");
  }

  const context: UserContext = {
    accountType: user.account_type as AccountType,
    accountStatus: user.account_status as AccountStatus,
  };

  if (user.account_type === "specialist") {
    const { data: services, error: servicesError } = await supabase
      .from("specialist_services")
      .select("service_type")
      .eq("specialist_id", userId);

    if (servicesError) {
      console.error("[getUserContextJWT] specialist_services query error:", servicesError);
    }

    const dbServices = (services?.map((s) => s.service_type) ?? []) as ServiceType[];

    if (dbServices.length > 0) {
      context.services = dbServices;
    } else {
      // Fall back to user_metadata (set during registration) and persist to DB
      const metaServices = (activeSession?.user?.user_metadata?.service_types ??
        []) as ServiceType[];
      context.services = metaServices;

      if (metaServices.length > 0 && activeSession?.access_token) {
        // Self-heal: insert missing specialist_services rows
        fetch("/api/auth/ensure-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeSession.access_token}`,
          },
        }).catch(() => {});
      }
    }
  }

  return context;
}
