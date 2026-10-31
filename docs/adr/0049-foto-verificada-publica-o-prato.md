# Foto verificada publica o prato

O catálogo da #366 tinha um portão de revisão humana: todo prato importado
nascia rascunho e só um admin com MFA o publicava, depois de escrever ao menos
um preparo. Com 7685 fotos prontas e nenhum preparo escrito, nada chegava ao
aluno. Decidimos que **a importação publica o prato que tem foto verificada e
ingredientes**. O preparo exibido é o guia genérico que o aparelho monta com as
porções da refeição, e a tela segue marcando o catálogo como experimental, com
imagens ilustrativas geradas por IA.

**Status:** accepted. Issue #366.

## Consequências

- A publicação acontece só para o que a execução criou ou completou com foto.
  Rascunho e arquivamento decididos pelo admin não são desfeitos no deploy
  seguinte; arquivar é o jeito de tirar um prato do ar.
- O preparo deixou de ser exigido para publicar (migration 0112). Continua
  protegido depois de publicado: editar ingredientes ou preparo exige devolver
  o prato a rascunho (0110).
- O casamento entre refeição e prato acontece no aparelho. O BFF entrega o
  catálogo genérico inteiro (~250 KB comprimido) e nunca recebe os alimentos do
  aluno, por isso não precisou de nova base legal nem de `/lgpd-check`.
- A combinação não foi revisada por nutricionista nem por cozinheiro. O risco
  é a sugestão parecer prescrição; o contrapeso é o aviso de catálogo
  experimental e o fato de o prato só usar alimentos e porções que já estão na
  refeição do aluno.

## Opções consideradas

- **Manter a revisão humana:** seguro, mas na prática deixava o catálogo vazio
  até alguém escrever milhares de preparos.
- **Casar no servidor com `match_meal_dishes`:** resposta menor, mas mandaria
  ao servidor a composição da refeição, que é dado de saúde.
