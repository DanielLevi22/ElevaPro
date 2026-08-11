-- Permissões de tabela para os papéis da API.
--
-- Descoberto em 2026-08-11, ao rodar `supabase db reset` para validar as
-- políticas das migrations 0016–0019: nenhuma tabela tinha GRANT para `anon`,
-- `authenticated` ou `service_role`. Só `postgres`.
--
-- Causa: o Supabase configura ALTER DEFAULT PRIVILEGES no schema `public` para
-- objetos criados por `supabase_admin`. Nossas tabelas são criadas pelas
-- migrations, que rodam como `postgres` — outro papel, sem entrada em
-- pg_default_acl. Então elas nascem sem permissão para a API.
--
-- Por que ninguém percebeu: o banco local acumulou grants aplicados fora do
-- versionamento em algum momento, e seguiu funcionando. O reset apagou.
-- Consequência: um banco reconstruído só a partir das migrations não serve a
-- aplicação — nem em preview, nem em produção, nem em disaster recovery.
--
-- GRANT e RLS são camadas distintas e ambas obrigatórias:
--   sem GRANT, tudo é negado com erro 42501 (a aplicação quebra e você vê)
--   sem RLS, tudo é liberado em silêncio (ninguém vê, até vazar)

-- ── authenticated ────────────────────────────────────────────────────────────
-- Recebe as quatro operações em todas as tabelas. Quem decide QUAIS LINHAS é a
-- RLS das migrations 0013 e 0015–0019, não o GRANT.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── service_role ─────────────────────────────────────────────────────────────
-- Ignora RLS por definição. Usado só no servidor, nunca no navegador.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ── anon ─────────────────────────────────────────────────────────────────────
-- Sem GRANT, de propósito. Nenhuma tela do produto lê dado sem autenticar, e
-- `exercises_read_all` / `foods_read_all` usam `USING (true)` — com grant, o
-- catálogo inteiro ficaria legível sem login.
--
-- `anon` continua funcionando para o que precisa: login e cadastro passam pelo
-- schema `auth`, não por este.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ── Tabelas futuras ──────────────────────────────────────────────────────────
-- Fecha a recorrência: sem isto, a próxima tabela criada por migration nasce
-- sem grant e o problema volta na próxima vez que alguém reconstruir o banco.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
