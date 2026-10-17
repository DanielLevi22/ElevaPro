# Correção de avaliações físicas e LGPD

Pesquisa em 16/10/2026. Escopo: erro de digitação em avaliação do especialista,
com versão corrigida nos gráficos e original apenas para consulta, conforme decisão
do mantenedor. Esta nota fundamenta a issue; não é PRD nem aprovação da implementação.

## Fontes oficiais

- A LGPD garante correção de dados incompletos, inexatos ou desatualizados (art. 18,
  III), sem distinguir quem os digitou. Exige qualidade, necessidade e prestação de
  contas (art. 6º, III, V e X). A correção deve ser comunicada aos agentes com quem
  houve compartilhamento, ressalvadas impossibilidade comprovada e desproporção
  (art. 18, §6º). [LGPD — Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- Dados de saúde exigem hipótese do art. 11; legítimo interesse do art. 7º não basta.
  Retenção deve observar necessidade e término do tratamento; o art. 16 disciplina
  exceções de conservação após o término. A LGPD não fixa prazo específico para
  versões de avaliação física nem exige imutabilidade dessas avaliações.
  [LGPD, arts. 5º, II; 11; 15–16](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- A ANPD explica que a correção pode incluir atualização e inserção de novos dados.
  O direito não obriga a usar SQL UPDATE ou a liberar edição irrestrita para todos.
  [ANPD — Direito dos Titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares)

## Aplicação ao Eleva Pro — interpretação de engenharia

Recomenda-se permitir correção identificada e vinculada à avaliação original,
preservando sua data de medição. A revisão passa a ser a versão vigente para série,
comparação, resumo e contexto de IA; a anterior aparece como substituída, fora dos
cálculos. Uma correção não deve parecer nova evolução física. Isso é uma proposta
de produto compatível com os princípios acima, não arquitetura prescrita pela lei.

Preservar a versão anterior não é automaticamente proibido, nem automaticamente
justificado por chamá-la de auditoria. O acervo de versões continua sendo dado de
saúde: documentar finalidade de rastreabilidade, necessidade do conteúdo anterior,
base aplicável, destinatários, prazo e eliminação. Herança do ciclo da avaliação
(fim do vínculo/exclusão da conta) é candidata inicial, sujeita à revisão do
responsável; não presumir retenção eterna ou prazo de prontuário médico.

Separar esse acervo da trilha de segurança: o evento registra ator, instante,
referências opacas e resultado, sem valores de saúde. Aplicar vínculo, autoria,
consentimento e RLS também às versões antigas. O titular mantém acesso e canal de
correção/exclusão. Antes de aprovar implementação, provar isolamento e ausência de
conteúdo sensível no evento com testes negativos, conforme a skill `lgpd-check`.

## Contradições locais a resolver na issue

- [ADR-0030](../adr/0030-a-medida-declarada-mora-na-mesma-tabela-com-a-origem.md)
  trata avaliação do especialista como imutável e limita a justificativa do direito
  de correção ao autorrelato. A origem do dado não afasta o direito do titular.
  Sua referência ao ADR-0017 tampouco fundamenta imutabilidade: esse ADR trata da
  separação entre execução mobile e acompanhamento web.
- [Mapa LGPD](../LGPD_COMPLIANCE.md), seção Students, equipara ausência de UPDATE à
  qualidade. O mesmo documento, no feedback, afirma de forma ampla que preservar
  versão inexata contraria correção. Nenhuma dessas generalizações substitui a
  análise de finalidade: versão substituída identificada difere de valor errado
  mantido vigente. O baseline já distingue SaaS de bem-estar de prontuário médico.
- A seção 7 do mapa define avaliações enquanto existir vínculo. O novo acervo
  precisa explicitar esse ciclo e seu descarte; esta pesquisa não comprova que o
  banco já executa toda a política documentada.

Não foi identificada nessas fontes obrigação de proibir a correção relatada.
A decisão de preservar conteúdo anterior precisa entrar na revisão LGPD concreta
da feature; a mera pesquisa não certifica sua conformidade.
