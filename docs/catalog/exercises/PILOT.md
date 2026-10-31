# Primeiro lote de gravação

Comece com uma tomada piloto antes de gravar o catálogo inteiro. O objetivo é
conferir enquadramento, luz e legibilidade do movimento no celular. O profissional
responsável revisa a execução e o ângulo; o roteiro não substitui essa revisão.

## Preparação

- [ ] Termo de imagem assinado e referências guardadas em local restrito.
- [ ] Fundo, roupa e luz escolhidos para serem repetidos nas próximas sessões.
- [ ] Celular em paisagem, apoiado em tripé, sem movimentação de câmera.
- [ ] Corpo inteiro e apoios visíveis, com margem para o movimento completo.
- [ ] Sem outras pessoas no quadro ou refletidas em espelhos.
- [ ] Usar o arquivo original da câmera, sem compressão de aplicativo de mensagens.

Grave em 1080p, 30 quadros por segundo, se o aparelho permitir. A saída será
1280×720. Não precisa editar, colocar música ou gerar capa: o processamento faz
o corte, remove áudio/metadados e gera o MP4 e a capa.

## Tomada piloto

**Exercício:** Agachamento livre sem peso.

**Ângulo proposto:** diagonal, sujeito à revisão do profissional. Pés, joelhos,
quadril e cabeça devem permanecer visíveis em todo o movimento.

Grave alguns segundos antes e depois de 2–3 repetições completas, em velocidade
natural. Um bruto de aproximadamente 12–15 segundos dá margem para escolher o
trecho. Não apresse as repetições para caber no limite do clipe; se necessário,
grave outra tomada com orientação do profissional.

Salve o bruto em:

```text
docs/catalog/exercises/videos/raw/agachamento-livre-sem-peso.mp4
```

Se a câmera gerar MOV, preserve o original e ajuste `source` no arquivo de edições
para `agachamento-livre-sem-peso.mov`. Não basta trocar a extensão para converter.

## Revisão e processamento

1. Assistir ao bruto e selecionar um trecho de 4–8 segundos que mostre o gesto
   completo e tenha início/fim adequados ao loop.
2. Ajustar `start` e `duration` em `edits.example.json`: os valores existentes são
   exemplos, não um corte já aprovado.
3. Com FFmpeg e FFprobe configurados, executar na raiz:

   ```powershell
   node scripts/exercise-videos.mjs process docs/catalog/exercises/edits.example.json
   ```

4. Conferir o MP4 e a capa em
   `videos/processed/exercises/agachamento-livre-sem-peso/`.
5. O profissional revisa o clipe final antes de marcar `technicalReviewed` no
   manifesto. Conferir visibilidade, execução, ausência de áudio e fechamento do
   loop. A capa deve mostrar claramente o movimento.
6. Validar reprodução e navegação no app/web, incluindo o emulador com um build
   que inclua `expo-video`. A validação no emulador ainda está pendente.

O processamento não publica nada. A publicação segue os pré-requisitos e o comando
do `README.md`: termo, revisão de privacidade e cota da conta conferidos.

## Próximas tomadas, depois de aprovar o piloto

Estas tomadas permitem conferir os três ângulos e uma sustentação antes de ampliar
a produção. Todas pertencem à sessão casa, incluindo exercícios classificados
como `ambos` no catálogo.

| Ordem | Exercício | Ângulo proposto | Nome do bruto |
| --- | --- | --- | --- |
| 1 | Agachamento livre sem peso | Diagonal | `agachamento-livre-sem-peso.mp4` |
| 2 | Ponte de glúteo no solo | Lateral | `ponte-de-gluteo-no-solo.mp4` |
| 3 | Abdução deitado de lado | Frontal | `abducao-deitado-de-lado.mp4` |
| 4 | Flexão de braço com joelhos apoiados | Diagonal | `flexao-de-braco-com-joelhos-apoiados.mp4` |
| 5 | Prancha | Lateral | `prancha.mp4` |

Na prancha, gravar entrada, sustentação e saída; selecionar a parte estável. A
duração de 4–8 segundos é do vídeo ilustrativo, não uma prescrição de tempo.

Não repetir os 181 exercícios antes de aprovar esse padrão. A fila completa está
em `RECORDING.md`; os arquivos reais continuam fora do Git.
