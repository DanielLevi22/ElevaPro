# A prontidão do dia é gravada, com a versão da regra que a calculou

A tela de Saúde do dia abre com uma **prontidão** de 0 a 100: o sono e a FC de repouso de
hoje comparados com a linha de base do próprio Student. A nota é calculada no aparelho,
por uma regra fixa e versionada, e gravada em `health_daily_metrics` ao lado dos números
de onde saiu.

**Status:** accepted. Lote Saúde em vidro.

## Por que gravar um número que dá para recalcular

A prontidão sai de duas colunas que já existem (`sleep_minutes` e `resting_heart_rate`),
e recalcular na leitura seria o caminho mínimo. Ela é gravada por um motivo: **o que o
Student viu num dia é o que o especialista vê sobre esse dia**. Recalculada, a nota muda
de valor cada vez que a regra muda ou que um dia antigo ganha leitura atrasada, e a
conversa "você estava com 58 na terça" deixa de ter um número em comum.

Por isso a nota nunca vai sozinha: `readiness_version` diz qual regra a produziu. Regra
nova grava versão nova daqui para frente e não reescreve o passado.

## A regra, versão 1

- **Entrada:** sono e FC de repouso de hoje, e os 14 dias anteriores, sem contar hoje.
- **Sem nota** quando falta leitura de hoje de qualquer um dos dois, ou quando a base
  tem menos de 3 dias com leitura de cada um. Média de dois dias tem cara de medição e
  não é uma, a mesma regra que a tela de Saúde já usa.
- **Sono:** a distância até a média, em fração dela, limitada a ±20%, vale ±15 pontos.
- **FC de repouso:** a distância até a média, invertida (mais baixa conta a favor),
  limitada a ±8%, vale ±15 pontos.
- **Nota:** 70 + sono + FC, arredondada e limitada a 0–100. Um dia igual à média dá 70.
- **Faixa:** 75 ou mais é "boa", de 55 a 74 é "moderada", abaixo de 55 é "baixa".

Os limites existem porque uma noite de 12 horas depois de uma viagem não é "prontidão
máxima", e porque um sensor que escorrega no pulso não pode derrubar a nota para zero.

## O que a nota não é

- **Não é parecer de saúde.** A frase que acompanha a nota descreve a comparação ("sono
  acima da sua média, FC de repouso estável") e não diz o que ela significa para a saúde
  de ninguém. É a linha que a tela de Saúde já segue.
- **Não decide nada sozinha.** Hoje a nota só é mostrada. Se um dia o motor de regras do
  [ADR-0028](0028-o-praticante-vem-primeiro.md) passar a recuar o plano por causa dela,
  isso é decisão automatizada que afeta o Student (LGPD, Art. 20). Ele precisa saber que
  foi a nota e poder pedir revisão, e isso entra na issue que fizer a ligação.
- **Não existe no iOS por enquanto.** O iOS não grava métricas diárias (só o Android
  persiste), então não há base de 14 dias para comparar.

## Base legal e consentimento

A nota é dado de saúde derivado (Art. 11): a mesma base de `health_daily_metrics`, tutela
da saúde + consentimento. A finalidade é nova, porque inferir recuperação vai além de
guardar a duração do sono. Por isso a `POLICY_VERSION` sobe para `1.7` e toda a base
reconsente, com a nota escrita no texto do consentimento. Ela herda a RLS da tabela,
que fecha o acesso do especialista quando o consentimento é revogado, e o valor não vai
para log.

## Considerado e descartado

- **Calcular na leitura:** descartado pelo motivo acima, porque o número do dia mudaria
  depois de mostrado.
- **Nota por modelo (IA):** descartada. A nota precisa ser explicável com uma frase e
  reproduzível num teste. "O modelo achou 62" não se explica ao Student nem ao
  especialista.
- **Incluir passos e calorias:** descartado na versão 1. Movimento do dia não mede
  recuperação, e um dia de descanso ativo derrubaria a nota de quem descansou.
