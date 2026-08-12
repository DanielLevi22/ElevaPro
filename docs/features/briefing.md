# Feature: briefing

**Status:** active
**PRD:** [briefing](../PRDs/briefing.md)
**Plataformas:** web
**Última atualização:** 2026-08-12

---

## O que é

`/dashboard/briefing` — a tela de abertura do dia do especialista. Responde a uma
pergunta: **quem precisa de mim hoje?**

## Por que existe

O `/dashboard` mostra quatro contagens. Nenhuma responde a pergunta com que o
especialista abre o sistema, e para descobrir que um aluno sumiu ele precisava
entrar aluno por aluno.

O aluno que abandona não avisa — ele para de registrar treino. Esse silêncio era
invisível na tela anterior, e é o sinal que chega cedo o bastante para agir.

---

## Fluxo de dados

```
/dashboard/briefing  (Server Component)
  → briefingService.fetchBriefing(specialistId)
      → student_specialists   (vínculos ativos — define o universo)
      → Promise.all([ profiles, student_anamnesis, training_periodizations,
                      workout_sessions, workouts, diet_plans, ai_chat_sessions ])
  → BriefingSignal[]   ← já derivado
  → <BriefingPage />
```

O universo sai dos vínculos ativos **antes** de tudo, e as sete buscas seguintes
filtram por essa lista. Em série, a tela esperaria sete idas ao banco.

## Tabelas do banco

| Tabela | Lê | RLS |
|---|---|---|
| `student_specialists` | vínculos `active` do especialista | ✅ |
| `profiles` | `full_name`, `account_status` | ✅ |
| `student_anamnesis` | **só `completed_at`** — nunca `responses` | ✅ |
| `training_periodizations` | existe uma `active`? | ✅ |
| `workout_sessions` | **só `completed_at`**, janela de 60 dias | ✅ |
| `workouts`, `diet_plans`, `ai_chat_sessions` | contagem (`head: true`) | ✅ |

Nenhum campo novo, nenhuma tabela nova, nenhuma escrita.

---

## Implementação

### Compartilhado (`shared/src/`)

| Arquivo | Responsabilidade |
|---|---|
| `services/briefing.service.ts` | Deriva os sinais e os números |
| `types/briefing.types.ts` | `BriefingSignal`, `BriefingStats`, `Briefing` |

### Web (`web/src/`)

| Tipo | Arquivo | Responsabilidade |
|---|---|---|
| Page | `app/dashboard/briefing/page.tsx` | Server Component: sessão, papel, busca |
| Page | `modules/briefing/pages/BriefingPage.tsx` | Composição da tela |
| Component | `modules/briefing/components/BriefingSummary.tsx` | Parágrafo de abertura |
| Component | `modules/briefing/components/AttentionCard.tsx` | Cartão de aluno |
| Component | `modules/briefing/components/StatStrip.tsx` | Faixa de números |

---

## Regras de negócio

1. **Inatividade: 7 dias sem sessão concluída.** Sete porque a prescrição é
   semanal — `workouts` tem `day_of_week` —, então quem treina em qualquer
   frequência deveria ter uma sessão na semana. Com quatro ou cinco, o alerta
   dispara para quem treina 3x e descansou o fim de semana.
2. **Convite pendente: 3 dias.** E vem *no lugar* da inatividade, não junto:
   quem nunca entrou não tem como estar treinando, então marcá-lo de inativo
   seria ruído em cima de um aluno já sinalizado por outro motivo.
3. **Anamnese pronta** só quando existe `completed_at` **e** não existe
   periodização `active`. Com plano ativo, não há o que fazer.
4. **Um sinal por aluno**, o mais urgente. A lista responde "o que fazer
   agora", não "tudo que se sabe".
5. **Ordem:** inativo → convite → anamnese; dentro do mesmo tipo, quem espera
   há mais tempo primeiro.
6. **Janela de 60 dias** nas sessões. Além disso a frase vira "sem treino
   registrado nos últimos dois meses" — número exato que ninguém usa não vale a
   consulta que cresce com o histórico.

## Decisões técnicas não-óbvias

- **Server Component, e o sinal atravessa já derivado.** Se o cliente recebesse
  as sessões para calcular a inatividade, o dado de saúde cru ficaria no HTML da
  página. O que cruza a fronteira é `"não treina há 12 dias"`, nunca o treino.

- **O parágrafo é template, não IA.** Mandar nome e situação de saúde de aluno
  para um modelo é outro tratamento, com outra base legal — e o valor da tela
  não depende disso.

- **Um `Map` para a última sessão de cada aluno.** Com 30 alunos e 60 dias de
  histórico, procurar na lista por aluno roda milhares de vezes por render.

- **Tons literais no `AttentionCard`.** O Tailwind só gera classe que aparece
  inteira no fonte; montar `text-${tone}` produz classe que não existe no CSS.
  Mesma armadilha registrada no `DataTable`.

- **Largura cheia.** O `main` do dashboard já não tem `max-width`; só o
  parágrafo de abertura guarda medida própria, porque linha longa demais é o que
  faz o olho perder a próxima.

## O que ficou de fora, e por quê

| Item do design | Motivo |
|---|---|
| "Bateu 3 PRs esta semana" | A política de leitura existe desde a `0017`, mas a dívida #9 continua: `workout_session_sets` e `workout_session_exercises.sets_data` guardam o mesmo dado. Detectar recorde exige antes decidir qual manda |
| "94% retenção" | Não existe fonte nem definição. Número que o especialista lê como real e não é, é pior que omitir |
| "+18% no mês" nas sessões de IA | Exige série histórica; a contagem entra, a variação não |

## Divergências web ↔ mobile

Não existe no mobile. É a tela de trabalho do especialista, que usa o web.

## Verificação

- 21 testes: 15 no serviço (limiares, ordem, o que **não** é lido), 6 na tela
  (estados cheio, vazio-com-alunos e vazio-sem-alunos, concordância no singular)
- Exercitado contra o banco local com dois especialistas e cinco alunos: cada um
  viu só os próprios, com os três tipos de sinal na ordem certa
