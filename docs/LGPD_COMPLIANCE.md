# LGPD — Obrigações e Requisitos do MeuPersonal

> Documento operacional. Traduz a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) em obrigações concretas para o MeuPersonal.
> Toda decisão de schema, feature e arquitetura que envolva dados pessoais deve ser verificada contra este documento.

---

## 1. Papéis e responsabilidades

### MeuPersonal — Controlador (Art. 5°, VI)

Daniel é o **controlador**: decide quais dados são coletados, por quê, como e por quanto tempo. É quem responde perante a ANPD em caso de infração.

Responsabilidades:
- Definir a finalidade de cada dado coletado
- Garantir que o sistema respeite os direitos dos titulares
- Manter registros de tratamento de dados
- Notificar titulares e ANPD em caso de incidente de segurança

### Supabase — Operador (Art. 5°, VII)

Supabase é o **operador**: executa o armazenamento e processamento conforme configurado pelo controlador. Não decide sobre finalidade ou base legal.

Implicação prática: RLS mal configurado ou queries sem controle de acesso são **falha do controlador**, não do operador. A responsabilidade é de quem modelou o banco.

### Especialistas e alunos — Titulares (Art. 5°, V)

Os usuários do sistema são os titulares dos dados. Têm os seguintes direitos que **o sistema precisa suportar**:

| Direito | O que o sistema precisa ter |
|---------|----------------------------|
| Acesso | Usuário consegue ver todos os seus dados |
| Correção | Usuário consegue editar nome, e-mail, dados pessoais |
| Exclusão | Usuário consegue solicitar remoção da conta e dados |
| Portabilidade | Usuário consegue exportar seus dados em formato legível |
| Revogação do consentimento | Usuário consegue revogar permissões específicas |
| Informação | Usuário sabe quais dados são coletados e por quê |

---

## 2. Mapa de dados — o que coletamos e por quê

> **Última revisão completa:** módulos Auth e Students revisados via `/lgpd-check`. Ver seção 10 para status detalhado por módulo.

### 2.1 Dados pessoais comuns (Art. 5°, I)

Qualquer dado que identifica ou pode identificar uma pessoa.

| Dado | Tabela | Base legal | Finalidade |
|------|--------|------------|------------|
| Nome completo | `profiles.full_name` | Execução de contrato | Identificação do usuário no sistema |
| E-mail | `profiles.email` | Execução de contrato | Autenticação e comunicação |
| Foto de perfil | `profiles.avatar_url` | Consentimento | Personalização da interface |
| Tipo de conta | `profiles.account_type` | Execução de contrato | Controle de acesso e fluxo de uso |
| Status da conta | `profiles.account_status` | Execução de contrato | Gestão de ciclo de vida do usuário |
| Tipo de serviço | `specialist_services.service_type` | Execução de contrato | Definir quais funcionalidades o especialista acessa |

### 2.2 Dados pessoais sensíveis (Art. 5°, II)

Dados referentes à saúde exigem **base legal específica** e proteção reforçada. O MeuPersonal trata dados de saúde — isso é o núcleo do produto.

| Dado | Tabela | Base legal | Finalidade |
|------|--------|------------|------------|
| Peso, altura | `physical_assessments` | Tutela da saúde (Art. 11, II, f) + Consentimento | Avaliação física, cálculo de composição corporal |
| % gordura, massa muscular | `physical_assessments` | Tutela da saúde + Consentimento | Acompanhamento de evolução física |
| Dobras cutâneas (7 pontos) | `physical_assessments` | Tutela da saúde + Consentimento | Protocolo Jackson-Pollock para composição corporal |
| Circunferências corporais | `physical_assessments` | Tutela da saúde + Consentimento | Acompanhamento de medidas |
| Histórico de saúde (anamnese) | `student_anamnesis.responses` | Consentimento explícito (Art. 11, I) | Informar o especialista sobre limitações, lesões, medicamentos |
| Dados de treino executado | `workout_sessions` | Execução de contrato | Acompanhamento de desempenho |
| Plano alimentar (metas calóricas e macros) | `diet_plans` | Tutela da saúde + Consentimento (Art. 11, II, f + I) | Prescrição nutricional — especialista ou autogerenciado pelo member |
| Refeições e alimentos do plano | `diet_meals`, `diet_meal_items` | Tutela da saúde + Consentimento | Composição do plano alimentar |
| Registro de refeições realizadas e substituições | `meal_logs` | Tutela da saúde + Consentimento | Acompanhamento de aderência nutricional |
| Registro alimentar (campo legado) | `diet_logs` | Tutela da saúde + Consentimento | Acompanhamento nutricional |
| Passos por dia (agregado) | `health_daily_metrics.steps` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Acompanhamento de atividade entre sessões de treino |
| Calorias ativas por dia (agregado) | `health_daily_metrics.active_calories` | Tutela da saúde + Consentimento | Estimativa de gasto energético para ajuste do plano |

