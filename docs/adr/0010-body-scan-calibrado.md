# Análise corporal calibrada pela altura do aluno

**Data:** 2026-08-12
**Status:** accepted

---

## Contexto

A análise corporal por imagem do mobile pedia ao modelo que estimasse **peso e
altura a partir das fotos**, e a tela vendia o resultado como *"um método
extremamente preciso para coleta de medidas"*.

Peso não é inferível de uma imagem — peso é massa, e nenhuma câmera mede massa.
Altura não é inferível sem uma referência de escala no enquadramento. O modelo
não recusava: devolvia um número plausível, porque a instrução mandava estimar.
O `bmi` era calculado sobre os dois valores inventados.

Levantamento completo, com os seis achados, em
o histórico do git — a spec foi entregue e saiu do working tree (ADR-0013).

## Opções consideradas

### Opção A — Medida calibrada por escala informada
- **Prós:** preserva o valor do produto (o especialista quer as medidas), usa
  dado que o sistema já tem em `physical_assessments`, e transforma estimativa
  de linguagem em regra de três.
- **Contras:** depende de o aluno ter avaliação física registrada; a
  circunferência continua sendo aproximação, não medida direta.

### Opção B — Só análise qualitativa
- **Prós:** honestidade total — nenhum número que a imagem não sustente.
- **Contras:** o especialista perde a comparação numérica, que é o que ele
  acompanha. Esvazia a feature.

### Opção C — Vídeo enviado ao modelo, com orientação em tempo real
- **Prós:** o modelo veria o corpo de vários ângulos.
- **Contras:** multiplica tokens e latência sem melhorar a análise — o modelo
  não precisa de 300 frames de um corpo parado — e aumenta muito a exposição de
  dado sensível que atravessa a fronteira, contra o parecer de minimização.

## Decisão

**Escolhemos a A, com a orientação de captura acontecendo no dispositivo.**

O fator decisivo é que **a referência de escala não precisa vir da câmera: vem
da pessoa.** `physical_assessments.height_cm` é a régua. Se o aluno tem 175 cm e
ocupa 900 px da cabeça ao pé, o frame tem 5,14 px/cm, e qualquer largura na
imagem converte para centímetro por regra de três.

E o vídeo entra como **visor, não como carga**: a orientação roda no aparelho e
o que sai continuam sendo três fotos — frente, costas e uma lateral — só que
comparáveis entre si.

## Como o processo funciona

```
1. CAPTURA (mobile, nada sai do aparelho)
   BodyScanIntroduction → consentimento explícito + aviso de IA externa
   BodyScanGrid         → três poses: frente, costas, lateral
   BodyScanCamera       → marcas fixas na tela (10% e 90% da altura)
                          nível pelo acelerômetro
                          registra os parâmetros do enquadramento

2. CALIBRAÇÃO (mobile)
   altura real (physical_assessments.height_cm)  ─┐
   altura em pixels no frame                     ─┴→ px_por_cm

3. ANÁLISE (BFF → Anthropic)
   POST /api/ai/body-scan
     entrada: 3 imagens (800px, JPEG q0.6) + px_por_cm + peso da balança
     o modelo devolve proporção, simetria, postura e circunferências
     estimadas — nunca peso, nunca altura

4. PERSISTÊNCIA (Supabase)
   body_scans ← resultado + parâmetros de captura
   A imagem NÃO é guardada. Minimização: guarda-se o derivado, não a foto.

5. LEITURA
   Mobile → o próprio aluno
   Web    → aba no perfil, especialista vinculado (RLS da 0017)
   Chat   → ferramenta query_body_scan nos dois coaches
```

**A comparação é aritmética, não modelo.** O delta entre dois escaneamentos é
subtração sobre linhas de `body_scans` — não custa chamada de IA. E é onde está
o valor: o erro sistemático da estimativa se repete nos dois e se cancela na
diferença.

## Consequências

**Fica mais fácil**
- Defender o número: ele vira regra de três sobre uma altura medida, com erro
  conhecido, em vez de um valor que o modelo escolheu.
- Comparar escaneamentos, porque o enquadramento é reproduzível.
- Cumprir o parecer de LGPD: nenhuma imagem persistida, e o chat consulta o
  resultado por ferramenta em vez de reenviar foto.

**Fica mais difícil**
- A análise passa a depender de avaliação física registrada. Sem `height_cm`
  não há régua, e a tela precisa dizer isso em vez de estimar assim mesmo.
- Roupa larga, pé calçado e postura relaxada passam a importar — o guia precisa
  instruir, e os parâmetros ficam gravados no scan.

**O que isto bloqueia**
- Escala absoluta de verdade exige ARKit/ARCore, que exige dev build e, no iOS,
  que o app seja buildado pela primeira vez (dívida 15 do STATUS). Fica fora até
  haver dois escaneamentos reais mostrando que a comparação é ruidosa.

## Como reverter (se necessário)

Se a calibração por altura se mostrar imprecisa demais na prática, cai-se para a
opção B: as circunferências saem, o cartão vira só postura e simetria, e
`body_scans` guarda menos colunas. O caminho inverso — voltar a estimar peso e
altura pela foto — está descartado: não é impreciso, é impossível.
