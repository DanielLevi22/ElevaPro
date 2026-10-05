import { defineAbilitiesFor } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeUser } from "@/lib/api-auth";
import { getMealRecipeCatalog } from "@/modules/nutrition/services/server";

/** Entrega conteúdo genérico; composição individual permanece no aparelho. */
export async function GET(request: NextRequest) {
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth.response;
  if (!defineAbilitiesFor({ accountType: auth.caller.accountType }).can("read", "Diet"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(getMealRecipeCatalog(process.env.MEAL_MEDIA_BASE_URL || "/"), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
