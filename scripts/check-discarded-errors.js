#!/usr/bin/env node
/**
 * check-discarded-errors.js
 *
 * Falha quando uma consulta ao Supabase desestrutura só `data` e joga o `error`
 * fora — `const { data } = await supabase...`.
 *
 * O PostgREST não lança: ele devolve `{ data: null, error }`. Quem descarta o
 * `error` recebe `null` e o interpreta como "não tem nada", que é exatamente o
 * que uma consulta bem-sucedida e vazia devolve. Os dois casos ficam
 * indistinguíveis, e o modo de falha padrão do sistema vira o silêncio.
 *
 * Não é hipótese. Foi assim que:
 *   - o painel `/admin` ficou inacessível pedindo quatro colunas inexistentes
 *     de `profiles` — 42703 descartado, tela vazia (dívida #10);
 *   - o coach de IA passou a prescrever sem anamnese e sem avaliação — três
 *     42703 no mesmo arquivo, todos engolidos (dívida #36);
 *   - nenhum caminho gravava `physical_assessments` e a leitura respondia
 *     "sem avaliação" em vez de erro (dívida #44).
 *
 * A checagem é textual e assumidamente conservadora: procura a desestruturação
 * sem `error` na mesma expressão. Chamada que trata o erro de outro jeito
 * (`.then`, wrapper próprio) passa — a guarda cobre o padrão que causou os três
 * defeitos acima, não toda forma possível de ignorar um erro.
 *
 * ## Por que catraca em vez de zero
 *
 * A varredura encontrou 64 ocorrências, e **nem toda é defeito**: em
 * `api-auth.ts`, por exemplo, `data` nulo e erro de consulta levam à mesma
 * resposta (negar), e ali o descarte é deliberado. Transformar as 64 em `throw`
 * de uma vez trocaria falha silenciosa por falha barulhenta em caminhos sem
 * teste — dívida conhecida por regressão desconhecida.
 *
 * Então a guarda fixa o teto por arquivo em `discarded-errors-baseline.txt` e
 * falha quando **cresce**. Ocorrência nova é barrada hoje; as existentes são
 * revisadas uma a uma, e o baseline desce junto. É a mesma lógica dos degraus
 * de cobertura: o número que entra é o que já se sustenta.
 *
 * Uso: npm run db:check-errors
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["app/src", "web/src", "shared/src"];
const BASELINE = path.join(__dirname, "discarded-errors-baseline.txt");

/**
 * `const { data } = await supabase...` e variações com renome (`data: perfil`),
 * incluindo `supabaseAdmin` e o `client` do GoTrue. Exige que não haja `error`
 * dentro das chaves.
 */
const PADRAO =
  /const\s*\{\s*data(?:\s*:\s*[A-Za-z0-9_]+)?\s*(?::\s*\{[^}]*\})?\s*\}\s*=\s*await\s+([A-Za-z0-9_]*\.?(?:supabase|supabaseAdmin|client)[A-Za-z0-9_]*)\b/g;

/** Testes montam respostas de mentira e não falam com o PostgREST. */
function ehTeste(arquivo) {
  return /__tests__|\.test\.|\.spec\./.test(arquivo);
}

function arquivosDe(dir) {
  const encontrados = [];
  const raiz = path.join(ROOT, dir);
  if (!fs.existsSync(raiz)) return encontrados;

  const pilha = [raiz];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name !== "node_modules") pilha.push(completo);
      } else if (/\.tsx?$/.test(entrada.name) && !ehTeste(completo)) {
        encontrados.push(completo);
      }
    }
  }
  return encontrados;
}

/** `caminho contagem` por linha; ausente = teto zero. */
function lerBaseline() {
  const teto = new Map();
  if (!fs.existsSync(BASELINE)) return teto;

  for (const linha of fs.readFileSync(BASELINE, "utf8").split("\n")) {
    const limpa = linha.trim();
    if (limpa === "" || limpa.startsWith("#")) continue;
    const corte = limpa.lastIndexOf(" ");
    teto.set(limpa.slice(0, corte), Number(limpa.slice(corte + 1)));
  }
  return teto;
}

function main() {
  const achados = [];

  for (const dir of DIRS) {
    for (const arquivo of arquivosDe(dir)) {
      const fonte = fs.readFileSync(arquivo, "utf8");
      const linhas = fonte.split("\n");

      for (const [indice, linha] of linhas.entries()) {
        // Comentário citando o padrão não é o padrão.
        if (/^\s*(\/\/|\*|\/\*)/.test(linha)) continue;

        PADRAO.lastIndex = 0;
        if (PADRAO.test(linha)) {
          achados.push(`${path.relative(ROOT, arquivo).split(path.sep).join("/")}:${indice + 1}`);
        }
      }
    }
  }

  const teto = lerBaseline();

  const porArquivo = new Map();
  for (const achado of achados) {
    const arquivo = achado.slice(0, achado.lastIndexOf(":"));
    porArquivo.set(arquivo, (porArquivo.get(arquivo) ?? 0) + 1);
  }

  const cresceram = [];
  for (const [arquivo, quantidade] of porArquivo) {
    const permitido = teto.get(arquivo) ?? 0;
    if (quantidade > permitido) cresceram.push({ arquivo, quantidade, permitido });
  }

  if (cresceram.length > 0) {
    console.error("\n✗ Consulta nova descartando o error:\n");
    for (const c of cresceram) {
      console.error(`   ${c.arquivo} — ${c.quantidade} (teto: ${c.permitido})`);
    }
    console.error(
      "\n   O PostgREST devolve { data: null, error } em vez de lançar. Sem ler o\n" +
        "   `error`, coluna inexistente e RLS negando viram 'sem dados' — o mesmo\n" +
        "   que uma consulta vazia e bem-sucedida.\n\n" +
        "   Troque por:\n" +
        "     const { data, error } = await supabase...\n" +
        "     if (error) throw error;\n",
    );
    process.exit(1);
  }

  // Dívida paga sem baixar o teto deixa espaço para ela voltar em silêncio.
  const diminuiram = [];
  for (const [arquivo, permitido] of teto) {
    const quantidade = porArquivo.get(arquivo) ?? 0;
    if (quantidade < permitido) diminuiram.push({ arquivo, quantidade, permitido });
  }

  if (diminuiram.length > 0) {
    console.error("\n✗ Baseline desatualizado — a dívida caiu e o teto não:\n");
    for (const d of diminuiram) {
      console.error(`   ${d.arquivo} — ${d.quantidade} (teto: ${d.permitido})`);
    }
    console.error("\n   Atualize scripts/discarded-errors-baseline.txt com os números novos.\n");
    process.exit(1);
  }

  console.log(
    achados.length === 0
      ? "✓ Nenhuma consulta descartando o error."
      : `✓ Nenhuma consulta nova descartando o error (${achados.length} no baseline, a revisar).`,
  );
}

main();
