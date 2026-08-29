# A IA nunca persiste sem confirmação explícita, e a aprovação salva a cópia guardada

Nenhuma ferramenta de IA grava no banco por conta própria: ela **propõe**, a proposta
fica guardada no estado da sessão, e só a aprovação do especialista persiste. Mais
importante, o que é gravado é a cópia guardada — o modelo não é chamado de novo para
reemitir o que foi aprovado. Pedir 4 treinos × 6 exercícios num segundo tool call abre
espaço para o modelo divergir do cartão que o especialista acabou de ler e aprovar.

## Consequências

- Existe `propose_workouts`, não existe `save_workouts`. O par proposta/aprovação é
  uma ferramenta só mais um passo de confirmação, nunca duas ferramentas simétricas.
- O estado da proposta pendente vive junto do estado da sessão (`ADR-0016`), então
  sobrevive ao corte do histórico enquanto espera a decisão humana.
- Vale para treino e para dieta: o orquestrador de nutrição repete a mesma forma em
  vez de inventar a sua.
