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

Os cinco existem no GitHub deste repo — conferido em 2026-08-29 com
`gh label list`. Nada a criar antes de rodar `/triage`.
