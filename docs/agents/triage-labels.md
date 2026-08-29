# Labels de triagem

As skills falam em cinco papéis canônicos de triagem. Este arquivo mapeia esses papéis
para as strings de label realmente usadas no issue tracker deste repo.

| Label em mattpocock/skills | Label no nosso tracker | Significado                                    |
| -------------------------- | ---------------------- | ---------------------------------------------- |
| `needs-triage`             | `needs-triage`         | Precisa de avaliação do mantenedor             |
| `needs-info`               | `needs-info`           | Esperando mais informação de quem reportou     |
| `ready-for-agent`          | `ready-for-agent`      | Totalmente especificado, pronto pra agente AFK |
| `ready-for-human`          | `ready-for-human`      | Exige implementação humana                     |
| `wontfix`                  | `wontfix`              | Não será tratado                               |

Quando uma skill mencionar um papel (ex.: "aplique o label de triagem AFK-ready"),
use a string da coluna da direita.

Edite a coluna da direita para casar com o vocabulário que você realmente usa.

## Estado no repo

Dos cinco, só `wontfix` já existe no GitHub deste repo. Os outros quatro precisam ser
criados antes do primeiro `/triage`:

```bash
gh label create needs-triage    --description "Precisa de avaliação do mantenedor"       --color d93f0b
gh label create needs-info      --description "Esperando informação de quem reportou"    --color fbca04
gh label create ready-for-agent --description "Especificado, pronto pra agente AFK"      --color 0e8a16
gh label create ready-for-human --description "Exige implementação humana"               --color 1d76db
```
