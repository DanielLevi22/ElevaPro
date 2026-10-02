# Passkeys e acesso privilegiado

## Garantia de acesso

`admin` e `specialist` só acessam dados de domínio quando o JWT assinado pelo
Supabase contém `aal2` ou uma entrada `amr` com `method: "passkey"` e a conta
possui um fator TOTP verificado. A
Passkey é um login sem senha, validado por assinatura WebAuthn no Supabase; Face
ID, biometria e PIN permanecem no aparelho. Uma sessão `aal1` de senha, OTP ou
outro método não recebe acesso. BFF e RLS conferem a prova de modo independente;
CASL e redirecionamento de tela não são fronteiras de segurança.

O Student, inclusive `member` legado, mantém o fluxo atual. Para a conta
privilegiada em `aal1`, só a própria linha em `profiles` e os próprios
`specialist_services` são legíveis para montar a tela de autenticação. Essa
exceção não permite alterar serviços, ler dados de alunos nem acessar Storage.

## Ambiente local

No Supabase da máquina, o app mobile confirma o TOTP sozinho (#355): cadastra o
fator, guarda o segredo no aparelho de desenvolvimento e gera o código. A
sessão é `aal2` real; RLS e BFF não têm exceção para o local. Conta cujo
autenticador foi cadastrado num celular precisa de `npm run local:reset-mfa`
uma vez, e o comando recusa qualquer API que não seja `127.0.0.1`/`localhost`.
E-mails do Auth local param no Mailpit (`http://127.0.0.1:47324`).

## Ativação por ambiente

1. Escolher RP ID estável. O preview usa `elevapro-preview.vercel.app`; produção
   exige host e projeto próprios. Alterar o RP ID inutiliza Passkeys já cadastradas.
2. Configurar em Supabase Authentication → Passkeys o mesmo RP ID, nome e origens
   HTTPS. Incluir `android:apk-key-hash:<SHA-256 em base64url>` da assinatura do
   build. O preview usa `_G6M64iRWLCpcwHnPPb8i1kthbNRf6fUIAm8rlCVGxQ` para
   a assinatura EAS Android consultada em 2026-09-28. Reconfirmar no EAS antes
   de trocar o keystore.
3. Publicar `/.well-known/assetlinks.json` com o fingerprint SHA-256 Android e
   `/.well-known/apple-app-site-association` com Apple Team ID real. O preview
   Android usa `FC:6E:8C:EB:88:91:58:B0:A9:73:01:E7:3C:F6:FC:8B:59:2D:85:B3:51:7F:A7:D4:20:09:BC:AE:50:95:1B:14`.
   O EAS iOS ainda não tem credenciais configuradas; obter Team ID e certificado
   antes de construir/testar iOS.
   O verificador nativo busca esses arquivos sem sessão da Vercel. Enquanto o
   domínio de preview estiver sob Vercel Authentication, o Android receberá
   redirecionamento para login e a associação falhará. A exceção de Deployment
   Protection libera o domínio inteiro, não apenas `/.well-known/*`; usar um
   ambiente público isolado com dados fictícios para o teste nativo, ou aguardar
   um domínio público de produção. Não remover a proteção do preview com dados
   reais apenas para concluir a associação.
4. No Vercel, definir `PASSKEY_RP_ID`, `PASSKEY_ANDROID_SHA256_FINGERPRINT` e,
   após existir assinatura iOS, `PASSKEY_APPLE_TEAM_ID` por ambiente. Habilitar
   `NEXT_PUBLIC_PASSKEY_ENABLED=true` somente no preview depois de comprovar
   que o Supabase emite `amr.method=passkey` e o mantém após refresh.
5. No EAS, `EXPO_PUBLIC_PASSKEY_RP_ID` deve coincidir com o RP ID; o perfil
   `preview` já declara o host. Definir `EXPO_PUBLIC_PASSKEY_ENABLED=true` só
   para o build de teste após ativar o Auth de preview. Builds nativos novos são obrigatórios. Expo Go
   não executa o módulo Passkey. Local usa origem loopback no web, mas Passkeys
   nativas dependem de domínio associado real e certificado do build local.

Até concluir o passo de prova no preview, manter TOTP habilitado. O MFA WebAuthn
do Supabase hospedado rejeitou a ativação com HTTP 422 em 2026-09-28. Não tentar
repetir a ativação: ela apresentou ainda um custo adicional no CLI.

## Migração e recuperação

Usuários com TOTP confirmam o código para cadastrar a Passkey e testam um login
novo. O fator TOTP permanece na conta para cadastrar e remover aparelhos;
não é solicitado no login diário por Passkey. Novos usuários confirmam o e-mail,
configuram e verificam o TOTP uma vez, e só então cadastram a Passkey. Não remover
o fator enquanto a conta tiver acesso privilegiado. Se senha e e-mail forem
comprometidos antes da primeira ativação, a recuperação exige verificação do suporte.
O nome do aparelho é apenas um rótulo e pode ser alterado sem TOTP. Durante a
migração, `aal2` ainda é aceito por BFF/RLS mesmo quando a UI exige Passkey;
somente o corte posterior no servidor removerá esse caminho direto.

Quando alguém perde o único aparelho, o suporte confere identidade por canal
independente, registra o caso e um segundo operador revisa a decisão. Só então
revoga as Passkeys antigas pelo Admin API do Supabase e as sessões ativas,
permitindo novo login/cadastro após confirmar o TOTP já cadastrado. Se o fator
TOTP também foi perdido, o suporte executa recuperação com dupla revisão e
provisiona um novo fator após validar a identidade. Nunca pede senha, código TOTP, token ou dado
biométrico. A conta fica sem acesso privilegiado até provar uma nova Passkey.
Registrar IDs opacos, ator, instante, resultado e motivo mínimo no sistema de
suporte e correlacionar com Auth Audit Logs; não incluir material de credencial.

## Evidência por release

1. JWT real de Passkey no preview: observar apenas `aal`, métodos de `amr` e
   resultado de refresh; não guardar token. `aal1` de senha continua negado.
2. BFF e RLS: teste positivo para Passkey e `aal2` legado; teste negativo para
   `aal1` comum, claim malformado, perfil errado, especialista sem vínculo e
   consentimento revogado.
3. Fechar/reabrir aba e app com sessão válida restaura o acesso. Expiração,
   logout e revogação o retiram.
4. Cadastro, login, cancelamento e perda do aparelho em web, Android e iOS de
   preview. Verificar os eventos Auth e a retenção operacional; nunca exportar
   segredo, token, e-mail ou IP bruto como evidência.
