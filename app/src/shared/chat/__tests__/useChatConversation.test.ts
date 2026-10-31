import { act, renderHook } from '@testing-library/react-native';
import { useChatConversation } from '../useChatConversation';

const GREETING = 'Olá! Por onde começamos?';

describe('useChatConversation', () => {
  it('começa com a saudação', async () => {
    const { result } = await renderHook(() => useChatConversation(GREETING));

    expect(result.current.messages.map((m) => m.content)).toEqual([GREETING]);
  });

  it('mostra a pergunta e vai montando a resposta conforme o texto chega', async () => {
    const { result } = await renderHook(() => useChatConversation(GREETING));

    await act(() =>
      result.current.reply('Monta uma dieta', async ({ text }) => {
        text('Claro, ');
        text('vamos lá.');
      })
    );

    const [, pergunta, resposta] = result.current.messages;
    expect(pergunta).toMatchObject({ role: 'user', content: 'Monta uma dieta' });
    expect(resposta).toMatchObject({ role: 'assistant', content: 'Claro, vamos lá.' });
    expect(result.current.responding).toBe(false);
  });

  it('o erro do stream vira a resposta, com a mensagem', async () => {
    const { result } = await renderHook(() => useChatConversation(GREETING));

    await act(() => result.current.reply('Oi', async ({ error }) => error('sem crédito')));

    expect(result.current.messages.at(-1)?.content).toBe('Erro: sem crédito');
  });

  it('falha de rede não deixa a resposta vazia', async () => {
    const { result } = await renderHook(() => useChatConversation(GREETING));

    await act(() =>
      result.current.reply('Oi', async () => {
        throw new Error('timeout');
      })
    );

    expect(result.current.messages.at(-1)?.content).toBe(
      'Não consegui responder agora. Tente de novo.'
    );
  });

  it('pergunta vazia não vai', async () => {
    const { result } = await renderHook(() => useChatConversation(GREETING));
    const stream = jest.fn();

    await act(() => result.current.reply('   ', stream));

    expect(stream).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1);
  });

  it('carregar a conversa salva troca a saudação; conversa vazia mantém', async () => {
    const { result } = await renderHook(() => useChatConversation(GREETING));

    await act(() => result.current.load([]));
    expect(result.current.messages[0].content).toBe(GREETING);

    await act(() =>
      result.current.load([{ id: '1', role: 'user', content: 'antiga', createdAt: '2026-10-01' }])
    );
    expect(result.current.messages.map((m) => m.content)).toEqual(['antiga']);
  });

  it('say acrescenta uma fala do assistente', async () => {
    const { result } = await renderHook(() => useChatConversation(GREETING));

    await act(() => result.current.say('Plano salvo.'));

    expect(result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: 'Plano salvo.',
    });
  });
});
