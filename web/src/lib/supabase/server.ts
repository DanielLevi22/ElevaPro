import type { Database } from "@elevapro/shared";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  // Com o genérico, o serviço compartilhado recebe um cliente do mesmo tipo que
  // já recebe no browser — era a falta dele que obrigava o `as any` em quem
  // chamava `createWorkoutsService(supabase)`.
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component — cookies only readable, not writable (middleware handles refresh)
          }
        },
      },
    },
  );
}
