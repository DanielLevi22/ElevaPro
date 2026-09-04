import type { Gravacao } from "@elevapro/shared";
import { conferir, diagnosticar, motivoDominante } from "@elevapro/shared";

/**
 * O que a análise produziu, e se dá para confiar nela.
 *
 * As duas coisas ficam juntas de propósito: a contagem de repetições sozinha
 * não diz se o vídeo foi lido direito, e foi exatamente essa separação que
 * fazia "nenhuma repetição detectada" ser verdade e não ajudar ninguém.
 */
export function ResultadoDaAnalise({
  gravacao,
  onBaixar,
}: {
  gravacao: Gravacao;
  onBaixar: () => void;
}) {
  const { acertos, erros, total } = conferir(gravacao);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">repetições detectadas</span>
          <span className="font-mono text-sm">{total}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">de acordo com o rótulo</span>
          <span className="font-mono text-sm">{acertos}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">em desacordo</span>
          <span className="font-mono text-sm">{erros}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">quadros</span>
          <span className="font-mono text-sm">{gravacao.quadros.length}</span>
        </div>
      </div>

      {total > 0 && acertos === 0 && (
        <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <strong>Todas as {total} repetições discordaram do rótulo.</strong> Antes de concluir que
          o julgador errou, confira o seletor: discordância total é o resultado esperado de uma
          série rotulada ao contrário.
        </p>
      )}

      <QualidadeDaLeitura gravacao={gravacao} semRepeticao={total === 0} />

      <button
        className="self-start rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        onClick={onBaixar}
        type="button"
      >
        Baixar fixture (.json)
      </button>
    </div>
  );
}

/**
 * Por que a gravação não rendeu repetição.
 *
 * "Nenhuma repetição detectada" é verdade e não ajuda: quem filmou de frente e
 * quem cortou os pés do quadro liam a mesma frase. O diagnóstico conta os
 * quadros por motivo e transforma o aviso em instrução.
 */
function QualidadeDaLeitura({
  gravacao,
  semRepeticao,
}: {
  gravacao: Gravacao;
  semRepeticao: boolean;
}) {
  const diagnostico = diagnosticar(gravacao.quadros);
  const motivo = motivoDominante(diagnostico);
  const pctDe = (n: number) =>
    diagnostico.quadros === 0 ? "0%" : `${Math.round((n / diagnostico.quadros) * 100)}%`;

  // A contagem por motivo aparece SEMPRE, e nao so quando nada foi detectado.
  // Escondida no caso intermediario, ela faltava justamente no diagnostico mais
  // dificil: aquele em que o julgador leu parte do video e perdeu o resto.
  const legivel = diagnostico.aptos / Math.max(1, diagnostico.quadros);
  const tudoBem = !semRepeticao && legivel >= 0.8;

  if (tudoBem) {
    return (
      <p className="text-xs text-neutral-500">
        {diagnostico.quadros} quadros, {pctDe(diagnostico.aptos)} legíveis.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <p className="font-semibold">
        {semRepeticao
          ? "Nenhuma repetição detectada"
          : `O corpo só foi legível em ${pctDe(diagnostico.aptos)} dos quadros`}
      </p>

      {motivo === "de-frente" && (
        <p>
          Em {pctDe(diagnostico.deFrente)} dos quadros a pessoa estava{" "}
          <strong>de frente ou de costas</strong> para a câmera. Precisa ser{" "}
          <strong>de lado</strong>: um ombro apontando para a câmera, o olhar para uma parede a 90°
          dela. De frente, a coxa aponta para a lente e some na projeção — o cálculo de profundidade
          devolveria um número plausível e errado, então o julgador prefere calar.
        </p>
      )}

      {motivo === "sem-articulacao" && (
        <p>
          Em {pctDe(diagnostico.semArticulacao)} dos quadros faltou{" "}
          <strong>quadril, joelho ou tornozelo</strong> no enquadramento. Afaste a câmera até o
          corpo inteiro caber, da cabeça aos pés, durante todo o movimento — inclusive no ponto mais
          fundo.
        </p>
      )}

      {motivo === null && (
        <p>
          O enquadramento estava legível em {pctDe(diagnostico.aptos)} dos quadros, então o problema
          não é a câmera. O mais provável é que o movimento não tenha completado o ciclo: o julgador
          só fecha uma repetição quando a pessoa desce e volta a estender por completo.
        </p>
      )}

      <p className="text-xs opacity-80">
        {diagnostico.quadros} quadros — {diagnostico.aptos} legíveis, {diagnostico.deFrente} de
        frente, {diagnostico.semArticulacao} com articulação fora do quadro.
      </p>
    </div>
  );
}
