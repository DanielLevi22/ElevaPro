# System Mapping — Mapeamento Completo do Sistema

> **Status:** ✅ Concluído em 2026-04-13
> **Objetivo:** Entender feature por feature o que existe, o que funciona, o que é código morto e quais decisões de schema tomar — antes de qualquer reescrita.
> **Resultado:** Base para a reescrita modular completa do sistema.

---

## Status geral dos módulos

| Módulo | Status | Relatório detalhado |
|--------|--------|---------------------|
| **Auth** | ✅ Mapeado | [AUTH_MODULE_REPORT.md](AUTH_MODULE_REPORT.md) |
| **Students** | ✅ Mapeado | [STUDENTS_MODULE_REPORT.md](STUDENTS_MODULE_REPORT.md) |
| **Nutrition** | ✅ Mapeado | [NUTRITION_MODULE_REPORT.md](NUTRITION_MODULE_REPORT.md) |
| **Workouts** | ✅ Mapeado | [WORKOUTS_MODULE_REPORT.md](WORKOUTS_MODULE_REPORT.md) |
| **Assessment** | ✅ Mapeado | [ASSESSMENT_MODULE_REPORT.md](ASSESSMENT_MODULE_REPORT.md) |
| **Gamification** | ✅ Mapeado | [GAMIFICATION_MODULE_REPORT.md](GAMIFICATION_MODULE_REPORT.md) |
| **Chat** | ✅ Mapeado | [CHAT_MODULE_REPORT.md](CHAT_MODULE_REPORT.md) |
| **System/Admin** | ✅ Mapeado | [SYSTEM_MODULE_REPORT.md](SYSTEM_MODULE_REPORT.md) |

---

## Decisões tomadas — Auth

**Roles (account_type):**
- `admin` — Daniel gerencia a plataforma
- `professional` — personal trainer e/ou nutricionista
- `managed_student` — criado e gerenciado pelo profissional
- `autonomous_student` — fluxo de cadastro autônomo (roadmap, não existe ainda)

**Aprovação de profissional:**
- Profissional se cadastra → `account_status = pending`
- Admin aprova manualmente → `account_status = active`
- Enquanto `pending`: acesso bloqueado por RLS

**Tipos de serviço do profissional:**
- Escolhidos no cadastro (personal_training, nutrition_consulting, ou ambos)
- Tabela separada `professional_services` — um profissional pode ter múltiplos tipos

**Campos a remover de `profiles`:**
`invite_code`, `phone`, `cref`, `crn`, `professional_bio`, `is_verified`, `verified_at`,
`admin_notes`, `last_login_at` — todos legados, nunca usados de forma funcional

**Campos a mover de `profiles`:**
- `weight`, `height` → `physical_assessments`
- `xp`, `level` → gamification (campo na própria tabela ou `student_streaks`)

---

## Divergências críticas identificadas (schema Drizzle vs produção real)

| Schema Drizzle (errado) | Produção real (correto) | Ação |
|------------------------|------------------------|------|
| `student_professionals` | `coachings` | Renomear para `student_professionals` no novo schema |
| `periodizations` | `training_periodizations` | Manter `periodizations` (mais simples) |
| `diet_plans` / `diet_meals` / `diet_meal_items` | `nutrition_plans` / `meals` / `meal_foods` | Manter nomes do Drizzle (mais específicos) |
| — | `student_anamnesis` | Adicionar ao schema |
| — | `conversations` + `messages` | Adicionar ao schema |

> **Decisão:** projeto novo, nomes novos. Drizzle vence — nomes mais semânticos e sem colisões.

---

## Schema canônico — tabelas finais

