/**
 * A camada que afirma "isto é resposta da nossa aplicação" antes de qualquer
 * parse.
 *
 * ── O defeito que este arquivo existe para fechar ────────────────────────────
 *
 * Em 2026-08-28 a IA do mobile não funcionava em canto nenhum. A causa era uma
 * só — o `Deployment Protection` da Vercel protegendo o deployment inteiro,
 * páginas e rotas de API — e o sintoma era mudo nos cinco serviços:
 *
 *     302 → (fetch segue o redirect) → 200 com o HTML do login da Vercel
 *
 *     if (!response.ok) { ... }              // 200 → passa direto
 *     return response.json() as Promise<T>;  // HTML → SyntaxError
 *
 * `response.ok` é verdadeiro para uma tela de login. O tratamento fino de erro
 * do `aiBodyScan` — `response_truncated`, `ai_unavailable`, … — nunca era
 * alcançado: o desvio acontecia antes, e o aluno via "não consegui completar".
 *
 * Por isso um helper e não um `try/catch` melhor em cada serviço: o defeito não
 * é o tratamento do erro, é que NÃO HOUVE ERRO. Cinco cópias do mesmo
 * tratamento é como o ponto cego ficou uniforme.
 *
 * ── As três defesas, em ordem de confiabilidade ──────────────────────────────
 *
 * 1. `content-type`. Funciona em qualquer runtime e pega o caso acima mesmo se
 *    o redirect for seguido. É a defesa primária.
 * 2. `redirect: 'manual'`. Numa API, `302` nunca é resposta legítima do
 *    produto — é a infraestrutura interceptando. Seguir o redirect transforma
 *    um problema de configuração num erro de parse três camadas abaixo, longe
 *    da causa. Exige `expo/fetch`: o `fetch` global do React Native é XHR por
 *    baixo e IGNORA esta opção nas duas plataformas.
 * 3. O host na mensagem. Nenhuma das três causas possíveis (SSO da Vercel,
 *    variável ausente, URL de emulador em aparelho) deixava rastro — e as três
 *    produziam a mesma tela.
 */

import { fetch as expoFetch } from 'expo/fetch';

/** Nome da variável em um lugar só: ela aparece em três mensagens diferentes. */
const VAR_URL = 'EXPO_PUBLIC_API_URL';

/**
 * Segredo do Protection Bypass for Automation da Vercel. Opcional.
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 *
 * O `Deployment Protection` da Vercel fica na frente do deployment inteiro —
 * páginas e rotas de API. Ele é PERÍMETRO, não autorização: só pergunta "você é
 * da equipe Vercel?", e não sabe o que é aluno, especialista ou vínculo. O app
 * não tem sessão da Vercel e nunca vai ter, então sem bypass nenhuma chamada de
 * IA alcança o BFF — foi o que deixou as cinco features de IA fora do ar.
 *
 * ── Por que bypass em vez de desligar a proteção ─────────────────────────────
 *
 * `Deployment Protection` é configuração de PROJETO. Desligar não abriria só o
 * alias de preview: abriria todo preview daquele projeto, para sempre, incluindo
 * o de cada PR futuro. Com o bypass, o perímetro continua de pé e passa só quem
 * tem o segredo.
 *
 * ── O que este segredo NÃO é ─────────────────────────────────────────────────
 *
 * `EXPO_PUBLIC_*` é inlinada no bundle em tempo de build. Este valor SAI do APK
 * com um unzip, e isso é teto de app cliente, não descuido: no Expo só variável
 * com esse prefixo chega ao runtime. É a mesma razão pela qual a
 * `ANTHROPIC_API_KEY` nunca vai para o mobile e toda IA passa pelo BFF
 * (`ADR-0004`).
 *
 * Então o modelo de ameaça que ele cobre é "quem digitou a URL", não "quem tem
 * o APK" — e o APK é `distribution: internal`. Quem protege o DADO é
 * `authorizeStudent`/`authorizeUser` em `web/src/lib/api-auth.ts`, com a guarda
 * `check-api-auth.js` falhando o CI se alguma rota sob `/api/` escapar. A
 * Vercel é a tranca do prédio; o `api-auth` é a fechadura do apartamento.
 *
 * Ausente em produção de propósito: lá o domínio não é protegido.
 */