| Registro de consentimento | `student_consents` | Consentimento explícito (Art. 11, I) | Provar que o aluno autorizou coleta de dados de saúde |

**Atenção:** O tratamento de dados sensíveis sem base legal adequada é considerado **infração grave** pela ANPD. A base de tutela da saúde exige que o tratamento seja realizado por profissional da área ou sob sua supervisão — o que se aplica ao contexto de personal trainers e nutricionistas usando o sistema.

### 2.3 O que NÃO coletamos (por princípio da necessidade)

Dados que foram explicitamente rejeitados do schema por violar o princípio da necessidade:

- `birth_date` em `profiles` — não pertence à identidade de conta; se necessário para cálculo de tmb, fica em `physical_assessments` ou `student_anamnesis`
- `gender` em `profiles` — mesmo motivo
- `phone` — nunca utilizado funcionalmente
- `cref` / `crn` — credenciais removidas do fluxo de cadastro
- `is_super_admin` — redundante com `account_type`

---

## 3. Bases legais aplicadas (Art. 7° e Art. 11)

Para cada tipo de tratamento, deve existir uma base legal documentada. Não existe "uso genérico" — cada finalidade precisa de justificativa.

| Tratamento | Base legal | Artigo |
|------------|------------|--------|
| Criar conta e autenticar | Execução de contrato | Art. 7°, V |
| Armazenar dados de perfil | Execução de contrato | Art. 7°, V |
| Especialista criar conta do aluno | Execução de contrato + Consentimento posterior | Art. 7°, V + I |
| Avaliações físicas | Tutela da saúde + Consentimento | Art. 11, II, f + I |
| Anamnese de saúde | Consentimento explícito | Art. 11, I |
| Prescrição de treinos | Execução de contrato | Art. 7°, V |
| Prescrição de dietas | Tutela da saúde + Execução de contrato | Art. 11, II, f |
| Logs de acesso ao sistema | Legítimo interesse (segurança) | Art. 7°, IX |
| Dados de gamificação | Execução de contrato | Art. 7°, V |
| Histórico de mensagens | Execução de contrato | Art. 7°, V |
| Member cria plano alimentar próprio (sem especialista) | Consentimento explícito | Art. 11, I |
| Sinal derivado de inatividade para o especialista vinculado (briefing) | Mesma base do dado de origem — Execução de contrato para `workout_sessions`, Consentimento explícito para a data de conclusão da anamnese | Art. 7°, V + Art. 11, I |

**Sobre o sinal derivado.** O briefing não é tratamento novo: agrega dado que o
especialista vinculado já pode ler, para a mesma finalidade — acompanhar o
aluno. O que o mantém dentro da minimização é o **recorte**: lê
`student_anamnesis.completed_at` e nunca `responses`; lê a data da última sessão
e nunca carga, repetição ou intensidade. O que chega à tela é "não treina há 12
dias", jamais o treino. Verificado por teste
(`web/src/modules/briefing/__tests__/briefingService.test.ts`).

O sinal também não vai para log: `"João Silva não treina há 5 dias"` é
inferência sobre saúde de titular identificado.

**Regra do consentimento (Art. 8°):** Quando usamos consentimento como base, ele precisa ser:
- **Livre**: o aluno não pode ser forçado a aceitar para usar o serviço principal
- **Informado**: explicar em linguagem simples o que será coletado e por quê
- **Inequívoco**: ação explícita (checkbox, botão confirmar) — nunca pré-marcado
- **Específico**: um consentimento por finalidade, não genérico
- **Demonstrável**: guardar registro de quando e como o consentimento foi dado
- **Revogável**: o usuário consegue revogar a qualquer momento

---

## 4. Os 10 princípios traduzidos em requisitos técnicos (Art. 6°)

### 4.1 Finalidade (Art. 6°, I)
> Dados usados apenas para o propósito declarado no momento da coleta.

**Requisitos:**
- [ ] Cada campo de formulário tem finalidade documentada
- [ ] Dados de saúde do aluno NÃO podem ser usados para fins de marketing
- [ ] Dados de treino NÃO podem ser compartilhados com terceiros sem nova base legal
- [ ] Não usar e-mail coletado para autenticação em campanhas sem consentimento separado