```
Auth
  profiles                    → id, email, full_name, avatar_url, account_type,
                                account_status, is_super_admin, birth_date, gender
  professional_services       → professional_id, service_type, is_active

Students
  student_professionals       → professional_id, student_id, service_type, status
  physical_assessments        → student_id, peso, altura, dobras, circunferências, fotos, BMI, BMR
  student_anamnesis           → student_id, responses (jsonb), completed_at

Nutrition
  foods                       → name, calories, protein, carbs, fat, fiber, serving_size, is_custom
  diet_plans                  → professional_id, student_id, name, status
  diet_meals                  → diet_plan_id, name, meal_time, day_of_week
  diet_meal_items             → diet_meal_id, food_id, quantity
  meal_logs                   → student_id, diet_meal_id, logged_date, completed

Workouts
  exercises                   → name, muscle_group, is_verified, created_by
  periodizations              → professional_id, student_id, objective, status
  training_plans              → periodization_id, name, order
  workouts                    → training_plan_id, title, day_of_week
  workout_exercises           → workout_id, exercise_id, sets, reps, rest, notes
  workout_sessions            → student_id, workout_id, started_at, finished_at, intensity
  workout_session_exercises   → session_id, exercise_id, sets_data (jsonb)

Gamification
  student_streaks             → student_id, current_streak, longest_streak, xp, level
  daily_goals                 → student_id, date, water_target, water_completed,
                                meals_completed, workout_completed, completed
  achievements                → student_id, type, points, unlocked_at

Chat
  conversations               → professional_id, student_id, last_message_at
  messages                    → conversation_id, sender_id, receiver_id,
                                content, message_type, media_url, read_at

System
  feature_flags               → flag_key, is_enabled, rollout_percentage
  feature_access              → subscription_tier, feature_key, limit_value, is_enabled
```

**Total: 25 tabelas** (eram 21 no Drizzle anterior — faltavam anamnesis, conversations, messages, professional_services)

---

## Código morto confirmado

| Módulo | O que é | Ação |
|--------|---------|------|
| Auth | Fluxo de invite code (web + mobile) | Deletar na reescrita de Auth |
| Auth | Campos legados em profiles (cref, crn, phone, etc.) | Não criar no novo schema |
| Students | `student_invites` — 0 rows, não usado | Não criar no novo schema |
| Students | `coachings` — renomear, não recriar |  Migrar para `student_professionals` |
| Nutrition | Notificações de refeição (kill switch ativo) | Não portar para o novo código |
| Workouts | `workout_logs` — 0 referências no código | Não criar no novo schema |

---

## Plano de reescrita — ordem definida

> **Estratégia:** cada módulo é reescrito em uma branch. O legado convive durante a branch.
> O PR que entra em `development` já sai limpo — legado deletado no mesmo commit.

```
feature/schema-foundation   → Drizzle reescrito + aplicado nos projetos Supabase dev e prod
feature/rewrite-auth        → profiles, professional_services, fluxo de aprovação
feature/rewrite-students    → student_professionals, physical_assessments, anamnesis
feature/rewrite-nutrition   → diet_plans, diet_meals, diet_meal_items, meal_logs, foods
feature/rewrite-workouts    → periodizations, training_plans, workouts, workout_sessions
feature/rewrite-assessment  → AI body scan, integração com anamnesis
feature/rewrite-gamification→ streaks, daily_goals, achievements, xp
feature/rewrite-chat        → conversations, messages, realtime
feature/rewrite-system      → feature_flags, feature_access, admin panel
```

---

## Novos módulos — Eleva Pro (adicionados em 2026-04-19)

As tabelas abaixo estendem o schema canônico das 25 tabelas originais.
Toda nova tabela segue as mesmas regras: RLS obrigatório, uuid, timestamptz.

