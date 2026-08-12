-- `specialist_services` nunca teve UNIQUE em (specialist_id, service_type).
--
-- Duas consequências, e a segunda é a que apareceu como bug:
--
-- 1. Nada impedia a mesma dupla repetida, e a leitura de serviços do
--    especialista passa a contar duplicata.
-- 2. `ensure-profile` faz upsert com `onConflict: "specialist_id,service_type"`.
--    Sem a constraint, o Postgres recusa com 42P10 — "there is no unique or
--    exclusion constraint matching the ON CONFLICT specification". A rota
--    ignorava o erro, então o autoconserto do cadastro nunca funcionou: o
--    especialista ficava sem nenhum serviço e o CASL negava dietas com
--    "Conta specialist com serviços [nenhum] não pode ler dietas".
--
-- Limpa a duplicata antes de criar a constraint — em base que já tenha uma, o
-- ALTER falharia e a migration travaria o deploy.

DELETE FROM specialist_services a
USING specialist_services b
WHERE a.specialist_id = b.specialist_id
  AND a.service_type = b.service_type
  AND a.ctid > b.ctid;

ALTER TABLE specialist_services
  ADD CONSTRAINT specialist_services_specialist_service_unique
  UNIQUE (specialist_id, service_type);
