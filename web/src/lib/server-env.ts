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
 * instrução: quem lê a mensagem no CI sabe o que consertar sem abrir o código.
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

export class ServerEnvError extends Error {
  readonly faltando: string[];

  constructor(faltando: string[]) {
    const detalhe = faltando
      .map(
        (nome) => `  - ${nome}: ${SEGREDOS_DE_SERVIDOR[nome as keyof typeof SEGREDOS_DE_SERVIDOR]}`,
      )
      .join("\n");

    super(
      `Variáveis de servidor ausentes no runtime:\n${detalhe}\n\n` +
        `Elas NÃO vêm do passo de build. O \`vercel deploy --prebuilt\` sobe o output já ` +
        `compilado, e a função lê \`process.env\` das Environment Variables do projeto na ` +
        `Vercel, escopadas por ambiente. Passá-las como env do \`vercel build\` é no-op ` +
        `para o runtime.\n\n` +
        `Confira com \`vercel env ls\` e adicione ao ambiente certo:\n` +
        `  vercel env add <NOME> preview\n` +
        `Depois redeploy — deployment publicado não recebe variável nova.`,
    );
    this.name = "ServerEnvError";
    this.faltando = faltando;
  }
}

/**
 * Lança quando algum segredo de servidor está ausente ou é placeholder.
 *
 * @example
 * assertServerEnv(); // no boot, ou no CI depois do deploy
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
