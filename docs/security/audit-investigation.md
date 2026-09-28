# Consulta de investigação da trilha

Use somente a conexão de banco autorizada para segurança/encarregado. O BFF e os
papéis `anon`/`authenticated` não têm leitura da tabela. Restrinja o intervalo e
use o `trace_id` apresentado ao suporte no cabeçalho `X-Request-Id`; não cole
nome, e-mail, IP, token ou dado de saúde no chamado.

```sql
SELECT event_id, occurred_at, event_type, outcome, actor_hash, subject_hash,
       resource_type, resource_id, origin, trace_id
FROM private.security_audit_events
WHERE trace_id = :'trace_id'
  AND occurred_at >= :'from_utc'::timestamptz
  AND occurred_at < :'to_utc'::timestamptz
ORDER BY occurred_at, event_id
LIMIT 100;
```

Compare `trace_id`, instante e tipo com o log técnico `rate_limit.decision` ou
com o evento de rota. `actor_hash` e `subject_hash` são pseudônimos; não
recalcule fora do banco nem exporte a chave do Vault. A ausência de resultado
não prova que a operação não ocorreu: pode ser falha de escrita, evento sem
`trace_id`, retenção vencida ou fluxo do Supabase Auth. Eventos de MFA são
investigados nos Auth Audit Logs, conforme
`docs/security/mfa-operating-procedure.md`.

Registre quem consultou, motivo, período, referência do evento e conclusão no
processo de incidente, sem copiar a linha integral para um log comum. A trilha
do produto expira em 365 dias pelo job `purge-security-audit-events`.
