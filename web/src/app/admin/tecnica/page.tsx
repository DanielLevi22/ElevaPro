import { AnaliseAoVivo, AnaliseDeArquivo, Varredura } from "@/modules/technique";
import { PageHeader } from "@/shared/components/ui/PageHeader";

/**
 * Painel de calibração da Análise de Técnica (issue #195).
 *
 * Server Component: só a análise precisa do browser, e ela está isolada nos
 * componentes clientes.
 *
 * **Nenhum quadro é gravado e nada é persistido.** O vídeo morre quando a aba
 * fecha; o que esta página produz é o limiar, e o limiar viaja no código.
 */

function Passo({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
          {numero}
        </span>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{titulo}</h2>
      </div>

      <div className="flex flex-col gap-4 border-l border-neutral-200 pl-10 dark:border-neutral-800">
        {children}
      </div>
    </section>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{children}</p>
  );
}

export default function CalibracaoDaTecnica() {
  return (
    <div className="flex max-w-4xl flex-col gap-12 p-6">
      <PageHeader
        description="Onde o limiar que o aparelho usa sai de medida em vez de palpite."
        eyebrow="Calibração"
        title="Análise de Técnica"
      />

      <div className="flex flex-col gap-3 rounded-xl bg-neutral-100 p-5 dark:bg-neutral-900">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Para que serve esta página
        </h2>
        <Nota>
          No aparelho, o app conta as repetições de um agachamento e diz se cada uma foi{" "}
          <strong>funda</strong> ou <strong>rasa</strong>. Para decidir isso ele usa um número — o{" "}
          <em>limiar</em>. Esta página existe para esse número sair de medida, e não de chute.
        </Nota>
        <Nota>
          O caminho é: você grava vídeos de agachamento, <strong>diz de antemão</strong> se aquela
          série era funda ou rasa, e a página compara o que você disse com o que o julgador diz. Um
          limiar bom é o que concorda com você na maior parte das vezes — e, principalmente, o que
          erra do lado menos perigoso.
        </Nota>
        <Nota>
          <strong>Nenhum vídeo sai do seu navegador.</strong> Ele não é enviado, não é salvo em
          banco e não fica em disco. O que se extrai dele é o boneco de palito: 33 pontos por
          quadro, sem imagem e sem rosto.
        </Nota>
      </div>

      <Passo numero={1} titulo="Grave os vídeos">
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            De lado, não de frente
          </h3>
          <Nota>
            A câmera precisa ver a pessoa <strong>de lado</strong> — um ombro apontando para a
            lente, o olhar para uma parede a 90° dela. É a vista de perfil, como numa foto 3x4 de
            lado. Filmar de frente é o erro mais comum, e faz a análise não detectar nada.
          </Nota>
          <Nota>
            O motivo é geométrico: o critério mede a altura do quadril contra a do joelho. De lado,
            a coxa aparece inteira e a medida é real. De frente, ela aponta para a lente e some na
            projeção — o cálculo devolveria um número plausível e errado, então o julgador prefere
            calar a chutar.
          </Nota>
        </div>
        <Nota>
          Enquadre o <strong>corpo inteiro</strong>, da cabeça aos pés, e confira que ele continua
          dentro do quadro no ponto mais fundo do agachamento. Use o celular que vai rodar o app:
          mesma lente e mesmo sensor que a produção, o que elimina uma fonte de diferença entre
          calibrar aqui e julgar lá.
        </Nota>
        <Nota>
          Grave <strong>séries homogêneas</strong>: um vídeo com cinco repetições todas fundas,
          outro com cinco todas rasas. Não misture as duas coisas no mesmo vídeo — o rótulo vale
          para a série inteira, e uma série misturada não tem rótulo verdadeiro.
        </Nota>
        <Nota>
          Faça vídeos dos dois tipos. Um corpus só com séries fundas não separa nada: qualquer
          limiar que chame tudo de fundo acerta 100% dele e falha no mundo real.
        </Nota>
      </Passo>

      <Passo numero={2} titulo="Extraia e rotule">
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            O que é &quot;rotular&quot;
          </h3>
          <Nota>
            É você dizer a verdade sobre o vídeo, <strong>antes</strong> de ver o que o app acha.
            Escolhendo &quot;todas no fundo&quot;, você está afirmando:{" "}
            <em>nesta série, todas as repetições tiveram o quadril abaixo da linha do joelho</em>.
            Esse é o gabarito.
          </Nota>
          <Nota>
            É por isso que o rótulo vem antes da análise, e não depois: rotular depois de ver o
            resultado faz você concordar com a máquina sem perceber, e o gabarito deixa de ser
            independente. Sem gabarito independente, medir acerto não significa nada.
          </Nota>
        </div>

        <Nota>
          Escolha o exercício e o rótulo, selecione o arquivo e clique em analisar. Ao final, baixe
          o <code>.json</code>: é a <em>fixture</em> daquela série — os pontos de cada quadro mais o
          seu rótulo. Repita para cada vídeo.
        </Nota>

        <AnaliseDeArquivo />
      </Passo>

      <Passo numero={3} titulo="Varra o limiar e escolha">
        <Nota>
          Carregue de uma vez todos os <code>.json</code> que você baixou. A página roda{" "}
          <strong>o julgador de verdade</strong> — o mesmo código que roda no celular — dezenas de
          vezes, cada uma com um limiar diferente, e mostra os erros que cada valor comete.
        </Nota>

        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Como ler a tabela
          </h3>
          <Nota>
            <strong>Funda → funda</strong> e <strong>Rasa → rasa</strong> são os acertos.{" "}
            <strong>Funda → rasa</strong> é o app sendo exigente demais: cobra profundidade de quem
            já estava fundo. Chato, mas inofensivo.
          </Nota>
          <Nota>
            <strong>Rasa → funda</strong> é o erro caro, e por isso aparece em vermelho: é o app
            dizendo &quot;fundo&quot; para um agachamento que não foi — validando exatamente o que
            ele existe para corrigir. Entre dois limiares de acerto parecido, prefira o que zera
            esta coluna.
          </Nota>
          <Nota>
            Olhe também o <strong>formato</strong>: se vários limiares seguidos acertam igual, você
            está num platô e pode escolher o meio dele com segurança. Se o acerto despenca do lado
            do valor escolhido, ele está numa borda — e uma borda quebra com a primeira gravação
            nova.
          </Nota>
        </div>

        <Varredura />
      </Passo>

      <section className="flex flex-col gap-4 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Câmera ao vivo (opcional)
        </h2>
        <Nota>
          Para ver o limiar atual funcionando na hora: agache na frente da câmera e ouça o veredito.
          Serve para ganhar intuição rápido, e é também a forma de mostrar a ideia para alguém.
        </Nota>
        <Nota>
          <strong>Não gera fixture, de propósito.</strong> Um rótulo dado por quem está executando o
          movimento não é independente — é a pessoa avaliando a si mesma enquanto tenta acertar. É
          justamente esse viés que o gabarito do passo 2 existe para evitar.
        </Nota>

        <AnaliseAoVivo />
      </section>
    </div>
  );
}
