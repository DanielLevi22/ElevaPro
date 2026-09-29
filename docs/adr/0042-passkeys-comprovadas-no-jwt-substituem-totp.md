# Passkeys comprovadas no JWT substituem TOTP

**Status:** accepted, implantação condicionada à prova no preview. Issue #349.

O código TOTP de um aplicativo externo em cada novo login inviabiliza a
experiência desejada de Face ID/PIN do aparelho. MFA WebAuthn como segundo fator
preservaria `aal2`, mas o Supabase hospedado de preview recusou a configuração
com HTTP 422. Usar apenas biometria local não daria ao servidor qualquer prova.

Adotamos Passkeys do Supabase Auth, que valida a assinatura WebAuthn e emite a
sessão. No Supabase, esse login pode ter `aal1`; portanto, a regra de acesso
privilegiado passa a ser `aal2` legado **ou** método `passkey` em `amr` do JWT
assinado. BFF e RLS aplicam o mesmo predicado. Uma senha com `aal1` continua
bloqueada mesmo que a conta tenha uma Passkey cadastrada. Claim do cliente,
`user_metadata` e mero retorno de sensor local jamais autorizam.

O SDK de Passkeys é experimental. A mudança só entra em produção depois de
provar em preview que cadastro, login e refresh mantêm o formato esperado de
`amr`; se o Supabase mudar a semântica, o controle falha fechado. A ativação é
separada por ambiente. RP ID/origens e associações de iOS/Android são estáveis;
trocar o RP ID requer reinscrever as credenciais. TOTP permanece como migração
até web, Android, iOS e recuperação por suporte estarem demonstrados.

Esta decisão substitui a exigência literal de `aal2` da primeira versão da
issue #349, mas preserva a exigência de autenticação forte verificável no
servidor para contas com acesso a dados de alunos.
