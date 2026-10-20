# O segundo fator só é exigido do admin

**Status:** accepted. Issue #428. Substitui, para o `specialist`, a exigência de
autenticação forte da ADR-0042; para o `admin` ela continua, e o mecanismo de
Passkey e TOTP descrito lá segue valendo como opção para os demais.

Cadastrar autenticador (QR code + código TOTP) e Passkey antes do primeiro
acesso era onde o especialista travava, e a cobrança valia em toda sessão.
Decidimos que o especialista entra por senha em `aal1`, com vínculo e papel
conferidos no BFF e na RLS como antes. O Student já não tinha a exigência. O
`admin` continua exigindo `aal2` ou Passkey com TOTP verificado: ele alcança
todas as contas, e o atrito de uma pessoa só não pesa como o de cada
especialista. TOTP e Passkey ficam opcionais na tela de Segurança, e entrar por
Passkey continua disponível.

O código não sai, porque a exigência pode voltar para o especialista. Ela volta
trocando dois pontos, e nenhum chamador muda: `isStrongAuthRequired` em
`shared/src/auth/` (telas e BFF) e o papel listado em
`private.current_session_meets_mfa_requirement()` (RLS). As políticas continuam
chamando a função; é ela que deixou de cobrar do especialista.

## Consequências

- Senha vazada de especialista passa a dar acesso aos dados de saúde dos
  alunos vinculados, sem outra barreira. Era o risco que a ADR-0042 fechava, e
  aceitamos em troca de o especialista conseguir usar o produto. O vínculo
  ativo e o consentimento continuam limitando o alcance a esses alunos.
- As provas negativas de MFA nos scripts `verify-*.sql` passam a provar o
  acesso do especialista em `aal1` e a recusa do admin em `aal1`.
