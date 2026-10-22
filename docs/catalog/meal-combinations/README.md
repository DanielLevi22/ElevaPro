# Produção de imagens do cardápio — #366

Inventário: **174 alimentos públicos**, consultados no Supabase local em 04/10/2026.
Universo das regras atuais: **18806 candidatos**. Imagens novas concluídas: **6439**.

Este é um checklist de produção, não uma prescrição. As combinações são candidatas e precisam de revisão culinária; não garantem adequação nutricional, alergênica ou ao plano. Estados cru/cozido e preparo devem ser confirmados antes de ativar uma receita no app. Não enumera todas as receitas possíveis do mundo ou todas as quantidades.

Uma caixa só é marcada após gerar, revisar visualmente, enviar e conferir tamanho/SHA-256 no storage. Ter uma foto não aprova ou ativa a receita. Originais ficam no ImageKit; a fila guarda só metadados e prompts. As 16 fotos do catálogo anterior permanecem no manifesto ativo e não são contadas como novas.

Reprodução: `node scripts/meal-catalog.mjs checklist`. Ledger: [production.json](./production.json). Regras: [candidates.mjs](../../../scripts/meal-catalog/candidates.mjs).

Produção contínua autorizada até concluir a fila. Próximo lote: `node scripts/meal-catalog.mjs queue 8`; gera metadados e prompts, sem concluir imagens. O agente usa imagegen para gerar cada foto, revisa, publica via `publish ID arquivo.jpg prompt.txt` e remove cópias temporárias somente após a verificação.

## Sem combinação nesta versão

- Creatina monoidratada — suplemento isolado; não recebe imagem de prato nesta fase.
- Dextrose — suplemento isolado; não recebe imagem de prato nesta fase.
- Maltodextrina — suplemento isolado; não recebe imagem de prato nesta fase.

## Checklist por tipo de preparo

