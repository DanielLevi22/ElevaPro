# A home decide o próximo passo, não resume o produto

O Student abre o Eleva Pro para agir, não para interpretar um painel. A tela inicial mostra uma única ação principal, escolhida pelo estado do dia: executar o Workout prescrito, registrar o que falta ou sincronizar uma fonte necessária. As métricas explicam essa escolha; elas não competem com ela.

**Status:** accepted. Direção de produto; a regra de prioridade de cada estado nasce em issue própria.

## Por que uma ação

Treino, dieta, cardio, saúde e ranking já existem como superfícies independentes. Uma home que dê o mesmo peso a todas deixa o Student decidir o que o produto esperava que ele fizesse. O caso concreto já revelou o risco: o cartão "Treino do dia" nunca apareceu por uma consulta incorreta ([issue #291](https://github.com/DanielLevi22/ElevaPro/issues/291)), e a entrada perdeu a ação mais importante sem sinalizar falha.

O cartão principal deve declarar o que acontece ao tocar e o que falta para concluí-lo. Sem Workout ativo, ele não inventa uma prescrição; oferece o caminho legítimo para o próximo estado. A ausência de plano é estado explícito, não um espaço vazio.

## Consequências

- A seleção do próximo passo é uma função testável, alimentada por serviços do domínio; a tela não consulta nem escolhe em paralelo.
- A home só afirma que há Workout do dia quando a regra publicada o encontrou. A escolha entre treino marcado hoje e o próximo da sequência é decisão da issue #291.
- Acessibilidade, desempenho e os dois temas fazem parte do contrato da home. Efeito visual que comprometa a rolagem cai para a superfície opaca medida no aparelho.
