import { passwordValidationError, userFacingAuthError } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeSpecialist(request);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    const body = await request.json();
    const { fullName, email, password } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "fullName, email e password são obrigatórios" },
        { status: 400 },
      );
    }

    const passwordError = passwordValidationError(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, account_type: "student" },
    });

    if (createError) {
      const message =
        createError.message.includes("already registered") || createError.code === "email_exists"
          ? "Email já cadastrado"
          : userFacingAuthError(createError.message);
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const studentId = newUser.user.id;

    // Upsert profile with account_status = 'invited' (Fluxo A)
    await supabaseAdmin.from("profiles" as never).upsert(
      {
        id: studentId,
        email,
        full_name: fullName,
        account_type: "student",
        account_status: "invited",
      } as never,
      { onConflict: "id" },
    );

    // Fetch specialist's services
    const { data: services } = await supabaseAdmin
      .from("specialist_services")
      .select("service_type")
      .eq("specialist_id", caller.id);

    const serviceList =
      services && services.length > 0
        ? (services as { service_type: string }[]).map((s) => s.service_type)
        : ["personal_training"];

    // Create links in student_specialists
    const links = serviceList.map((service_type) => ({
      student_id: studentId,
      specialist_id: caller.id,
      service_type,
      status: "active",
    }));

    const { error: linkError } = await supabaseAdmin
      .from("student_specialists" as never)
      .upsert(links as never[], {
        onConflict: "student_id,specialist_id,service_type",
        ignoreDuplicates: true,
      });

    if (linkError) {
      logger.error("students.link_failed", { error: linkError });
      return NextResponse.json(
        { error: "Erro ao vincular aluno ao especialista" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, student_id: studentId }, { status: 201 });
  } catch (error) {
    logger.error("students.create_failed", { error });
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
