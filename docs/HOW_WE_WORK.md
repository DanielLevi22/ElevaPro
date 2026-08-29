# Como Trabalhamos — Eleva Pro

> O fluxo de desenvolvimento, do "tive uma ideia" ao merge.
> As regras de código estão no [`CLAUDE.md`](../CLAUDE.md); aqui está a ordem das coisas.
> Última atualização: 2026-08-29

---

## Visão geral do ciclo

```
IDEIA → GRELHA → ISSUE → SEAMS → CÓDIGO → REVISÃO → MERGE → DECISÃO REGISTRADA
```

Nenhuma etapa é pulada. Os git hooks travam as que dá pra travar — e quando travam,
dizem o que fazer. Este documento não repete o que eles falam.

---

## 1. Ter uma ideia ou tarefa

Antes de qualquer coisa, responda mentalmente:

- **O quê** vou construir?
- **Por quê** isso precisa existir agora?
- **Como** vou saber que está pronto?

Se não conseguir responder as 3, a tarefa ainda não está madura. Não começa.

---

## 2. Ser grelhado antes de escrever a spec

A spec preenchida sozinha é a spec que ninguém contestou. As 3 perguntas
respondidas de cabeça costumam esconder decisão não tomada, e isso só aparece
depois, no código.

```
/mattpocock-skills:grill-me
```

O agente monta uma **árvore de decisão** e trabalha por rodadas. Em cada rodada
ele pergunta tudo que já dá pra perguntar — cada pergunta numerada, com a
resposta que ele recomenda — e espera. Suas respostas empurram a fronteira e
abrem a rodada seguinte. Acaba quando a fronteira esvazia: nenhum galho ficou
suposto em silêncio.

Regra da grelha: **fato é trabalho do agente, decisão é sua.** Se a pergunta
depende de algo que dá pra descobrir no repo, ele descobre; não pergunta a você.

Com a grelha fechada:

```
/mattpocock-skills:to-spec
```

Isso publica a spec como **issue no GitHub** com o label `ready-for-agent` —
problema, solução, user stories, decisões de implementação, decisões de teste e
o que ficou fora. Não vira arquivo em `docs/` ([ADR-0013](adr/0013-specs-vivem-no-issue-tracker.md)).

> Vale para mudança pequena também. Uma rodada curta de grelha custa menos que
> um PR refeito.

**A spec não carrega caminho de arquivo nem trecho de código.** Os dois
envelhecem antes de a issue fechar. O que ela carrega é decisão.

---

## 3. Abrir a branch a partir da issue

**Nunca crie uma branch manualmente.** Use o script, passando o número da issue:

```bash
node scripts/new-feature.js 126
```

Ele recusa issue que não esteja `ready-for-agent`, atualiza `development`, cria
`feature/<numero>-<slug>` e atribui a issue a você.

O número na frente da branch não é enfeite: é por ele que o pre-commit reencontra
a issue a cada commit.

---

## 4. Implementar

- Nenhuma adição de escopo não acordada na issue. Se surgir algo novo → pausar,
  comentar na issue, retomar.
- **Teste primeiro, nos seams da issue.** Red → green, uma fatia vertical por vez:
  um teste que falha → o mínimo de código pra passar → próxima fatia. Nunca a
  bateria toda antes da implementação — teste em massa verifica comportamento
  *imaginado*. Refatorar não faz parte do loop; é revisão.
- Nenhum teste em seam que não esteja na issue.
- Ao desenhar módulo novo: interface pequena, muito comportamento atrás dela. O
  **teste da deleção** decide se ele se paga — se apagar o módulo faz a
  complexidade sumir, ele era só passagem; se ela reaparece espalhada nos
  chamadores, ele estava ganhando o salário.
- Commits frequentes e pequenos.

---

## 5. Commitar e abrir o PR

```bash
git commit -m "tipo(escopo): descrição em minúsculas"
git push -u origin feature/<numero>-<slug>
```

Os tipos aceitos estão no `commitlint.config.js`, e o hook `commit-msg` recusa o
que não estiver lá. O PR vai de `feature/*` para `development`, com título no
mesmo formato e uma descrição que diga o que foi feito e como testar.

`--no-verify` é proibido. Se um hook barrou, ele achou algo — a saída dele diz o quê.

