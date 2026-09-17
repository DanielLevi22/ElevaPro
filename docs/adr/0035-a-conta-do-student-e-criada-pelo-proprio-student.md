# A conta do Student é criada pelo próprio Student

Quando um Specialist adiciona um Student, ele inicia um convite por e-mail; não cria uma senha para outra pessoa. O Student define a própria credencial no link de ativação, e o Specialist vê apenas o estado operacional do convite e da primeira entrada.

**Status:** accepted. Substitui o fluxo de credencial compartilhada a ser especificado a partir da [issue #283](https://github.com/DanielLevi22/ElevaPro/issues/283).

## Por que convite

O fluxo atual pode criar uma credencial conhecida pelo Specialist e não avisa o Student que a conta existe. Isso reduz ativação e é incompatível com uma conta que guarda dados de saúde: a senha é prova de autenticação do titular, não um dado a ser combinado entre duas pessoas.

O convite resolve os dois lados sem converter um código de vínculo em senha. Código de vínculo, caso exista no futuro, serve para relacionar uma conta já autenticada a um Specialist e nunca para entrar no produto.

## Consequências

- O registro nasce como `invited`, mas esse estado nunca bloqueia o fluxo de criação de senha do titular.
- O e-mail de convite é de uso único, expira, não expõe dado de saúde e é reenviado por ação explícita do Specialist, com limite contra abuso.
- A lista de Students mostra convite enviado, expirado, aceito e primeira entrada, sem revelar credencial, token ou conteúdo de e-mail.
