import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Cliente do Supabase sob a identidade de quem chamou, e não do `service_role`.
 *
 * A diferença é a RLS: com este cliente, quem decide o que a rota enxerga são as
 * políticas do banco. Com o `service_role` a rota vê tudo e a autorização volta
 * a ser responsabilidade de quem escreveu o código — que é como as rotas do BFF
 * passaram a precisar do `api-auth` e da guarda do CI.
 *
 * Vivia dentro da rota de análise corporal. Saiu de lá quando o portão de
 * elegibilidade passou a precisar do mesmo cliente: um adapter é seam
 * hipotético, dois é seam real.
 */
export function clienteDoTitular(request: NextRequest): SupabaseClient {
  const authHeader = request.headers.get("Authorization") ?? "";
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}
