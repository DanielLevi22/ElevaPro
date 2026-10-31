# Backup portátil das imagens de refeições

Execute os comandos na raiz do projeto. A CLI lê as credenciais do ImageKit em
`web/.env.local` e reúne o manifesto ativo e as imagens verificadas no registro
de produção. Nenhum comando de exportação exclui a origem.

Até 500 imagens:

```powershell
node scripts/meal-media.mjs export <diretorio-do-backup> imagekit
```

Acima de 500, exporte partes para diretórios diferentes. O início é um índice
baseado em zero; o tamanho de cada parte deve ficar entre 1 e 500. Para 505 imagens:

```powershell
node scripts/meal-media.mjs export <backup>/part-00001 imagekit 0 500
node scripts/meal-media.mjs export <backup>/part-00002 imagekit 500 500
```

Não publique novos itens nem altere o registro entre as partes do mesmo backup.
Cada parte contém seu próprio `manifest.json` e os originais conferidos por
tamanho e SHA-256. Preserve todas as partes; a última pode ter menos de 500 itens.
Uma falha não produz um manifesto de backup concluído.

Restaure cada parte separadamente:

```powershell
node scripts/meal-media.mjs restore <backup>/part-00001 imagekit
node scripts/meal-media.mjs restore <backup>/part-00002 imagekit
```

O formato do pacote preserva identidade, caminho, versão e integridade sem
depender do provedor. A CLI atual aceita ImageKit; outro destino pode consumir
o mesmo formato por meio da interface de storage usada pelo serviço de arquivo.

