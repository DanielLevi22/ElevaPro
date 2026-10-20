import { NextResponse } from "next/server";
import { appVersionFrom } from "@/lib/app-version";

// Lida a cada requisição: a resposta é o que diz ao cliente aberto que o
// deploy mudou, e uma cópia em cache diria que nada mudou.
export const dynamic = "force-dynamic";

/** Versão no ar, para o cliente comparar com a que ele carregou. */
export function GET() {
  return NextResponse.json(
    { version: appVersionFrom(process.env.VERCEL_GIT_COMMIT_SHA) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
