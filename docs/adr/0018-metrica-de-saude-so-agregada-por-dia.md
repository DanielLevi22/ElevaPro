# Métrica de saúde entra agregada por dia, nunca a série bruta

O Health Connect e o HealthKit entregam granularidade fina o bastante para inferir
rotina e deslocamento do aluno — a que hora saiu de casa, quando parou de se mover.
Isso está além da finalidade declarada, que é acompanhar atividade entre sessões de
treino, então só o agregado diário atravessa para `health_daily_metrics`. É a maior
minimização possível sem perder a finalidade, e é irreversível na direção errada:
uma vez guardada, a série bruta não desaparece por decisão posterior.

## Consequências

- A chave é `(student_id, date)` com a data calculada em fuso local. `toISOString()`
  converte para UTC e, em fuso negativo perto da meia-noite, gravaria no dia anterior.
- Permissão do sistema operacional não é consentimento LGPD: a primeira autoriza ler
  do aparelho, o segundo autoriza armazenar. O onboarding registra os dois separados.
- A task de sincronização de saúde é separada da de dieta. Acopladas, um erro do
  Health Connect suprimiria o reagendamento da notificação de refeição.