const VAR_BYPASS = 'EXPO_PUBLIC_VERCEL_BYPASS';

/** Header que a Vercel lê para liberar um deployment protegido. */
const HEADER_BYPASS = 'x-vercel-protection-bypass';

/**
 * Onde o BFF está, sem barra no fim.
 *
 * Lido a cada chamada, e não uma vez no import, porque `EXPO_PUBLIC_*` é
 * inlinado no bundle em tempo de build: ler cedo não deixa o valor mais certo,
 * só torna o módulo impossível de testar. Quem garante que ele existe é
 * `assertBffConfigured`, chamado no boot.
 */
function bffOrigin(): string {
  const bruto = process.env[VAR_URL]?.trim();
  // A string literal "undefined" conta como ausente. Não é defensividade
  // gratuita: é exatamente o sintoma que este arquivo existe para matar — o
  // `${process.env.EXPO_PUBLIC_API_URL}` dos serviços antigos interpolava a
  // ausência e produzia a URL `"undefined/api/ai/body-scan"`. Qualquer caminho
  // que ainda faça isso chega aqui com a palavra, não com o vazio.
  if (!bruto || bruto === 'undefined' || bruto === 'null') throw new BffConfigError();
  return bruto.replace(/\/+$/, '');
}

/** URL absoluta de uma rota do BFF. `path` começa com barra. */
export function bffUrl(path: string): string {
  return `${bffOrigin()}${path}`;
}

/**
 * O header de bypass, quando há segredo configurado e o destino é HTTPS.
 *
 * A checagem de esquema não é zelo decorativo: mandar segredo por HTTP em texto
 * claro entrega o bypass a quem estiver no caminho, e `EXPO_PUBLIC_API_URL`
 * aceita `http://10.0.2.2:3000` no desenvolvimento local — onde, aliás, não há
 * proteção nenhuma para contornar. Objeto vazio quando não se aplica: o header
 * some do request em vez de ir vazio, que a Vercel trataria como tentativa
 * inválida.
 */
function headerDeBypass(url: string): Record<string, string> {
  const segredo = process.env[VAR_BYPASS]?.trim();
  if (!segredo || segredo === 'undefined') return {};
  if (!url.startsWith('https://')) return {};
  return { [HEADER_BYPASS]: segredo };
}

/**
 * Falta a variável que diz onde o BFF está.
 *
 * Antes deste erro, a ausência montava a string `"undefined/api/ai/body-scan"`
 * — ou, nos serviços que usavam `?? ''`, um caminho relativo sem host, que em
 * React Native não tem origem para completar. Os dois falhavam como "erro de
 * rede", indistinguíveis de estar sem sinal.
 */
export class BffConfigError extends Error {
  readonly code = 'bff_not_configured';

  constructor() {
    super(
      `${VAR_URL} não está definida. Build de desenvolvimento lê app/.env.development; ` +
        `build de release lê app/.env.production; build no EAS lê as variáveis do ` +
        `environment do perfil (eas.json) — confira com ` +
        `\`eas env:list --environment preview\`. Esperado: https://host, sem barra no fim.`
    );
    this.name = 'BffConfigError';
  }
}

/**
 * O BFF não respondeu, ou quem respondeu não foi ele.
 *
 * Guarda o host junto porque é a informação que decide entre as três causas —
 * e era exatamente a que faltava na tela.
 */
export class BffUnreachableError extends Error {
  readonly code = 'bff_unreachable';
  readonly host: string;

  constructor(host: string, motivo: string) {
    super(`Não consegui falar com ${host}: ${motivo}`);
    this.name = 'BffUnreachableError';
    this.host = host;
  }
}

/**
 * Respondeu, com algo que não é JSON da aplicação.
 *
 * Quase sempre a tela de login de uma proteção de plataforma. Separado de
 * `BffUnreachableError` porque a ação é outra: aqui o endereço está certo e o
 * que está errado é o acesso.
 */
export class BffNotJsonError extends Error {
  readonly code = 'bff_not_json';
  readonly host: string;

