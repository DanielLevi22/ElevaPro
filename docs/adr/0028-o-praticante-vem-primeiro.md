# O Praticante vem primeiro, e quem orienta o Student é estado do vínculo

O produto tem dois modos e continua com os dois, mas o principal passa a ser o
**Praticante**: a pessoa que treina sem especialista, com o Assistente montando treino,
dieta e cardio para ela aprovar. O modo **Aluno**, acompanhado por um Specialist,
continua. E os dois deixam de ser papéis diferentes: são um Student só, com uma
**Guidance** (`specialist` ou `self_guided`) que sai do vínculo ativo, e não do
cadastro.

**Status:** accepted. Substitui a prioridade "B2B primário, B2C secundário" do
[ADR-0008](0008-billing-model.md); os preços e o aluno gerenciado gratuito daquele
ADR continuam valendo até a revisão dos planos.

## Por que o Praticante vem primeiro

É o modo com maior potencial de receita: cada Praticante é uma assinatura, sem
depender de um especialista para trazê-lo. O mercado de referência confirma o formato,
com apps que geram treino e dieta por IA ao próprio usuário (Fitbod, SensAI, Cal AI) e
relógios cujo treinador monta o plano sozinho (ver
[`docs/research/zepp-coach.md`](../research/zepp-coach.md)).

Na prática, toda funcionalidade passa a ser desenhada primeiro para quem não tem
especialista: sem prescrição por trás, com o Assistente propondo e o próprio Student
aprovando. O caso com especialista é o segundo, e reaproveita o mesmo fluxo com outro
aprovador. O [ADR-0020](0020-ia-nunca-persiste-sem-confirmacao.md) vale para os dois:
a IA propõe e só a aprovação humana grava.

## A adaptação do plano é regra, e o Assistente explica

Quem decide se o plano da semana sobe, mantém ou recua é um **motor de regras
determinístico**, não o modelo de linguagem. O Assistente entra depois: escreve ao
Student por que o ajuste aconteceu e, quando a regra pede mudança de estrutura, propõe o
plano reescrito para aprovação (ADR-0020).

- **Entradas:** carga de cada sessão (PSE × minutos), com média de 42 dias (forma) e de
  7 dias (fadiga); aderência ao prescrito; e a nota de recuperação quando o relógio
  entrega sono e FC de repouso.
- **Regras de partida**, as publicadas pela Zepp: carga que sobe mais de 50% na semana
  reduz a seguinte; cumprir menos de 50% do prescrito faz o plano recuar e subir aos
  poucos.
- **Com Guidance `specialist`**, a regra não muda o plano: vira alerta ao especialista,
  que é quem prescreve.

Por que não deixar a IA decidir: a regra dá a mesma resposta para os mesmos dados, cabe
num teste, e responde "por que meu treino caiu?" apontando o número que a disparou. A IA
decidindo seria mais cara a cada semana de cada Praticante, variaria entre execuções e
não teria como ser auditada. A PSE já é coletada em toda sessão (#295) e não é dado de
saúde, então o motor funciona sem relógio e sem consentimento de Art. 11.

## Por que um Student só, e não dois papéis

Hoje `account_type` guarda `student` ou `member`, e o valor registra **como a conta foi
criada**: quem se cadastra sozinho vira `member`, quem o especialista cadastra vira
`student`. Nada troca o papel quando a pessoa contrata ou encerra um especialista, e a
migration `0014` já existiu para corrigir conta gravada com o papel errado.

Mas "quem orienta esta pessoa" muda com o tempo, e o ADR-0008 prevê exatamente essa
mudança: o Praticante que contrata um especialista passa a ser pago por ele. Um papel
congelado no cadastro não representa isso. Então:

- `account_type` fica com `admin`, `specialist` e `student`. `member` sai.
- **Guidance é derivada**, nunca gravada à mão: `specialist` com vínculo ativo em
  `student_specialists`, `self_guided` sem ele.
- A interface diz "Aluno" para `specialist` e "Praticante" para `self_guided`.

`Practitioner` foi descartado como nome em inglês: sugere profissional de saúde, o
oposto do que se quer dizer. `Member` foi descartado por não dizer nada sobre quem
orienta a pessoa.

## Consequências

- **Migração do papel.** As contas `member` viram `student`, e o valor sai do enum. As
  funções de cadastro (`0040`, `0050`) passam a criar `student`, e o endurecimento que
  impede escolher o próprio papel continua valendo.
- **RLS e CASL passam a olhar o vínculo, não o papel.** "Gerencia os próprios planos"
  (`0012`, `0013`, `0033`) vale para Guidance `self_guided`. Um Student que encerra o
  especialista ganha essa permissão; o que o especialista criou continua dele.
- **Acesso por plano de assinatura** passa a ser central, porque o Praticante paga por
  recurso e o custo de IA por Praticante é real: estimado em ~R$ 6/mês no uso típico e
  ~R$ 17 no pesado, contra R$ 19 do plano mais barato antes da comissão das lojas. Cota
  por recurso é obrigatória, conferida no servidor. O desenho das travas (plano,
  relógio, consentimento) fica para a revisão da issue #160.
- **O Aluno herda o plano do especialista.** Os recursos de um Student com Guidance
  `specialist` são os do plano de assinatura do Specialist, e o Aluno não tem
  assinatura própria nem compra recurso avulso. Se o plano do especialista não inclui
  um recurso, o Aluno não o tem. Quando o vínculo acaba, o Student vira Praticante no
  plano gratuito até assinar — a conta e o histórico continuam os mesmos.
- **O custo do [ADR-0005](0005-ai-model-selection.md) não vale para este produto**: os
  R$ 0,67 por usuário foram estimados para um assistente leve, não para um que gera
  todos os planos.
- **Guarda-corpo em vez de bloqueio regulatório.** O Assistente gera plano para quem
  passa por triagem na anamnese; condição clínica (cardíaca, gestação, diabetes, renal,
  transtorno alimentar, medicação que altera FC) encaminha a um especialista, o que
  também é o caminho do Praticante para Aluno. Termos de uso e revisão jurídica curta
  entram no checklist de lançamento.
- **`CLAUDE.md` e `CONTEXT.md`** passam a descrever o Student com Guidance. O código
  segue com `member` até a migração acima.
