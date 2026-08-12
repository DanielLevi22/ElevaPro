import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authorizeUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Garante que o especialista tenha as linhas de `specialist_services` do
 * cadastro. Chamada no primeiro login.
 *
 * **Não cria perfil.** Quem cria é o trigger `handle_new_user`, no INSERT em
 * `auth.users`, a partir do payload do cadastro. Antes esta rota também criava,
 * lendo o `account_type` de `user_metadata` — que o próprio usuário reescreve
 * com `updateUser` — e caindo em 'specialist' quando o campo faltava. Perfil
 * ausente virava a conta que o chamador escolhesse.
 *
 * Perfil que não existe é estado de erro, não algo para remendar com dado que o
 * chamador controla: `authorizeUser` devolve 403 e o problema aparece.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeUser(request);
    if (!auth.ok) return auth.response;

    if (auth.caller.accountType !== "specialist") {
      return NextResponse.json({ ok: true, services: 0 });
    }

    // Os serviços vêm do cadastro; o `account_type` acima já veio de `profiles`,
    // então o pior que um metadado adulterado consegue é criar serviço para uma
    // conta que já é de especialista.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(auth.caller.id);
    const serviceTypes = authUser?.user?.user_metadata?.service_types;
    if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return NextResponse.json({ ok: true, services: 0 });
    }

    const links = (serviceTypes as string[]).map((service_type) => ({
      specialist_id: auth.caller.id,
      service_type,
    }));

    // O erro era engolido, e o upsert falhava sempre: sem UNIQUE em
    // (specialist_id, service_type), o Postgres recusa o ON CONFLICT com 42P10.
    // O autoconserto nunca rodou e ninguém soube. A constraint entrou na 0022;
    // o erro agora aparece.
    const { error } = await supabaseAdmin
      .from("specialist_services" as never)
      .upsert(links as never[], {
        onConflict: "specialist_id,service_type",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error("[POST /api/auth/ensure-profile] specialist_services:", error);
      return NextResponse.json({ error: "Falha ao registrar os serviços." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, services: links.length });
  } catch (error) {
    console.error("[POST /api/auth/ensure-profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
