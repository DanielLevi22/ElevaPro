# Glossário — Linguagem Ubíqua do MeuPersonal

> Este documento define os termos canônicos do domínio. Quando houver dúvida sobre
> como nomear algo no código, na UI ou na documentação — este glossário decide.
> Atualizar sempre que um novo conceito de domínio for introduzido.

---

## Regra de uso

- **Nome canônico**: o termo que usamos em código (variáveis, funções, tabelas)
- **Nome na UI**: o que o usuário vê na interface
- **Nunca usar**: termos que já causaram confusão e foram descartados

---

## Pessoas

| Nome canônico | Nome na UI | Tipo no banco | Nunca usar |
|---|---|---|---|
| `admin` | Administrador | `profiles.account_type = 'admin'` | "root", "superuser" |
| `specialist` | Personal Trainer | `profiles.account_type = 'specialist'` | "personal", "trainer", "coach", "professional" |
| `student` | Aluno | `profiles.account_type = 'student'` | "cliente", "paciente", "user", "managed_student" |
| `member` | Membro | `profiles.account_type = 'member'` | "autonomous_student", "aluno autônomo" |

> `student` treina sob um `specialist`; `member` é independente e gerencia os
> próprios planos. A fonte da verdade é o enum `account_type` em
> [`shared/src/types/auth.types.ts`](../shared/src/types/auth.types.ts) —
> qualquer divergência aqui é bug de documentação.

---

## Nutrição

| Nome canônico | Nome na UI | Tabela principal | Descrição |
|---|---|---|---|
| `DietPlan` | Plano Alimentar | `diet_plans` | Plano nutricional completo atribuído a um aluno. Pode ser `unique` (mesmo cardápio todo dia) ou `cyclic` (cardápio varia por dia da semana). |
| `DietMeal` | Refeição | `diet_meals` | Uma refeição dentro de um DietPlan. Tem horário, ordem e dia da semana. |
| `DietMealItem` | Alimento da Refeição | `diet_meal_items` | Um alimento específico dentro de uma DietMeal, com quantidade e unidade. |
| `Food` | Alimento | `foods` | Item do banco de alimentos com informações nutricionais por porção. |
| `MealLog` | Registro de Refeição | `meal_logs` | Registro de que o aluno efetivamente consumiu uma DietMeal em uma data específica. |
| `serving_size` | Porção de referência | — | Quantidade base do Food para cálculo de macros (ex: 100g). Macros são sempre calculados proporcionalmente: `(quantity / serving_size) * macro`. |

### Tipos de DietPlan

| Valor | Significado |
|---|---|
| `unique` | Cardápio único — mesmas refeições todos os dias (`day_of_week = -1`) |
| `cyclic` | Cardápio cíclico — refeições variam por dia da semana (`day_of_week = 0-6`, onde 0 = domingo) |

### Status de DietPlan

| Valor | Significado |
|---|---|
| `draft` | Em criação, não atribuído ao aluno |
| `active` | Plano atual do aluno |
| `completed` | Período encerrado normalmente |
| `finished` | Encerrado manualmente antes do fim |

---

## Treino

| Nome canônico | Nome na UI | Tabela principal | Descrição |
|---|---|---|---|
| `Periodization` | Periodização | `periodizations` | Estrutura macro do planejamento de treino de um aluno. Contém Phases. |
| `Phase` | Fase | `periodization_phases` | Bloco de tempo dentro de uma Periodização (ex: "Hipertrofia", "Força"). Contém Workouts. |
| `Workout` | Treino | `workouts` | Sessão de treino template dentro de uma Phase. Contém WorkoutItems. |
| `WorkoutItem` | Exercício do Treino | `workout_items` | Um exercício dentro de um Workout, com séries, repetições e carga. |
| `Exercise` | Exercício | `exercises` | Item do banco de exercícios com nome, grupo muscular e instruções. |
| `WorkoutSession` | Sessão Realizada | `workout_sessions` | Registro de execução real de um Workout por um aluno em uma data. |
| `WorkoutSessionItem` | Série Realizada | `workout_session_items` | Registro de um exercício específico dentro de uma WorkoutSession, com carga e reps reais. |

---

## Avaliação

| Nome canônico | Nome na UI | Tabela principal | Descrição |
|---|---|---|---|
| `Assessment` | Avaliação | `assessments` | Avaliação física de um aluno em uma data (peso, medidas, composição). |

---

## Sistema

| Nome canônico | Significado |
|---|---|
| `professional_id` | FK para `profiles.id` do professional responsável. Presente em quase todas as tabelas. |
| `RLS` | Row Level Security — política do Supabase que garante que cada professional só vê seus próprios dados. **Toda nova tabela deve ter RLS.** |
| `BFF` | Backend-for-Frontend — as API Routes do Next.js (`web/src/app/api/`) que servem como backend compartilhado para web e mobile. |
