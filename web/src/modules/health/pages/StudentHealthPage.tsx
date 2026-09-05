import { CartaoDaMetrica } from "../components/CartaoDaMetrica";
import { SerieDoPeriodo } from "../components/SerieDoPeriodo";
import { carregarHistoricoDeSaude, DIAS_DA_JANELA } from "../services/historicoDeSaude";

function formatarSono(minutos: number): string {
  const sinal = minutos < 0 ? "-" : "";
  const absoluto = Math.abs(minutos);
  const horas = Math.floor(absoluto / 60);
  const resto = absoluto % 60;

  if (horas === 0) return `${sinal}${resto}min`;
  return resto === 0 ? `${sinal}${horas}h` : `${sinal}${horas}h${String(resto).padStart(2, "0")}`;
}

/**
 * Estado vazio que distingue os dois motivos possíveis.
 *
 * Sem essa distinção, o aluno que revogou o consentimento e o aluno que nunca
 * conectou o relógio chegam idênticos aqui — e o especialista cobraria de um
 * deles uma coisa que já foi decidida. A RLS devolve lista vazia nos dois casos
 * (`0043`), e é ela quem deve decidir, não esta tela: por isso o texto nomeia
 * as duas possibilidades em vez de afirmar uma.
 */
function SemDados() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Nenhum dado de relógio nos últimos {DIAS_DA_JANELA} dias.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        O aluno pode ainda não ter conectado o relógio, ou ter desligado o compartilhamento — nos
        dois casos, quem decide é ele, pelo app.
      </p>
    </div>
  );
}

/**
 * O que o relógio do aluno mediu, para o especialista vinculado.
 *
 * Server Component: a leitura é pura, não há interação, e buscar no servidor
 * evita mandar o cliente Supabase e uma volta de rede ao navegador para
 * desenhar quatorze barras.
 */
export async function StudentHealthPage({ studentId }: { studentId: string }) {
  const { dias, sono, frequenciaDeRepouso, passos } = await carregarHistoricoDeSaude(studentId);

  if (dias.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-bold text-foreground text-pretty">Relógio</h1>
        <SemDados />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground text-pretty">Relógio</h1>
        <p className="text-sm text-muted-foreground">
          Últimos {DIAS_DA_JANELA} dias, comparados com a média do próprio aluno
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CartaoDaMetrica
          formatar={formatarSono}
          resumo={sono}
          rotulo="Sono na última noite"
          sufixo="vs. média"
        />
        <CartaoDaMetrica
          formatar={(v) => `${v} bpm`}
          menorEMelhor
          resumo={frequenciaDeRepouso}
          rotulo="FC de repouso"
          sufixo="vs. média"
        />
        <CartaoDaMetrica
          formatar={(v) => v.toLocaleString("pt-BR")}
          resumo={passos}
          rotulo="Passos"
          sufixo="vs. média"
        />
      </div>

      <SerieDoPeriodo
        cor="rgb(129 140 248)"
        dias={dias}
        extrair={(d) => d.sleep_minutes}
        formatar={(v) => `${Math.round(v / 60)}h`}
        rotulo="Sono por noite"
      />

      <SerieDoPeriodo
        cor="rgb(248 113 113)"
        dias={dias}
        extrair={(d) => d.resting_heart_rate}
        formatar={(v) => String(v)}
        rotulo="Frequência cardíaca de repouso"
      />

      {/*
        O que a tela não diz, e por quê. Sem esta linha, uma FC de repouso alta
        por três dias vira conversa clínica na próxima sessão — e a base legal
        aqui é acompanhamento de treino, não avaliação de saúde.
      */}
      <p className="text-xs text-muted-foreground">
        Medidas do aparelho do aluno, para ajuste de carga. Não substituem avaliação clínica, e a
        precisão varia entre modelos de relógio.
      </p>
    </div>
  );
}
