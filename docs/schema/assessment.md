# Schema — Módulo Assessment

> Registra **por que** o schema deste módulo é assim, e o que foi rejeitado.
> A fonte da verdade do DDL é `shared/src/database/schema/*.ts` ([ADR-0009](../adr/0009-migration-strategy.md)).

---

## Contexto

O módulo Assessment centraliza tudo relacionado a avaliar o estado físico do aluno:

1. **Anamnese** — histórico de saúde preenchido pelo aluno no onboarding (`student_anamnesis`)
2. **Avaliação física** — medições manuais coletadas pelo especialista (`physical_assessments`)
3. **Body scan** — análise por IA a partir de fotos do aluno (`body_scans`)

Essas três entidades foram separadas do módulo Students porque compartilham o mesmo domínio (estado físico do aluno) e tendem a crescer juntas — comparações entre avaliações, linha do tempo de progresso, exportação de relatório. O módulo Students fica responsável apenas pelo relacionamento (quem está vinculado a quem).

O código mobile já refletia essa separação: `src/modules/assessment/` existia como módulo independente com `assessmentStore`, `anamnesisService` e `aiBodyScan`. O schema agora alinha-se com essa fronteira.

---

## Origem das tabelas

| Tabela | Origem |
|---|---|
| `student_anamnesis` | Movida de Students |
| `physical_assessments` | Movida de Students |
| `body_scans` | Nova — AI body scan |

---

## Tabela `student_anamnesis`

Questionário de saúde preenchido pelo próprio aluno no onboarding. Gera insumos para o especialista entender o histórico, limitações e objetivos do aluno antes de começar a prescrever.

Cada aluno tem exatamente uma anamnese — ela pode ser atualizada, mas não duplicada.

**Por que jsonb?**
As perguntas da anamnese são qualitativas e semi-estruturadas — histórico de lesões, doenças, medicamentos, objetivos, restrições alimentares. O conteúdo do questionário pode evoluir (novas perguntas, remoção de perguntas antigas) sem precisar alterar o schema. A anamnese é sempre lida como um bloco completo — nunca filtramos por campo específico.

**`UNIQUE(student_id)`**: um aluno tem exatamente uma anamnese. Atualizamos o registro existente quando o questionário muda.

**`completed_at NULL`**: indica que o aluno ainda não preencheu. Usado para exibir prompt no app e aviso para o especialista ("aluno não preencheu anamnese").

**Quem preenche**: o aluno. O especialista lê, não edita. Sem `specialist_id`.

---

## Tabela `physical_assessments`

Cada avaliação é um snapshot imutável — não atualizamos registros existentes, criamos novos. Isso permite visualizar a evolução do aluno ao longo do tempo em gráficos e resumos.

A avaliação pertence ao aluno, não ao especialista. Qualquer especialista vinculado ao aluno pode registrar uma avaliação — personal trainer e nutricionista podem ambos fazer bioimpedância ou dobras cutâneas. O `specialist_id` registra quem coletou, mas não restringe quem pode coletar.

**Por que colunas fixas e não jsonb?**
Para gerar gráficos de evolução (peso ao longo do tempo, gordura corporal mês a mês), as queries precisam referenciar colunas nomeadas diretamente. As métricas de avaliação física são protocolos padronizados — o protocolo de dobras Jackson-Pollock tem sempre os mesmos 7 pontos, as circunferências têm sempre os mesmos locais. Não há ganho de flexibilidade em usar jsonb aqui.

**`specialist_id NULL`**: nullable porque no futuro o aluno pode registrar o próprio peso sem precisar de especialista. `SET NULL` na deleção do especialista — a avaliação pertence ao aluno e deve ser preservada.

**`assessed_at` vs `created_at`**: `assessed_at` é quando a avaliação foi feita na prática (pode ser retroativa). `created_at` é quando o registro entrou no banco.

**Imutabilidade**: avaliações não são atualizadas. Uma avaliação corrigida cria um novo registro. O histórico é a fonte de verdade.

---

## Tabela `body_scans`

Avaliação gerada por IA a partir de fotos tiradas pelo próprio aluno. O aluno tira as fotos, o sistema salva no Storage e envia para análise da IA, que retorna métricas e análise postural.

**Status**: estrutura definida. A orquestração completa (fluxo de upload → IA → persistência do resultado) será especificada quando a feature migrar para o web. O schema suporta o resultado final independentemente do frontend.

**Por que scores numéricos em colunas fixas e feedback em jsonb?**
Os scores (symmetry, muscle, posture) são números consultados em gráficos de evolução — precisam de colunas indexáveis. O feedback é texto livre gerado pela IA, estruturado por ângulo — não é consultado individualmente, sempre lido como bloco.

**Sem `specialist_id`**: o scan é iniciado pelo aluno, não pelo especialista. O especialista acessa o resultado via RLS por vínculo ativo.

**Fotos em Supabase Storage**: as URLs referenciam o bucket privado `body-scans`. Acesso controlado por RLS no storage — apenas o aluno e especialistas vinculados.

**Imutabilidade**: cada scan é um snapshot. Nenhum campo é atualizado após a criação.

---

## O que foi explicitamente rejeitado

| Decisão rejeitada | Motivo |
|---|---|
| Manter `physical_assessments` e `student_anamnesis` em Students | Students é gerência de relacionamento. Dados de saúde têm domínio próprio e tendem a crescer juntos (comparações, relatórios, linha do tempo). |
| jsonb para métricas de `physical_assessments` | Necessário fazer queries por campo específico para gráficos de evolução. Colunas fixas são mais eficientes e o protocolo de medição é padronizado. |
| jsonb para scores de postura em `body_scans` | Scores são numéricos e consultados em gráficos — precisam de índice. Apenas o feedback textual vai em jsonb. |
| `nutrition_progress` como tabela separada em Nutrition | Os dados (peso, medidas, % gordura) já existem em `physical_assessments` e `body_scans`. Duplicar seria inconsistência de fonte de verdade. A tela de progresso nutricional lê diretamente daqui. |
| Atualizar registros existentes em `physical_assessments` e `body_scans` | Avaliações são snapshots históricos. Atualizar destruiria o histórico. Uma correção cria novo registro. |

---

## Compliance LGPD

Base legal, finalidade, retenção e direitos dos titulares deste módulo estão em
[`docs/LGPD_COMPLIANCE.md`](../LGPD_COMPLIANCE.md), que é o registro canônico.
As políticas de RLS vivem nas migrations (`supabase/migrations/`), não aqui — ver
[ADR-0014](../adr/0014-rls-helpers-security-definer.md).

Todas as tabelas deste módulo contêm **dados sensíveis de saúde** (Art. 5°, II da Lei 13.709/2018).

### Garantias críticas

- Specialist desvinculado perde acesso via RLS automaticamente — sem lógica de aplicação
- Fotos do body scan em bucket privado — acesso controlado por RLS no Supabase Storage
- Nunca logar conteúdo de `student_anamnesis.responses` ou métricas individuais em texto claro
- Seeds de desenvolvimento não podem conter dados reais de avaliações, anamnese ou fotos