```
AI
  ai_chat_sessions            → student_id, specialist_id, module, created_at
  ai_chat_messages            → session_id, role, content, metadata (jsonb)

Engagement
  daily_habit_logs            → student_id, log_date, sleep_quality, energy_level, hydration_ok
  weekly_reviews              → student_id, week_start, week_end, summary_text, metrics (jsonb)

Check-in e Progresso
  student_checkins            → student_id, photo_urls[], analysis_text, analysis_metadata (jsonb)
  pending_plan_adjustments    → student_id, checkin_id, module, before_snapshot, after_snapshot,
                                diff_summary, reason, status (pending/approved/rejected)

Notificações
  student_notifications       → student_id, type, title, body, metadata, read_at, push_sent_at

Billing
  subscription_plans          → id (text PK), name, audience, price_brl, max_students, features (jsonb)
  subscriptions               → user_id, plan_id, status, provider, provider_subscription_id,
                                current_period_start, current_period_end, trial_end
  payment_events              → subscription_id, provider, event_type, payload (jsonb)

Marketplace
  specialist_public_profiles  → id (FK profiles), display_name, bio, specialties[], city,
                                price_range_min, price_range_max, cref, is_verified
  student_reviews             → specialist_id, student_id, student_specialist_id,
                                rating_overall, comment, specialist_reply
  marketplace_leads           → student_id, specialist_id, status, student_message

Especialista
  specialist_alerts           → specialist_id, student_id, type, severity, resolved_at
  specialist_whatsapp_settings → specialist_id, phone_number, is_active, alert_types[], quiet_hours
  admin_audit_logs            → admin_id, action, target_type, target_id, details (jsonb)
```

**Total novo: +17 tabelas → 42 tabelas no total**

---

## Arquitetura de IA — regras que não mudam

### Modelo por função (não negociar)

| Função | Modelo | Regra |
|---|---|---|
| Orquestrador de chat (treino/nutrição) | `claude-sonnet-4-6` | Multi-turn complexo, tool use |
| Sub-agentes (gerar JSON estruturado) | `claude-haiku-4-5-20251001` | 10x mais barato, nunca usar Sonnet aqui |
| Assistente diário, briefing, review | `claude-haiku-4-5-20251001` | Tarefas estruturadas, baixa latência |
| Análise de check-in com foto | `claude-sonnet-4-6` + Vision | Único com vision nativa no Claude |

```typescript
// Constantes — nunca hardcodar strings de modelo
export const AI_MODELS = {
  ORCHESTRATOR: "claude-sonnet-4-6",
  SUBAGENT:     "claude-haiku-4-5-20251001",
} as const;
```

### Análise corporal por imagem — o modelo não mede, ele interpreta

Peso e altura **entram** na chamada, vindos de `physical_assessments`; nunca
saem dela. A altura é a régua que converte pixel em centímetro, e a captura no
mobile guia o enquadramento para que dois escaneamentos sejam comparáveis.

A imagem **não é persistida** — só o resultado, em `body_scans`. A comparação
entre escaneamentos é subtração sobre linhas gravadas, não chamada de IA. Os
coaches leem o resultado por `query_body_scan`; foto nunca é reenviada ao chat.

Fluxo completo e o porquê de cada escolha: `docs/decisions/ADR-010-body-scan-calibrado.md`.

### Prompt caching — obrigatório onde contexto > 1000 tokens

```typescript
// Contexto do aluno vai em bloco cacheável — Claude cacheia por 5 min
// Em sessão de 10 mensagens: paga o contexto 1x, economiza ~85%
content: [
  { type: "text", text: studentContext, cache_control: { type: "ephemeral" } },
  { type: "text", text: userMessage }
]
```

### Onde vive o código de IA

```
web/src/app/api/ai/
  chat/[studentId]/route.ts       → orquestrador SSE (especialista)
  student/briefing/route.ts       → briefing pré-treino (REST, sem streaming)
  student/chat/route.ts           → assistente diário (SSE)
  student/checkin/route.ts        → análise de check-in com visão
  student/onboarding/route.ts     → criação de plano autônomo (SSE)
  student/plan/approve/route.ts   → aprovação de ajuste de plano
  report/weekly/route.ts          → chamado pelo cron job
```

**Nunca criar chamadas de IA fora de `/api/ai/`. Nunca chamar Anthropic direto do mobile.**

### Chat usa SSE. Tarefas pontuais usam REST.

