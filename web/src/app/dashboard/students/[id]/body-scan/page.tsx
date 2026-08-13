import { createBodyScanService } from "@elevapro/shared";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BodyScanHistory } from "@/modules/students/components/BodyScanHistory";

/**
 * Análises corporais do aluno, para o especialista vinculado.
 *
 * Server Component com o cliente de sessão — **não** `service_role`. Quem pode
 * ler é decidido pela RLS de `body_scans` (migration `0017`): o próprio aluno e
 * o especialista com vínculo `active`. Repetir essa regra aqui em código criaria
 * a segunda cópia que sempre diverge da primeira.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const service = createBodyScanService(supabase);

  // Independentes: sem Promise.all, a página espera duas viagens em série.
  const [scans, comparison] = await Promise.all([
    service.list(id, 20),
    service.latestWithComparison(id),
  ]);

  return (
    <div className="py-6">
      <BodyScanHistory scans={scans} deltas={comparison.deltas} />
    </div>
  );
}
