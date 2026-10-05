import { type NextRequest, NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/api-auth";
import { getMealMediaOverview } from "@/modules/nutrition/services/server";

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json(getMealMediaOverview(), { headers: { "Cache-Control": "no-store" } });
}
