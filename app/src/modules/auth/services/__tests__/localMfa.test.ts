import type { TotpFactor, TotpPort } from '@elevapro/shared';
import { createLocalMfaConfirmer, isLocalBackend, type SecretStore, totpCode } from '../localMfa';

/**
 * O autenticador confirmado sozinho no ambiente local (#355).
 *
 * A sessão sai `aal2` de verdade: RLS e BFF seguem exigindo o segundo fator, e
 * só quem digita o código muda. Por isso a trava que importa é a do ambiente —
 * fora da máquina de desenvolvimento, este caminho não pode rodar.
 */

// RFC 6238, apêndice B: segredo ASCII "12345678901234567890", SHA-1.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totpCode', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('no instante %is gera o código do RFC 6238', (seconds, code) => {
    expect(totpCode(RFC_SECRET, seconds * 1000)).toBe(code);
  });
});

const LOCAL = { isDev: true, appEnv: 'development', supabaseUrl: 'http://10.0.2.2:47321' };

describe('isLocalBackend', () => {
  it.each([
    'http://10.0.2.2:47321',
    'http://localhost:47321',
    'http://127.0.0.1:47321',
  ])('reconhece o Supabase da máquina em %s', (supabaseUrl) => {
    expect(isLocalBackend({ ...LOCAL, supabaseUrl })).toBe(true);
  });

  // Art. 46: o segundo fator protege o acesso do especialista a dados de saúde.
  // Fora da máquina de desenvolvimento ninguém pode ter o código digitado por
  // conta própria — nem o preview, que guarda dados reais.
  it.each([
    ['o preview', { supabaseUrl: 'https://lcwzijtunmlvvrqtproh.supabase.co' }],
    ['um host que só começa como o local', { supabaseUrl: 'http://localhost.evil.com' }],
    ['um build de release', { isDev: false }],
    ['outro ambiente declarado', { appEnv: 'preview' }],
    ['URL inválida', { supabaseUrl: 'não é url' }],
  ])('recusa %s', (_caso, override) => {
    const SEGUNDO_FATOR_PULADO_FORA_DO_LOCAL = isLocalBackend({ ...LOCAL, ...override });
    expect({ SEGUNDO_FATOR_PULADO_FORA_DO_LOCAL }).toEqual({
      SEGUNDO_FATOR_PULADO_FORA_DO_LOCAL: false,
    });
  });
});

function memoryStore(initial: Record<string, string> = {}): SecretStore {
  const secrets = new Map(Object.entries(initial));
  return { get: (key) => secrets.get(key), set: (key, value) => void secrets.set(key, value) };
}

/** A porta MFA do Supabase, com os fatores em memória e o código conferido de verdade. */
function fakePort(factors: TotpFactor[], secretOf: Record<string, string>, now: number) {
  const verified: { factorId: string; code: string }[] = [];
  const port: TotpPort = {
    listFactors: async () => ({ data: { all: factors }, error: null }),
    enroll: async () => {
      factors.push({ id: 'novo', factor_type: 'totp', status: 'unverified' });
      return { data: { id: 'novo', totp: { secret: secretOf.novo } }, error: null };
    },
    unenroll: async () => ({ error: null }),
    challenge: async () => ({ data: { id: 'desafio' }, error: null }),
    verify: async ({ factorId, code }) => {
      const ok = code === totpCode(secretOf[factorId], now);
      if (ok) verified.push({ factorId, code });
      return { error: ok ? null : new Error('código errado') };
    },
    getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1' }, error: null }),
  };
  return { port, verified };
}

const NOW = 1_700_000_000_000;

describe('createLocalMfaConfirmer', () => {
  it('cadastra o fator, guarda o segredo e confirma o código na primeira vez', async () => {
    const { port, verified } = fakePort([], { novo: RFC_SECRET }, NOW);
    const store = memoryStore();

    const confirmed = await createLocalMfaConfirmer(port, store, () => NOW).confirm('user-1');

    expect(confirmed).toBe(true);
    expect(verified).toEqual([{ factorId: 'novo', code: totpCode(RFC_SECRET, NOW) }]);
    expect(store.get('totp:user-1')).toBe(RFC_SECRET);
  });

  it('nos logins seguintes confirma com o segredo guardado, sem cadastrar de novo', async () => {
    const factors = [{ id: 'antigo', factor_type: 'totp', status: 'verified' }];
    const { port, verified } = fakePort(factors, { antigo: RFC_SECRET }, NOW);
    const store = memoryStore({ 'totp:user-1': RFC_SECRET });

    const confirmed = await createLocalMfaConfirmer(port, store, () => NOW).confirm('user-1');

    expect(confirmed).toBe(true);
    expect(verified).toHaveLength(1);
    expect(factors).toHaveLength(1);
  });

  it('devolve a tela manual quando o fator foi cadastrado num celular', async () => {
    const factors = [{ id: 'celular', factor_type: 'totp', status: 'verified' }];
    const { port, verified } = fakePort(factors, { celular: RFC_SECRET }, NOW);

    const confirmed = await createLocalMfaConfirmer(port, memoryStore(), () => NOW).confirm(
      'user-1'
    );

    expect(confirmed).toBe(false);
    expect(verified).toHaveLength(0);
  });
});
