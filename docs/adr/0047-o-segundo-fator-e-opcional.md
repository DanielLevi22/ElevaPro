# O segundo fator é opcional para todos

**Status:** accepted. Issue #428. Substitui a exigência de autenticação forte
da ADR-0042; o mecanismo de Passkey e TOTP descrito nela continua valendo como
opção.

Cadastrar autenticador (QR code + código TOTP) e Passkey antes do primeiro
acesso era onde o especialista travava, e a cobrança valia para `admin` e
`specialist` em toda sessão. Decidimos que nenhum papel precisa de segundo
fator para acessar: login por senha em `aal1` basta, com vínculo e papel
conferidos no BFF e na RLS como antes. TOTP e Passkey ficam opcionais na tela
de Segurança, e entrar por Passkey continua disponível.

O código não sai, porque a exigência pode voltar. Ela volta trocando dois
pontos, e nenhum chamador muda: `isStrongAuthRequired` em `shared/src/auth/`
(telas e BFF) e o corpo de `private.current_session_meets_mfa_requirement()`
(RLS), cujo predicado anterior está na migration `0078`. As políticas continuam
chamando a função; é ela que deixou de cobrar.

## Consequências

- Senha vazada de especialista passa a dar acesso aos dados de saúde dos
  alunos vinculados, sem outra barreira. Era o risco que a ADR-0042 fechava, e
  aceitamos em troca de o especialista conseguir usar o produto. A conta
  `admin` fica no mesmo regime por decisão explícita; religar só para ela é
  fazer `isStrongAuthRequired` e a função da RLS olharem o papel.
- As provas negativas de MFA nos scripts `verify-*.sql` passam a provar o
  acesso em `aal1`, e o `LGPD_COMPLIANCE.md` deixa de citar MFA como trava.
