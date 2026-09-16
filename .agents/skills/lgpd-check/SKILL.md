---
name: lgpd-check
description: Revisão de conformidade LGPD do Eleva Pro. Use ao criar ou alterar tabela e campo do Supabase, ao tratar dado de saúde (physical_assessments, student_anamnesis, workout_sessions, diet_logs, health_daily_metrics), e ao implementar onboarding, consentimento, exportação ou exclusão de dados. Produz parecer por bloco com base legal, finalidade e minimização.
metadata:
  author: Daniel Levi
  version: "1.0.0"
---

# Skill: /lgpd-check

## Quando usar

Invocar este skill sempre que for:
- Projetar ou aprovar um novo módulo de schema
- Adicionar campos que coletam dados pessoais ou de saúde
- Implementar features de onboarding, formulários, exportação ou exclusão de dados
- Revisar uma feature existente para compliance antes de lançar

---

## O que fazer ao ser invocado

### 1. Identificar o contexto da revisão

Antes de qualquer análise, perguntar (se não estiver claro):
- Qual tabela, campo ou feature está sendo revisada?
- Qual é a finalidade do dado sendo coletado?
- Quem vai acessar esse dado (specialist, student, admin)?

### 2. Ler o documento base

Ler `docs/LGPD_COMPLIANCE.md` para ter o mapa de dados e bases legais atualizados.

### 3. Executar a revisão estruturada

Para cada item abaixo, responder ✅ Conforme / ❌ Não conforme / ⚠️ Atenção necessária:

#### Bloco A — Necessidade e Finalidade (Art. 6°, I e III)
- [ ] O dado tem finalidade declarada e específica?
- [ ] O dado é estritamente necessário para a funcionalidade operar?
- [ ] Existe algum campo que poderia ser removido sem impactar o serviço?
- [ ] O dado já está coberto por alguma outra tabela/campo existente?

#### Bloco B — Base Legal (Art. 7° ou Art. 11)
- [ ] Existe base legal documentada para cada novo dado coletado?
- [ ] Se dado de saúde (peso, gordura, circunferências, anamnese, treinos, dieta) → base é Tutela da Saúde (Art. 11, II, f) + Consentimento ou Consentimento Explícito (Art. 11, I)?
- [ ] Se dado comum (nome, e-mail, tipo de conta) → base é Execução de Contrato (Art. 7°, V)?
- [ ] Consentimento, quando usado, é livre / informado / inequívoco / específico / revogável?

#### Bloco C — Segurança e Acesso (Art. 6°, VII)
- [ ] RLS será habilitado nessa tabela?
- [ ] Políticas RLS definidas: quem pode SELECT / INSERT / UPDATE / DELETE?
- [ ] Para dados de saúde: apenas aluno proprietário + especialista com `student_specialists.status = 'active'`?
- [ ] Especialista desvinculado perde acesso automaticamente via RLS?
- [ ] Dados de um especialista não ficam visíveis para outro especialista sobre o mesmo aluno?

#### Bloco D — Direitos dos Titulares (Art. 18)
- [ ] O usuário consegue ver esses dados na tela "Meus Dados"?
- [ ] O usuário consegue corrigir esses dados?
- [ ] O usuário consegue solicitar exclusão desses dados?
- [ ] Se o usuário pedir exclusão de conta, o que acontece com esses dados? (Eliminar ou anonimizar — soft delete não é eliminação)

#### Bloco E — Prevenção e Transparência (Art. 6°, VI e VIII)
- [ ] Esses dados aparecerão em algum log de aplicação? (Dados sensíveis não podem ser logados em texto claro)
- [ ] O onboarding informa o usuário sobre coleta desses dados?
- [ ] A Política de Privacidade cobre esses dados?

### 4. Gerar o output

Apresentar o resultado em formato estruturado:

```
## Resultado do /lgpd-check — [Nome da feature/tabela]

### Blocos conformes
- Bloco A ✅
- ...

### Itens que precisam de atenção
- ⚠️ [descrição do item] → [o que precisa ser feito]

### Bloqueadores (não implementar sem resolver)
- ❌ [descrição] → [ação obrigatória]

### Testes de trava LGPD (obrigatório — ver passo 5)
- [ ] `arquivo:teste` — [a proibição] — [artigo]
- [ ] Prova negativa feita: [como o controle foi revertido e qual teste falhou]

### Atualizações necessárias em docs/LGPD_COMPLIANCE.md
- [ ] Adicionar [campo/tabela] ao mapa de dados (Seção 2.x)
- [ ] Documentar base legal para [tratamento]
- [ ] Atualizar checklist pré-lançamento se necessário
```

