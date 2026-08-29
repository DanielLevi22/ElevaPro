import {
  BffConfigError,
  BffHttpError,
  BffNotJsonError,
  BffUnreachableError,
  bffUrl,
  getBff,
  lerRespostaBff,
  postBff,
} from '../client';

const HOST = 'https://elevapro-preview.vercel.app';

function resposta({
  status = 200,
  contentType = 'application/json; charset=utf-8',
  corpo = {},
}: {
  status?: number;
  contentType?: string | null;
  corpo?: unknown;
} = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (nome: string) => (nome === 'content-type' ? contentType : null) },
    json: async () => corpo,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = HOST;
  global.fetch = jest.fn();
});

describe('bffUrl', () => {
  it('monta a URL a partir da variável de ambiente', () => {
    expect(bffUrl('/api/ai/body-scan')).toBe(`${HOST}/api/ai/body-scan`);
  });

  // A barra dupla não quebrava o roteamento da Vercel, mas aparecia na mensagem
  // de erro e fazia o host tentado parecer outro.
  it('não duplica a barra quando a variável termina em barra', () => {
    process.env.EXPO_PUBLIC_API_URL = `${HOST}/`;
    expect(bffUrl('/api/ai/body-scan')).toBe(`${HOST}/api/ai/body-scan`);
  });

  // Regressão: antes isto montava a string "undefined/api/ai/body-scan" e o
  // fetch falhava com um erro de rede que não dizia nada. Os serviços que
  // usavam `?? ''` eram igualmente mudos — viravam caminho relativo, e em React
  // Native não existe origem para completar.
  it('falha com o nome da variável quando ela está ausente', () => {
    // `delete` e não `= undefined`: em Node, atribuir undefined a process.env
    // grava a STRING "undefined" — que é justamente o valor que produzia a URL
    // `"undefined/api/ai/body-scan"`. O caso da string tem teste próprio abaixo.
    process.env.EXPO_PUBLIC_API_URL = undefined;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(() => bffUrl('/api/ai/body-scan')).toThrow(BffConfigError);
    expect(() => bffUrl('/api/ai/body-scan')).toThrow('EXPO_PUBLIC_API_URL');
  });

  it('trata string vazia como ausente', () => {
    process.env.EXPO_PUBLIC_API_URL = '   ';
    expect(() => bffUrl('/x')).toThrow(BffConfigError);
  });

  // Regressão do sintoma exato: um caminho que interpole a variável ausente
  // entrega a palavra "undefined" como se fosse host.
  it('trata a string literal "undefined" como ausente', () => {
    process.env.EXPO_PUBLIC_API_URL = 'undefined';
    expect(() => bffUrl('/api/ai/body-scan')).toThrow(BffConfigError);
  });
});