- [Vitamina, página 1](./smoothie-001.md) — 54 combinações
- [Prato, página 1](./savory_plate-001.md) — 250 combinações
- [Prato, página 2](./savory_plate-002.md) — 250 combinações
- [Prato, página 3](./savory_plate-003.md) — 250 combinações
- [Prato, página 4](./savory_plate-004.md) — 250 combinações
- [Prato, página 5](./savory_plate-005.md) — 250 combinações
- [Prato, página 6](./savory_plate-006.md) — 250 combinações
- [Prato, página 7](./savory_plate-007.md) — 250 combinações
- [Prato, página 8](./savory_plate-008.md) — 250 combinações
- [Prato, página 9](./savory_plate-009.md) — 250 combinações
- [Prato, página 10](./savory_plate-010.md) — 250 combinações
- [Prato, página 11](./savory_plate-011.md) — 250 combinações
- [Prato, página 12](./savory_plate-012.md) — 250 combinações
- [Prato, página 13](./savory_plate-013.md) — 250 combinações
- [Prato, página 14](./savory_plate-014.md) — 250 combinações
- [Prato, página 15](./savory_plate-015.md) — 250 combinações
- [Prato, página 16](./savory_plate-016.md) — 250 combinações
- [Prato, página 17](./savory_plate-017.md) — 250 combinações
- [Prato, página 18](./savory_plate-018.md) — 250 combinações
- [Prato, página 19](./savory_plate-019.md) — 250 combinações
- [Prato, página 20](./savory_plate-020.md) — 250 combinações
- [Prato, página 21](./savory_plate-021.md) — 250 combinações
- [Prato, página 22](./savory_plate-022.md) — 250 combinações
- [Prato, página 23](./savory_plate-023.md) — 250 combinações
- [Prato, página 24](./savory_plate-024.md) — 250 combinações
- [Prato, página 25](./savory_plate-025.md) — 250 combinações
- [Prato, página 26](./savory_plate-026.md) — 250 combinações
- [Prato, página 27](./savory_plate-027.md) — 250 combinações
- [Prato, página 28](./savory_plate-028.md) — 250 combinações
- [Prato, página 29](./savory_plate-029.md) — 250 combinações
- [Prato, página 30](./savory_plate-030.md) — 250 combinações
- [Prato, página 31](./savory_plate-031.md) — 250 combinações
- [Prato, página 32](./savory_plate-032.md) — 250 combinações
- [Prato, página 33](./savory_plate-033.md) — 250 combinações
- [Prato, página 34](./savory_plate-034.md) — 250 combinações
- [Prato, página 35](./savory_plate-035.md) — 250 combinações
- [Prato, página 36](./savory_plate-036.md) — 250 combinações
- [Prato, página 37](./savory_plate-037.md) — 250 combinações
- [Prato, página 38](./savory_plate-038.md) — 250 combinações
- [Prato, página 39](./savory_plate-039.md) — 250 combinações
- [Prato, página 40](./savory_plate-040.md) — 250 combinações
- [Prato, página 41](./savory_plate-041.md) — 250 combinações
- [Prato, página 42](./savory_plate-042.md) — 250 combinações
- [Prato, página 43](./savory_plate-043.md) — 250 combinações
- [Prato, página 44](./savory_plate-044.md) — 250 combinações
- [Prato, página 45](./savory_plate-045.md) — 250 combinações
- [Prato, página 46](./savory_plate-046.md) — 112 combinações
- [Prato com leguminosa, página 1](./legume_plate-001.md) — 250 combinações
- [Prato com leguminosa, página 2](./legume_plate-002.md) — 250 combinações
- [Prato com leguminosa, página 3](./legume_plate-003.md) — 250 combinações
- [Prato com leguminosa, página 4](./legume_plate-004.md) — 250 combinações
- [Prato com leguminosa, página 5](./legume_plate-005.md) — 250 combinações
- [Prato com leguminosa, página 6](./legume_plate-006.md) — 250 combinações
- [Prato com leguminosa, página 7](./legume_plate-007.md) — 250 combinações
- [Prato com leguminosa, página 8](./legume_plate-008.md) — 250 combinações
- [Prato com leguminosa, página 9](./legume_plate-009.md) — 250 combinações
- [Prato com leguminosa, página 10](./legume_plate-010.md) — 250 combinações
- [Prato com leguminosa, página 11](./legume_plate-011.md) — 250 combinações
- [Prato com leguminosa, página 12](./legume_plate-012.md) — 250 combinações
- [Prato com leguminosa, página 13](./legume_plate-013.md) — 250 combinações
- [Prato com leguminosa, página 14](./legume_plate-014.md) — 250 combinações
- [Prato com leguminosa, página 15](./legume_plate-015.md) — 250 combinações
- [Prato com leguminosa, página 16](./legume_plate-016.md) — 250 combinações
- [Prato com leguminosa, página 17](./legume_plate-017.md) — 250 combinações
- [Prato com leguminosa, página 18](./legume_plate-018.md) — 250 combinações
- [Prato com leguminosa, página 19](./legume_plate-019.md) — 250 combinações
- [Prato com leguminosa, página 20](./legume_plate-020.md) — 57 combinações
- [Bowl, página 1](./yogurt_bowl-001.md) — 250 combinações
- [Bowl, página 2](./yogurt_bowl-002.md) — 250 combinações
- [Bowl, página 3](./yogurt_bowl-003.md) — 250 combinações
- [Bowl, página 4](./yogurt_bowl-004.md) — 250 combinações
- [Bowl, página 5](./yogurt_bowl-005.md) — 250 combinações
- [Bowl, página 6](./yogurt_bowl-006.md) — 250 combinações
- [Bowl, página 7](./yogurt_bowl-007.md) — 250 combinações
- [Bowl, página 8](./yogurt_bowl-008.md) — 200 combinações
- [Legumes com finalização, página 1](./seasoned_side-001.md) — 220 combinações
- [Lanche com bebida, página 1](./paired_drink-001.md) — 36 combinações
- [Lanche, página 1](./snack_plate-001.md) — 156 combinações
- [Sanduíche ou torrada, página 1](./sandwich-001.md) — 77 combinações
- [Mingau, página 1](./porridge-001.md) — 108 combinações
- [Bebida com suplemento, página 1](./protein_drink-001.md) — 36 combinações
