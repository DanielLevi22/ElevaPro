# Coluna substituída sai na mesma migration, não é deprecada

A migration `0007` deprecou uma coluna em vez de removê-la, e o resultado foi um
trabalho de consolidação dois meses depois. Enquanto a coluna existe, o caminho antigo
compila, e alguém volta a usá-lo sem saber que era o caminho errado. Substituição
remove; deprecação só adia o custo e o entrega maior.

## Consequências

- O drift de schema é conferido contra o Drizzle, não contra o banco: roda no CI sem
  credencial e trata o schema versionado como fonte da verdade (`ADR-0009`).
- Renome não é remoção. Antes de apagar o código de uma tabela, confere-se coluna a
  coluna se existe equivalente com outro nome — cinco das doze tabelas de um mutirão
  de limpeza tinham, e apagá-las teria destruído feature que o modelo suporta.