describe('lerRespostaBff', () => {
  it('devolve o JSON quando a resposta é da aplicação', async () => {
    const corpo = await lerRespostaBff<{ reply: string }>(
      resposta({ corpo: { reply: 'oi' } }) as unknown as Response,
      `${HOST}/api/x`
    );
    expect(corpo.reply).toBe('oi');
  });

  /**
   * O defeito de 2026-08-28, reproduzido: o `Deployment Protection` da Vercel
   * respondia 302 e o fetch seguia para uma tela de login que voltava 200 com
   * HTML. `response.ok` era verdadeiro, o código seguia, e a quebra acontecia
   * no `json()` — longe da causa e sem citar o host.
   */
  it('recusa HTML com 200 em vez de deixar quebrar no json()', async () => {
    const html = resposta({ contentType: 'text/html; charset=utf-8' });
    await expect(
      lerRespostaBff(html as unknown as Response, `${HOST}/api/ai/body-scan`)
    ).rejects.toBeInstanceOf(BffNotJsonError);
  });

  // 500 sem JSON e 200 com HTML sao causas diferentes. Tratar as duas como
  // "protecao de plataforma" manda conferir a Vercel quando o perimetro ja foi
  // atravessado — o erro que mente, exatamente o que este arquivo evita.
  it('nao culpa a plataforma quando o proprio BFF quebrou', async () => {
    const r = resposta({ status: 500, contentType: null });

    await expect(lerRespostaBff(r as unknown as Response, `${HOST}/x`)).rejects.toThrow(
      /exceção não tratada/
    );
  });

  it('culpa a plataforma quando a resposta chegou HTML com 200', async () => {
    const r = resposta({ status: 200, contentType: 'text/html' });

    await expect(lerRespostaBff(r as unknown as Response, `${HOST}/x`)).rejects.toThrow(
      /proteção de plataforma/
    );
  });

  it('nomeia o host tentado no erro — nenhuma das três causas deixava rastro', async () => {
    const html = resposta({ contentType: 'text/html' });
    await expect(
      lerRespostaBff(html as unknown as Response, `${HOST}/api/ai/body-scan`)
    ).rejects.toThrow('elevapro-preview.vercel.app');
  });

  it('trata resposta sem content-type como não-JSON', async () => {
    const sem = resposta({ contentType: null });
    await expect(lerRespostaBff(sem as unknown as Response, `${HOST}/x`)).rejects.toBeInstanceOf(
      BffNotJsonError
    );
  });

  // Numa API, 302 nunca é resposta legítima do produto — é a infraestrutura
  // interceptando.
  it('trata redirect como infraestrutura, não como resposta', async () => {
    const r = resposta({ status: 302, contentType: null });
    await expect(lerRespostaBff(r as unknown as Response, `${HOST}/x`)).rejects.toBeInstanceOf(
      BffUnreachableError
    );
  });

  // O tratamento fino por código de erro do `aiBodyScan` depende disto: o corpo
  // de um 503 precisa chegar parseado, ou `ai_unavailable` nunca é alcançado.
  it('parseia o corpo de um erro da aplicação, que é JSON', async () => {
    const r = resposta({ status: 503, corpo: { error: 'ai_unavailable' } });
    const corpo = await lerRespostaBff<{ error: string }>(r as unknown as Response, `${HOST}/x`);
    expect(corpo.error).toBe('ai_unavailable');
  });

  // A Vercel MUDOU a forma de recusar. O helper foi escrito contra
  // `302 -> vercel.com/sso-api`; hoje ela devolve 401 com
  // `application/json`, que passa pelas duas defesas anteriores: nao e
  // redirect e nao e HTML. Verificado ao vivo em 2026-08-29 contra o preview.
  it('reconhece o 401 em JSON da protecao da Vercel', async () => {
    const r = resposta({
      status: 401,
      corpo: {
        error: { code: '401', message: 'Protected deployment' },
        protection: { vercel_auth_enabled: true, password_enabled: false },
      },
    });

    await expect(lerRespostaBff(r as unknown as Response, `${HOST}/x`)).rejects.toBeInstanceOf(
      BffUnreachableError
    );
  });

  // Prova negativa: sem a distincao, o erro volta a ser o que era — um 401
  // que parece falha de login do aluno quando e a plataforma barrando.
  it('diz que a protecao da plataforma barrou, nao o login do aluno', async () => {
    const r = resposta({
      status: 401,
      corpo: {
        error: { code: '401', message: 'Protected deployment' },
        protection: { vercel_auth_enabled: true },
      },
    });

    await expect(lerRespostaBff(r as unknown as Response, `${HOST}/x`)).rejects.toThrow(
      /EXPO_PUBLIC_VERCEL_BYPASS não está definida|não foi aceito/
    );
  });

  // Um 401 nosso continua sendo nosso: `authorizeStudent` sem token responde
  // assim, e confundir os dois manda o usuario conferir a Vercel a toa.
  it('nao confunde o 401 da aplicacao com o da plataforma', async () => {
    const r = resposta({ status: 401, corpo: { error: 'Token ausente.' } });
    const corpo = await lerRespostaBff<{ error: string }>(r as unknown as Response, `${HOST}/x`);
    expect(corpo.error).toBe('Token ausente.');
  });
});

describe('postBff', () => {
  it('envia o token e devolve o corpo', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(resposta({ corpo: { reply: 'ok' } }));

    const corpo = await postBff<{ reply: string }>('/api/x', { a: 1 }, { token: 'jwt' });

    expect(corpo.reply).toBe('ok');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`${HOST}/api/x`);
    expect(init.headers.Authorization).toBe('Bearer jwt');
    // `manual` é o que impede o 302 de virar erro de parse três camadas abaixo.
    expect(init.redirect).toBe('manual');
  });

  it('lança com o código que a rota devolveu quando o status não é ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      resposta({ status: 503, corpo: { error: 'ai_unavailable' } })
    );

    await expect(postBff('/api/x', {})).rejects.toMatchObject({
      name: 'BffHttpError',
      code: 'ai_unavailable',
      status: 503,
    });
  });

  // O corpo da protecao da Vercel traz `error` como OBJETO `{code, message}`.
  // Interpolar objeto em string produz "[object Object]" na tela.
  it('extrai o codigo quando o erro do corpo e objeto, nao string', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      resposta({ status: 503, corpo: { error: { code: 'ai_unavailable', message: 'x' } } })
    );

    await expect(postBff('/api/x', {})).rejects.toMatchObject({ code: 'ai_unavailable' });
  });

  it('cai em http_<status> quando o erro não traz código', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(resposta({ status: 500, corpo: {} }));
    await expect(postBff('/api/x', {})).rejects.toMatchObject({ code: 'http_500' });
  });

  // Aparelho de verdade com a URL do emulador (10.0.2.2), cleartext HTTP
  // bloqueado em release, sem sinal: tudo chega aqui, e o host é o que
  // distingue os três.
  it('nomeia o host quando a rede falha', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    await expect(postBff('/api/x', {})).rejects.toBeInstanceOf(BffUnreachableError);
    await expect(postBff('/api/x', {})).rejects.toThrow('elevapro-preview.vercel.app');
  });

  it('não deixa erro de rede virar BffHttpError', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(postBff('/api/x', {})).rejects.not.toBeInstanceOf(BffHttpError);
  });
});

