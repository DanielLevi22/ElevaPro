# Schema — Módulo Students

> Registra **por que** o schema deste módulo é assim, e o que foi rejeitado.
> A fonte da verdade do DDL é `shared/src/database/schema/*.ts` ([ADR-0009](../adr/0009-migration-strategy.md)).

---

## Contexto

O módulo Students gerencia o relacionamento entre alunos e especialistas:
1. **Vínculo** entre aluno e especialista (`student_specialists`)
2. **Infraestrutura de vínculo** — códigos de convite para o fluxo autônomo (`student_link_codes`)
3. **Consentimento** — rastreio de consentimento explícito para dados de saúde (`student_consents`)

> Dados de saúde do aluno (`physical_assessments`, `student_anamnesis`, `body_scans`) foram movidos para o módulo **Assessment** — ver [schema/assessment.md](assessment.md). Students é responsável apenas pelo relacionamento.

Separados porque são contextos completamente diferentes: o vínculo é relacional, o consentimento é rastreio legal. Dados de saúde têm domínio próprio e vivem em Assessment.

---

## Fluxos de vínculo — decisões tomadas

O sistema suporta dois caminhos para criar o vínculo aluno ↔ especialista. Ambos chegam no mesmo estado final: uma linha em `student_specialists` com `status = 'active'`.

**Fluxo A — Especialista cria o aluno**
Especialista preenche nome, e-mail e tipo de serviço. O sistema cria o perfil do aluno com `account_status = 'invited'` e já cria o vínculo automaticamente. O aluno recebe e-mail com link de ativação, define sua senha e entra no sistema já vinculado.

> Por que o vínculo é criado antes da ativação? Porque o especialista pode começar a criar treinos e planos alimentares imediatamente — o aluno encontra tudo pronto quando ativa a conta. O `account_status = 'invited'` garante que o aluno não consegue logar antes de ativar.

**Fluxo B — Aluno cria a própria conta**
Aluno se cadastra sozinho com `account_status = 'active'`. Sem vínculo inicial. Quando quer se vincular a um especialista, gera um código curto na tela dele e passa para o especialista fora do sistema. O especialista digita o código e o vínculo é criado.

> Por que não o especialista gera o código? Porque o aluno já existe — o ponto de partida está no lado do aluno, não do especialista. O aluno controla quem vai se vincular a ele.

**Regra de unicidade de vínculo**
Um aluno nunca pode ter dois especialistas do mesmo `service_type` ao mesmo tempo. Se um aluno já tem um personal trainer e um novo personal quer se vincular, o sistema bloqueia.

**Desvínculo e dados**
Quando o vínculo é desfeito, `student_specialists.status` vai para `inactive`. Os dados (treinos, planos, avaliações) permanecem no banco — o aluno perde o acesso via RLS, mas os registros existem. Se o mesmo especialista re-vincular o aluno, o acesso é restaurado automaticamente sem nenhuma lógica especial — o RLS simplesmente libera porque o vínculo voltou a ser `active`.

Dados pertencentes a um especialista nunca ficam visíveis para outro especialista, mesmo que ambos estejam vinculados ao mesmo aluno.

**Quem pode desvincular**
Ambos os lados podem encerrar o vínculo — specialist e student. O campo `ended_by` registra quem iniciou, o que aciona a notificação para o outro lado:
- `ended_by = specialist_id` → notifica o aluno: "Seu especialista encerrou o vínculo"
- `ended_by = student_id` → notifica o especialista: "O aluno X encerrou o vínculo"

---

## `profiles` — adição do status `invited`

O módulo Auth define `profiles.account_status` como `active | inactive`. O módulo Students adiciona o terceiro valor:

**`invited`**: perfil criado pelo especialista, aluno ainda não ativou a conta. Bloqueado por RLS — não consegue logar.

```
account_status: active | inactive | invited
```

---

## Tabela `student_specialists`

### Enum `link_status`

Usado em `student_specialists.status`. Enum no banco — impede inserção de qualquer valor fora de `active` ou `inactive` sem depender de validação na aplicação.

**`UNIQUE(student_id, service_type) WHERE status = 'active'`**: constraint parcial — garante que não existam dois vínculos ativos para o mesmo aluno e tipo de serviço. Vínculos inativos (histórico) podem existir múltiplos para o mesmo par.

**`ended_by` + `ended_at`**: preenchidos juntos quando `status` vai para `inactive`. Registram quem encerrou o vínculo e quando. `ended_by SET NULL` — se o perfil de quem encerrou for anonimizado futuramente, o `ended_at` e o `status` permanecem intactos.

**Relação com os dados do módulo**
Todos os dados criados por um especialista para um aluno (treinos, planos, avaliações) referenciam `specialist_id` e `student_id`. O RLS verifica se existe um `student_specialists active` para esse par antes de liberar acesso. Isso é o que implementa a lógica de "perde acesso ao desvincular".

