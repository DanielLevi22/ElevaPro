import type { HealthDailyMetric } from "@elevapro/shared";
import { formatDate } from "@/shared/utils/formatDate";

/**
 * Barras dos últimos dias, em SVG inline.
 *
 * Sem biblioteca de gráfico de propósito: a aba Métricas já carrega `recharts`
 * sob demanda porque ele é pesado, e uma barra por dia não paga esse custo numa
 * aba que o especialista abre para dar uma olhada rápida.
 *
 * A altura é relativa ao maior valor do período, não a uma escala fixa: o que
 * importa é o formato da série — três noites curtas em seguida —, não o valor
 * absoluto, que os cartões acima já dão.
 */
export function SerieDoPeriodo({
  dias,
  extrair,
  cor,
  formatar,
  rotulo,
}: {
  dias: HealthDailyMetric[];
  extrair: (dia: HealthDailyMetric) => number | null;
  cor: string;
  formatar: (valor: number) => string;
  rotulo: string;
}) {
  // Do mais antigo para o mais recente: `getRange` entrega decrescente, e um
  // gráfico temporal lido da direita para a esquerda inverte a leitura de
  // tendência — o especialista veria melhora onde houve piora.
  const serie = [...dias].reverse();
  const valores = serie.map(extrair);
  const maximo = Math.max(...valores.filter((v): v is number => v != null), 1);

  return (
    <section className="bg-surface border border-white/10 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-foreground text-pretty mb-4">{rotulo}</h2>

      {/*
        O gráfico inteiro sai do fluxo de acessibilidade, não só as barras: os
        rótulos abaixo delas são a mesma série, e sem isto o leitor de tela lê
        os quatorze valores duas vezes — uma aqui, outra na tabela.
      */}
      <div aria-hidden className="flex items-end gap-1.5 h-32 overflow-x-auto">
        {serie.map((dia, indice) => {
          const valor = valores[indice];
          const altura = valor == null ? 4 : Math.max(6, (valor / maximo) * 100);
          const ehUltimo = indice === serie.length - 1;

          return (
            <div className="flex-1 min-w-[18px] flex flex-col items-center gap-1.5" key={dia.date}>
              <div
                className="w-full rounded-t transition-[height]"
                style={{
                  height: `${altura}px`,
                  // Dia sem leitura vira tracinho apagado, e não barra de altura
                  // zero: zero no mesmo tom do resto lê como "dormiu nada".
                  backgroundColor: valor == null ? "rgb(113 113 122)" : cor,
                  opacity: valor == null ? 0.35 : ehUltimo ? 1 : 0.55,
                }}
              />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {valor == null ? "—" : formatar(valor)}
              </span>
            </div>
          );
        })}
      </div>

      {/*
        A tabela é a série, não uma repetição dela: o gráfico é `aria-hidden`, e
        sem isto a informação não existiria para leitor de tela.
      */}
      <table className="sr-only">
        <caption>{rotulo}</caption>
        <tbody>
          {serie.map((dia, indice) => (
            <tr key={dia.date}>
              <th scope="row">{formatDate(dia.date, "short")}</th>
              <td>
                {valores[indice] == null ? "sem leitura" : formatar(valores[indice] as number)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
