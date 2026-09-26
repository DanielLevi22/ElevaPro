-- Plano de dieta em rascunho (#337).
--
-- O especialista monta a próxima dieta sem tirar a atual do aluno: o plano
-- nasce `draft`, e só vale — e só finaliza o anterior — quando é enviado.
--
-- Arquivo próprio porque um valor novo de enum não pode ser usado na mesma
-- transação em que é criado, e a 0073 usa `'draft'` nas políticas.

ALTER TYPE public.diet_plan_status ADD VALUE IF NOT EXISTS 'draft';
