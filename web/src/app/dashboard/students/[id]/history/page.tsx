import { redirect } from "next/navigation";

/**
 * O Histórico virou Atividades e a rota antiga continua existindo só para não
 * quebrar link salvo — o especialista que guardou o endereço da aba não deve
 * cair num 404 por causa de uma renomeação.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/students/${id}/activities`);
}