**Specialist com conta desativada**
Quando `profiles.account_status` de um specialist muda para `inactive`, uma trigger ou RPC de desativação seta `status = 'inactive'`, `ended_by = NULL`, `ended_at = now()` em todos os vínculos ativos desse specialist. O CASCADE DELETE na FK existe como segurança, mas em operação normal nunca dispara — anonimizamos o perfil em vez de deletar.

---

## Tabela `student_link_codes`

Usada exclusivamente no Fluxo B — aluno cria a própria conta e quer se vincular.

**Código de 6 caracteres alfanuméricos**: curto o suficiente para o aluno passar verbalmente ou por mensagem. `UNIQUE` garante que não existe código duplicado ativo.

**Sem campo `used`**: o código é deletado imediatamente após o uso — não há razão para manter um registro com finalidade encerrada. Um código ou existe (válido) ou não existe (foi usado, substituído ou expirou). Estado binário pela presença ou ausência da linha.

**Gerar novo código deleta o anterior**: quando o aluno gera um novo código, todos os códigos anteriores desse aluno são deletados antes do INSERT. Sem acumulação de registros sem propósito.

**Expiração**: a validação no uso verifica `expires_at > now()`. Códigos expirados que ainda não foram limpos são rejeitados e deletados no momento da tentativa. Um job de limpeza periódico remove os expirados remanescentes.

**Por que não reutilizar o mesmo código?**
Segurança mínima — se o código vazar, tem tempo limitado de vida. O aluno pode gerar um novo a qualquer momento.

---

## Tabela `student_consents`

Rastreia o consentimento explícito do aluno para coleta de dados de saúde. Obrigatório pela LGPD — Art. 11, I (consentimento explícito para dados sensíveis).

### Enum `consent_type`

**`consent_type`**: único valor no MVP — `'health_data_collection'`. Cobre `physical_assessments` e `student_anamnesis` com uma única ação de consentimento no onboarding. Novos tipos podem ser adicionados no futuro sem alterar o schema.

**`policy_version`**: versão da Política de Privacidade vigente no momento do consentimento. Quando a política mudar, permite identificar usuários que consentiram com versão anterior e solicitar re-consentimento.

**`revoked_at`**: quando o aluno revoga via configurações de privacidade, `revoked_at` recebe o timestamp. O RLS de `physical_assessments` e `student_anamnesis` bloqueia novos registros. Dados existentes são preservados até o aluno solicitar exclusão de conta.

**Fluxo de consentimento no onboarding:**
1. Aluno ativa conta (Fluxo A) ou conclui cadastro (Fluxo B)
2. App exibe tela de consentimento em linguagem simples: o que é coletado, quem acessa, como revogar
3. Aluno clica em "Concordo" → INSERT em `student_consents`
4. Specialist só pode criar `physical_assessments` ou ler `student_anamnesis` se existir `student_consents` com `revoked_at IS NULL` para aquele aluno

**Por que tabela separada e não campo em `profiles`?**
Permite histórico de revogação e re-consentimento, múltiplos tipos de consentimento no futuro, e versionamento da política — tudo sem alterar o schema.

---

## O que foi explicitamente rejeitado

| Decisão rejeitada | Motivo |
|------------------|--------|
| Especialista gera o código de vínculo (Fluxo B) | No Fluxo B o aluno já existe — o ponto de partida é o aluno, não o especialista. O aluno controla quem se vincula a ele. |
| Aprovação do aluno para aceitar vínculo do especialista | Adiciona fricção desnecessária no MVP. O código já garante que só quem tem o código pode se vincular. |
| Deletar dados ao desvincular | Irreversível. Soft delete via `status = inactive` preserva histórico e permite recuperação ao re-vincular. |
| `is_active` em vez de `status` | `status` abre espaço para estados futuros sem alterar o tipo de coluna. |
| `physical_assessments` e `student_anamnesis` em Students | Dados de saúde têm domínio próprio (Assessment). Students é gerência de relacionamento — misturar os dois reduzia coesão e dificultava crescimento do domínio de avaliações. |
| `used` boolean em `student_link_codes` | Código deletado ao usar — estado binário por presença/ausência de linha. Campo seria sempre `true` no momento de ser lido. |
| Marcar código anterior como `used` ao gerar novo | Código sem finalidade não deve permanecer no banco. Deletar é mais limpo e alinhado ao princípio da Necessidade (LGPD). |
| `ended_at` sem `ended_by` | Os dois campos são interdependentes — saber quando sem saber quem não serve para notificações. |
| Consentimento como campo em `profiles` | Tabela separada permite histórico de revogação, múltiplos tipos e versionamento de política sem alterar schema. |

---

## Compliance LGPD

Base legal, finalidade, retenção e direitos dos titulares deste módulo estão em
[`docs/LGPD_COMPLIANCE.md`](../LGPD_COMPLIANCE.md), que é o registro canônico.
As políticas de RLS vivem nas migrations (`supabase/migrations/`), não aqui — ver
[ADR-0014](../adr/0014-rls-helpers-security-definer.md).

### Bloco C — Segurança e RLS
