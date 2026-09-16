import { describe, expect, it } from "vitest";
import { type Action, defineAbilitiesFor, type Subject, type UserContext } from "../abilities";

/**
 * Tabela de permissões: 4 papéis × 15 subjects.
 *
 * Existe porque `abilities.ts` viveu duplicado no mobile e no web até divergir
 * sem ninguém notar — o mobile concedia `manage Periodization` ao `member` e o
 * web não, e a mesma conta via botões diferentes em cada plataforma. Com o
 * arquivo único, é esta tabela que impede a próxima divergência: mudar uma
 * concessão sem mudar a expectativa aqui quebra o teste.
 */

const SUBJECTS: Subject[] = [
  "User",
  "AdminPanel",
  "SystemSettings",
  "AuditLogs",
  "Client",
  "Workout",
  "Diet",
  "Exercise",
  "Food",
  "Profile",
  "Analytics",
  "Periodization",
  "HealthMetric",
  "Hydration",
  "DeclaredMeasurement",
  "all",
];

/** O que cada papel pode GERENCIAR (`manage`). Tudo que não está aqui é negado. */
const GERENCIA: Record<string, Subject[]> = {
  admin: SUBJECTS,
  "specialist:personal_training": ["Client", "Workout", "Exercise", "Periodization"],
  "specialist:nutrition_consulting": ["Client", "Diet", "Food"],
  student: ["HealthMetric", "Hydration"],
  member: [
    "Workout",
    "Diet",
    "Exercise",
    "Food",
    "HealthMetric",
    "Hydration",
    "DeclaredMeasurement",
  ],
};

/** O que cada papel pode LER além do que gerencia. */
const LE: Record<string, Subject[]> = {
  "specialist:personal_training": [
    "Analytics",
    "Profile",
    "HealthMetric",
    "Diet",
    "DeclaredMeasurement",
  ],
  "specialist:nutrition_consulting": [
    "Analytics",
    "Profile",
    "HealthMetric",
    "Workout",
    "Periodization",
    "DeclaredMeasurement",
  ],
  student: ["Workout", "Diet", "Exercise", "Profile"],
  member: ["Profile"],
};

const CONTEXTOS: Record<string, UserContext> = {
  admin: { accountType: "admin" },
  "specialist:personal_training": {
    accountType: "specialist",
    services: ["personal_training"],
  },
  "specialist:nutrition_consulting": {
    accountType: "specialist",
    services: ["nutrition_consulting"],
  },
  student: { accountType: "student" },
  member: { accountType: "member" },
};

describe("defineAbilitiesFor — tabela de permissões", () => {
  for (const [papel, contexto] of Object.entries(CONTEXTOS)) {
    describe(papel, () => {
      const ability = defineAbilitiesFor(contexto);
      const gerencia = new Set(GERENCIA[papel] ?? []);

      for (const subject of SUBJECTS) {
        const esperado = papel === "admin" || gerencia.has(subject);
        it(`${esperado ? "gerencia" : "não gerencia"} ${subject}`, () => {
          expect(ability.can("manage", subject)).toBe(esperado);
        });
      }
    });
  }

  describe("leitura além do que gerencia", () => {
    for (const [papel, subjects] of Object.entries(LE)) {
      for (const subject of subjects) {
        it(`${papel} lê ${subject}`, () => {
          expect(defineAbilitiesFor(CONTEXTOS[papel]).can("read", subject)).toBe(true);
        });
      }
    }
  });

  // O specialist recebe permissão por serviço contratado, não pelo papel: sem
  // linha em `specialist_services` ele não gerencia treino nem dieta.
  it("specialist sem serviço não gerencia treino nem dieta", () => {
    const ability = defineAbilitiesFor({ accountType: "specialist", services: [] });
    expect(ability.can("manage", "Workout")).toBe(false);
    expect(ability.can("manage", "Diet")).toBe(false);
    expect(ability.can("manage", "Client")).toBe(true);
  });

  // Regressão do DT-08. O mobile concedia isto e o web não. A RLS de
  // `training_periodizations` (migration 0018) dá ao member apenas SELECT —
  // conceder no CASL mostra botão cuja gravação o banco recusa em silêncio.
  it("member não gerencia Periodization — a RLS só lhe dá leitura", () => {
    expect(defineAbilitiesFor({ accountType: "member" }).can("manage", "Periodization")).toBe(
      false,
    );
  });

  // A medida declarada (0056): declarar é do Praticante, e com especialista quem mede
  // é ele. Mas o que o aluno declarou antes do vínculo continua dele para corrigir e
  // apagar (Art. 18, III e VI) — a RLS confere a Guidance de verdade no banco.
  it("student não declara medida, mas corrige e apaga a que declarou", () => {
    const ability = defineAbilitiesFor({ accountType: "student" });
    expect(ability.can("create", "DeclaredMeasurement")).toBe(false);
    expect(ability.can("update", "DeclaredMeasurement")).toBe(true);
    expect(ability.can("delete", "DeclaredMeasurement")).toBe(true);
  });

  it("admin gerencia tudo pelo curinga", () => {
    const ability = defineAbilitiesFor({ accountType: "admin" });
    expect(ability.can("manage", "all")).toBe(true);
    expect(ability.can("ban" as Action, "User")).toBe(true);
  });
});