---

## 6. Revisar em dois eixos

Antes de pedir aprovação. Roda dois sub-agentes em paralelo, justamente para um
não contaminar o outro:

```
/mattpocock-skills:code-review
```

| Eixo | Pergunta | Fonte da verdade |
|---|---|---|
| **Standards** | O código segue as convenções do projeto? | `CLAUDE.md` + `CONTEXT.md` |
| **Spec** | O que foi construído é o que foi decidido? | A issue da branch |

O eixo Spec é o que pega o desvio silencioso — a feature que funciona mas não é a
que foi acordada na grelha. É por isso que as decisões resolvidas ficam escritas
na issue.

> ⚠️ Use o nome completo com prefixo. `/code-review` sem prefixo é o comando
> nativo do Claude Code, que faz outra coisa (procura bug no diff). Os dois
> servem; não são o mesmo.

---

## 7. Registrar o que o código não conta

Depois do PR aprovado, antes de mergear. Pergunte as três, e **só escreva se as
três forem sim**:

1. **Difícil de reverter** — mudar de ideia depois custa caro?
2. **Surpreendente sem contexto** — quem ler o código vai perguntar "por que assim?"
3. **Trade-off real** — havia alternativa e você escolheu uma por um motivo?

Se sim, `docs/adr/NNNN-titulo.md` no formato do `_template.md`: um parágrafo basta.
Se não, **não escreva nada** — armadilha local vira comentário no código, onde quem
for mexer vai encontrar. Documento que ninguém precisa é documento que vai mentir
depois.

Termo de domínio novo entra no `CONTEXT.md` na hora, não no fim.

Então feche a issue:

```bash
gh issue close <numero> --comment "Entregue em <PR>"
```

---

## 8. Mergear

- [x] Lint, typecheck e testes limpos
- [x] PR aprovado
- [x] ADR escrito, se houve decisão difícil de reverter
- [x] Issue fechada

---

## Qual skill em qual passo

As skills do plugin `mattpocock-skills` são invocadas por você, digitando; o
agente não as dispara sozinho.

| Passo | Comando | O que faz |
|---|---|---|
| 2 | `/mattpocock-skills:grill-me` | Entrevista em rodadas até fechar a árvore de decisão |
| 2 | `/mattpocock-skills:to-spec` | Converte a conversa em issue, sem entrevistar de novo |
| 4 | `/mattpocock-skills:implement` | Executa a issue dirigindo o loop red→green nos seams |
| 6 | `/mattpocock-skills:code-review` | Revisão Standards + Spec em paralelo |
| — | `/mattpocock-skills:grill-with-docs` | Igual ao `grill-me`, mas atualiza `CONTEXT.md` e ADR durante a conversa |
| — | `/mattpocock-skills:triage` | Passa as issues pelo estado de triagem — é o que transforma backlog em fila |
| — | `/mattpocock-skills:improve-codebase-architecture` | Varre o codebase atrás de módulos rasos. Ritual periódico, não de feature |
| — | `/mattpocock-skills:ask-matt` | Não sabe qual usar? Pergunta aqui |

Estas o agente alcança sozinho quando a tarefa pede, sem você digitar:
`tdd`, `codebase-design`, `domain-modeling`, `diagnosing-bugs`,
`resolving-merge-conflicts`, `research`, `prototype`.

**Continuam mandando sobre elas:** `/lgpd-check` antes de campo ou tabela nova, e
`vercel-react-best-practices` em qualquer componente React. Skill de fora não
revoga bloqueador do projeto.

---

## Papéis

| Quem | Responsabilidade |
|---|---|
| **Daniel** | Define prioridade, faz a triagem das issues, aprova PR, decide sobre escopo |
| **Agente (Claude)** | Propõe abordagem técnica, implementa, recusa implementação sem issue `ready-for-agent` |

O agente não começa a codar sem issue `ready-for-agent`. Se não houver, ele faz as
3 perguntas e aguarda a issue ser criada e triada.

Na grelha a divisão é mais fina: **fato é do agente, decisão é do Daniel.** Se
responder a pergunta depende de algo que dá pra descobrir no repo, no banco ou na
doc, o agente descobre — perguntar isso é empurrar trabalho pra cima de você. O que
sobe pra você é só o que exige julgamento de produto.
