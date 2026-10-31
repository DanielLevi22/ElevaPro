# Imagens do catálogo experimental — #366

Fotos ilustrativas geradas com `imagegen`, usando descrições genéricas dos pratos,
sem dados pessoais ou dados de refeições de usuários enviados ao gerador.
Os JPEGs originais têm largura de 960 px e qualidade 85. As receitas chegam pela
API e as imagens por URLs resolvidas no backend; não há geração durante o uso.

As imagens não representam medidas exatas de porção ou validação nutricional.
As quantidades exibidas na interface vêm da refeição autorizada do próprio usuário.
O catálogo inicial contém 16 pratos, incluindo três montagens para arroz, feijão,
peito de frango grelhado, brócolis cozido e azeite de oliva. A apresentação em tela
informa que as receitas são experimentais e as imagens são ilustrativas.

`mediaManifest.json` registra IDs próprios, caminhos versionados, tamanho e SHA-256.
Os originais ativos ficam no ImageKit. Não há fotos do catálogo em
`web/public/` nem no app. Uma foto nova recebe uma versão e caminho novos.

No ImageKit, as fotos deste catálogo ficam exclusivamente em
`/meal-images/<id-da-foto>-v<versão>-<hash>.jpg`, sem subpastas por foto.
Outros tipos de imagem usam pastas próprias e não entram neste
manifesto ou backup. Esta biblioteca contém somente fotos editoriais públicas;
imagens pessoais exigem controle de acesso e fluxo próprios.

No admin, **Imagens do cardápio** exporta backup JSON e restaura no destino
configurado, conferindo os arquivos. O backup web é limitado a 3 MB para caber
na requisição da primeira entrega; catálogos maiores usam a CLI por diretório.

```sh
node scripts/meal-media.mjs export ./backup-meals imagekit
node scripts/meal-media.mjs restore ./backup-meals imagekit
```

Para publicar, configure `IMAGEKIT_URL_ENDPOINT` e `IMAGEKIT_PRIVATE_KEY` no
servidor. A chave nunca vai ao app. Após conferir a cópia, altere
`MEAL_MEDIA_BASE_URL` para a base do destino, preservando os caminhos do manifesto.
A ativação da entrega ocorre por configuração/deploy do backend, não pela tela.
Mantenha a origem disponível durante a transição e o cache do catálogo (60 s);
sessões já abertas podem conservar os endereços antigos por mais tempo.

O adapter de diretório serve para backups portáteis e testes com fixtures;
o painel não restaura imagens no repositório do app.

O painel exporta os originais do catálogo ativo. A CLI inclui também imagens
concluídas na [fila editorial](../../../../../../docs/catalog/meal-combinations/README.md),
para que fotos novas ainda não ativadas também tenham backup portátil.
O checklist enumera candidatos do inventário público, sem enviar planos ao gerador.

ImageKit é o primeiro destino externo. Outro provedor implementa leitura do
original e escrita sem sobrescrever, mantendo o mesmo manifesto. Não é preciso
recriar fotos, alterar IDs das receitas ou atualizar o app para trocar a entrega.
