import { approveNextBlock, requestNextBlock } from '../nextBlockService';

const mockPostBff = jest.fn();

jest.mock('@/shared/bff', () => ({
  postBff: (path: string, body: unknown, options: unknown) => mockPostBff(path, body, options),
}));
jest.mock('@/auth', () => ({ tokenDaSessao: () => 'token-do-aluno' }));

describe('nextBlockService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pede o próximo bloco com o que mudou e se é antes do fim, com o token da sessão', async () => {
    mockPostBff.mockResolvedValue({ block: { blockNumber: 3 } });

    const block = await requestNextBlock({ changes: { gym_type: 'Home gym' }, early: true });

    expect(block).toEqual({ blockNumber: 3 });
    expect(mockPostBff).toHaveBeenCalledWith(
      '/api/ai/student/block/next',
      { changes: { gym_type: 'Home gym' }, early: true },
      { token: 'token-do-aluno' }
    );
  });

  // ADR-0020: nada é gravado sem "Aprovar". O corpo vai vazio: o servidor
  // grava a cópia que a pessoa viu, guardada na sessão, e não o que o app manda.
  it('aprovar não manda o bloco: o servidor grava a proposta que guardou', async () => {
    mockPostBff.mockResolvedValue({});

    await approveNextBlock();

    expect(mockPostBff).toHaveBeenCalledWith(
      '/api/ai/student/block/approve',
      {},
      { token: 'token-do-aluno' }
    );
  });

  it('a falha do servidor chega à tela, que mostra o erro', async () => {
    mockPostBff.mockRejectedValue(new Error('502'));
    await expect(requestNextBlock({ changes: {}, early: false })).rejects.toThrow('502');
  });
});
