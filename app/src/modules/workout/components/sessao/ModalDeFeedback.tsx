import type { ImageSourcePropType } from 'react-native';
import { Modal } from 'react-native';
import { TelaDeFeedback } from './TelaDeFeedback';

/**
 * A tela de feedback aberta por cima de outra: o fim do cardio e a correção no
 * histórico. A sessão de musculação a mostra como momento, sem modal.
 *
 * O modal só existe enquanto está visível: montar a tela a cada abertura é o
 * que faz a correção da segunda sessão chegar com os valores dela, e não com os
 * da primeira que foi aberta.
 *
 * @example
 * <ModalDeFeedback visivel={!!emCorrecao} modo="correcao" pseInicial={log.perceived_exertion} … />
 */
interface ModalDeFeedbackProps {
  visivel: boolean;
  imagem: ImageSourcePropType;
  onFechar: () => void;
  onSalvar: (pse: number, notas: string) => void;
  modo?: 'registro' | 'correcao';
  pseInicial?: number | null;
  notasIniciais?: string | null;
  onApagarObservacao?: () => void;
}

export function ModalDeFeedback({ visivel, onFechar, ...tela }: ModalDeFeedbackProps) {
  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onFechar}>
      {visivel ? <TelaDeFeedback onFechar={onFechar} {...tela} /> : null}
    </Modal>
  );
}
