jest.mock('@elevapro/supabase', () => ({
  supabase: {
    auth: {
      getClaims: jest.fn(),
      passkey: {
        startRegistration: jest.fn(),
        verifyRegistration: jest.fn(),
        startAuthentication: jest.fn(),
        verifyAuthentication: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      mfa: { listFactors: jest.fn(), getAuthenticatorAssuranceLevel: jest.fn() },
    },
  },
}));
jest.mock('react-native-passkeys', () => ({
  isSupported: jest.fn(),
  create: jest.fn(),
  get: jest.fn(),
}));

import { supabase } from '@elevapro/supabase';
import * as passkeys from 'react-native-passkeys';
import {
  hasCurrentPrivilegedProof,
  registerPasskey,
  removePasskey,
  renamePasskey,
  signInWithPasskey,
} from '../passkey.service';

const auth = supabase.auth as unknown as {
  getClaims: jest.Mock;
  mfa: { getAuthenticatorAssuranceLevel: jest.Mock; listFactors: jest.Mock };
  passkey: {
    startRegistration: jest.Mock;
    verifyRegistration: jest.Mock;
    startAuthentication: jest.Mock;
    verifyAuthentication: jest.Mock;
    list: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};
const device = passkeys as unknown as { isSupported: jest.Mock; create: jest.Mock; get: jest.Mock };

describe('passkey.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.EXPO_PUBLIC_PASSKEY_RP_ID = 'elevapro-preview.vercel.app';
    process.env.EXPO_PUBLIC_PASSKEY_ENABLED = 'true';
    device.isSupported.mockReturnValue(true);
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2' },
      error: null,
    });
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ factor_type: 'totp', status: 'verified' }] },
      error: null,
    });
  });

  it('não chama o Auth se o aparelho não suportar Passkeys', async () => {
    device.isSupported.mockReturnValue(false);
    await expect(signInWithPasskey()).rejects.toThrow('não oferece Passkeys');
    expect(auth.passkey.startAuthentication).not.toHaveBeenCalled();
  });

  it('não conclui login quando a assinatura é cancelada', async () => {
    auth.passkey.startAuthentication.mockResolvedValue({
      data: { challenge_id: 'ch-1', options: {} },
      error: null,
    });
    device.get.mockResolvedValue(null);
    await expect(signInWithPasskey()).rejects.toThrow('cancelada');
    expect(auth.passkey.verifyAuthentication).not.toHaveBeenCalled();
  });

  it('conclui login só depois da verificação remota e de receber sessão', async () => {
    auth.passkey.startAuthentication.mockResolvedValue({
      data: { challenge_id: 'ch-1', options: { challenge: 'AQI' } },
      error: null,
    });
    device.get.mockResolvedValue({ id: 'credential-1' });
    auth.passkey.verifyAuthentication.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });
    await expect(signInWithPasskey()).resolves.toBeUndefined();
    expect(auth.passkey.verifyAuthentication).toHaveBeenCalledWith({
      challengeId: 'ch-1',
      credential: { id: 'credential-1' },
    });
  });

  it('não conclui cadastro quando a verificação remota falha', async () => {
    auth.passkey.startRegistration.mockResolvedValue({
      data: { challenge_id: 'ch-2', options: {} },
      error: null,
    });
    device.create.mockResolvedValue({ id: 'credential-2' });
    auth.passkey.verifyRegistration.mockResolvedValue({ error: new Error('assinatura inválida') });
    await expect(registerPasskey()).rejects.toThrow('assinatura inválida');
  });

  it('não inicia inscrição com uma sessão apenas de senha', async () => {
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1' },
      error: null,
    });
    await expect(registerPasskey()).rejects.toThrow('Confirme o código');
    expect(auth.passkey.startRegistration).not.toHaveBeenCalled();
  });

  it('não considera senha aal1 uma sessão Passkey', async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { aal: 'aal1', amr: [{ method: 'password' }] } },
    });
    await expect(hasCurrentPrivilegedProof()).resolves.toBe(false);
  });

  it('não considera Passkey sem TOTP verificado uma sessão privilegiada', async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { aal: 'aal1', amr: [{ method: 'passkey' }] } },
    });
    auth.mfa.listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    await expect(hasCurrentPrivilegedProof()).resolves.toBe(false);
  });

  it('com Passkeys habilitadas, não considera TOTP suficiente para o login diário', async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { aal: 'aal2', amr: [{ method: 'totp' }] } },
    });
    await expect(hasCurrentPrivilegedProof()).resolves.toBe(false);
  });

  it('bloqueia a remoção do único aparelho', async () => {
    auth.passkey.list.mockResolvedValue({ data: [{ id: 'aparelho-1' }], error: null });
    await expect(removePasskey('aparelho-1')).rejects.toThrow('Cadastre outro aparelho');
    expect(auth.passkey.delete).not.toHaveBeenCalled();
  });

  it('renomeia a credencial selecionada', async () => {
    auth.passkey.update.mockResolvedValue({ error: null });
    await renamePasskey('aparelho-1', ' Meu telefone ');
    expect(auth.passkey.update).toHaveBeenCalledWith({
      passkeyId: 'aparelho-1',
      friendlyName: 'Meu telefone',
    });
  });
});