  constructor(host: string, contentType: string | null, status: number) {
    super(
      `${host} respondeu ${status} com ${contentType ?? 'tipo desconhecido'} em vez de JSON. ` +
        `Quase sempre é proteção de plataforma interceptando a rota — o deployment ` +
        `inteiro fica atrás de login, rotas de API incluídas.`
    );
    this.name = 'BffNotJsonError';
    this.host = host;
  }
}

/**
 * O BFF respondeu JSON e recusou.
 *
 * Distinto dos dois acima: aqui a aplicação foi alcançada e falou. Guarda o
 * `code` que a rota devolveu — é o que `aiBodyScan` traduz em mensagem.
 */
export class BffHttpError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(path: string, status: number, code?: string) {
    super(`BFF respondeu ${status} em ${path}${code ? ` (${code})` : ''}`);
    this.name = 'BffHttpError';
    this.status = status;
    this.code = code ?? `http_${status}`;
  }
}

/** Só o host, para a mensagem. URL quebrada não pode derrubar o relato do erro. */
function hostDe(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Confere que a resposta é da nossa aplicação e devolve o JSON.
 *
 * Exportada porque o `aiBodyScan` precisa do corpo para o tratamento por código
 * de erro dele, que roda DEPOIS desta verificação — e é justamente o que nunca
 * era alcançado.
 *
 * @example
 * const dados = await lerRespostaBff<{ text: string }>(resposta, url);
 */
/**
 * O que fazer, quando a plataforma barra.
 *
 * Segredo enviado e recusado é um problema; segredo ausente é outro, e a ação é
 * diferente em cada caso. Sem esta distinção o erro volta a ser o que era:
 * verdadeiro, inútil, e igual para causas que não se parecem.
 */
function pistaDeBypass(url: string): string {
  const tinhaBypass = HEADER_BYPASS in headerDeBypass(url);
  return tinhaBypass
    ? `o segredo de ${VAR_BYPASS} foi enviado e não foi aceito — confira se ele bate com o Protection Bypass for Automation do projeto na Vercel (o valor é inlinado no build: mudar o segredo exige build novo)`
    : `${VAR_BYPASS} não está definida, e este deployment está atrás do Deployment Protection da Vercel`;
}

/**
 * A resposta é a recusa da proteção da Vercel, e não da nossa aplicação?
 *
 * A Vercel mudou a forma de recusar. Este arquivo nasceu contra
 * `302 → vercel.com/sso-api`; em 2026-08-29, verificado ao vivo contra o
 * preview, ela passou a devolver **401 com `application/json`** — que atravessa
 * as duas defesas anteriores, porque não é redirect e não é HTML.
 *
 * A assinatura é a chave `protection`: nenhuma rota nossa devolve isso, e ela
 * vem justamente com `vercel_auth_enabled`. Distinguir importa porque o 401 da
 * nossa aplicação (`authorizeStudent` sem token) é um problema do usuário, e o
 * 401 da plataforma é de configuração — mandar conferir a Vercel por um login
 * expirado é o erro que mente.
 */
function ehRecusaDaPlataforma(corpo: unknown): boolean {
  if (typeof corpo !== 'object' || corpo === null) return false;
  const protecao = (corpo as { protection?: unknown }).protection;
  return typeof protecao === 'object' && protecao !== null;
}

export async function lerRespostaBff<T>(response: Response, url: string): Promise<T> {
  const host = hostDe(url);

  // Antes do `ok`: com `redirect: 'manual'` o 302 chega aqui como resposta, e
  // é o sintoma mais direto de proteção de plataforma na frente da API.
  if (response.status >= 300 && response.status < 400) {
    throw new BffUnreachableError(
      host,
      `respondeu ${response.status} (redirect) — numa API isso é sempre infraestrutura, nunca resposta do produto. ${pistaDeBypass(url)}`
    );
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new BffNotJsonError(host, contentType, response.status);
  }

  const corpo = (await response.json()) as T;

  // Depois do parse porque a assinatura está no corpo — e o corpo é JSON
  // legítimo, então nenhuma das defesas anteriores o alcança.
  if (ehRecusaDaPlataforma(corpo)) {
    throw new BffUnreachableError(
      host,
      `respondeu ${response.status} com a recusa do Deployment Protection da Vercel, não da aplicação. ${pistaDeBypass(url)}`
    );
  }

  // Só agora o status importa: o corpo é JSON e o serviço consegue ler o código
  // de erro que a rota devolveu.
  return corpo;
}

interface PostBffOptions {
  /** JWT do aluno. As rotas do BFF exigem — `authorizeStudent` depende dele. */
  token?: string;
  /** Análise de imagem passa de 30s com folga. */
  timeoutMs?: number;
}

const TIMEOUT_PADRAO_MS = 60_000;

/**
 * POST numa rota do BFF, devolvendo a resposta crua.
 *
 * Aplica as defesas de REDE (host montado, redirect manual, timeout) e para
 * aí. Existe separada de `postBff` para o `aiBodyScan`, que precisa olhar o
 * status antes do corpo: 403 ali é sempre falta de consentimento e 422 é falta
 * de altura, e as duas são situações do produto, não erros de transporte.
 *
 * Quem chama é responsável por passar a resposta por `lerRespostaBff` antes de
 * parsear — é o passo que a `postBff` faz sozinha.
 */
export async function fetchBff(
  path: string,
  body: unknown,
  { token, timeoutMs = TIMEOUT_PADRAO_MS }: PostBffOptions = {}
): Promise<{ response: Response; url: string }> {
  const url = bffUrl(path);
  const host = hostDe(url);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);

  let response: Response;
  try {
    response = (await expoFetch(url, {
      method: 'POST',
      // `manual` só é honrado pelo fetch do `expo/fetch`. Ver o cabeçalho.
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headerDeBypass(url),
      },
      body: JSON.stringify(body),
      signal: abort.signal,
    })) as unknown as Response;
  } catch (erro) {
    // Rede, DNS, cleartext HTTP bloqueado em release, timeout. O host na
    // mensagem é o que distingue "sem sinal" de "apontando para 10.0.2.2 num
    // aparelho de verdade".
    const motivo = abort.signal.aborted
      ? `não respondeu em ${Math.round(timeoutMs / 1000)}s`
      : ((erro as Error)?.message ?? 'falha de rede');
    throw new BffUnreachableError(host, motivo);
  } finally {
    clearTimeout(timer);
  }

  return { response, url };
}

