/** Web não agenda notificação local — nada aqui bloqueia nada. */
export default {
  isGranted(): boolean {
    return true;
  },
  openSettings(): void {},
};
