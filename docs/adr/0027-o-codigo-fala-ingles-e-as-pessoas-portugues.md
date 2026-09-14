# O código fala inglês, e as pessoas conversam em português

Todo identificador é escrito em inglês: tabela, coluna, enum, contrato de API, função,
tipo, componente, hook, arquivo e pasta. Tudo o que é lido por gente é escrito em
português: interface, comentário, definição do glossário, docs, ADRs, issues e commits.
A fronteira é "o compilador ou o banco leem isto?". Se leem, é inglês.

**Status:** accepted

## Por que a regra precisou ser escrita

O repositório tinha as duas línguas sem fronteira. O banco e o glossário nasceram em
inglês (`diet_plans`, `WorkoutSession`), e o código dos lotes de telas de 2026-09 foi
escrito em português (`maquinaDaSessao`, `BotaoRedondo`, `useRastreioDaCorrida`). Quem
lia precisava traduzir de cabeça entre "plano alimentar", `DietPlan` e `diet_plans`, e
cada módulo novo escolhia um lado.

## Por que inglês, e não português

Português foi considerado a sério, e com o app ainda fora de produção era a hora mais
barata para fazê-lo. Pesaram contra:

- **É a convenção do mercado.** Identificador em inglês é o que desenvolvedor,
  biblioteca e ferramenta esperam, e o que torna o código legível para quem o time
  contratar.
- **O ecossistema é inglês.** React, React Native, Supabase (`auth.users`,
  `storage.objects`) e o próprio SQL. Um código "todo em português" nunca é todo, e
  o esforço de chegar perto produz nomes como `usarEstado`.
- **A camada cara já está em inglês.** Traduzir exigiria renomear 29 tabelas com as
  colunas, 78 políticas de RLS, 16 funções e 323 chamadas `.from()` em 82 arquivos. Em
  inglês nenhuma migration é necessária; o que diverge é código, e código se renomeia
  a qualquer momento sem dado envolvido.
- **Identificador não tem acento.** Em português isso gera `avaliacoes_fisicas` e
  `sessoes`, legível mas pior que o original.

## Consequências

- **O glossário mantém o termo oficial em inglês e a definição em português**, como já
  fazia. A palavra da interface aparece na definição quando for diferente do termo
  (Student com Guidance `self_guided` aparece como "Praticante").
- **Código em português é renomeado aos poucos**: no módulo que um lote estiver
  mexendo, ou quando o arquivo for tocado. Não há lote dedicado à tradução, porque ele
  travaria o produto sem entregar nada ao usuário.
- **Comentário continua em português**, porque explica o porquê a uma pessoa. O
  `CLAUDE.md` já pede comentário do porquê e não do quê.
- **Uma checagem automática** (Biome ou pre-commit) pode vir depois, se a convenção
  começar a escorregar. Hoje ela vive no `CLAUDE.md`.