/**
 * O Protection Bypass da Vercel.
 *
 * O segredo existe para o app atravessar o PERÍMETRO — não para autorizar nada.
 * Quem protege o dado é `authorizeStudent`/`authorizeUser` no BFF. Ver o
 * cabeçalho de `VAR_BYPASS` em `client.ts` para por que ele é extraível do APK
 * e por que isso é aceito.
 */
describe('Protection Bypass da Vercel', () => {
  afterEach(() => {
    process.env.EXPO_PUBLIC_VERCEL_BYPASS = undefined;
    delete process.env.EXPO_PUBLIC_VERCEL_BYPASS;
  });

  it('manda o header quando o segredo está configurado', async () => {
    process.env.EXPO_PUBLIC_VERCEL_BYPASS = 'segredo-123';
    (global.fetch as jest.Mock).mockResolvedValueOnce(resposta({ corpo: { ok: 1 } }));

    await postBff('/api/x', {}, { token: 'jwt' });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['x-vercel-protection-bypass']).toBe('segredo-123');
  });

  // Produção não é protegida: mandar o header lá seria vazar o segredo para um
  // destino que não pediu nada.
  it('não manda o header quando não há segredo', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(resposta({ corpo: { ok: 1 } }));

    await postBff('/api/x', {}, { token: 'jwt' });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect('x-vercel-protection-bypass' in init.headers).toBe(false);
  });

  /**
   * Segredo em texto claro sobre HTTP é segredo entregue a quem estiver no
   * caminho. `EXPO_PUBLIC_API_URL` aceita `http://10.0.2.2:3000` no
   * desenvolvimento local — onde, aliás, não existe proteção para contornar.
   */
  it('nunca manda o segredo por HTTP', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
    process.env.EXPO_PUBLIC_VERCEL_BYPASS = 'segredo-123';
    (global.fetch as jest.Mock).mockResolvedValueOnce(resposta({ corpo: { ok: 1 } }));

    await postBff('/api/x', {}, { token: 'jwt' });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    if ('x-vercel-protection-bypass' in init.headers) {
      throw new Error(
        'SEGREDO EM TEXTO CLARO: o bypass foi enviado por HTTP. ' +
          'Qualquer intermediário no caminho passa a poder atravessar o Deployment Protection.'
      );
    }
  });

  // As três causas produziam a mesma tela muda. Um 302 com segredo e um 302 sem
  // segredo são problemas diferentes e exigem ações diferentes.
  it('diz que o segredo não foi aceito quando havia segredo', async () => {
    process.env.EXPO_PUBLIC_VERCEL_BYPASS = 'segredo-errado';
    (global.fetch as jest.Mock).mockResolvedValueOnce(resposta({ status: 302, contentType: null }));

    await expect(postBff('/api/x', {})).rejects.toThrow(/foi enviado e não foi aceito/);
  });

  it('diz que a variável falta quando não havia segredo', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(resposta({ status: 302, contentType: null }));

    await expect(postBff('/api/x', {})).rejects.toThrow(
      /EXPO_PUBLIC_VERCEL_BYPASS não está definida/
    );
  });
});

describe('getBff', () => {
  // O portão de elegibilidade é uma pergunta, não uma submissão — e precisa das
  // mesmas três defesas do POST. Um GET escrito com o `fetch` global voltaria a
  // seguir redirect e a receber a tela de login da plataforma como 200 com
  // HTML, que é o defeito que este arquivo inteiro existe para fechar.
  it('pergunta com GET, sem corpo, e mantém as defesas', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      resposta({ corpo: { podeEscanear: true, fonte: 'assessment' } })
    );

    const corpo = await getBff<{ podeEscanear: boolean }>('/api/ai/x/eligibility', {
      token: 'jwt',
    });

    expect(corpo.podeEscanear).toBe(true);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`${HOST}/api/ai/x/eligibility`);
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer jwt');
  });

  it('recusa quem responde HTML no lugar de JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      resposta({ status: 200, contentType: 'text/html' })
    );

    await expect(getBff('/api/ai/x/eligibility', { token: 'jwt' })).rejects.toBeInstanceOf(
      BffNotJsonError
    );
  });
});
