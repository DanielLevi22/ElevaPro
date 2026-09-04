# A técnica se julga por regra geométrica, e não se guarda

A Análise de Técnica decide se um agachamento foi fundo por uma razão entre
distâncias — `(quadril.y − joelho.y) / |coxa|`, positivo quando o quadril passa
da linha do joelho —, e não por um classificador treinado. Nada do que ela lê é
persistido: nem quadro, nem landmark, nem contagem, nem veredito. Cada
finalidade de tratamento tem consentimento próprio, e não um texto novo dentro
de um consentimento que já existia.

**Status:** accepted

## Por que regra e não classificador

Havia o caminho de rotular landmarks e treinar um modelo. Ele se derrota
sozinho: os rótulos sairiam do veredito da própria regra, então o classificador
aprenderia a reproduzi-la — com menos precisão, custo maior e sem explicação.

O que decide contra ele não é a precisão, é a **conferibilidade**. O personal
precisa poder discordar do app com argumento, e "quadril abaixo do joelho" é uma
frase que ele confere olhando o quadro mais fundo da repetição. "A rede achou"
não é resposta aceitável quando o erro pode machucar alguém.

Consequência aceita: um critério por exercício, escrito à mão. Flexão e afundo
não saem de graça deste — cada um precisa do seu critério, do seu limiar
calibrado e da sua vista de câmera. O seletor de exercícios da tela de
calibração mostra os dois desabilitados de propósito, para que isso fique
visível em vez de parecer uma opção a mais num menu.

## Por que nada é persistido

Diverge de `body_scans`, que guarda o resultado derivado da medição. A diferença
é o que o dado serve: o body scan existe para ser comparado com o de três meses
atrás, então o histórico É o produto. A Análise de Técnica corrige o movimento
enquanto ele acontece — a repetição de ontem não informa a de agora.

Sem finalidade para o histórico, guardá-lo violaria a necessidade (Art. 6°, III)
e criaria uma base de dado sensível cuja única função seria existir. A promessa
"nada é gravado" também é o que torna a tela aceitável para quem treina numa
academia com outras pessoas em volta.

Consequência: acompanhamento pelo personal, replay e evolução de técnica ao
longo do tempo estão fora — e voltar atrás custa caro, porque exigiria
consentimento novo, tabela nova, RLS e retenção. É a decisão mais difícil de
reverter deste ADR, e é deliberada.

## Por que consentimento por finalidade

A issue #194 propunha reusar `health_data_collection` e subir a versão da
política. A implementação divergiu: a migration 0041 criou
`technique_analysis` como tipo próprio.

Art. 8°, §4° anula autorização genérica. Empacotadas num consentimento só, as
finalidades ficam presas uma na outra — recusar a câmera contínua durante a
série custaria ao aluno a avaliação física, a anamnese e o acompanhamento de
passos. Consentimento cuja recusa cobra funcionalidade alheia não é livre, e é a
liberdade que sustenta a base do Art. 11, I.

Consequência boa: a política do body scan não sobe e ninguém reconsente o que já
consentiu. Consequência a manter: **toda finalidade nova daqui em diante entra
como tipo novo**, nunca como parágrafo dentro de um consentimento existente.

## O número que falta

O `ADR-0022` ficou bom porque nasceu com a medida do aparelho dentro dele. Este
não tem a dele: **quanto o Redmi Note 14 Pro sustenta com preview aberto,
esqueleto desenhado e o térmico subindo ao longo de uma série inteira.** O
overlay de diagnóstico do módulo nativo existe para responder isso, e a resposta
ainda não foi tomada.

Nenhuma decisão acima depende desse número — regra contra classificador e
persistência contra ausência dela se decidem sem ele. O que ele decide é se a
feature roda, e essa pergunta continua aberta. Preencher aqui quando medir.
