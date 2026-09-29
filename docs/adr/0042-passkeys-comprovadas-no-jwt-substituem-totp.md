# Passkeys no login com TOTP para cadastrar aparelhos

**Status:** accepted, implantação condicionada à prova no preview. Issue #349.

O código TOTP de um aplicativo externo em cada novo login inviabiliza a
experiência desejada de Face ID/PIN do aparelho. MFA WebAuthn como segundo fator
preservaria `aal2`, mas o Supabase hospedado de preview recusou a configuração
com HTTP 422. Usar apenas biometria local não daria ao servidor qualquer prova.

Adotamos Passkeys do Supabase Auth, que valida a assinatura WebAuthn e emite a
sessão. No Supabase, esse login pode ter `aal1`; portanto, a regra de acesso
privilegiado passa a ser `aal2` ou método `passkey` em `amr` do JWT assinado,
desde que a conta possua fator TOTP verificado. BFF e RLS aplicam o mesmo
predicado. Senha com `aal1` e Passkey de conta sem TOTP verificado não recebem
acesso privilegiado. Claim do cliente, `user_metadata` e mero retorno de sensor
local jamais autorizam.

O autenticador é confirmado apenas para cadastrar ou remover aparelhos,
inclusive na primeira ativação. Ele não aparece no login diário por Passkey.
Uma conta nova confirma o e-mail, verifica o TOTP uma vez e então cadastra a
Passkey. A inscrição inicial do TOTP ainda é um ponto de bootstrap: se senha e
e-mail forem comprometidos antes dela, o suporte trata o caso como recuperação
de identidade. Perda do aparelho ou do fator exige verificação pelo suporte.
Renomear a credencial altera só seu rótulo; o Supabase Auth permite essa ação
com qualquer sessão autenticada, sem exigir AAL2.

O SDK de Passkeys é experimental. A mudança só entra em produção depois de
provar em preview que cadastro, login e refresh mantêm o formato esperado de
`amr`; se o Supabase mudar a semântica, o controle falha fechado. A ativação é
separada por ambiente. RP ID/origens e associações de iOS/Android são estáveis;
trocar o RP ID requer reinscrever as credenciais. O fator TOTP permanece como
prova de gestão de aparelhos. Antes do corte, web, Android, iOS e recuperação
por suporte precisam ser demonstrados.

Durante a implantação, `aal2` continua autorizado no BFF/RLS para permitir
migração com a flag Passkey desligada. Quando a flag está ligada, a UI exige
cadastrar e entrar por Passkey; retirar a alternativa `aal2` do servidor requer
uma etapa de corte depois da prova real em preview. Até lá, uma chamada direta
com senha+TOTP ainda obtém acesso privilegiado. A issue permanece aberta para
esse corte, sem declarar a política final concluída.

Esta decisão substitui a exigência literal de `aal2` da primeira versão da
issue #349, mas preserva a exigência de autenticação forte verificável no
servidor para contas com acesso a dados de alunos.
