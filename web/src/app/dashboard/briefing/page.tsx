import { createActivityService, createBriefingService } from "@elevapro/shared";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BriefingPage from "@/modules/briefing/pages/BriefingPage";

/**
 * Server Component de propósito: o que atravessa a fronteira é o sinal já
 * derivado ("não treina há 5 dias"), não a lista de sessões. Se o cliente
 * recebesse as linhas para calcular a inatividade, o dado de saúde cru ficaria
 * no HTML da página.
 */
export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles" as never)
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = (profile as { account_type: string } | null)?.account_type;
  // O briefing é a tela do especialista. O aluno tem a própria em /dashboard/student.
  if (accountType !== "specialist") redirect("/dashboard");

  // Independentes: em serie, a tela espera as duas antes de pintar qualquer
  // coisa. O item de atividade que atravessa a fronteira ja vem resumido --
  // nome, tipo, titulo, PSE e horario --, nunca a linha de sessao.
  const [{ signals, stats }, recentActivity] = await Promise.all([
    createBriefingService(supabase as never).fetchBriefing(user.id),
    createActivityService(supabase as never).fetchRecentActivity(user.id),
  ]);

  const today = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

  return (
    <BriefingPage signals={signals} stats={stats} today={today} recentActivity={recentActivity} />
  );
}
