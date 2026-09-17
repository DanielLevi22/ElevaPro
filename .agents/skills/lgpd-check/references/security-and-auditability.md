# Segurança e auditabilidade na revisão LGPD

Leia esta referência quando a mudança envolver identidade, autorização, logs, auditoria,
incidente, integração ou qualquer dado pessoal fora do fluxo de schema comum. Ela completa
o `SKILL.md`; a fonte de fatos e de requisitos atuais é
`docs/research/security-and-auditability-baseline.md`.

## Decisão antes de implementação

Para cada dado ou evento, fixe finalidade, base legal, titular, destinatário, origem,
retenção e responsável. Uma finalidade nova, um destinatário novo, IA que infere dado de
saúde, transferência internacional ou risco alto exige avaliação de impacto e validação
do encarregado/jurídico; não trate consentimento genérico como atalho.

Os direitos do titular incluem acesso, correção, eliminação/bloqueio, portabilidade,
informação e revogação. A implementação precisa explicar o que muda e manter evidência
de solicitação, decisão e atendimento. Backup não invalida a eliminação: a política define
como o dado deixa os ciclos de restauração e quem pode restaurá-lo.

## Evento auditável não é log de aplicação

Registre somente eventos que tornam investigação, prestação de contas ou direito do
titular possível: autenticação e recuperação, convite, mudança de papel ou vínculo,
consentimento, acesso de terceiro a dado sensível, exportação, alteração/exclusão de dado
sensível, privilégio administrativo, configuração de segurança e falha de integração
relevante.

O contrato mínimo é: `event_id`, tipo e versão, `occurred_at` do servidor, ator e papel,
titular afetado quando distinto, recurso e identificador opaco, ação, resultado, origem e
correlação (`trace_id`). Adicione IP ou cliente apenas se forem proporcionais à investigação.

O evento nunca carrega senha, token, cookie, cabeçalho `Authorization`, corpo integral,
nome/e-mail desnecessário, anamnese, medida, dieta, conversa ou valor de saúde. Guardar o
conteúdo para "auditar" cria uma segunda base sensível e piora o incidente.

O cliente não informa ator, horário, resultado ou alvo do evento. A escrita é append-only
por mecanismo servidor/banco limitado; `UPDATE` e `DELETE` ficam vedados aos papéis da
aplicação. A leitura segue RLS e é auditada. Imutabilidade não significa retenção eterna:
defina prazo, legal hold, eliminação verificável e acesso excepcional.

## Controles que a revisão confere

- **Identidade:** convite de uso único; o Student define a própria senha; recuperação e
  login limitados; MFA/AAL para admin e ações sensíveis. Nunca registre credenciais.
- **Autorização:** CASL melhora a interface; RLS e grants mínimos são a fonte de verdade.
  Sempre prove que o autorizado passa e o não vinculado falha. `service_role` só roda no
  servidor e recebe revisão explícita.
- **Fronteiras:** BFF valida schema e autorização; CORS, redirects e CSRF seguem o modelo
  de sessão; webhook valida assinatura, janela de tempo e idempotência antes de persistir.
- **Observabilidade:** logs técnicos têm redaction e correlação; alertas não expõem dados;
  Auth/API/Storage/DB e a trilha de negócio cobrem camadas diferentes.
- **Operação:** segredo segregado por ambiente, rotação/revogação possível, dependência
  monitorada, backup restaurado em teste e runbook de incidente exercitado.

## Saída que bloqueia entrega

Não aprove implementação se faltar uma destas evidências: RLS e grants para dado exposto;
teste negativo de isolamento; consentimento/versionamento quando aplicável; proibição de
conteúdo sensível em logs/eventos; retenção para o novo acervo; ou dono e runbook para
incidente de risco relevante. Registre o bloqueio e a ação necessária na issue, em vez de
aceitar compensação verbal.