### 4.2 Adequação (Art. 6°, II)
> O uso real dos dados precisa combinar com o que foi informado.

**Requisitos:**
- [ ] O que a política de privacidade diz precisa refletir o que o código faz
- [ ] Se mudar a finalidade de uso de um dado, exige nova comunicação ao titular

### 4.3 Necessidade (Art. 6°, III)
> Coletar o mínimo necessário. Critério: "este dado é essencial para o serviço funcionar?"

**Requisitos:**
- [ ] Formulários de cadastro: apenas nome e e-mail são obrigatórios
- [ ] Foto de perfil é opcional — não bloquear uso sem ela
- [ ] Anamnese é opcional no onboarding — o sistema funciona sem ela
- [ ] Não adicionar campos a formulários sem justificativa de necessidade
- [ ] Antes de adicionar qualquer novo campo ao schema, perguntar: "o serviço deixa de funcionar sem isso?"

### 4.4 Livre Acesso (Art. 6°, IV)
> O titular tem direito de saber como seus dados estão sendo usados.

**Requisitos:**
- [ ] Tela "Meus Dados" acessível no app e no web (mobile + web)
- [ ] Usuário consegue ver todos os dados armazenados sobre ele
- [ ] Usuário consegue exportar seus dados (treinos, avaliações, anamnese)
- [ ] Mostrar com clareza: quais dados, para qual finalidade, por quanto tempo

### 4.5 Qualidade dos Dados (Art. 6°, V)
> Dados precisam estar corretos e o titular pode corrigi-los.

**Requisitos:**
- [ ] Tela de perfil com campos editáveis (nome, foto)
- [ ] Aluno pode atualizar anamnese quando as informações mudarem
- [ ] Especialista pode corrigir avaliação física com erro (mas não deletar histórico)

### 4.6 Transparência (Art. 6°, VI)
> Informações claras, precisas e facilmente acessíveis sobre o tratamento.

**Requisitos:**
- [ ] Política de Privacidade em linguagem acessível — não juridiquês
- [ ] Explicar na tela de cadastro quais dados são coletados e por quê
- [ ] No onboarding do aluno: informar que dados de saúde serão coletados e quem terá acesso
- [ ] Não usar frases genéricas como "para melhorar sua experiência" — ser específico

### 4.7 Segurança (Art. 6°, VII)
> Medidas técnicas para proteger contra acesso não autorizado.

**Requisitos obrigatórios:**
- [ ] **RLS ativo em todas as tabelas** — não existe tabela sem Row Level Security
- [ ] Supabase Auth para autenticação — senhas nunca armazenadas em texto claro
- [ ] HTTPS em todos os endpoints (garantido pelo Supabase + Vercel)
- [ ] Especialista só acessa dados de alunos com vínculo `active` em `student_specialists`
- [ ] Aluno só acessa seus próprios dados
- [ ] Admin não acessa dados de saúde de alunos sem necessidade
- [ ] Tokens de sessão não devem aparecer em logs

**Requisitos recomendados (antes do lançamento):**
- [ ] MFA disponível para especialistas (Supabase suporta nativamente)
- [ ] Rate limiting nas APIs de autenticação
- [ ] Alertas de acesso suspeito (muitas tentativas de login)

### 4.8 Prevenção (Art. 6°, VIII)
> Adotar medidas para prevenir danos antes que aconteçam.

**Requisitos:**
- [ ] Nunca logar dados sensíveis em texto claro (peso, gordura, respostas de anamnese)
- [ ] Variáveis de ambiente nunca hardcoded no código
- [ ] Seeds de desenvolvimento não podem usar dados reais de usuários
- [ ] Ambientes dev/staging separados de produção (ver CLAUDE.md — pendente)
- [ ] Revisão de segurança antes de cada release (npm audit)

### 4.9 Não Discriminação (Art. 6°, IX)
> Proibido tratar dados para fins discriminatórios.

**Requisitos:**
- [ ] Dados de saúde do aluno (peso, composição corporal) não podem ser usados para filtros de acesso ou precificação
- [ ] Se o módulo de IA for implementado no futuro, garantir que não use dados sensíveis para classificações discriminatórias

### 4.10 Responsabilização e Prestação de Contas (Art. 6°, X)
> Não basta fazer o certo — é preciso provar que está fazendo o certo.