/**
 * POST numa rota do BFF, com as três defesas aplicadas e o JSON já parseado.
 *
 * É o caminho de quatro dos cinco serviços de IA. O quinto (`aiBodyScan`) usa
 * `fetchBff` porque lê o status antes do corpo.
 *
 * @example
 * const r = await postBff<{ text: string }>('/api/ai/student/nutribot', { message }, { token });
 */
/**
 * O código de erro que a rota devolveu, venha ele como string ou como objeto.
 *
 * `{ error: 'ai_unavailable' }` é a forma das nossas rotas. Mas há corpo de erro
 * com `error` OBJETO — `{ code, message }` —, e interpolar objeto em string
 * produz `"[object Object]"` na tela do usuário.
 */
function codigoDoErro(corpo: { error?: unknown } | null): string | undefined {
  const erro = corpo?.error;
  if (typeof erro === 'string') return erro;
  if (typeof erro === 'object' && erro !== null) {
    const code = (erro as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

export async function postBff<T>(
  path: string,
  body: unknown,
  options: PostBffOptions = {}
): Promise<T> {
  const { response, url } = await fetchBff(path, body, options);
  const corpo = await lerRespostaBff<T & { error?: unknown }>(response, url);

  // Depois do parse, e não antes: o código de erro que a rota devolveu está no
  // corpo, e é ele que vira mensagem para o aluno. Checar `ok` primeiro jogaria
  // essa informação fora.
  if (!response.ok) throw new BffHttpError(path, response.status, codigoDoErro(corpo));

  return corpo;
}

/**
 * Falha no boot, com o nome da variável, em vez de montar URL inválida.
 *
 * Chamada do layout raiz. O `packages/supabase/client.ts` faz o mesmo com as
 * variáveis do Supabase desde que um APK de release morreu depois da splash sem
 * log nenhum — a diferença é que lá o throw é no import, e aqui não pode ser:
 * `EXPO_PUBLIC_API_URL` só é lida quando alguém chama o BFF, e um throw no
 * import derrubaria o app inteiro por uma feature que ele talvez nem use.
 */
export function assertBffConfigured(): void {
  bffOrigin();
}
