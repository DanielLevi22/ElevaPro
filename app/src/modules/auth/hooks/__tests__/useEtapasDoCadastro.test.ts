import { act, renderHook } from '@testing-library/react-native';
import { TOTAL_DE_TRACOS, useEtapasDoCadastro } from '../useEtapasDoCadastro';

/**
 * O caminho do cadastro não é linear: só o Specialist passa pela escolha de
 * serviços. É isso que este arquivo prova, sem renderizar tela nenhuma.
 */
describe('etapas do cadastro', () => {
  it('começa na escolha de papel, com Specialist pré-selecionado', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());

    expect(result.current.etapa).toBe('papel');
    expect(result.current.papel).toBe('specialist');
    expect(result.current.ehPrimeira).toBe(true);
  });

  it('leva o Specialist pela escolha de serviços', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());

    await act(() => result.current.avancar());
    expect(result.current.etapa).toBe('servicos');
  });

  it.each(['student', 'member'] as const)('pula a escolha de serviços para %s', async (papel) => {
    const { result } = await renderHook(() => useEtapasDoCadastro());

    await act(() => result.current.escolherPapel(papel));
    await act(() => result.current.avancar());

    expect(result.current.etapa).toBe('dados');
  });

  it('impede sair dos serviços sem escolher nenhum, e diz por quê', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());
    await act(() => result.current.avancar());

    expect(result.current.impedimento).toMatch(/pelo menos um serviço/);

    await act(() => result.current.avancar());
    expect(result.current.etapa).toBe('servicos');
  });

  it('libera a saída depois de escolher um serviço', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());
    await act(() => result.current.avancar());
    await act(() => result.current.alternarServico('personal_training'));

    expect(result.current.impedimento).toBeNull();

    await act(() => result.current.avancar());
    expect(result.current.etapa).toBe('dados');
  });

  it('alterna o serviço em vez de só ligar', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());

    await act(() => result.current.alternarServico('personal_training'));
    await act(() => result.current.alternarServico('nutrition_consulting'));
    expect(result.current.servicos).toEqual(['personal_training', 'nutrition_consulting']);

    await act(() => result.current.alternarServico('personal_training'));
    expect(result.current.servicos).toEqual(['nutrition_consulting']);
  });

  it('volta pelo mesmo caminho que veio, e não pelo caminho do Specialist', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());
    await act(() => result.current.escolherPapel('student'));
    await act(() => result.current.avancar());

    await act(() => result.current.voltar());

    // Cair em 'servicos' aqui mostraria ao Student uma etapa que ele nunca viu.
    expect(result.current.etapa).toBe('papel');
  });

  it('volta do Specialist para os serviços, que é onde ele esteve', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());
    await act(() => result.current.avancar());
    await act(() => result.current.alternarServico('personal_training'));
    await act(() => result.current.avancar());

    await act(() => result.current.voltar());

    expect(result.current.etapa).toBe('servicos');
  });

  it('não sai da primeira etapa para trás', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());

    await act(() => result.current.voltar());
    expect(result.current.etapa).toBe('papel');
  });

  it('não passa da última para frente', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());
    await act(() => result.current.escolherPapel('member'));
    await act(() => result.current.avancar());

    await act(() => result.current.avancar());
    expect(result.current.etapa).toBe('dados');
    expect(result.current.ehUltima).toBe(true);
  });

  it('guarda os serviços quando a pessoa volta e reconfirma o papel', async () => {
    const { result } = await renderHook(() => useEtapasDoCadastro());
    await act(() => result.current.avancar());
    await act(() => result.current.alternarServico('personal_training'));
    await act(() => result.current.voltar());

    await act(() => result.current.escolherPapel('specialist'));

    expect(result.current.servicos).toEqual(['personal_training']);
  });

  it('acende o último traço na etapa final, mesmo em caminho de duas etapas', async () => {
    // A barra tem três traços sempre. Encolhê-la quando a pessoa escolhe "Sou
    // Aluno" leria como perda de progresso, não como caminho mais curto.
    const { result } = await renderHook(() => useEtapasDoCadastro());
    await act(() => result.current.escolherPapel('student'));
    await act(() => result.current.avancar());

    expect(result.current.indiceDoTraco).toBe(TOTAL_DE_TRACOS - 1);
  });
});
