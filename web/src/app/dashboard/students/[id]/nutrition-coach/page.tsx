import { redirect } from "next/navigation";

/**
 * O coach de nutrição virou uma das conversas do AI Coach.
 *
 * A rota fica de pé porque pode estar em link salvo — e porque ela nunca teve
 * aba: quem chegava aqui digitou a URL, e someção silenciosa seria pior.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/students/${id}/ai-coach`);
}
