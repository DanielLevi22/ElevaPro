# A medida declarada mora na mesma tabela da avaliação, com a origem ao lado

O Praticante (ADR-0028) não tem especialista, e ficava sem composição corporal nem
medidas para acompanhar: a Assessment era só "medida pelo especialista, com fita". A
partir da `0056` o próprio Student declara peso, altura, gordura e circunferências, e a
declaração mora em `physical_assessments` com `measured_by = 'self'`. A do especialista
fica `measured_by = 'specialist'` e segue imutável.

**Status:** accepted. Issue #312, lote do fluxo de métricas em vidro.

## Opções consideradas

- **Tabela nova para a declaração.** Separaria as regras de escrita sem uma coluna de
  origem, mas as quatro telas de corpo (composição, circunferências, comparação,
  histórico), a Escala do Body scan e o painel do especialista passariam a ler e juntar
  duas tabelas com as mesmas colunas. É a mesma grandeza com outra origem.
- **Reusar a anamnese.** A anamnese já guarda altura e peso declarados, mas é um
  questionário único por aluno, sem data por medida: não dá série, e é o que menos
  serve para acompanhar.
- **Mesma tabela, com a origem.** Escolhida. As políticas separam as regras por
  `measured_by`, e a série é recortada por origem antes de chegar a qualquer gráfico.

## As regras que o banco carrega

- **Uma série nunca mistura as duas.** Fita e fita métrica em casa não são o mesmo
  instrumento, e a diferença entre as duas parece progresso. As telas escolhem uma
  origem e a comparação é sempre da mesma origem; a troca é explícita.
- **Só declara quem não tem especialista ativo.** Com especialista, quem mede é ele.
  Uma declaração ao lado da fita seria o número que o aluno escolhe mostrar.
- **A declarada se corrige e se apaga; a do especialista, não.** Corrigir medida
  clínica reescreve o histórico (ADR da imutabilidade, `0017`). A declarada é o que o
  titular disse, e o Art. 18, III e VI alcança o que ele declarou — inclusive depois de
  contratar um especialista.
- **Declarar exige consentimento presente** (`has_health_consent`), e não só a ausência
  de revogação como o acervo do especialista: não existe declaração anterior ao portão.
  Apagar não exige nada.
- **A Escala ganha uma terceira origem**, `self`, entre a fita e a anamnese.

## Consequências

- Toda leitura nova de `physical_assessments` precisa decidir a origem. Uma consulta
  que ignora `measured_by` volta a misturar as séries sem erro nenhum.
- Uma conta que ganha especialista para de declarar, mas o que já declarou continua
  dela, visível e corrigível. É o único caminho em que as duas origens convivem na
  mesma conta.
- **Pendente no web (#312):** o painel do especialista, o gráfico de peso da nutrição e
  os dois carregadores de contexto da IA ainda leem `physical_assessments` sem olhar
  `measured_by`. Para a conta que declarou e depois contratou um especialista, a
  "última avaliação" pode ser a declarada, e o gráfico junta as duas origens.
- A primeira medida do Praticante nasce da anamnese adaptativa, quando ele ainda não
  tem nenhuma declarada. Responder de novo não cria outra.
