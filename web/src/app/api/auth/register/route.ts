import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { email, password, full_name, service_types } = await request.json();

  if (!email || !password || !full_name || !service_types?.length) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  // Create auth user (auto-confirmed so immediate sign-in works)
  const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, account_type: "specialist", service_types },
  });

  if (authError) {
    const msg =
      authError.message.toLowerCase().includes("already registered") ||
      authError.code === "email_exists"
        ? "Este e-mail já possui uma conta."
        : authError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
  }

  const userId = data.user.id;

  // O perfil já existe: o trigger `handle_new_user` o cria no INSERT em
  // auth.users, a partir do `user_metadata` acima. Esta rota tentava inserir de
  // novo, batia em chave duplicada, e o `if (!profileError)` abaixo pulava os
  // serviços — então todo especialista nascia sem nenhum, e o CASL negava
  // dietas com "Conta specialist com serviços [nenhum]".
  const serviceRows = (service_types as string[]).map((service_type) => ({
    specialist_id: userId,
    service_type,
  }));

  const { error: servicesError } = await supabaseAdmin
    .from("specialist_services" as never)
    .insert(serviceRows as never[]);

  // Falhar aqui deixa a conta pela metade: existe, entra, e não lê dieta nem
  // treino. Melhor recusar o cadastro do que entregar isso ao usuário.
  if (servicesError) {
    console.error("[register] specialist_services insert error:", servicesError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Não foi possível concluir o cadastro. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
