# Eventos de segurança são imutáveis, mínimos e investigáveis

O Eleva Pro registra eventos de segurança e privacidade em uma trilha própria, somente de anexação, separada dos logs de aplicação. Cada evento contém quem agiu, qual ação protegida ocorreu, sobre qual recurso opaco, resultado, origem técnica e correlação; ele nunca contém nome, e-mail, token, senha, corpo de requisição, anamnese, medida ou outro valor de saúde.

**Status:** accepted. Controles e evidências detalhados em [`docs/research/security-and-auditability-baseline.md`](../research/security-and-auditability-baseline.md).

## Por que uma trilha própria

Log comum serve para diagnosticar software e expira ou é filtrado sem garantia de integridade. Auditoria precisa responder quem acessou ou alterou um recurso protegido, quando, de qual contexto e com qual resultado. Guardar o conteúdo do recurso para isso duplicaria dados sensíveis e faria do log um novo vazamento — o defeito da issue #282 é justamente o aviso de que isso já é risco real.

## O que gera evento

Autenticação e recuperação de conta; criação, alteração, remoção e exportação de dado sensível; leitura de dado sensível por terceiro autorizado; mudança de vínculo, papel, permissão ou consentimento; uso de privilégio administrativo; emissão ou falha de convite; e alteração de configuração de segurança. Leitura do próprio titular e operações técnicas repetitivas são agregadas ou isentas quando não melhoram investigação, conforme matriz de eventos da futura issue.

## Consequências

- A trilha tem RLS: titular vê eventos sobre seus recursos; auditor administrativo vê metadados necessários; Specialist não lê a trilha inteira do Student por padrão.
- Escrita ocorre somente no servidor ou por mecanismo de banco controlado. Cliente não escolhe ator, instante, resultado nem recurso do evento.
- Exportação, retenção, acesso excepcional e eliminação da trilha obedecem uma política documentada. Imutável não significa retenção infinita nem impede anonimização quando a base legal e a investigação já não justificam identificar o titular.
