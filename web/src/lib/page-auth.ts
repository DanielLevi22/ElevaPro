import { type AccountType, defineAbilitiesFor } from "@elevapro/shared";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./supabase/server";

/**
 * Autorização de página renderizada no servidor.
 *
 * Irmã de `api-auth.ts`, e pelo mesmo motivo: o nome carrega a garantia que a
 * função dá. Muda só o desfecho — rota do BFF responde 401/403, página
 * redireciona, porque quem chega aqui é um navegador.
 *
 * Existe porque `admin/layout.tsx` protege no cliente, e proteger no cliente
 * não protege: o layout é um Client Component que recebe `children` já
 * renderizados, então o payload da página é montado no servidor e enviado
 * **antes** de o `useEffect` decidir mandar embora quem não é admin. O que ele
 * esconde é a pintura, não o conteúdo.
 */

/** Quem está vendo a página, com o papel lido de `profiles`. */
export interface Visitante {
  id: string;
  accountType: AccountType;
}

/**
 * Sessão válida e permissão de `AdminPanel` pela tabela do CASL.
 *
 * A decisão sai de `defineAbilitiesFor`, não de um `=== "admin"` escrito aqui:
 * é a mesma tabela que decide o que a UI mostra, e duas cópias da regra de
 * acesso divergem em silêncio — foi exatamente assim que `Periodization`
 * passou a valer no mobile e não no web.
 *
 * @example
 * export default async function Page() {
 *   await exigirPainelAdmin();
 *   return <Painel />;
 * }
 */
export async function exigirPainelAdmin(): Promise<Visitante> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  // Falha de consulta não é "não é admin", e também não é "é": somar as duas
  // coisas foi o que deixou o painel inacessível sem ninguém entender por quê
  // (ver `admin/layout.tsx`). Levantar mostra o erro; redirecionar o esconde.
  if (error) throw error;

  const accountType = profile.account_type as AccountType;
  if (!defineAbilitiesFor({ accountType }).can("manage", "AdminPanel")) redirect("/dashboard");

  return { id: user.id, accountType };
}