### 5. Escrever os testes de trava LGPD — obrigatório

**Todo `/lgpd-check` que aprova uma feature produz teste de trava.** Sem isso a
revisão vira parecer arquivado: a decisão fica no documento e o controle fica no
código, e a distância entre os dois é como nasce "controle documentado que o
banco não tem" — foi exatamente o que a auditoria de 2026-08-11 encontrou em
`workout_sessions` (decisão dizia "RLS bloqueia", tabela estava sem RLS nenhuma)
e o que o PRD `session-feedback-correction` reencontrou em 2026-08-28.

Um teste de trava não verifica que a feature funciona. Ele verifica **que ela
continua restrita**, e existe para falhar na cara de quem tentar afrouxar a
restrição sem saber que ela é jurídica.

**A regra das três partes.** Todo teste de trava tem:

1. **Nome que diz a proibição**, não o mecanismo.
   `'aluno não altera a data da sessão'`, nunca `'testa privilégio de coluna'`.
2. **Comentário com o artigo e o porquê**, imediatamente acima. É o que a pessoa
   lê às 2h da manhã quando o teste barra o atalho dela. Precisa responder "por
   que não posso simplesmente mudar isto?" sem abrir outro arquivo.
3. **Mensagem de falha que nomeia o dano**, não o valor esperado.
   `'HISTÓRICO REESCRITO: UPDATE de completed_at foi aceito'` diz o que
   aconteceu de errado; `expected 0 to be 1` manda a pessoa procurar sozinha.

**Onde cada trava mora**, conforme o que ela protege:

| O que a revisão decidiu | Onde o teste vai |
|---|---|
| Quem lê e escreve cada linha, quais colunas | `scripts/verify-rls.sql` — roda contra o banco real |
| Consentimento antes de gravar dado sensível | teste do store/service que grava |
| Campo que não pode ser logado nem retornado | teste do service, afirmando ausência |
| Dado que não atravessa fronteira para o cliente | teste do service, sobre o payload |
| Retenção, eliminação, cascata | `verify-rls.sql` ou teste de migration |

**Prova negativa obrigatória.** Teste que passa sem poder falhar não é trava, é
decoração — e é pior que nada, porque dá confiança falsa. Antes de dar a revisão
por concluída, reverta o controle num escopo descartável (transação com
`ROLLBACK`, mock invertido) e confirme que o teste **falha**. Registre no PRD que
a prova negativa foi feita.

**Afirme a ausência, não só a presença.** "O especialista lê o aluno vinculado"
passa com uma política que deixa todo mundo ler tudo. O teste que vale é o par:
lê o vinculado **e** não lê o não-vinculado. Para dado sensível, sempre semeie
linhas dos DOIS lados — assim "zero linhas" significa bloqueio, e não tabela
vazia.

**No output da revisão**, listar as travas escritas em uma seção própria:

```
### Testes de trava LGPD
- [ ] `arquivo:teste` — [a proibição, em uma linha] — [artigo]
- [ ] Prova negativa: [como o controle foi revertido e qual teste falhou]
```

### 6. Atualizar o mapa de dados

Se novos dados foram identificados como conformes, atualizar `docs/LGPD_COMPLIANCE.md`:
- Seção 2.1 (dados comuns) ou 2.2 (dados sensíveis) com o novo campo
- Seção 3 com a base legal do novo tratamento
- Seção 7 com a política de retenção se aplicável

---

## Referência rápida — bases legais mais usadas no Eleva Pro

| Situação | Base legal | Artigo |
|----------|------------|--------|
| Criar conta, autenticar, dados de perfil | Execução de contrato | Art. 7°, V |
| Specialist cria conta do aluno | Execução de contrato + consentimento posterior | Art. 7°, V + I |
| Avaliações físicas, dieta | Tutela da saúde + Consentimento | Art. 11, II, f + I |
| Anamnese de saúde | Consentimento explícito | Art. 11, I |
| Prescrição de treinos | Execução de contrato | Art. 7°, V |
| Logs de acesso/segurança | Legítimo interesse | Art. 7°, IX |
| Gamificação, histórico de uso | Execução de contrato | Art. 7°, V |

## Referência rápida — o que NÃO coletar

Dados já rejeitados do schema por violação do Princípio da Necessidade:
- `birth_date` / `gender` em `profiles`
- `phone` sem uso funcional
- `cref` / `crn` removidos do fluxo
- Qualquer campo "pode ser útil no futuro"
