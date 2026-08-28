import { ConfirmModal } from '../ConfirmModal';
import { StatusModal } from '../StatusModal';
import { useAppAlertStore } from './store';

/**
 * Desenha o aviso que estiver no topo da fila. Monta uma vez, na raiz — os
 * modais são `Modal` do React Native, então aparecem por cima de qualquer tela
 * sem depender de onde a chamada nasceu.
 */
export function AppAlertHost() {
  const current = useAppAlertStore((state) => state.current);
  const dismiss = useAppAlertStore((state) => state.dismiss);

  if (current === null) return null;

  if (current.kind === 'status') {
    return (
      <StatusModal
        visible
        onClose={() => {
          current.onDismiss?.();
          dismiss();
        }}
        title={current.title}
        message={current.message}
        type={current.type}
        buttonText={current.buttonText}
      />
    );
  }

  return (
    <ConfirmModal
      visible
      onClose={dismiss}
      onConfirm={current.onConfirm}
      onCancel={current.onCancel}
      title={current.title}
      message={current.message}
      type={current.type}
      confirmText={current.confirmText}
      cancelText={current.cancelText}
    />
  );
}
