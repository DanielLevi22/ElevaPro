# O placar só conta treino, e só mostra quem entrou

O ranking (issue #320, migrations `0058` e `0059`) tem duas regras difíceis de mudar depois
que existir placar: **o ponto sai só da sessão de treino concluída**, e **o placar global é
opt-in e recíproco** — só aparece quem consentiu, e só vê quem também aparece.

**Status:** accepted. Issue #320, lote do ranking em vidro.

## Por que só treino

Cada sessão concluída vale 100, até duas por dia, e sessão com data no futuro não vale. A
regra mora numa função só (`private.ranking_points_for_day`), e um trigger recalcula a
semana inteira a cada sessão gravada. O cliente não escreve em `ranking_scores`.

Refeição, água e meta de dieta ficaram de fora de propósito. Pontuar por elas faria o placar
contar a desconhecidos quem segue a dieta, que é dado de saúde (Art. 11) exposto por um
tratamento de execução de contrato. O treino já é Art. 7°, V (`workout_sessions`), e o
placar herda essa base.

O teto diário existe porque o aluno insere a própria sessão: sem ele, abrir e fechar sessão
vazia subiria qualquer um. Recalcular em vez de somar mantém o teto certo quando uma sessão
é corrigida ou apagada pelo serviço.

Mudar a regra muda a posição de todo mundo de uma vez, inclusive na semana corrente. Se um
dia outra fonte pontuar, ela entra na mesma função e o texto de "Como funciona" muda junto.

## Por que opt-in, e recíproco

O nome no placar global chega a pessoas sem vínculo nenhum com o titular, e quase todas são
Praticantes. Isso não é execução do contrato de ninguém, então precisa de consentimento
próprio (`consent_type = 'ranking'`, versão `1.0`), separado do de saúde pelo mesmo motivo da
Análise de Técnica (0041): recusar o placar não pode custar outra coisa.

A reciprocidade decorre do texto do aceite, que diz que o nome aparece "para outros
participantes". Por isso quem não participa não lê o global, e **o especialista também não
lê**: ele não é participante. O placar dele é o dos próprios alunos, que o vínculo já lhe
permite ver, com ou sem opt-in.

A leitura com outras pessoas sai só pela RPC `get_leaderboard`, porque a RLS de `profiles`
não deixa o cliente ler o nome de quem não é vinculado — e não deve deixar. A RPC devolve o
primeiro nome e a inicial do sobrenome, e nunca a foto.

## Consequências

- Abrir o global a especialistas, ou mostrar o nome inteiro, exige texto de aceite novo e
  reconsentimento de todos os participantes.
- Diferente do aceite de saúde (0043), o banco **compara a versão** do aceite do ranking
  (`private.ranking_consent_version()`): quem aceitou um texto antigo sai do placar no mesmo
  instante em que o app lhe mostra o convite de novo. Subir a versão é mudar
  `RANKING_PURPOSE` e essa função no mesmo PR.
- A issue #320 falava em "Meus alunos / Geral" para o especialista, e em subir a
  `POLICY_VERSION` para 1.9. Os dois ficaram de fora pelos motivos acima.
