import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { useProgressNavigation } from '../navigation/ProgressNavigation';

/**
 * O voltar do hub. Na aba do aluno o hub é raiz e não tem botão; aberto pelo
 * especialista, dentro da pilha de Alunos, ele volta ao Acompanhamento.
 *
 * @example <ProgressHeader … leading={<HubBackButton />} />
 */
export function HubBackButton() {
  const { onBack } = useProgressNavigation();
  if (!onBack) return null;
  return <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onBack} />;
}
