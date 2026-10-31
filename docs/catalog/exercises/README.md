# Vídeos de demonstração dos exercícios

Conteúdo da [issue #463](https://github.com/DanielLevi22/ElevaPro/issues/463).
Esta pasta é separada de `../meal-combinations`, que continua contendo as imagens de refeições.

## Organização

- `PILOT.md`: preparação da primeira tomada e sequência inicial de cinco exercícios.
- `RECORDING.md`: roteiro por sessão, categoria e grupo muscular para revisar antes da filmagem.
- `recording-plan.json`: nomes oficiais, ângulos propostos e identificadores dos arquivos.
- `videos/raw/`: vídeos brutos locais, nomeados conforme o roteiro.
- `videos/processed/`: clipes e capas locais prontos para revisão; manifesto de publicação.
- `release.example.json`: referências operacionais a preencher antes de publicar.

Os vídeos e termos assinados não entram no Git. Originais publicados ficam no
ImageKit em **`/exercises/<slug>/v1.mp4`**, com capa **`v1.jpg`** na mesma pasta.
Os arquivos de refeição continuam no destino atual. Não use nome ou documento
da pessoa filmada em arquivo, URL, manifesto ou log.

## Antes de gravar

1. Revisar o roteiro com o profissional que demonstrará os movimentos; os ângulos são propostas.
2. Obter termo assinado para a finalidade de demonstração pública no app/web e entrega via ImageKit/CDN.
3. Controlador/encarregado valida base legal, operador/transferência, prazo de retenção dos brutos e do termo e canal de retirada da imagem. A revisão LGPD permanece pendente até essa validação.
4. Preparar fundo, luz, roupa e enquadramento constantes. Gravar uma tomada piloto antes dos lotes.

Não há vídeos gravados ou autorização assinada no início deste trabalho.
Brutos e termos ficam sob acesso restrito da equipe, fora de pasta pública.

## Cota e entrega

Conferido em 31/10/2026: o [plano gratuito](https://imagekit.io/plans/) informa
3 GB de armazenamento, 20 GB/mês de banda e 500 unidades/mês de processamento de vídeo.
Esses números não representam o saldo da conta, compartilhado com as fotos das refeições.
181 clipes abaixo de 1 MB somam menos de 181 MB; capas até 300 KB acrescentam até 54,3 MB.
Cada carregamento consome banda; loops e cache precisam ser medidos no aparelho.

Corte, compressão e capa são feitos localmente para entregar os originais, sem
transformações de vídeo sob demanda. [Transformações e extração de capas no ImageKit](https://imagekit.io/docs/how-pricing-works)
consomem unidades; não acrescente parâmetros de transformação aos endereços publicados.
Confira o saldo no painel antes de preencher `quotaCheckedAt`.

## Retirada de imagem

O controlador recebe o pedido pelo canal acordado no termo. Suspender a publicação,
remover `video_url` dos exercícios afetados, excluir clipes/capas no ImageKit e purgar
os endereços no CDN. Eliminar cópias locais/backups conforme a retenção validada e
registrar a conclusão no repositório restrito de evidências, sem conteúdo pessoal no Git.
O cache dos players não deve persistir vídeos em disco. Prazo de eliminação e
retenção do termo ainda exigem decisão do controlador antes da publicação.

## Comandos

Na raiz do projeto, com Node instalado:

```powershell
node scripts/exercise-videos.mjs plan
node scripts/exercise-videos.mjs process docs/catalog/exercises/edits.example.json
```

O processamento exige FFmpeg com libx264 e FFprobe no PATH, ou `FFMPEG_PATH` e
`FFPROBE_PATH`. Ajuste `source`, `start` e `duration` no arquivo de edições após
assistir ao bruto. Opcionalmente, `crop: { width, height, x, y }` recorta o quadro
antes de redimensionar com preservação de proporção e faixas até 1280×720.
Não corte mãos, pés ou equipamento. Nenhum arquivo de saída existente é sobrescrito;
use nova versão/lote para refazer um corte. O comando não muda velocidade de reprodução.

Assista aos MP4 e capas produzidos e marque `technicalReviewed: true` somente nos
aprovados. Copie `release.example.json` para `release.json` e preencha referências
restritas após termo, revisão de privacidade e cota conferidos. Não coloque o termo
nem dados da pessoa nesse arquivo. A CLI exige os três campos antes do primeiro upload.

Para publicar, configure `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PRIVATE_KEY`,
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente restrito do operador e rode:

```powershell
node scripts/exercise-videos.mjs publish docs/catalog/exercises/videos/processed/pilot.json
```

A CLI não carrega credenciais de produção automaticamente. Só atualiza oficiais
verificados, sem criador e com `video_url` nulo; nomes repetidos/ausentes, bytes
alterados e versões já publicadas diferentes são recusados. Repetir o mesmo lote
conserva os endereços. O ImageKit é reutilizado da integração das refeições, com
`overwriteFile=false`. Falha após upload permite reexecutar para conferir e retomar;
não há transação distribuída entre CDN e banco. O mapeamento final fica em
`videos/processed/publication.json`, e o histórico de operações do provedor deve
ser preservado no acesso restrito acordado pelo controlador.
