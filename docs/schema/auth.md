# Schema — Módulo Auth

> Registra **por que** o schema deste módulo é assim, e o que foi rejeitado.
> A fonte da verdade do DDL é `shared/src/database/schema/*.ts` ([ADR-0009](../adr/0009-migration-strategy.md)).

---

## Contexto

O módulo Auth é a identidade central do sistema. Todo usuário — independente do tipo — tem exatamente uma linha na tabela `profiles`. Essa tabela é criada automaticamente via trigger do Supabase quando um usuário se registra em `auth.users`.

O schema anterior tinha problemas identificados durante o desenvolvimento das primeiras features:
- `is_super_admin` era redundante com `account_type = 'admin'`
- `birth_date` e `gender` estavam em `profiles` mas pertencem ao contexto de Students
- O nome `professional` não refletia bem o domínio do produto
- `managed_student` e `autonomous_student` eram técnicos demais

Esses problemas motivaram a decisão de arquitetar o banco inteiro antes de gerar qualquer migration.

---

## Tipos de conta — `account_type`

O sistema tem 4 tipos de conta. Essa foi uma das discussões mais importantes do módulo:

**`admin`**
Daniel — o criador do produto. Gerencia a plataforma, tem acesso total. Existe apenas um admin. Não tem relação com especialistas ou alunos.

**`specialist`**
Anteriormente chamado de `professional`. Renomeado porque "specialist" é semanticamente mais rico e extensível — um especialista pode ser personal trainer, nutricionista, fisioterapeuta (futuro), psicólogo esportivo (futuro). O tipo específico de serviço que ele oferece fica em `specialist_services`, não no `account_type`. Assim, adicionar um novo tipo de serviço no futuro não exige alterar o enum de contas.

**`student`**
Anteriormente chamado de `managed_student`. É o aluno vinculado a um ou mais especialistas. O especialista cria a conta do aluno (via RPC), prescreve treinos e planos alimentares. O aluno consome. Tem um fluxo de UI completamente próprio — telas de acompanhamento, execução de treino, registro de refeições.

**`member`**
Anteriormente chamado de `autonomous_student`. É o usuário independente — não tem especialista, cria e gerencia o próprio conteúdo. **Roadmap futuro**: no MVP apenas `specialist` e `student` estão implementados. O `member` entra quando o módulo de IA estiver pronto, pois o fluxo dele é fundamentalmente diferente e usa IA como assistente na criação de planos. O nome `member` foi escolhido porque "aluno" implica ter alguém ensinando — esse usuário não tem isso.

> **Por que não usar um flag `is_self_managed` em vez de um tipo separado?**
> Foi considerado. Mas `student` e `member` têm fluxos de UI completamente diferentes — onboarding diferente, telas diferentes, permissões diferentes. Quando a separação resulta em experiências distintas, o `account_type` é o lugar certo para fazer essa distinção. Um flag seria correto se a diferença fosse só de permissão, não de identidade.

---

## Tabela `profiles`

### Enum `account_type`

| Valor | Descrição |
|-------|-----------|
| `admin` | Daniel — acesso total à plataforma |
| `specialist` | Personal trainer ou nutricionista (antes: `professional`) |
| `student` | Aluno vinculado a um ou mais specialists (antes: `managed_student`) |
| `member` | Usuário independente, sem specialist — roadmap futuro (antes: `autonomous_student`) |

Renomeações em relação ao schema anterior: `professional → specialist`, `managed_student → student`, `autonomous_student → member`. Os nomes antigos estão registrados aqui para rastreabilidade na migração.

### Enum `account_status`

| Valor | Descrição |
|-------|-----------|
| `active` | Conta normal em operação |
| `inactive` | Desativada — nunca deletamos, só desativamos |
| `invited` | Criada pelo specialist (Fluxo A) — aluno ainda não ativou. Adicionado pelo módulo Students. |

O valor `pending` existia no schema anterior para aprovação do specialist pelo admin — fluxo removido. `invited` substitui essa necessidade no contexto correto (onboarding do aluno).

**O que foi removido e por quê:**

| Campo removido | Motivo |
|---------------|--------|
| `is_super_admin` | Redundante — `account_type = 'admin'` já identifica o administrador. Ter os dois criava dois caminhos para verificar a mesma coisa, gerando inconsistência potencial. |
| `birth_date` | Pertence ao contexto de Students (avaliação física, cálculo de idade para TMB). Não faz sentido para especialista ou admin. |
| `gender` | Mesmo motivo do `birth_date` — relevante para avaliação física de alunos, não para identidade de conta. |
| `invite_code` | Legado de um fluxo de convite que foi descartado. |
| `phone` | Nunca utilizado funcionalmente. |
| `cref` / `crn` | Credenciais profissionais que foram removidas do fluxo de cadastro. O processo de validação mudou. |
| `professional_bio` | Legado de uma tela de perfil expandido que não foi implementada. |
| `xp` / `level` | Pertencem ao módulo de Gamification, não à identidade de conta. |

---

## Tabela `specialist_services`

Anteriormente chamada de `professional_services`. Renomeada para consistência com a renomeação de `professional` → `specialist`.

Um especialista pode oferecer um ou dois tipos de serviço. Essa tabela registra quais. A separação em tabela própria (em vez de colunas booleanas em `profiles`) permite adicionar novos tipos de serviço no futuro sem alterar o schema de `profiles`.

**`service_type`: `personal_training | nutrition_consulting`**

**`UNIQUE(specialist_id, service_type)`**: um especialista não pode ter dois registros do mesmo tipo de serviço.

**Por que não ter `is_active`?**
O schema anterior tinha `is_active boolean`. Foi removido porque: se o especialista desativa um serviço, a linha é deletada. Não há necessidade de histórico de quais serviços um especialista já ofereceu no MVP. Manter `is_active = false` em vez de deletar só adiciona complexidade de filtragem em toda query que usa essa tabela.

---

## Compliance LGPD

Base legal, finalidade, retenção e direitos dos titulares deste módulo estão em
[`docs/LGPD_COMPLIANCE.md`](../LGPD_COMPLIANCE.md), que é o registro canônico.
As políticas de RLS vivem nas migrations (`supabase/migrations/`), não aqui — ver
[ADR-0014](../adr/0014-rls-helpers-security-definer.md).

### Bloco C — Segurança e RLS ⚠️

RLS obrigatório para `profiles` e `specialist_services`. Políticas mínimas necessárias:

**Decisão pendente para implementação:** definir se specialist pode ver `profiles` de outros specialists ou apenas de seus alunos.