**Requisitos:**
- [ ] Manter este documento atualizado
- [ ] Logs de acesso a dados sensíveis preservados (não expostos, mas existentes para auditoria)
- [ ] Documentar decisões de schema que envolvam dados pessoais (já fazemos em `docs/schema/`)
- [ ] Política de Privacidade publicada antes do lançamento
- [ ] Definir responsável pelo contato com titulares (e-mail de privacidade/DPO)

---

## 5. Direitos dos titulares — como o sistema deve suportar

A LGPD garante direitos aos titulares que o sistema precisa implementar. Abaixo o mapeamento de onde cada direito se materializa no produto:

| Direito | Onde implementar | Status |
|---------|-----------------|--------|
| Acesso aos dados | Tela "Meus Dados" (mobile + web) | Pendente |
| Correção | Tela de perfil editável | Parcialmente implementado |
| Exclusão | Fluxo "Excluir minha conta" com confirmação | Pendente |
| Portabilidade | Exportar dados em JSON/PDF | Pendente |
| Revogação do consentimento | Tela de configurações de privacidade | Pendente |
| Oposição ao tratamento | Configurações granulares de privacidade | Pendente |
| Informação | Política de Privacidade + onboarding | Pendente |
| Notificação de incidentes | Processo de comunicação definido | Pendente |

### Exclusão vs. Soft Delete

A LGPD distingue **eliminar** de **esconder**:

- **Soft delete** (`account_status = 'inactive'`): dado permanece no banco — **isso não é eliminação** para fins da LGPD
- **Eliminação real**: dado apagado ou anonimizado irreversivelmente

**Posição do MeuPersonal:**

Quando um usuário solicita exclusão da conta:
1. Dados de identificação (`email`, `full_name`, `avatar_url`) devem ser eliminados ou anonimizados
2. Dados de saúde (`physical_assessments`, `student_anamnesis`) devem ser eliminados
3. Histórico de treinos e dietas: decisão pendente — pode ser anonimizado para fins estatísticos (sem nome, sem e-mail, sem vínculo)
4. Dados financeiros e fiscais: podem ser mantidos por obrigação legal (prazo legal de guarda)

> Esta decisão precisa ser aprovada antes de implementar o fluxo de exclusão de conta.

---

## 6. Dados sensíveis de saúde — proteção reforçada (Art. 11)

O MeuPersonal é, na prática, uma plataforma de saúde. Dados de avaliação física e anamnese são **dados sensíveis** pela LGPD. Isso implica:

**No banco de dados:**
- RLS para dados de saúde deve ser mais restritivo: apenas o próprio aluno e especialistas com vínculo `active` acessam
- Especialistas desvinculados perdem acesso via RLS (não precisamos deletar os dados, o vínculo inativo já bloqueia)
- Especialistas diferentes não podem ver dados uns dos outros sobre o mesmo aluno

**No código:**
- Queries que retornam dados de saúde devem incluir verificação de vínculo ativo
- Nunca retornar dados de saúde em listagens genéricas
- Endpoints de saúde devem ter logs de acesso (quem acessou, quando)

**No produto:**
- Consentimento explícito antes de coletar a primeira avaliação física
- Consentimento explícito antes de coletar a anamnese
- O aluno deve conseguir ver quais especialistas têm acesso aos seus dados de saúde

---

## 7. Retenção de dados — por quanto tempo guardar

A LGPD exige que dados sejam eliminados quando deixam de ser necessários (Art. 15).

| Dado | Tempo de retenção | Justificativa |
|------|------------------|---------------|
| Dados de perfil | Enquanto a conta estiver ativa | Necessário para o serviço |
| Avaliações físicas | Enquanto existir vínculo com especialista | Histórico clínico necessário ao especialista |
| Anamnese | Enquanto a conta estiver ativa | Auto-relato do aluno |
| Histórico de treinos | Enquanto a conta estiver ativa | Histórico de evolução |
| Histórico de dietas | Enquanto a conta estiver ativa | Histórico de evolução |
| Passos e calorias diários | Enquanto a conta estiver ativa | Comparação de longo prazo é a finalidade; `ON DELETE CASCADE` elimina junto com a conta |
| Logs de autenticação | 90 dias | Segurança — detecção de acessos suspeitos |
| Dados após exclusão de conta | 0 dias (eliminar ou anonimizar) | Princípio da necessidade |

### Revogação de consentimento — `health_daily_metrics`

