# A autorização do BFF devolve resultado, não lança exceção

As rotas do BFF usam `service_role`, então a RLS não as alcança e a autorização é
inteiramente código. `AuthResult` como união discriminada faz o compilador exigir a
checagem antes de usar o valor; com `throw`, esquecer o `try` é silencioso — e
silêncio aqui é rota aberta.

## Consequências

- O nome carrega a garantia: `authorizeLinkedSpecialist(request, studentId)` não tem
  como mentir, porque sem o `studentId` não há checagem de vínculo e isso é visível
  na chamada. O antecessor, `getCallerSpecialist`, existia em seis arquivos com dois
  significados diferentes.
- `ensure-profile` não cria perfil. Quem cria é o trigger `handle_new_user`, no INSERT
  em `auth.users`, com o payload do cadastro — que naquele instante é legítimo.
  Recriar depois significa reler metadado que o usuário já pôde alterar.
- `getUserContextJWT` não tem fallback para `user_metadata`. Ele monta o CASL, e o
  fallback deixava o usuário gravar o próprio papel de admin para ganhar a UI de admin.
- Bucket de storage nasce por migration, nunca pelo painel, para não herdar a política
  que alguém escolher na interface.
