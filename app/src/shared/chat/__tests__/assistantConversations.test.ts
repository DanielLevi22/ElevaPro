import { assistantConversations } from '../assistantConversations';

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ success: true }),
  });
});

it('renomeia e arquiva a conversa existente por PATCH, sem criar outra sessão', async () => {
  await assistantConversations.rename('token', 'student', 'conversation', ' Novo título ');
  await assistantConversations.archive('token', 'student', 'conversation');
  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    'https://example.test/api/ai/chat/student/sessions',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ sessionId: 'conversation', title: 'Novo título' }),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    expect.any(String),
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ sessionId: 'conversation' }),
    })
  );
});
