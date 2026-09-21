/**
 * No iOS não existe a permissão especial de alarme exato — o agendamento
 * local sempre dispara no horário pedido. Este módulo só existe de verdade no
 * Android; aqui é o stub que o Metro resolve por convenção de nome de arquivo.
 */
export default {
  isGranted(): boolean {
    return true;
  },
  openSettings(): void {},
};
