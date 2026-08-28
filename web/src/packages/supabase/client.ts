import type { Database } from "@elevapro/shared";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[supabase] Missing environment variables — app will not connect to supabase");
  }
}

// O genérico `Database` é o que faz `.from().select()` ser verificado. Sem ele
// toda consulta feita pelo cliente do browser devolvia `any` — o mesmo defeito
// que o mobile tinha, e a razão de coluna inexistente só aparecer como 42703 em
// runtime. `supabase-admin.ts` (service_role) já era tipado; este não era.
export const supabase = createBrowserClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);
