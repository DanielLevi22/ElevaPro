import { defineAbilitiesFor } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeUser } from "@/lib/api-auth";
import { clienteDoTitular } from "@/lib/supabase-titular";
import { getMealRecipeCatalog, loadPublishedMealDishes } from "@/modules/nutrition/services/server";

/** Entrega conteúdo genérico; composição individual permanece no aparelho. */
export async function GET(request: NextRequest) {
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth.response;
  if (!defineAbilitiesFor({ accountType: auth.caller.accountType }).can("read", "Diet"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const base = process.env.MEAL_MEDIA_BASE_URL || "/";
  return NextResponse.json(getMealRecipeCatalog(base, await publishedDishes(request, base)), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

// O catálogo fixo segue útil sem o banco: falha na leitura dos pratos importados
// não tira do aluno os pratos que já funcionavam.
async function publishedDishes(request: NextRequest, base: string) {
  try {
    return await loadPublishedMealDishes(clienteDoTitular(request), base);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "meal_dishes_unavailable",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return [];
  }
}
