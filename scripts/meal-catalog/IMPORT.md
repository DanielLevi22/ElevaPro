# Importação do catálogo de pratos

O catálogo é conteúdo genérico: `meal_dishes` relaciona-se a `foods` por
`meal_dish_ingredients`; preparos ficam em `meal_dish_preparations` e fotos em
`media_assets`. `diet_meal_dishes` guarda apenas opções escolhidas para uma refeição,
com acesso herdado do plano. Importar nunca cria vínculos com alunos.

## Local

Com o Supabase local de pé, aplicar migrations sem resetar o banco:

```powershell
npx --no-install supabase migration up --local
node scripts/meal-catalog-import.mjs dry-run
node scripts/meal-catalog-import.mjs apply-local
```

O CLI local usa somente o container `supabase_db_ElevaPro`. Não usa connection
string hospedada ou service role do `.env`. Pode ser repetido: IDs dos pratos são
estáveis, assets não sobrescrevem bytes e conteúdo já revisado é preservado.

## Preview e produção

O workflow `supabase-migrations` aplica, nesta ordem:

1. Migrations do commit.
2. Seed público de alimentos existente.
3. Verificação SQL do catálogo em transação com rollback.
4. Importação transacional dos pratos e imagens do mesmo commit.
5. Verificações de RLS existentes.

`development` usa o environment `preview`; `main` usa `production`, com os gates
de aprovação configurados no GitHub. Ambos usam o secret `SUPABASE_DB_URL` do
próprio environment. Não é necessária outra chave ou upload manual de JSON.

O artefato SQL é derivado de `public-foods.jsonl`, das regras de combinações e do
ledger `production.json`, sem credenciais. IDs de alimentos são reconciliados
pelo nome público exato no banco de destino, pois os UUIDs podem diferir entre
ambientes. Nome ausente ou ambíguo interrompe a transação inteira. Nenhum alimento
particular é promovido ao catálogo público.

Para aplicação operacional pelo mesmo caminho, preparar um arquivo:

```sh
node scripts/meal-catalog-import.mjs export-sql /tmp/meal-catalog.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /tmp/meal-catalog.sql
```

Não inserir secrets no arquivo. Não executar `db reset` em ambientes hospedados.
O relatório retorna contagens inseridas e totais; segunda execução deve inserir
zero pratos/ingredientes/imagens já existentes. O artefato não muda status ou
texto de um prato existente. Foto adicionada depois pode completar um rascunho
sem imagem; um prato revisado não é reescrito pelo pipeline.

## Publicação e consulta

Todo candidato nasce `draft`. Na mesma transação, a importação publica o prato
que ela criou ou completou com foto verificada, desde que tenha ingredientes
(ADR-0049). Sem foto, segue rascunho. Não há passos ou tempos inventados: o
preparo de um prato importado é o guia genérico que o aparelho monta com as
porções da refeição. Um prato que o admin devolveu a rascunho ou arquivou não é
republicado por uma nova execução.

O app recebe os publicados por `/api/nutrition/recipes`, ao lado dos 16 pratos
fixos, e casa no aparelho os alimentos da refeição com os de cada prato: o
servidor não recebe o que o aluno come. A consulta
`match_meal_dishes(food_ids, limit, offset)` continua disponível no banco e
retorna somente publicados. Nenhuma das duas altera gramagens.

Mudanças nos ingredientes da refeição removem escolhas incompatíveis. O aluno
não altera o catálogo ou a prescrição do especialista. Seleção não registra
consumo e não inicia preparo automaticamente.

## Procedência e portabilidade

`media_assets` separa caminho/ID da base pública de entrega. Migrar o provedor
preserva o caminho e o hash; o backup portátil existente guarda os bytes.
Prompts e histórico das imagens concluídas permanecem no ledger. JSONs de lotes
concluídos são dispensáveis quando seus registros já estão nele. Lotes pendentes
e novos ficam em `tmp/meal-catalog-batches/`, ignorada pelo Git; a retomada das
imagens concluídas depende do ledger, não desses arquivos operacionais.

## Verificação e incidente local

`scripts/verify-meal-catalog.sql` verifica importação, preservação de revisão,
busca, RLS, MFA, autoria, consentimento e cascata em rollback. A prova negativa
com `-v prove_negative=1` deve falhar com `RASCUNHO EXPOSTO`; use somente banco
descartável, nunca faça uma execução deliberadamente inválida em produção.

Supabase Postgres `17.6.1.104` com `supautils.hint_roles` apresentou SIGSEGV ao
chamar uma RPC revogada. Reproduzido com função trivial em instância isolada,
correspondente ao relato [supabase/postgres#2112](https://github.com/supabase/postgres/issues/2112).
O teste consulta o privilégio efetivo com `has_function_privilege`, sem chamar
a RPC proibida. Não conceder EXECUTE ao cliente para contornar falha do servidor.
