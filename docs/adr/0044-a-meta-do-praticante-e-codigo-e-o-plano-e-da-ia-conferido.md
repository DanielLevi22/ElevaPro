# A meta e as travas do Praticante são código; o plano é da IA, conferido pelo código

No Aluno, quem decide divisão, volume e meta calórica é o Specialist, e a IA só
escolhe exercícios e alimentos dentro disso. No Praticante não há ninguém para
decidir, e hoje quem decide tudo é o modelo: o `propose_plan` do coach do aluno
escolhe `daily_calories`, macros e `split_name` sozinho. Decidimos dividir a
decisão em três partes:

1. **O código fixa a meta e as travas.** Meta calórica e macros pela
   `energyTargets.ts`, que já existe, mais o piso na TMB, o teto de ritmo e a
   triagem que decide se há dieta. Nada disso passa pela IA.
2. **A IA monta o plano dentro de faixas.** Divisão, volume, exercícios e
   refeições, numa chamada única, sem chat, recebendo as respostas do onboarding,
   a meta já fixada e as faixas de treino da pesquisa.
3. **O código confere o que a IA devolveu** antes de mostrar: os dias são os
   escolhidos, as refeições são N, nenhum alimento excluído aparece, o esporte
   vem como opcional e as calorias batem com a meta. Se não bater, gera de novo
   ou mostra o erro.

A aprovação segue o ADR-0020: a proposta fica guardada, e só "Aprovar plano"
grava, pelo mesmo caminho do `student/coach/save-plan`.

**Status:** accepted, abertura ao público condicionada à validação profissional
e jurídica (abaixo). Issue #365. Base:
[`regras-prescricao-praticante.md`](../research/regras-prescricao-praticante.md).

## Por que não tudo em regra

A primeira versão desta decisão punha divisão e volume num módulo de regras.
A pesquisa mostrou que, no treino, a literatura só dá faixa: a divisão por
número de dias é convenção, e nenhuma fonte dá volume por nível nem converte
minutos de sessão em número de exercícios. Escrever essas regras seria inventar
números para depois o CREF corrigir. Dar as faixas à IA reaproveita o que o coach
já faz, e a revisão do CREF passa a ser sobre as faixas do prompt.

## Por que não tudo na IA

A meta e as travas ficam em código por três motivos:

- **Segurança.** "Nunca abaixo da TMB" e "condição clínica → sem dieta" não podem
  depender de o modelo lembrar. O coach atual já erra nisso.
- **LGPD.** A triagem acontece antes da chamada, e a condição clínica nunca chega
  à IA: ela recebe "sem dieta" ou a exclusão de alimento.
- **Reprodutibilidade.** A mesma pessoa não pode receber duas metas porque o
  modelo variou, e a meta precisa ser explicável na tela: "sua meta ficou em
  1.850 porque não descemos abaixo do seu gasto em repouso".

Não é um motor de regras: são poucas funções puras no `shared`, ao lado da
`energyTargets.ts`.

## As travas e as decisões de dado

- Condição clínica ou "prefiro não informar" → sem dieta, só treino.
- IMC < 18,5 → sem meta de perda.
- **Meta nunca abaixo da TMB**, e ritmo máximo de ~1% do peso por semana.
- **O Praticante é só para maiores de 18 anos.** Quem tem menos é orientado a usar
  o app com um especialista. Isso tira do caminho o Art. 14 da LGPD (dado de saúde
  de adolescente), a Mifflin-St Jeor fora da faixa validada (19–78 anos) e o
  IMC-para-idade. Revisável com parecer jurídico.
- A condição clínica não é guardada: o banco recebe só o resultado da triagem
  (dieta liberada ou encaminhada, e se o motivo foi condição ou não informar).
  Lesão continua guardada por região, porque muda o treino.
- Quem recusa o consentimento de saúde recebe só treino, gerado com objetivo,
  nível, dias, tempo e local, sem nenhum dado de saúde gravado. Recusar custa a
  dieta, não o app (Art. 8°).

## A análise corporal é etapa opcional, não um segundo fluxo

O body scan não estima peso nem altura: precisa dos dois como escala
(ADR-0022). Por isso ele não substitui "Sobre você" e entra como ramo opcional
logo depois dela, num fluxo só:

- **Oferta, nunca passo obrigatório.** "Fazer agora" e "Agora não" com o mesmo
  peso. Fotos do corpo no primeiro minuto são atrito, e a ativação não pode
  depender delas. Quem pula encontra a oferta de novo em "Complete seu perfil", e
  o plano se recalibra quando o resultado chega.
- **A análise roda enquanto a pessoa responde.** Ela leva cerca de 30 s; começa
  depois da terceira foto e a pessoa segue para as telas seguintes. "Montando"
  espera o resultado se ele ainda não chegou. Falhou, o plano sai pela fórmula
  padrão.
- **O resultado muda o plano.** Com % de gordura, a proteína passa a ser por kg
  de massa magra, o que corrige a meta inflada em obesidade (abaixo), e o gasto
  em repouso pode vir da massa magra (Katch-McArdle), a validar pelo CRN. As
  notas de postura e simetria vão à IA como ênfase do treino; a foto nunca vai.
- **É estimativa e a tela diz isso,** com o selo de confiança que já existe.

## O que corrige no código atual

A conferência de `energyTargets.ts` contra as fontes achou três falhas:

- **Sedentário em corte fica abaixo da TMB:** 1,2 × 0,8 = 0,96 × TMB, e não existe
  piso nenhum.
- **Proteína do corte por peso total:** a faixa da literatura é por kg de massa
  magra; em obesidade a meta infla (130 kg → 286 g/dia).
- **Carbo "pelo que sobra" chega a quase zero sem aviso** quando proteína e
  gordura por peso total consomem a meta.

## Valores provisórios e condição para abrir ao público

Os fatores de atividade do código não têm fonte primária, e as faixas de treino
do prompt são as da pesquisa, não de um profissional. O código pode ser escrito e
testado assim, com cada valor provisório marcado e com a fonte ao lado. O
onboarding só abre ao público depois de:

1. um educador físico (CREF) e um nutricionista (CRN), como responsáveis
   técnicos, validarem as faixas do prompt e os valores da meta (tabela da seção
   5 da pesquisa);
2. um parecer jurídico sobre plano gerado por sistema para quem não tem
   profissional. Gerar pela IA não muda essa questão. O art. 3º, VII da Lei
   8.234/1991 torna privativa do nutricionista a assistência nutricional a
   indivíduos "sadios ou enfermos", e a Resolução CONFEF 542/2024 trata como
   exercício ilegal a orientação "mesmo em ambiente virtual" por quem não tem
   registro. Nenhum texto lido trata do caso do software.

Quando os dois chegarem, este ADR registra o que foi validado e o parecer, e os
marcadores de provisório saem do código.

## Consequências

- O coach de chat do aluno precisa receber a meta do código em vez de escolher
  `daily_calories`: dois caminhos dando metas diferentes para a mesma pessoa
  contradizem esta decisão. O risco jurídico acima já existe nele hoje.
- A geração reaproveita o miolo das rotas de IA, mas por rota própria com a
  autorização do Student (`authorizeStudentWithHealthConsent`): a `workout/batch`
  exige Specialist com MFA.
- As telas de captura do scan moram no grupo `(professional)`; o onboarding
  reaproveita a captura e o portão, e o Praticante precisa alcançá-las.
- A conferência da saída da IA é o seam "plano gerado respeita as escolhas" da
  #365, e é ela que se testa, não o prompt.
