# Atribuições de terceiros

Obras de terceiros usadas no Eleva Pro, com as obrigações que a licença de cada
uma impõe.

## Modelo anatômico 3D

**"Ecorché practice"**, por **martinjario** — [Sketchfab](https://sketchfab.com/3d-models/ecorche-practice-downloadable-37bac276e9a04014aabd96eb7e95e79a)
Licença: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Usado no mapa muscular do painel do especialista, em dois arquivos:

- `web/public/models/muscle-body.glb` — cópia do original.
- `web/public/models/corpo-por-musculo.glb` — **obra derivada**, gerada por
  `scripts/modelo/reagrupar.js`. A geometria é a mesma; o que muda é o
  agrupamento: as 87 malhas `Object_N` do original, partidas por ilha de textura
  e ocupando cada uma quase o corpo inteiro, foram reagrupadas por conectividade
  e posição anatômica em 12 malhas nomeadas por grupo muscular.

A CC BY 4.0 permite uso comercial e obra derivada, e exige atribuição. Reagrupar
e renomear malhas não cria autoria nova sobre a geometria — o derivado carrega a
mesma obrigação do original. O crédito também viaja dentro do próprio arquivo,
no campo `asset.copyright` do glTF.

**Ao substituir o modelo**, remova esta seção junto. Atribuição a obra que não
está mais no produto confunde tanto quanto atribuição faltando.
