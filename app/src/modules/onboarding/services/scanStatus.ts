import { supabase } from '@elevapro/supabase';

/**
 * Se a pessoa já fez algum escaneamento corporal: o cartão da tela inicial só
 * apresenta o recurso a quem ainda não conhece.
 *
 * Lê só o `id`, nunca o resultado: para decidir o cartão basta saber se existe.
 *
 * @example if (!(await hasAnyScan(user.id))) mostrarCartao();
 */
export async function hasAnyScan(studentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('body_scans')
    .select('id')
    .eq('student_id', studentId)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}
