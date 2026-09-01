# technique-spike — descartável

Spike da [issue #194](https://github.com/DanielLevi22/ElevaPro/issues/194).
**Não é a feature, e não deve virar a feature.** Apagar depois de medir, como o
`pose-spike` do `ADR-0022` foi apagado.

## A pergunta

O `ADR-0022` mediu a extração do body scan entre **210 e 250 ms por passe com a
máscara ligada**, e registra que a máscara é metade do custo. O mesmo ADR
atribui **~30fps** ao consumidor de exercício — mas isso é projeto, não medida.
Ninguém nunca rodou o landmarker sem máscara com delegate de GPU neste projeto.

A ordem de entrega da #194 começa aqui porque a resposta pode derrubar duas
decisões já tomadas: o esqueleto que acompanha o movimento inteiro (Q8) e o
replay reconstruído (Q10) assumem taxa que ainda não foi verificada.

## O que ele mede

Uma janela por segundo, com:

| Campo | Por quê |
|---|---|
| `p50` / `p95` | Duração do passe: do frame chegar ao resultado sair |
| `fps` | Taxa efetiva sustentada, não teórica |
| `comCorpo` | Quantos passes devolveram os 33 landmarks |
| `delegate` | `GPU` ou `CPU` — o número não significa nada sem isto |
| `termico` | `none` → `severe`: taxa que só se sustenta frio não sustenta uma série |

**`comCorpo` é o campo que valida todos os outros.** O spike anterior mediu
latência contra imagem vazia: o detector rejeitou o frame, o estágio de landmark
nunca rodou, e a medida bonita não respondia a pergunta. `p95` baixo com
`comCorpo` em zero é medida do detector recusando trabalho, não do trabalho.

## Como rodar

1. `npx expo run:android` (precisa de dev build — não roda em Expo Go)
2. Abrir a rota `/spike-tecnica` (só existe com `__DEV__`)
3. Apontar para uma pessoa **de perfil**, corpo inteiro no quadro
4. Agachar por **cinco minutos seguidos**, sem parar

O tempo importa: a pergunta não é "qual a taxa" e sim "qual a taxa depois de
cinco minutos com o aparelho quente".

## Vereditos

Preencher aqui, no padrão do spike do `ADR-0022`. Aparelho, data, e uma linha
por pergunta.

**Aparelho:** _(preencher — o alvo é o Redmi Note 14 Pro, Android 16, arm64, que
é onde o `ADR-0022` foi medido)_

- ⏳ **A GPU aceita o modelo?** — `delegate` diz `GPU` ou caiu para `CPU`?
  Atenção: a criação pode passar e a inferência falhar depois; se `comCorpo`
  ficar em zero com `delegate: GPU`, a GPU aceitou o modelo mas não o executou.
- ⏳ **Quanto custa o passe sem máscara?** — `p50` e `p95` com `comCorpo` alto.
- ⏳ **A taxa sustenta esqueleto acompanhando o movimento?** — `fps` estável, e
  quanto ele cai entre o minuto 1 e o minuto 5.
- ⏳ **O aparelho aguenta?** — até onde `termico` sobe em cinco minutos.

## O que fazer com a resposta

- **Sustenta ~30fps frio e não desaba quente** → o desenho da #194 está de pé.
- **Fica na faixa de 10–15fps** → esqueleto contínuo provavelmente ainda passa
  (é o que o olho aceita), mas a segmentação de repetição perde resolução
  temporal e o limiar de profundidade precisa de mais folga.
- **Fica abaixo de ~8fps ou desaba com o térmico** → Q8 e Q10 voltam à mesa
  antes de qualquer regra ser escrita.
