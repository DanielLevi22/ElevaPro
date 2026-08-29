/**
 * As variáveis que só o servidor lê, e a guarda que impede o silêncio.
 *
 * ── O defeito que este arquivo existe para fechar ────────────────────────────
 *
 * Em 2026-08-29 a IA do preview estava fora do ar e ninguém sabia. A
 * `ANTHROPIC_API_KEY` não existia no runtime, e o sintoma que chegava ao aluno
 * era `500` com página HTML — porque o SDK da Anthropic **não valida a chave na
 * construção**, só no request. O erro nascia dentro de `validateHeaders`, três
 * camadas abaixo da causa, sem nomear a variável.
 *
 * O `supabase-admin.ts` tinha o mesmo buraco em outra forma: avisava com
 * `console.warn`, que ninguém lê em produção, e só quando a chave estava
 * **vazia** — chave errada passava direto.
 *
 * ── Por que aqui e não em cada rota ──────────────────────────────────────────
 *
 * A checagem em cada rota é a cópia que produz o ponto cego uniforme: alguém
 * esquece uma, e é justamente a que quebra. Aqui a lista é única e o CI a
 * exercita.
 *
 * ── Duas audiências, e só uma delas é a rede ─────────────────────────────────
 *
 * Nome de variável, topologia e instrução de painel servem a quem CONSERTA, e
 * têm um único destino legítimo: o log. Por isso nada disso mora em
 * `Error.message` — esse é o campo que uma página de erro do Next renderiza
 * sozinha, e bastaria uma rota nova esquecer o invólucro para ele virar
 * resposta HTTP.
 *
 * ── O que esta guarda NÃO faz ────────────────────────────────────────────────
 *
 * Não confere se o valor é **válido** — chave revogada continua passando, e só
 * o provedor sabe recusá-la. Ela fecha a classe de defeito que custou dias:
 * variável na loja errada, ausente no ambiente que importa. Validade é papel do
 * smoke test pós-deploy, que faz uma chamada de verdade.
 */

/**
 * Segredos que a aplicação lê em execução, com o que se perde sem cada um.
 *
 * Nomear a consequência, e não só a variável, é o que transforma a falha em
 * instrução: quem lê o log sabe o que consertar sem abrir o código.
 */
const SEGREDOS_DE_SERVIDOR = {
  ANTHROPIC_API_KEY:
    "toda rota /api/ai/* responde erro — e como o mobile consome IA via BFF, as features de IA do app param junto",
  SUPABASE_SERVICE_ROLE_KEY:
    "`supabaseAdmin` cai num cliente placeholder e toda consulta administrativa falha em silêncio",
  NEXT_PUBLIC_SUPABASE_URL: "nenhum cliente Supabase sabe para onde apontar",
} as const;

/** Marcadores de arquivo de exemplo que passariam pela checagem de vazio. */
const PLACEHOLDERS = ["PREENCHER", "changeme", "your-key-here", "placeholder"];

/**
 * Ambiente incompleto.
 *
 * A `message` é curta de propósito e não nomeia variável, host nem plataforma:
 * ela é o único campo que uma página de erro renderiza por conta própria. O que
 * interessa a quem conserta vive em `faltando` e em `instrucaoDeAmbiente()`,
 * alcançáveis só por quem escreve no log.
 */
export class ServerEnvError extends Error {
  readonly faltando: string[];

  constructor(faltando: string[]) {
    super("Configuração de servidor incompleta.");
    this.name = "ServerEnvError";
    this.faltando = faltando;
  }
}

/**
 * A instrução de correção — para o log, nunca para a resposta.
 *
 * Função separada, e não um campo do erro, porque campo viaja junto: qualquer
 * caminho que serialize o erro levaria a topologia junto. Aqui o detalhe só
 * existe para quem o pede.
 *
 * @example
 * console.error("[ia] ambiente incompleto", instrucaoDeAmbiente(erro.faltando));
 */
export function instrucaoDeAmbiente(faltando: string[]): string {
  const detalhe = faltando
    .map(
      (nome) => `  - ${nome}: ${SEGREDOS_DE_SERVIDOR[nome as keyof typeof SEGREDOS_DE_SERVIDOR]}`,
    )
    .join("\n");

  return [
    `Variáveis de servidor ausentes no runtime:\n${detalhe}`,
    "Elas NÃO vêm do passo de build. O `vercel deploy --prebuilt` sobe o output já compilado, " +
      "e a função lê `process.env` das Environment Variables do projeto na Vercel, escopadas " +
      "por ambiente. Passá-las como env do `vercel build` é no-op para o runtime.",
    "Confira com `vercel env ls` e adicione ao ambiente certo:\n  vercel env add <NOME> preview\n" +
      "Depois redeploy — deployment publicado não recebe variável nova.",
  ].join("\n\n");
}

/**
 * Lança quando algum segredo de servidor está ausente ou é placeholder.
 *
 * @example
 * assertServerEnv(); // na entrada da rota, antes de qualquer chamada externa
 */
export function assertServerEnv(env: Record<string, string | undefined> = process.env): void {
  const faltando = Object.keys(SEGREDOS_DE_SERVIDOR).filter((nome) => {
    const valor = env[nome]?.trim();
    if (!valor) return true;
    // A string literal "undefined" chega aqui quando alguém interpolou uma
    // ausência em vez de checá-la — o mesmo sintoma que o BFF do mobile teve.
    if (valor === "undefined" || valor === "null") return true;
    return PLACEHOLDERS.some((p) => valor.includes(p));
  });

  if (faltando.length > 0) throw new ServerEnvError(faltando);
}
