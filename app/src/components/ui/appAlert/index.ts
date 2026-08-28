/**
 * Avisos e confirmações do app, no visual do design system.
 *
 * Substitui o `Alert.alert` do React Native, que renderiza o diálogo do
 * sistema operacional — cinza no iOS, Material no Android — no meio de telas
 * que são pretas com gradiente. Além de destoar, o nativo não dá controle
 * sobre tipografia, ícone ou cor de ação destrutiva.
 *
 * A API é imperativa de propósito: metade das chamadas parte de store e hook,
 * fora da árvore React, onde não dá para usar contexto. O estado vive num store
 * Zustand e quem desenha é o `<AppAlertHost />`, montado uma vez na raiz.
 *
 * @example
 * showAlert({ title: 'Erro', message: 'Não foi possível salvar.', type: 'error' });
 *
 * @example
 * showConfirm({
 *   title: 'Excluir treino',
 *   message: 'Esta ação não pode ser desfeita.',
 *   type: 'danger',
 *   confirmText: 'Excluir',
 *   onConfirm: () => remove(id),
 * });
 */
import { type ConfirmRequest, type StatusRequest, useAppAlertStore } from './store';

export { AppAlertHost } from './AppAlertHost';
export type { AlertRequest, ConfirmModalType, ConfirmRequest, StatusRequest } from './store';
export { useAppAlertStore } from './store';

/** Aviso de um botão só. `type` default é `info`. */
export const showAlert = (
  options: Omit<StatusRequest, 'kind' | 'type'> & { type?: StatusRequest['type'] }
): void => {
  useAppAlertStore.getState().push({ kind: 'status', type: 'info', ...options });
};

/** Escolha entre duas ações. `type` default é `info`. */
export const showConfirm = (
  options: Omit<ConfirmRequest, 'kind' | 'type'> & { type?: ConfirmRequest['type'] }
): void => {
  useAppAlertStore.getState().push({ kind: 'confirm', type: 'info', ...options });
};
