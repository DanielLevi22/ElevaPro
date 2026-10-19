import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { ROUTES } from '@/navigation/types';
import { AssistantHistoryPanel } from './AssistantHistoryPanel';
import type { AssistantModule } from './assistantConversations';

interface Props {
  token: string;
  studentId: string;
  disabled: boolean;
  canWorkout: boolean;
  canNutrition: boolean;
}

/** Abre o histórico sem desmontar a conversa atual; escolher outra troca a rota.
 * @example <AssistantHistoryButton token={token} studentId={studentId} disabled={busy} canWorkout canNutrition />
 */
export function AssistantHistoryButton({ disabled, ...scope }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const select = (session: { id: string; module: AssistantModule }) => {
    setVisible(false);
    router.replace({
      pathname:
        session.module === 'nutrition'
          ? ROUTES.NUTRITION.WIZARD_ASSISTANT
          : ROUTES.WORKOUTS.ASSISTANT,
      params: { studentId: scope.studentId, sessionId: session.id },
    });
  };
  return (
    <>
      <BotaoRedondo
        icone="history"
        rotulo="Histórico de conversas"
        disabled={disabled}
        onPress={() => setVisible(true)}
      />
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        {visible && (
          <AssistantHistoryPanel {...scope} onClose={() => setVisible(false)} onSelect={select} />
        )}
      </Modal>
    </>
  );
}
