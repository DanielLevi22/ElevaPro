import { act, renderHook } from '@testing-library/react-native';
import { TOTAL_DE_TRACOS, useEtapasDoCadastro } from '../useEtapasDoCadastro';

/**
 * O caminho do cadastro não é linear: só o Specialist passa pela escolha de
 * serviços. É isso que este arquivo prova, sem renderizar tela nenhuma.
 */
describe('etapas do cadastro', () => {
  it('começa na escolha de papel, com Specialist pré-selecionado', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());

    expect(result.current.etapa).toBe('papel');
    expect(result.current.papel).toBe('specialist');
    expect(result.current.ehPrimeira).toBe(true);
  });

  it('leva o Specialist pela escolha de serviços', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());

    act(() => result.current.avancar());
    expect(result.current.etapa).toBe('servicos');
  });

  it.each(['student', 'member'] as const)('pula a escolha de serviços para %s', (papel) => {
    const { result } = renderHook(() => useEtapasDoCadastro());

    act(() => result.current.escolherPapel(papel));
    act(() => result.current.avancar());

    expect(result.current.etapa).toBe('dados');
  });

  it('impede sair dos serviços sem escolher nenhum, e diz por quê', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());
    act(() => result.current.avancar());

    expect(result.current.impedimento).toMatch(/pelo menos um serviço/);

    act(() => result.current.avancar());
    expect(result.current.etapa).toBe('servicos');
  });

  it('libera a saída depois de escolher um serviço', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());
    act(() => result.current.avancar());
    act(() => result.current.alternarServico('personal_training'));

    expect(result.current.impedimento).toBeNull();

    act(() => result.current.avancar());
    expect(result.current.etapa).toBe('dados');
  });

  it('alterna o serviço em vez de só ligar', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());

    act(() => result.current.alternarServico('personal_training'));
    act(() => result.current.alternarServico('nutrition_consulting'));
    expect(result.current.servicos).toEqual(['personal_training', 'nutrition_consulting']);

    act(() => result.current.alternarServico('personal_training'));
    expect(result.current.servicos).toEqual(['nutrition_consulting']);
  });

  it('volta pelo mesmo caminho que veio, e não pelo caminho do Specialist', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());
    act(() => result.current.escolherPapel('student'));
    act(() => result.current.avancar());

    act(() => result.current.voltar());

    // Cair em 'servicos' aqui mostraria ao Student uma etapa que ele nunca viu.
    expect(result.current.etapa).toBe('papel');
  });

  it('volta do Specialist para os serviços, que é onde ele esteve', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());
    act(() => result.current.avancar());
    act(() => result.current.alternarServico('personal_training'));
    act(() => result.current.avancar());

    act(() => result.current.voltar());

    expect(result.current.etapa).toBe('servicos');
  });

  it('não sai da primeira etapa para trás', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());

    act(() => result.current.voltar());
    expect(result.current.etapa).toBe('papel');
  });

  it('não passa da última para frente', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());
    act(() => result.current.escolherPapel('member'));
    act(() => result.current.avancar());

    act(() => result.current.avancar());
    expect(result.current.etapa).toBe('dados');
    expect(result.current.ehUltima).toBe(true);
  });

  it('guarda os serviços quando a pessoa volta e reconfirma o papel', () => {
    const { result } = renderHook(() => useEtapasDoCadastro());
    act(() => result.current.avancar());
    act(() => result.current.alternarServico('personal_training'));
    act(() => result.current.voltar());

    act(() => result.current.escolherPapel('specialist'));

    expect(result.current.servicos).toEqual(['personal_training']);
  });

  it('acende o último traço na etapa final, mesmo em caminho de duas etapas', () => {
    // A barra tem três traços sempre. Encolhê-la quando a pessoa escolhe "Sou
    // Aluno" leria como perda de progresso, não como caminho mais curto.
    const { result } = renderHook(() => useEtapasDoCadastro());
    act(() => result.current.escolherPapel('student'));
    act(() => result.current.avancar());

    expect(result.current.indiceDoTraco).toBe(TOTAL_DE_TRACOS - 1);
  });
});
