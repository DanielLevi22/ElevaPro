# A nota do especialista é de quem escreveu, e o aluno só lê

`specialist_notes` (migration `0057`) guarda o que o profissional escreve sobre o progresso
do Aluno. Duas assimetrias, as duas deliberadas: **outro especialista do mesmo aluno não lê
a nota do colega**, e **o Aluno lê tudo que escreveram sobre ele, mas não escreve nem
apaga**.

**Status:** accepted. Issue #312 §4, lote do fluxo de métricas em vidro.

## Por que o colega não lê

Um aluno pode ter dois profissionais ao mesmo tempo — personal e nutricionista são serviços
separados no `student_specialists`. A leitura por vínculo, que é o padrão das outras tabelas
de saúde, faria a observação do treinador aparecer no painel da nutricionista.

A nota é campo aberto: é onde se escreve "chegou abatido", "reclamou de dor no ombro",
"sumiu duas semanas". Isso é o registro de **uma** relação profissional, e ampliá-lo para
todo vínculo ativo transformaria uma anotação de acompanhamento num prontuário compartilhado
que ninguém decidiu criar. Quem precisa que o colega saiba conta ao colega.

O custo é real: dois profissionais do mesmo aluno não se coordenam por aqui. Se a
coordenação virar requisito, ela pede uma nota com destinatário explícito — não o
afrouxamento desta política.

## Por que o Aluno não apaga

O Art. 18 alcança o que o titular declarou. A nota não é declaração dele: é o registro do
profissional sobre o acompanhamento, a mesma natureza da avaliação física, que a `0017`
tornou imutável. Deixar o aluno apagá-la reescreveria o histórico clínico de outra pessoa.

Ele não fica sem saída: **lê tudo** (inclusive depois de revogar o consentimento — revogar
fecha o acesso do especialista, nunca o do titular), **revoga** e **encerra o vínculo**, e a
exclusão da conta elimina as notas por cascata.

## Consequências

- **Apagar exige ler.** O Postgres aplica a política de `SELECT` à linha citada no `WHERE`
  de um `DELETE`. Revogado o consentimento, o autor perde a leitura e, com ela, o alcance
  para apagar — por isso a política de `DELETE` tem as mesmas condições da de leitura, em
  vez de prometer o que o banco não entrega. A nota fica com o aluno até a conta dele sair.
- **A conta do especialista apagada deixa a nota sem autor** (`ON DELETE SET NULL`), e não
  leva o histórico do aluno junto — mesma escolha de `physical_assessments`.
- Toda leitura nova precisa decidir de quem é a nota. Uma consulta que filtra só por
  `student_id` devolve, para o especialista, exatamente o que esta decisão fecha; quem
  garante isso é a RLS, e as travas da `verify-rls.sql` falham nos dois sentidos.
