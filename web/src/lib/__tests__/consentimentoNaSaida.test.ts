import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Consentimento no ponto em que o dado sai, não na tela.
 *
 * Cinco rotas mandavam anamnese, peso e percentual de gordura para a Anthropic
 * checando só autenticação. O `HealthDataConsentGate` do app não fechava isso:
 * ele é portão de cliente, e estas rotas usam `service_role`, então a RLS não
 * participa (`ADR-0015`). Um token de aluno válido alcançava a rota direto,
 * sem passar pela tela.
 *
 * O Art. 11, I exige consentimento onde o dado **sai do banco**.
 */

let consentiu: boolean;
let explodir: boolean;
let idConsultado: string | null;

vi.mock("@elevapro/shared", () => ({
  createHealthService: () => ({
    hasCollectionConsent: async (studentId: string) => {
      idConsultado = studentId;
      if (explodir) throw new Error("student_consents fora do ar");
      return consentiu;
    },
  }),
}));

vi.mock("../supabase-titular", () => ({ clienteDoTitular: () => ({}) }));
// O `authorizeUser` confere o `account_type` em `profiles` — com
// `service_role`, porque a pergunta é sobre quem está pedindo.
vi.mock("../supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "aluno-1", account_type: "student", status: "active" },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "aluno-1" } }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "aluno-1", account_type: "student" },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

const { authorizeStudentWithHealthConsent } = await import("../api-auth");

const pedido = () =>
  ({ headers: { get: () => "Bearer t" } }) as unknown as Parameters<
    typeof authorizeStudentWithHealthConsent
  >[0];

beforeEach(() => {
  consentiu = true;
  explodir = false;
  idConsultado = null;
});

describe("consentimento antes de o dado sair", () => {
  it("com consentimento vigente, deixa passar", async () => {
    const auth = await authorizeStudentWithHealthConsent(pedido());

    expect(auth.ok).toBe(true);
  });

  // A proibição: sem consentimento, dado de saúde não atravessa a fronteira.
  it("sem consentimento, o dado não sai — Art. 11, I", async () => {
    consentiu = false;

    const auth = await authorizeStudentWithHealthConsent(pedido());

    expect(auth.ok, "DADO DE SAÚDE LIBERADO: rota passou sem consentimento vigente").toBe(false);
    if (auth.ok) return;
    expect(auth.response.status).toBe(403);
    expect(await auth.response.json()).toEqual({ error: "consent_required" });
  });

  // "Não consegui perguntar" não é "pode".
  it("falha ao consultar o consentimento recusa, não libera", async () => {
    explodir = true;

    const auth = await authorizeStudentWithHealthConsent(pedido());

    expect(auth.ok, "DADO DE SAÚDE LIBERADO: falha na consulta virou permissão").toBe(false);
    if (auth.ok) return;
    // 503 e não 403: quem lê precisa distinguir "falta consentir" de "o
    // sistema não sabe", que pedem ações diferentes.
    expect(auth.response.status).toBe(503);
  });

  // O id sai do token. Um id vindo do cliente seria superfície para perguntar
  // pelo consentimento de outra pessoa.
  it("pergunta pelo titular do token, não por um id do cliente", async () => {
    await authorizeStudentWithHealthConsent(pedido());

    expect(idConsultado).toBe("aluno-1");
  });
});

/**
 * A trava contra a regressão silenciosa.
 *
 * Uma rota nova que trate dado de saúde e use só `authorizeStudent` reabre o
 * buraco sem mudar nada visível — foi assim que as cinco ficaram abertas. Aqui
 * a lista é explícita: entrar nela é decisão, não esquecimento.
 */
describe("as rotas que tratam dado de saúde", () => {
  const API = join(process.cwd(), "src/app/api/ai");

  /** As que só autenticam de propósito: não leem nem enviam dado de saúde. */
  const SEM_DADO_DE_SAUDE = new Set([
    // Informa se dá para escanear, e "falta consentir" é resposta com 200 —
    // não erro. Ela faz a própria checagem para poder responder isso.
    "body-scan/eligibility/route.ts",
  ]);

  const rotasDoAluno = (dir: string, prefixo = ""): string[] =>
    readdirSync(dir).flatMap((entrada) => {
      const cheio = join(dir, entrada);
      const rel = prefixo ? `${prefixo}/${entrada}` : entrada;
      if (statSync(cheio).isDirectory()) return rotasDoAluno(cheio, rel);
      return entrada === "route.ts" ? [rel] : [];
    });

  it("nenhuma rota do aluno autentica sem checar consentimento", () => {
    const abertas = rotasDoAluno(API)
      .filter((rel) => !SEM_DADO_DE_SAUDE.has(rel))
      .filter((rel) => {
        const fonte = readFileSync(join(API, rel), "utf8");
        return /authorizeStudent\(/.test(fonte) && !/authorizeStudentWithHealthConsent/.test(fonte);
      });

    expect(
      abertas,
      `DADO DE SAÚDE SEM CONSENTIMENTO: ${abertas.join(", ")} autentica o aluno e manda o dado sem checar student_consents (Art. 11, I)`,
    ).toEqual([]);
  });
});
