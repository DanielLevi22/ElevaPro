import { showAlert, showConfirm, useAppAlertStore } from '..';

describe('appAlert', () => {
  beforeEach(() => {
    useAppAlertStore.setState({ current: null, queue: [] });
  });

  it('mostra o aviso na hora quando não há nada em cena', () => {
    showAlert({ title: 'Erro', message: 'Falhou.', type: 'error' });

    expect(useAppAlertStore.getState().current).toMatchObject({
      kind: 'status',
      title: 'Erro',
      type: 'error',
    });
  });

  it('assume o tipo info quando não informado', () => {
    showAlert({ title: 'Aviso', message: 'Só isso.' });

    expect(useAppAlertStore.getState().current).toMatchObject({ type: 'info' });
  });

  /**
   * O `Alert.alert` nativo enfileira. Sem isto, uma tela que avisa duas coisas
   * no mesmo tick mostraria só a segunda.
   */
  it('enfileira o segundo aviso em vez de sobrescrever o primeiro', () => {
    showAlert({ title: 'Primeiro', message: 'a' });
    showAlert({ title: 'Segundo', message: 'b' });

    expect(useAppAlertStore.getState().current).toMatchObject({ title: 'Primeiro' });
    expect(useAppAlertStore.getState().queue).toHaveLength(1);

    useAppAlertStore.getState().dismiss();

    expect(useAppAlertStore.getState().current).toMatchObject({ title: 'Segundo' });
    expect(useAppAlertStore.getState().queue).toHaveLength(0);
  });

  it('esvazia ao fechar o último', () => {
    showAlert({ title: 'Único', message: 'a' });
    useAppAlertStore.getState().dismiss();

    expect(useAppAlertStore.getState().current).toBeNull();
  });

  it('guarda as duas ações da confirmação', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    showConfirm({
      title: 'Finalizar?',
      message: 'Faltam séries.',
      type: 'warning',
      confirmText: 'Finalizar',
      onConfirm,
      onCancel,
    });

    const current = useAppAlertStore.getState().current;
    expect(current).toMatchObject({ kind: 'confirm', type: 'warning', confirmText: 'Finalizar' });
    if (current?.kind !== 'confirm') throw new Error('esperava uma confirmação');
    current.onConfirm();
    current.onCancel?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