```
SSE  → ai-coach-chat, assistente diário, onboarding
REST → briefing, análise de check-in, review semanal (cron)
```

---

## Billing — gates de features

Toda feature premium passa por `checkFeatureAccess()` antes de processar:

```typescript
// web/src/lib/billing/checkFeature.ts
export async function checkFeatureAccess(
  userId: string,
  feature: "ai_chat" | "checkin_analysis" | "whatsapp_alerts" | "marketplace"
): Promise<{ allowed: boolean; limit?: number; used?: number }>
```

Providers: **Stripe** (cartão) + **Asaas** (PIX/boleto). Webhooks processados em `/api/webhooks/`.

---

## Notificações — um canal, múltiplas entregas

```
Trigger (cron ou evento)
  → INSERT em student_notifications
  → Se mobile com push_token → Expo Push API
  → Se especialista com WhatsApp ativo (plano Pro+) → Meta Business API
```

WhatsApp usa templates pré-aprovados pela Meta — nunca mensagem livre.
Número do especialista requer consentimento explícito (LGPD).

---

## Cron jobs (Vercel Cron → Next.js Route Handlers)

| Job | Horário | O que faz |
|---|---|---|
| Review semanal alunos | Dom 20h | Haiku gera resumo, salva em `weekly_reviews` |
| Relatório especialista | Dom 21h | Consolida alunos, notifica especialista |
| Verificação de abandono | Diário 9h | Query SQL → insere em `specialist_alerts` |
| Expiração de trials | Diário 0h | Atualiza `subscriptions` vencidas |

---

## Anti-padrões — proibido no codebase

```typescript
// ❌ Query Supabase inline em componente ou página
const { data } = await supabase.from("workouts").select("*");
// ✅ Usar service de /shared/src/services/

// ❌ Chamar Anthropic API no mobile (expõe API key)
const r = await anthropic.messages.create({ ... });
// ✅ Chamar BFF: fetch("/api/ai/chat/studentId")

// ❌ Sonnet para tarefa estruturada (10x mais caro)
model: "claude-sonnet-4-6" // para gerar JSON de 3 campos
// ✅ model: "claude-haiku-4-5-20251001"

// ❌ Contexto grande sem cache
content: studentContext + userMessage // paga tokens inteiros toda mensagem
// ✅ cache_control: { type: "ephemeral" } no bloco de contexto

// ❌ Tabela sem RLS
CREATE TABLE nova_tabela (...); -- qualquer auth user lê tudo
// ✅ ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY; imediatamente após
```

---

## Checklist de PR — obrigatório antes de abrir

- [ ] Nenhuma query Supabase fora de `/shared/src/services/` ou `/api/`
- [ ] Toda nova tabela tem `ENABLE ROW LEVEL SECURITY` + políticas
- [ ] Nenhuma chave de API no código (só em variáveis de ambiente)
- [ ] Nenhum `any` no TypeScript sem justificativa em comentário
- [ ] Modelo de IA correto (Haiku para tarefas simples, Sonnet para orquestração)
- [ ] Prompt caching aplicado onde contexto > 1000 tokens
- [ ] `biome check` limpo
- [ ] `tsc --noEmit` limpo
- [ ] Testes para lógica de negócio nova

---

## Referências

Para detalhes técnicos de cada módulo, consultar os relatórios:

- [Auth](AUTH_MODULE_REPORT.md) · [Students](STUDENTS_MODULE_REPORT.md) · [Nutrition](NUTRITION_MODULE_REPORT.md)
- [Workouts](WORKOUTS_MODULE_REPORT.md) · [Assessment](ASSESSMENT_MODULE_REPORT.md)
- [Gamification](GAMIFICATION_MODULE_REPORT.md) · [Chat](CHAT_MODULE_REPORT.md) · [System](SYSTEM_MODULE_REPORT.md)

Para PRDs dos novos módulos: [docs/PRDs/README.md](PRDs/README.md)
