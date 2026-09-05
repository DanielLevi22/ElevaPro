import type { ResumoDaMetrica } from "../services/historicoDeSaude";

/**
 * Uma métrica do relógio, sempre contra a linha de base do próprio aluno.
 *
 * O número absoluto não é a informação: 58 bpm de repouso não diz nada sozinho,
 * 58 quando a média dele é 52 diz bastante. É também o que mantém a tela do
 * lado do acompanhamento de treino — ela mostra a variação e nomeia o que ela
 * é, sem afirmar o que significa para a saúde de ninguém.
 */
export function CartaoDaMetrica({
  rotulo,
  resumo,
  formatar,
  sufixo,
  menorEMelhor = false,
}: {
  rotulo: string;
  resumo: ResumoDaMetrica;
  formatar: (valor: number) => string;
  sufixo: string;
  /** FC de repouso subindo é sinal de fadiga; sono subindo, não. */
  menorEMelhor?: boolean;
}) {
  const { atual, media, variacao } = resumo;

  const corDaVariacao =
    variacao == null || variacao === 0
      ? "text-muted-foreground"
      : variacao > 0 === menorEMelhor
        ? "text-orange-400"
        : "text-emerald-400";

  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-5">
      <p className="text-xs text-muted-foreground mb-1">{rotulo}</p>

      <p className="font-display text-2xl font-bold text-foreground tabular-nums">
        {atual == null ? "—" : formatar(atual)}
      </p>

      {/*
        Ternário, não `&&`: a alternativa não é "nada", é dizer por que não há
        comparação. Some sem explicação e a tela parece quebrada nos primeiros
        dias de uso, que é justamente quando ela é mais olhada.
      */}
      {variacao != null && media != null ? (
        <p className={`text-xs mt-1 font-semibold tabular-nums ${corDaVariacao}`}>
          {variacao > 0 ? "+" : ""}
          {formatar(variacao)} {sufixo} · média {formatar(media)}
        </p>
      ) : (
        <p className="text-xs mt-1 text-muted-foreground">
          {atual == null ? "sem leitura" : "sem base suficiente"}
        </p>
      )}
    </div>
  );
}
