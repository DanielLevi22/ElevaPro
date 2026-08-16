# PRD: physical-assessment-schema-drift

**Data de criação:** 2026-08-12
**Status:** approved
**Branch:** feature/physical-assessment-schema-drift
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?

Fazer o código de avaliação física escrever e ler as colunas que existem em
`physical_assessments`, e decidir quais medidas a avaliação guarda.

### Por quê?

**Nenhum caminho do sistema grava `physical_assessments` corretamente.** O
mobile e o web usam nomes de coluna que não existem, e os dois desligam o que
teria acusado: um descarta o `error` da resposta, o outro usa
`as unknown as AssessmentInsert`.

Descoberto em 2026-08-12 ao verificar o banco antes da migration `0026`. Não é
regressão nova — é uma divergência que nunca funcionou e que nada nunca acusou.

**Bloqueia a feature de análise corporal.** A `ADR-010` usa
`physical_assessments.height_cm` como régua da imagem. Sem avaliação gravada não
há altura, e `/api/ai/body-scan` responde `422 height_required` sempre — a
feature recém-entregue pareceria quebrada, com a causa em outro módulo.

### Como saberemos que está pronto?

- [ ] Uma avaliação criada pelo mobile aparece no banco com todos os campos
- [ ] Uma avaliação criada pelo web aparece no banco com todos os campos
- [ ] Nenhum `as unknown as` no caminho de escrita de avaliação
- [ ] Erro de escrita ou de leitura chega à tela em vez de virar "sem dados"
- [ ] O body scan encontra a altura e deixa de responder `422` para aluno com
      avaliação registrada

---

## Contexto

### O que a tabela tem

```
id, student_id, specialist_id, assessed_at,
weight_kg, height_cm, body_fat_pct, muscle_mass_kg,
skinfold_chest, skinfold_abdomen, skinfold_thigh, skinfold_tricep,
skinfold_suprailiac, skinfold_subscapular, skinfold_midaxillary,
circ_waist, circ_hip, circ_chest,
circ_right_arm, circ_left_arm, circ_right_thigh, circ_left_thigh,
notes, created_at
```

### F1 — O mobile lê 27 colunas, das quais 2 existem 🔴

`physicalAssessmentService.getLatestAssessment` faz `select` de 27 nomes.
Existem **`created_at` e `notes`**.

O PostgREST devolve `42703 column does not exist`. E a leitura descarta o erro:

```ts
const { data } = await supabase.from('physical_assessments').select(/* 27 nomes */)
```

Sem `error`. `data` vem `null`, a função retorna `null`, e a tela mostra
"sem avaliação". **A query nunca funcionou e nunca houve sintoma** — é a forma
mais extrema do padrão que se repete neste projeto: falha e ausência com a mesma
aparência.

### F2 — O mobile grava nomes que não existem 🔴

`PostureAnalysis` monta `aiDataToSave` com `weight`, `height`, `neck`,
`shoulder`, `chest`, `waist`, `abdomen`, `hips`, `arm_right_relaxed`, … e chama
`addPhysicalAssessment`. O insert do `students.service` **checa o erro e lança**,
então esse lado falha de forma visível — mas falha sempre.

### F3 — O web também usa nomes legados, com o cast que esconde 🔴

`web/src/app/api/students/[id]/route.ts`:

```ts
// field mapping uses legacy names — tracked as tech debt in assessments module
.update(numeric as unknown as AssessmentInsert)
```

`AssessmentInsert` vem de `database.types.ts`, gerado do schema — ele teria
pegado todos os nomes errados. O `as unknown as` existe exatamente para calar
essa checagem. E o resultado do `update` e do `insert` não é lido: `error`
nunca é verificado.

O comentário registra a dívida e segue gravando errado, o que é pior que não
saber: alguém já viu e decidiu conviver.

### F4 — Sete medidas não têm coluna 🟠