Revogar o consentimento de coleta de saúde é **prospectivo**: a coleta cessa
imediatamente e o especialista perde o acesso pela RLS, mas o histórico já
gravado permanece visível ao próprio aluno. Mesmo comportamento de `meal_logs`
e `physical_assessments` — revogar não é o mesmo que exercer o direito de
eliminação (Art. 18, VI), que continua disponível separadamente.

> Política de retenção detalhada deve ser definida e publicada na Política de Privacidade antes do lançamento.

---

## 8. Sanções — o que pode acontecer se descumprir (Art. 52)

A ANPD pode aplicar as seguintes sanções, em ordem crescente de gravidade:

1. **Advertência** — com prazo para correção
2. **Multa simples** — até 2% do faturamento, limitado a R$ 50 milhões por infração
3. **Multa diária** — enquanto a irregularidade persistir
4. **Publicização da infração** — dano à reputação
5. **Bloqueio dos dados** — operação paralisada até correção
6. **Suspensão do banco de dados** — até 6 meses
7. **Proibição de atividade** — medida extrema

**O que reduz a sanção:** boa-fé, resposta rápida ao incidente, cooperação com a ANPD, ter documentação e processo.

**O que agrava:** reincidência, omissão, não ter DPO/canal de contato, não avisar os titulares.

---

## 9. Checklist pré-lançamento

Itens obrigatórios antes de abrir para o público:

**Legal:**
- [ ] Política de Privacidade publicada e acessível sem login
- [ ] Termos de Uso publicados
- [ ] E-mail de contato para titulares exercerem seus direitos (ex: privacidade@meupersonal.com.br)
- [ ] Consentimento explícito para dados de saúde implementado no onboarding do aluno

**Técnico:**
- [ ] RLS ativo e testado em todas as tabelas com dados pessoais
- [ ] Nenhum dado sensível em logs de aplicação
- [ ] Fluxo de exclusão de conta implementado (eliminar ou anonimizar)
- [ ] Tela "Meus Dados" disponível no app e no web
- [ ] Campos editáveis de perfil funcionando

**Processo:**
- [ ] Processo definido para responder a solicitações de titulares (prazo: 15 dias úteis conforme LGPD)
- [ ] Processo definido para notificar titulares e ANPD em caso de incidente (prazo: 72 horas)
- [ ] Ambientes de dev/staging separados de produção (dados reais apenas em produção)

---

## 10. Impacto no schema — status por módulo

### Estado real da RLS — verificado em 2026-08-11

As tabelas abaixo registravam decisões de RLS como tomadas desde a revisão de
cada módulo. A auditoria de 2026-08-11 foi ao banco e encontrou **18 das 27
tabelas sem RLS nenhuma**: a decisão estava documentada, a migration nunca
existiu. Fotos corporais, anamneses, avaliações físicas e histórico de treino
eram legíveis por qualquer conta autenticada falando direto com o PostgREST —
falha do **controlador**, na definição da seção 1 deste documento.

Corrigido pelas migrations `0016`–`0020` (PRD
[rls-security-hardening](PRDs/rls-security-hardening.md)).

| Módulo | Tabelas | RLS | Migration |
|---|---|---|---|
| Auth / Students | `profiles`, `student_specialists`, `student_consents`, `student_link_codes` | ✅ | 0016 |
| Saúde | `student_anamnesis`, `physical_assessments`, `body_scans`, `workout_sessions`, `workout_session_exercises` | ✅ | 0017 |
| Prescrição e catálogo | `workouts`, `workout_exercises`, `training_periodizations`, `training_plans`, `exercises`, `specialist_services` | ✅ | 0018 |
| Gamificação | `achievements`, `daily_goals`, `student_streaks` | ✅ | 0019 |
| Nutrição | `diet_plans`, `diet_meals`, `diet_meal_items`, `meal_logs`, `foods` | ✅ | 0013 |
| Saúde diária | `health_daily_metrics` | ✅ | 0015 |
| IA | `ai_chat_sessions`, `ai_chat_messages` | ✅ | 0003 |
| Treino (séries) | `workout_session_sets` | ✅ | 0011 + 0017 |

**O escalonamento que invalidava as políticas existentes.** `student_specialists`
aceitava INSERT de qualquer autenticado, e as políticas de `meal_logs`,
`health_daily_metrics` e dos planos de dieta consultam essa tabela para decidir
acesso. Inserir uma linha de vínculo concedia acesso *legitimamente* ao dado de
saúde de qualquer aluno. A tabela agora não tem política de INSERT nem de
DELETE: o vínculo só nasce pela função `public.link_student_by_code`, que tira o
especialista de `auth.uid()` no servidor em vez de aceitá-lo por parâmetro.

