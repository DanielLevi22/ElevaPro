# Helpers de RLS são `SECURITY DEFINER` no schema `private`, com `EXECUTE` para `authenticated`

A expressão de uma política de RLS roda com o papel de *quem consulta*. Revogar
`EXECUTE` de `authenticated` — como sugere o exemplo mais comum da documentação —
faz toda leitura falhar com `permission denied for function` (42501) em vez de
devolver lista vazia. Conceder é seguro porque o helper lê `auth.uid()` internamente
em vez de receber o chamador por parâmetro: o papel pode executar a função, mas não
pode mentir sobre quem é.

## Consequências

- O schema `private` não é exposto pelo PostgREST — o `config.toml` lista só `public`
  e `graphql_public` — então o helper não vira endpoint.
- As políticas usam `(SELECT auth.uid())`, não `auth.uid()` puro: a forma com subquery
  é avaliada uma vez por consulta, a nua roda por linha.
- Índices em `(specialist_id, status)` e `(student_id, status)` são parte da decisão,
  não afinação posterior: sem eles cada checagem de vínculo vira seq scan em toda
  leitura de tabela protegida.
- A migration `0020` existe porque migration não concede acesso — a tabela nasce
  pertencendo a `postgres`, e o `pg_default_acl` do `public` não alcança o que veio
  depois. Foi assim que 18 tabelas ficaram sem RLS.
