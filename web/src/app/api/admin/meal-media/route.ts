import type { Database } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/api-auth";
import { clienteDoTitular as createCallerClient } from "@/lib/supabase-titular";
import { getMealMediaOverview } from "@/modules/nutrition/services/server";

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100_000)
    return NextResponse.json(
      { message: `Página inválida: ${page}; esperado inteiro entre 1 e 100000.` },
      { status: 400 },
    );
  try {
    const client = createCallerClient(request) as SupabaseClient<Database>;
    const overview = await getMealMediaOverview(client, page);
    return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      {
        message:
          "Não foi possível consultar as imagens no banco. Confira as migrations do catálogo neste ambiente e tente novamente.",
      },
      { status: 503 },
    );
  }
}