**Garantias verificadas por teste, não por leitura de migration.**
`scripts/test-rls-isolation.mjs` autentica dois alunos e dois especialistas
reais, semeia dado de saúde para os dois lados e afirma tabela a tabela quem
enxerga o quê — incluindo o especialista desvinculado perdendo acesso na mesma
consulta, sem job de limpeza. `scripts/check-rls.js` roda no pre-commit e no CI
e falha se uma tabela nova nascer sem RLS.

**O que a RLS não cobre — 1: o Storage.** `body_scans` guarda a URL da foto, não
o binário. A RLS protege a linha; o arquivo precisa de política própria. O
bucket `assessments`, para onde o mobile envia as fotos de análise postural,
**não existia** em ambiente nenhum até a migration `0021`, que o cria privado e
com política de dono + especialista vinculado. O bucket das fotos de
`body_scans` segue pendente.

**O que a RLS não cobre — 2: as rotas com `service_role`.** As rotas do BFF em
`web/src/app/api/` usam a chave de serviço, que ignora RLS por definição. Ali a
única barreira é a checagem do próprio código. Em 2026-08-11, duas rotas de IA
recebiam o `studentId` pela URL e não checavam vínculo: um token de aluno
qualquer obtinha `HTTP 200` e a anamnese de qualquer outro aluno no contexto do
modelo. Fechado pelo PRD
[api-security-hardening](PRDs/api-security-hardening.md), com helper único
(`web/src/lib/api-auth.ts`), guarda no CI e teste com quatro usuários reais.

---

### Módulo Auth ✅ Revisado

| Decisão | Princípio atendido |
|---------|-------------------|
| `birth_date` e `gender` fora de `profiles` | Necessidade |
| `is_super_admin` removido | Necessidade |
| `account_status = 'inactive'` em vez de DELETE | Preservação de integridade referencial |
| `avatar_url` opcional | Necessidade — personalização, não essencial |

**Decisões tomadas nesta revisão:**

| Decisão | Impacto |
|---------|---------|
| Fluxo de exclusão: anonimizar `profiles` (não deletar) | Preserva integridade referencial com dados de outros módulos |
| Contas `invited` sem ativação: anonimizar após 90 dias | Princípio da Necessidade — dado sem finalidade ativa |
| RLS `profiles`: usuário vê apenas próprio registro | Segurança — implementar na migration |

---

### Módulo Students ⚠️ Revisado — nova tabela necessária

| Decisão já tomada | Princípio atendido |
|---------|-------------------|
| `specialist_id SET NULL` em `physical_assessments` | Preservação do histórico do aluno |
| `student_anamnesis UNIQUE(student_id)` | Evitar duplicação de dados sensíveis |
| RLS bloqueia especialistas desvinculados | Segurança |
| `student_link_codes expires_at` | Segurança — tempo de vida limitado |
| `physical_assessments` imutável (nunca UPDATE) | Qualidade dos dados — histórico preservado |

**Decisões tomadas nesta revisão:**

| Decisão | Impacto |
|---------|---------|
| Nova tabela `student_consents` | Rastreia consentimento explícito para dados de saúde — obrigatório Art. 11, I |
| Consentimento antes da primeira avaliação/anamnese | Fluxo de onboarding precisa de tela de consentimento |
| Revogação de consentimento: bloqueia novos registros via RLS, mantém existentes | Princípio da revogabilidade |
| Exclusão de conta do aluno: deletar `physical_assessments` e `student_anamnesis` | Eliminação real — soft delete não é suficiente aqui |
| Conteúdo de `student_anamnesis.responses` nunca logado em texto claro | Prevenção |

---

### Módulo Workouts ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| `workout_sessions.workout_id SET NULL` (não RESTRICT) | Dado do aluno preservado mesmo após deleção do treino pelo specialist |
| `workout_session_exercises.workout_exercise_id SET NULL` | Mesma garantia — sets_data jamais deletado por cascade do specialist |
| RLS bloqueia INSERT de sessões por specialists | Specialist não pode inserir histórico falso em nome do aluno |
| RLS bloqueia specialist após desvínculo | Specialist desvinculado perde acesso ao histórico de sessões do aluno |
| DELETE proibido via RLS em sessions | Histórico é imutável — só deletado quando o próprio aluno exclui a conta |
| CASCADE DELETE em student_id de workout_sessions | Exclusão de conta do aluno elimina todo o histórico de sessões |
| Dados de performance não são dados sensíveis (Art. 5°, II) | Base legal: execução de contrato (Art. 7°, V) — sem necessidade de consentimento explícito |
| Briefing lê `workout_sessions.completed_at` e nada mais — nem carga, nem repetição, nem intensidade | Necessidade (Art. 6°, III): o sinal é "não treina há N dias", não o treino |

