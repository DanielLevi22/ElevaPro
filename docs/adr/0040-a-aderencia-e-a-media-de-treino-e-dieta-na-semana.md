# A aderência é a média de treino e dieta na semana

O painel e a lista do especialista (issue #332) precisavam de um número só para "como está
indo o acompanhamento". Decidimos: **média entre duas contas independentes — sessões
concluídas sobre as prescritas na fase ativa, e `mealAdherence` (refeições feitas sobre
planejadas, issue #298) — nos últimos 7 dias dos dois lados**. Sem plano de um lado, o peso
vai todo para o outro; sem nenhum dos dois, `null`, nunca 0%.

**Status:** accepted.

## Por que média, e não uma conta nova

`mealAdherence` já existe e já é o que o aluno vê no próprio hub de Progresso — reaproveitá-la
em vez de recalcular por outro caminho evita que "aderência" signifique duas contas diferentes
no mesmo produto. O lado do treino não tinha equivalente pronto: é novo, mas seguindo a mesma
forma (feito sobre esperado) para os dois lados combinarem sem estranhar.

A janela é de 7 dias, não os 30 do hub do aluno. O painel do especialista é uma visão
operacional — "como foi a semana" — e não uma tendência histórica; e o próprio PRD pediu
"periodização ativa, janela semanal". Usar 30 dias aqui só para bater com o hub deixaria o
número lento para refletir uma semana ruim, que é exatamente o que o especialista quer ver.

## Por que sessões prescritas na fase ativa, e não na periodização inteira

Uma periodização tem fases (`training_plans`), e só uma costuma estar em andamento. Contar
contra a periodização inteira somaria treinos de fases que ainda não chegaram ou que já
passaram — um aluno na semana 2 de 16 apareceria como "cumprindo 2 de 64", que não é a
pergunta que o especialista faz.

## Por que média simples, e não pesos diferentes

Nenhum motivo apareceu para pesar um lado mais que o outro — o especialista acompanha os dois
igualmente quando o aluno contratou os dois. Se um dia isso mudar (por exemplo, o serviço
contratado for só um), o cálculo já faz isso sozinho: sem plano daquele lado, o peso vai
inteiro para o outro.

## Consequências

- O número do painel não é comparável ao do hub de Progresso do aluno (bases e janelas
  diferentes) — são duas métricas relacionadas, não a mesma métrica em dois lugares.
- Aluno sem periodização ativa nem plano de dieta ativo não aparece com 0%, aparece sem
  número (`null`, "Sem plano ativo" na tela) — 0% afirmaria abandono onde não há dado.
- Mudar a janela de 7 dias exige revisitar esta decisão, porque o PRD e os testes de trava a
  fixam nesse valor.
