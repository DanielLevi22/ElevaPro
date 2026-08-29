import { BffConfigError, BffHttpError, BffNotJsonError, BffUnreachableError } from '../client';
import { mensagemDeErroBff } from '../mensagem';

const HOST = 'elevapro-preview.vercel.app';

/**
 * Release, não desenvolvimento: é aqui que o vazamento importa. Nos testes o
 * `__DEV__` do React Native é `true`, e sem desligá-lo estaríamos afirmando o
 * contrário do que queremos garantir.
 */
function comoEmRelease<T>(fn: () => T): T {
  const global_ = globalThis as { __DEV__?: boolean };
  const antes = global_.__DEV__;
  global_.__DEV__ = false;
  try {
    return fn();
  } finally {
    global_.__DEV__ = antes;
  }
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('mensagemDeErroBff — o que o usuário lê', () => {
  // Prova negativa do vazamento real: a tela do NutriBot exibiu o host e a
  // descrição da proteção de plataforma. Para o aluno não era acionável, e
  // entregava a forma da infraestrutura de graça.
  it('nunca mostra host, variável de ambiente ou plataforma', () => {
    const erros = [
      new BffConfigError(),
      new BffUnreachableError(HOST, 'o segredo de EXPO_PUBLIC_VERCEL_BYPASS não foi aceito'),
      new BffNotJsonError(HOST, 'text/html', 500),
      new BffHttpError('/api/ai/student/nutribot', 503, 'server_misconfigured'),
    ];

    for (const erro of erros) {
      const mensagem = comoEmRelease(() => mensagemDeErroBff(erro));

      expect(mensagem).not.toContain(HOST);
      expect(mensagem.toLowerCase()).not.toContain('vercel');
      expect(mensagem).not.toContain('EXPO_PUBLIC');
      expect(mensagem).not.toContain('Deployment');
      expect(mensagem).not.toMatch(/\d{3}/);
    }
  });

  it('falha de rede vira algo que o usuário pode fazer', () => {
    const mensagem = comoEmRelease(() =>
      mensagemDeErroBff(new BffUnreachableError(HOST, 'não respondeu em 60s'))
    );

    expect(mensagem).toContain('conexão');
  });

  it('app mal configurado manda atualizar, que é a ação dele', () => {
    const mensagem = comoEmRelease(() => mensagemDeErroBff(new BffConfigError()));

    expect(mensagem).toContain('Atualize');
  });

  // Configuração do servidor não é problema do aluno: mandá-lo tentar de novo
  // agora o faria repetir o que não tem como funcionar.
  it('configuração do servidor vira "fora do ar", sem nomear a causa', () => {
    const erro = new BffHttpError('/api/x', 503, 'server_misconfigured');

    const mensagem = comoEmRelease(() => mensagemDeErroBff(erro));

    expect(mensagem).toContain('fora do ar');
    expect(mensagem).not.toContain('server_misconfigured');
  });

  it('falta de consentimento continua explícita — essa é ação do titular', () => {
    const erro = new BffHttpError('/api/ai/student/nutribot', 403, 'consent_required');

    expect(comoEmRelease(() => mensagemDeErroBff(erro))).toContain('consentimento');
  });

  it('cai na frase genérica quando nem Error era', () => {
    expect(comoEmRelease(() => mensagemDeErroBff('string solta'))).toContain('Tente de novo');
    expect(comoEmRelease(() => mensagemDeErroBff(null))).toContain('Tente de novo');
  });
});

describe('mensagemDeErroBff — o que vai para o log', () => {
  // O diagnóstico não pode sumir: ele saiu da tela, não do sistema. Sem isto,
  // a correção de privacidade teria recriado o erro mudo que começou tudo.
  it('registra o detalhe técnico, que a tela não mostra mais', () => {
    const erro = new BffUnreachableError(HOST, 'o segredo não foi aceito');

    comoEmRelease(() => mensagemDeErroBff(erro));

    expect(console.error).toHaveBeenCalledWith('[bff]', expect.stringContaining(HOST));
  });

  it('registra até o que não é Error, para não perder o caso raro', () => {
    comoEmRelease(() => mensagemDeErroBff({ estranho: true }));

    expect(console.error).toHaveBeenCalled();
  });
});

describe('mensagemDeErroBff — em desenvolvimento', () => {
  // Em dev quem lê a tela é quem conserta, e o ciclo fica mais curto com o
  // detalhe à vista. É a única situação em que ele volta para a interface.
  it('mostra o detalhe junto da frase pública', () => {
    const erro = new BffUnreachableError(HOST, 'não respondeu em 60s');
    const global_ = globalThis as { __DEV__?: boolean };
    const antes = global_.__DEV__;
    global_.__DEV__ = true;

    try {
      const mensagem = mensagemDeErroBff(erro);

      expect(mensagem).toContain('[dev]');
      expect(mensagem).toContain(HOST);
    } finally {
      global_.__DEV__ = antes;
    }
  });
});