> **Revisão de 2026-08-11 — reprovou em RLS.** As decisões acima falavam em "RLS
> bloqueia" desde a revisão do módulo, mas a auditoria foi ao banco e encontrou
> `workout_sessions` e `workout_session_exercises` **sem RLS nenhuma**. Corrigido
> na migration `0017`. O caso está registrado na abertura da seção 10: decisão
> documentada não é controle implementado.

---

### Módulo Nutrition ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| RLS habilitado em `diet_plans`, `diet_meals`, `diet_meal_items`, `meal_logs`, `foods` (migration 0013) | Segurança (Art. 6°, VII) |
| Especialista só acessa `meal_logs` de alunos com vínculo `active` em `student_specialists` | Segurança — especialista desvinculado perde acesso |
| Especialista não pode inserir `meal_logs` em nome do aluno (RLS: FOR SELECT only) | Integridade — histórico pertence ao aluno |
| Member cria `diet_plans` com `specialist_id IS NULL` — dados protegidos por `student_id = auth.uid()` | Segurança |
| Consentimento explícito obrigatório antes do primeiro INSERT em `diet_plans` por member (`student_consents`, tipo `health_data_collection`) | Base legal Art. 11, I |
| `meal_logs.actual_items` (JSONB com substituições) nunca deve ser logado em texto claro | Prevenção (Art. 6°, VIII) |
| `foods` públicos legíveis por todos os autenticados; customizados protegidos por `created_by = auth.uid()` | Necessidade + Segurança |

**Decisões pendentes de implementação:**

| Item | Ação necessária |
|------|----------------|
| Consentimento no app mobile antes de `toggleMealCompletion` e `substituteFood` | Verificar `student_consents` no `nutritionStore.ts` antes de gravar `meal_logs` |
| NutriBotService e ScanFoodService (BFF API routes) sem verificação de consentimento | Adicionar middleware de consentimento nas routes `/api/ai/student/nutribot` e `/api/ai/student/scan-food` |

---

### Módulo Gamification ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| `phone` removido do tipo `LeaderboardEntry` e de todas as queries do leaderboard | Necessidade (Art. 6°, III) — telefone não é necessário para ranking |
| Botão WhatsApp removido da tela de ranking (não existe base legal para exposição de telefone no leaderboard) | Finalidade (Art. 6°, I) |
| Leaderboard global expõe apenas `full_name`, `avatar_url` e pontuação — sem dados de contato | Necessidade + Finalidade |
| `daily_goals`, `student_streaks`, `achievements`: base legal Execução de Contrato (Art. 7°, V) | Base legal documentada |

**Decisões pendentes de implementação:**

| Item | Ação necessária |
|------|----------------|
| ~~RLS nas tabelas de gamificação (`daily_goals`, `student_streaks`, `achievements`)~~ | ✅ Feito na migration `0019` — aluno lê e escreve o próprio; especialista com vínculo `active` só lê |
| `ranking_scores` não existe no schema Drizzle nem nas migrations | Criar tabela com RLS antes de usar o leaderboard em produção |
| Leaderboard global mostra `full_name` de todos os alunos ranqueados — verificar se há consentimento necessário para participação pública | Avaliar se `ranking_scores` deve ser opt-in (consentimento) ou opt-out |

---

### Student Web Dashboard ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| Consentimento explícito (`HealthDataConsentModal`) antes do primeiro `diet_plans` INSERT por member | Base legal Art. 11, I |
| Leitura de `workout_sessions` coberta pelo RLS existente do módulo Workouts | Segurança |
| Leitura de `student_specialists` + `profiles.full_name` coberta pelo RLS do módulo Students | Segurança |
| `ranking_scores` (leaderboard) não expõe dados de contato após remoção do `phone` | Necessidade |

**Itens pendentes de lançamento:**

| Item | Ação necessária |
|------|----------------|
| Módulo Nutrition (diet_plans) sem revisão LGPD no app mobile | Verificar consentimento antes de gravar `meal_logs` no mobile |
| Tela "Meus Dados" para o aluno ver e exportar seus dados | Pendente — obrigatório antes do lançamento (Art. 18) |
| Fluxo de exclusão de conta | Pendente — eliminar dados de saúde (`physical_assessments`, `student_anamnesis`, `meal_logs`) |

