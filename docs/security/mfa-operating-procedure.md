# MFA para contas privilegiadas

## Escopo e garantia

`admin` e `specialist` precisam completar TOTP antes de usar recursos privilegiados. O
Student (inclusive o legado `member`) não é obrigado neste corte. O segredo, o QR Code e
o código de uso único pertencem exclusivamente ao Supabase Auth e ficam apenas na memória
da tela durante a configuração; o Eleva Pro não os grava, registra ou envia ao BFF.

O BFF confere o claim assinado `aal` em cada rota privilegiada. `aal1` recebe
`mfa_required`; `aal2` é a única garantia aceita. A policy RLS
`privileged_session_requires_mfa` aplica a mesma regra às consultas diretas do mobile.
CASL e o redirecionamento de interface não substituem essas verificações.

A única exceção AAL1 é a leitura da própria linha em `profiles`, necessária para o cliente
descobrir o papel da sessão e abrir o desafio TOTP. Ela não libera perfis de terceiros,
dados de alunos, Storage ou qualquer tabela de domínio.

## Configuração exigida no Supabase

No Dashboard > Authentication:

1. Em **Multi-Factor**, manter TOTP habilitado e no máximo dois fatores por usuário.
2. Manter SMS desabilitado neste corte.
3. Em **Enhanced MFA Security**, habilitar o limite de sessão AAL1 (15 minutos).
4. Em **Audit Logs**, preservar os eventos Auth de inscrição, desafio, verificação,
   remoção e recuperação de MFA conforme a retenção operacional do projeto.

Os Auth Audit Logs são a fonte autoritativa desses eventos: registram instante de servidor
e ator da autenticação sem que a aplicação manipule código, segredo, QR, token, e-mail ou
IP bruto. A trilha `private.security_audit_events` permanece append-only por 365 dias para
eventos de produto; sua retenção é executada pelo job `purge-security-audit-events`.

## Recuperação segura

Não há bypass local nem recuperação manual por suporte. Quem perder o autenticador deve
usar exclusivamente o fluxo documentado do Supabase Auth, com reautenticação e a política
de fatores da organização. Antes de remover ou reinscrever um fator, o operador confirma a
identidade fora do aplicativo e consulta os Auth Audit Logs. A remoção, recuperação e nova
inscrição ficam evidenciadas ali.

## Evidência por release

1. No web e mobile: uma conta privilegiada nova inscreve TOTP, confirma código válido e
   chega a AAL2; um código inválido é recusado em português.
2. Com sessão AAL1, chamar uma rota BFF de especialista/admin deve retornar
   `403 { "error": "mfa_required" }`; com AAL2 deve passar a autorização.
3. Uma conta Student deve continuar acessando seu fluxo sem MFA.
4. No Dashboard, conferir os eventos Auth de MFA e o período de retenção. Nunca exportar
   códigos, QR Codes, tokens, e-mails ou IPs brutos para a evidência do release.
