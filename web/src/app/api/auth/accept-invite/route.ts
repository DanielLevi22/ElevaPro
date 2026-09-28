import { type NextRequest, NextResponse } from "next/server";
import { authorizeUser } from "@/lib/api-auth";

/** Mantém clientes antigos compatíveis; o evento nasce no Auth ao trocar senha. */
export async function POST(request: NextRequest) {
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ success: true });
}