---

### Módulo AI BFF ⚠️ Revisado — pendências antes do lançamento

Rotas criadas em `web/src/app/api/ai/` que processam dados de saúde via terceiros (Anthropic Claude e Google Gemini).

| Rota | Dado transmitido | Destinatário | Sensível? | Base legal |
|------|-----------------|--------------|-----------|------------|
| `/api/ai/chat/[studentId]` | Objetivo, experiência, frequência, dias, **lesões**, **condições de saúde**, peso, altura, % gordura, periodizações. **Sem o nome do titular** | Anthropic | ✅ Sim (Art. 11) | Consentimento explícito — verificado na rota desde 2026-08-12 |
| `/api/ai/body-scan` | Fotos corporais (base64) + métricas inferidas | Anthropic | ✅ Sim (Art. 5°, II) | Consentimento explícito (Art. 11, I) |
| `/api/ai/nutrition/adherence` | `diet_logs` anonimizados + nome do plano | Anthropic | ✅ Sim | Consentimento explícito |
| `/api/ai/voice-command` | Removido — rota e serviço eliminados | — | — | — |
| `/api/ai/workout/negotiate` | Nível do aluno, objetivo, lista de exercícios | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/workout/batch` | Idem | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/nutrition/recipe` | Nome da refeição + ingredientes | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/nutrition/assistant` | Lista de compras categorizada | Anthropic | ❌ Não sensível | Execução de contrato |

**Decisões tomadas nesta revisão:**

| Decisão | Princípio atendido |
|---------|-------------------|
| `studentName` removido do prompt da rota `/nutrition/adherence` — IA não precisa do nome para analisar aderência | Necessidade (Art. 6°, III) |
| Nome do titular removido do prompt do coach do especialista — o modelo diz "o aluno" | Necessidade (Art. 6°, III) |
| `/api/ai/chat/[studentId]` só monta o contexto de saúde com `student_consents` vigente; sem consentimento o coach avisa e segue por estrutura | Base legal Art. 11, I |
| O contexto lê seis campos nomeados da anamnese, nunca `responses` inteiro | Necessidade (Art. 6°, III) |
| Erro do chat não expõe texto técnico ao usuário; o log registra a sessão, nunca o conteúdo do contexto | Prevenção (Art. 6°, VIII) |
| Nenhum dado é persistido nas rotas BFF — processamento em memória e descartado | Necessidade + Segurança |
| Autenticação obrigatória (Bearer token validado via Supabase) antes de qualquer processamento | Segurança (Art. 6°, VII) |
| Transmissão via HTTPS (Vercel → Anthropic/Google) | Segurança |
| Dados de `diet_logs` enviados ao Claude não contêm identificadores do aluno (`student_id` nunca incluído no payload) | Necessidade |

**Pendências obrigatórias antes do lançamento:**

| Item | Ação necessária | Responsável |
|------|----------------|-------------|
| Consentimento da tela de Body Scan deve mencionar explicitamente envio de fotos a serviço de IA externo | Atualizar texto da tela `BodyScanIntroduction.tsx` | Dev + Legal |
| Anthropic e Google devem ser listados como sub-processadores na Política de Privacidade | Atualizar política de privacidade | Legal |
| Rota `/api/ai/body-scan` deve verificar `student_consents` (tipo `health_data_collection`) antes de processar | Adicionar middleware de consentimento na rota, igual ao padrão de `nutribot` e `scan-food` | Dev |
| `loadStudentContext` manda a anamnese inteira (`select("*")`) para o prompt da Anthropic | Recortar os campos que o modelo realmente usa para montar treino — Necessidade (Art. 6°, III) | Dev |
| Rota `/api/ai/nutrition/adherence` deve verificar `student_consents` antes de processar | Idem | Dev |
| ~~Verificar DPA Google (Gemini) para dado biométrico de voz~~ | Eliminado — voice command removido do escopo | — |

---

### Módulos pendentes de revisão LGPD

| Módulo | Status LGPD |
|--------|-------------|
| **Chat** | ⏳ Aguardando discussão do schema |
| **System** | ⏳ Aguardando discussão do schema |

> Regra: cada módulo passa por `/lgpd-check` antes de ser marcado como ✅ Aprovado.

---

*Fonte: Lei nº 13.709/2018 (LGPD). Material de referência: Faculdade de Tecnologia Rocketseat — Carlos Fábio Andrade.*
