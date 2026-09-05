import { pedacosDoTexto } from "../services/marcacaoDoTexto";

/**
 * O texto do assistente, com a marcação que ele escreve.
 *
 * Só o texto **do assistente**: o que a pessoa digitou é mostrado como ela
 * digitou. Quem escreve um asterisco na própria mensagem espera ver um
 * asterisco, não itálico.
 *
 * Cada pedaço vira elemento React — nunca HTML montado a partir do texto do
 * modelo. Quebras de linha e listas continuam pelo `whitespace-pre-wrap` da
 * bolha, que já dava conta delas.
 */
export function TextoDoAssistente({ content }: { content: string }) {
  return (
    <>
      {pedacosDoTexto(content).map((pedaco, i) => {
        // O texto é imutável e a lista nunca reordena nem recebe inserção no
        // meio: o índice, junto do tipo, é identidade estável aqui.
        const key = `${pedaco.tipo}-${i}`;

        if (pedaco.tipo === "negrito") {
          return (
            <strong key={key} className="font-semibold">
              {pedaco.texto}
            </strong>
          );
        }
        if (pedaco.tipo === "italico") return <em key={key}>{pedaco.texto}</em>;
        if (pedaco.tipo === "codigo") {
          return (
            <code key={key} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em]">
              {pedaco.texto}
            </code>
          );
        }
        return <span key={key}>{pedaco.texto}</span>;
      })}
    </>
  );
}
