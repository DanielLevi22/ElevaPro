import { type BodyScanRecord, linhasMedidas, ressalvasDoScan } from "@elevapro/shared";
import { DataTable } from "@/shared/components/ui/DataTable";

/**
 * O que o aparelho mediu, para quem prescreve em cima disso.
 *
 * A diferença entre esta tela e a do aluno é o propósito, não o dado: o aluno
 * exerce acesso ao que foi tratado (Art. 18, II), o especialista decide o que
 * fazer. Por isso aqui as ressalvas vêm **antes** dos números — saber que a
 * foto estava em contraluz muda como se lê a tabela inteira, e depois dela já
 * é tarde.
 *
 * Nenhum número daqui é do modelo. São conta sobre a geometria da foto, e é
 * essa procedência que os torna acompanháveis ao longo do tempo — "ombro
 * direito elevado" não dá para comparar com nada.
 */

export function MedidasDoScan({ scan }: { scan: BodyScanRecord }) {
  const linhas = linhasMedidas(scan);
  const ressalvas = ressalvasDoScan(scan);

  // Sem medida não há seção. Cabeçalho vazio afirmaria que houve medição.
  if (linhas.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
        Medido no aparelho
      </h2>
      <p className="text-muted-foreground text-xs mt-1 mb-4">
        Geometria da foto, não estimativa do modelo. A escala vem da altura do aluno.
      </p>

      {ressalvas.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          {ressalvas.map((ressalva) => (
            <li className="text-amber-500 text-xs leading-5" key={ressalva}>
              {ressalva}
            </li>
          ))}
        </ul>
      )}

      <DataTable
        columns={[
          { key: "rotulo", header: "Medida", keepOnMobile: true, render: (l) => l.rotulo },
          {
            key: "valor",
            header: "Valor",
            width: "md:w-32",
            keepOnMobile: true,
            render: (l) => (
              <span className="font-bold text-foreground">
                {l.valor.toFixed(1)}
                <span className="text-muted-foreground font-normal"> {l.unidade}</span>
              </span>
            ),
          },
          {
            // O lado some quando o desnível é menor que a incerteza do método,
            // e a nota entra no lugar dizendo por quê. Nomear lado abaixo disso
            // afirmaria uma certeza que a torção tolerada do aparelho consome.
            key: "lado",
            header: "Lado",
            width: "md:w-44",
            render: (l) =>
              l.lado ?? (l.nota ? <span className="text-muted-foreground">{l.nota}</span> : "—"),
          },
        ]}
        rowKey={(l) => l.campo}
        rows={linhas}
      />
    </section>
  );
}
