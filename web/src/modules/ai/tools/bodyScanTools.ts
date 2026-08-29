import type { ToolDefinition } from "../providers/types";

/**
 * Consulta da análise corporal, compartilhada pelos dois coaches.
 *
 * Existe como ferramenta, e não como bloco fixo do contexto, porque o contexto
 * é reenviado a cada turno: somar o corpo da análise encareceria toda mensagem
 * por um dado que a maioria dos turnos não usa, e ampliaria sem necessidade o
 * payload de saúde que atravessa a fronteira (Art. 6°, III).
 *
 * O contexto só anuncia que existem N análises e quando foi a última — índice
 * no contexto, detalhe por ferramenta (`ADR-0010`).
 */
export const BODY_SCAN_TOOL: ToolDefinition = {
  name: "query_body_scan",
  description:
    "Consulta a análise corporal por imagem mais recente do aluno e o que mudou desde a anterior. Use quando for prescrever e a composição corporal ou a postura importarem para a decisão — assimetria e desalinhamento mudam a escolha de exercício; tendência de cintura calibra a meta calórica. As circunferências são ESTIMATIVAS derivadas da altura como escala, com erro de 5 a 10%: trate a variação entre duas análises como o dado confiável, nunca o valor absoluto como medida.",
  input_schema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};