Sem equivalente no banco: `neck`, `shoulder`, `abdomen`, `forearm_right`,
`forearm_left`, `calf_right`, `calf_left`. Mais as quatro de foto
(`photo_front`, `photo_back`, `photo_side_right`, `photo_side_left`).

E o banco tem três que ninguém usa: `body_fat_pct`, `muscle_mass_kg`,
`skinfold_midaxillary`.

**Aqui há decisão de produto, não só de código:** a avaliação física do Eleva
Pro guarda pescoço, ombro, abdômen, antebraço e panturrilha, ou não? A resposta
define se a correção é renomear ou se precisa de migration.

---

## O mapa de nomes

| Código usa | Banco tem | Ação |
|---|---|---|
| `weight` | `weight_kg` | renomear |
| `height` | `height_cm` | renomear |
| `chest` | `circ_chest` | renomear |
| `waist` | `circ_waist` | renomear |
| `hips` | `circ_hip` | renomear (singular no banco) |
| `arm_right_relaxed` | `circ_right_arm` | renomear |
| `arm_left_relaxed` | `circ_left_arm` | renomear |
| `thigh_proximal_right` | `circ_right_thigh` | renomear |
| `thigh_proximal_left` | `circ_left_thigh` | renomear |
| `skinfold_triceps` | `skinfold_tricep` | renomear (singular no banco) |
| `skinfold_abdominal` | `skinfold_abdomen` | renomear |
| `skinfold_chest`, `skinfold_subscapular`, `skinfold_suprailiac`, `skinfold_thigh`, `notes` | iguais | nada |
| `neck`, `shoulder`, `abdomen`, `forearm_*`, `calf_*` | — | **decidir** |
| `photo_*` | — | remover do código — a foto não é persistida (`ADR-010`) |
| — | `body_fat_pct`, `muscle_mass_kg`, `skinfold_midaxillary` | passar a usar? |

---

## Parecer LGPD

> Aplicado o `/lgpd-check`. `physical_assessments` é tabela sensível.

**Bloco A — Necessidade** ⚠️ A decisão do F4 é uma decisão de minimização:
cada medida que voltar precisa de finalidade declarada. Medida que o
especialista não usa para prescrever não deve ter coluna.

**Bloco B — Base legal** ✅ Tutela da saúde (Art. 11, II, f) + consentimento,
já registrado no mapa. Corrigir nomes não muda a base.

**Bloco C — Segurança** ⚠️ A rota do web grava por `service_role`, o que já é
a dívida 26 do STATUS. Corrigir os nomes não corrige isso, e as duas coisas
convivem no mesmo arquivo — cuidado para não dar a impressão de que foi
resolvido.

**Bloco D — Direitos** ⚠️ Se colunas novas forem criadas, entram no mapa de
dados (seção 2.2) e na exportação.

---

## Escopo

### Incluído

**Fase 1 — parar de mentir sobre o resultado**
- A leitura passa a ler `error`, e erro vira erro na tela — não "sem avaliação"
- Escrita idem, nos dois lados
- Remover `as unknown as AssessmentInsert`: o tipo gerado é o que pega isto

**Fase 2 — alinhar os nomes**
- Aplicar o mapa acima no mobile e no web
- Tirar os campos de foto do código

**Fase 3 — decidir o que falta** (bloqueada por decisão de produto)
- Confirmar quais das sete medidas sem coluna a avaliação deve guardar
- Migration para as que ficarem; remover do código as que saírem

### Fora do escopo

- **`service_role` na rota do web** — é a dívida 26, com causa própria.
- **Redesenhar a tela de avaliação física.** Aqui é fazer funcionar o que já
  existe.

---

## Referências

- `app/src/modules/assessment/services/physicalAssessmentService.ts`
- `app/src/modules/assessment/screens/PostureAnalysis.tsx` (`aiDataToSave`)
- `shared/src/services/students.service.ts` (`addPhysicalAssessment`)
- `web/src/app/api/students/[id]/route.ts`
- `docs/decisions/ADR-010-body-scan-calibrado.md` — por que a altura importa
