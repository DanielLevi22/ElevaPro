jest.mock('@elevapro/supabase', () => ({
  supabase: {
    auth: {
      mfa: {
        challenge: jest.fn(),
        enroll: jest.fn(),
        getAuthenticatorAssuranceLevel: jest.fn(),
        listFactors: jest.fn(),
        unenroll: jest.fn(),
        verify: jest.fn(),
      },
    },
  },
}));

import { supabase } from '@elevapro/supabase';
import { beginTotpChallenge, hasCurrentMfaAssurance, verifyTotp } from '../mfa.service';

const mockMfa = supabase.auth.mfa as unknown as {
  challenge: jest.Mock;
  enroll: jest.Mock;
  getAuthenticatorAssuranceLevel: jest.Mock;
  listFactors: jest.Mock;
  unenroll: jest.Mock;
  verify: jest.Mock;
};

describe('mfa.service', () => {
  beforeEach(() => jest.resetAllMocks());

  it('reutiliza fator confirmado sem expor QR, chave ou criar outro segredo', async () => {
    mockMfa.listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }] },
    });

    await expect(beginTotpChallenge()).resolves.toEqual({ factorId: 'factor-1' });
    expect(mockMfa.enroll).not.toHaveBeenCalled();
  });

  it('inscreve um fator novo e mantém a chave manual apenas no retorno em memória', async () => {
    mockMfa.listFactors.mockResolvedValue({ data: { all: [] } });
    mockMfa.enroll.mockResolvedValue({
      data: { id: 'factor-new', totp: { secret: 'SECRET-123', uri: 'otpauth://totp/Eleva' } },
      error: null,
    });

    await expect(beginTotpChallenge()).resolves.toEqual({
      factorId: 'factor-new',
      secret: 'SECRET-123',
      uri: 'otpauth://totp/Eleva',
    });
  });

  // LGPD Art. 6º, VII: reiniciar a tela não pode invalidar o autenticador já confirmado.
  it('remove somente fator pendente antes de gerar um novo QR Code', async () => {
    mockMfa.listFactors.mockResolvedValue({
      data: { all: [{ id: 'pending-1', factor_type: 'totp', status: 'unverified' }] },
    });
    mockMfa.unenroll.mockResolvedValue({ error: null });
    mockMfa.enroll.mockResolvedValue({
      data: { id: 'factor-new', totp: { secret: 'SECRET-123', uri: 'otpauth://totp/Eleva' } },
      error: null,
    });

    await beginTotpChallenge();

    expect(mockMfa.unenroll).toHaveBeenCalledWith({ factorId: 'pending-1' });
  });

  it('explica quando o provedor TOTP está desabilitado', async () => {
    mockMfa.listFactors.mockResolvedValue({ data: { all: [] } });
    mockMfa.enroll.mockResolvedValue({
      data: null,
      error: { code: 'mfa_totp_enroll_not_enabled', message: 'TOTP enrollment is disabled' },
    });

    await expect(beginTotpChallenge()).rejects.toThrow(
      'A autenticação em duas etapas está indisponível no momento.'
    );
  });

  it('só considera AAL2 como sessão reforçada', async () => {
    mockMfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' } });

    await expect(hasCurrentMfaAssurance()).resolves.toBe(false);
  });

  it('não confirma código quando o desafio do Supabase falha', async () => {
    mockMfa.challenge.mockResolvedValue({ error: new Error('desafio recusado') });

    await expect(verifyTotp('factor-1', '123456')).rejects.toThrow('desafio recusado');
    expect(mockMfa.verify).not.toHaveBeenCalled();
  });

  it('confirma o código somente no desafio criado para o fator', async () => {
    mockMfa.challenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mockMfa.verify.mockResolvedValue({ error: null });

    await expect(verifyTotp('factor-1', '123456')).resolves.toBeUndefined();
    expect(mockMfa.verify).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      code: '123456',
      factorId: 'factor-1',
    });
  });
});
