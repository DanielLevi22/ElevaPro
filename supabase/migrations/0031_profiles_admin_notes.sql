-- Cria `profiles.admin_notes`.
--
-- A tela de detalhe do usuário no `/admin` lê, edita e grava este campo desde
-- que foi escrita — numa coluna que nunca existiu. O `select` era recusado com
-- 42703 e o `update` também; a caixa de notas aparecia vazia, aceitava texto e
-- perdia tudo, sem erro na tela.
--
-- A coluna entra em vez de a feature sair porque anotar sobre uma conta é
-- trabalho real de quem administra: por que foi suspensa, o que o suporte já
-- tentou, o que ficou combinado.
--
-- **Não é campo de dado de saúde.** É anotação administrativa sobre a conta, e
-- o texto é escrito pelo admin, não coletado do titular. Fica sob a mesma RLS
-- de `profiles`, que o admin já alcança — nenhuma política nova, nenhum acesso
-- novo a `physical_assessments`, `student_anamnesis`, `health_daily_metrics`,
-- `meal_logs` ou `diet_plans`, que seguem fechadas para admin e verificadas em
-- `scripts/test-rls-isolation.mjs`.
--
-- Entra no direito de acesso do titular (Art. 18, II): é dado pessoal dele,
-- ainda que escrito por terceiro.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN profiles.admin_notes IS
  'Anotação administrativa sobre a conta, escrita pelo admin. Não é dado de saúde.';
