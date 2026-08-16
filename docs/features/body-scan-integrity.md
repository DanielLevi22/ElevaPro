# Feature: body-scan-integrity

**Status:** active
**PRD:** [body-scan-integrity](../PRDs/body-scan-integrity.md)
**ADR:** [ADR-010 — Análise corporal calibrada pela altura](../decisions/ADR-010-body-scan-calibrado.md)
**Plataformas:** ambos
**Última atualização:** 2026-08-12

---

## O que é

O aluno tira três fotos pelo app — frente, costas e uma lateral — e recebe uma
análise de proporção, simetria e postura, com circunferências **estimadas**. O
especialista vinculado vê o histórico no web, e os coaches de IA consultam o
resultado quando ele importa para a prescrição.

## Por que existe

A versão anterior pedia ao modelo que **estimasse peso e altura a partir das
fotos** e vendia o resultado como *"um método extremamente preciso"*. Peso é
massa e nenhuma câmera mede massa; altura exige referência de escala. O modelo
não recusava — devolvia número plausível, e o IMC era calculado sobre os dois
valores inventados.

Além disso, `body_scans` existia com RLS e **nenhuma linha do código escrevia
nela**: o resultado vivia no Zustand e sumia ao fechar o app.

---

## Fluxo de dados

```
BodyScanIntroduction   consentimento + aviso de IA externa
  → BodyScanGrid       três poses
  → BodyScanCamera     marcas de enquadramento + nível (disparo travado)
  → assessmentStore    capturedImages + captureFraming
  → AIBodyScanService  checa consentimento, redimensiona para 800px
  → POST /api/ai/body-scan
        ├── checa student_consents        (403 consent_required)
        ├── lê physical_assessments       (422 height_required)
        ├── Anthropic — altura como régua
        └── grava body_scans              (student_id vem do token)
  → BodyScanProcessing → PostureAnalysis (comparação primeiro)

web:  /dashboard/students/[id]/body-scan   Server Component, RLS
chat: query_body_scan                      nos dois coaches
```

## Tabelas do banco

| Tabela | Operações | RLS ativo |
|--------|-----------|-----------|
| `body_scans` | SELECT, INSERT | ✅ dono + especialista vinculado (`0017`) |
| `student_consents` | SELECT | ✅ |
| `physical_assessments` | SELECT (altura e peso) | ✅ |

**A imagem não é persistida.** As colunas `photo_*_url` saíram na `0026`
justamente para ninguém preenchê-las por engano.

---

## Implementação

### Web (`web/src/`)

| Tipo | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Route | `app/api/ai/body-scan/route.ts` | Consentimento, régua, modelo, gravação |
| Page | `app/dashboard/students/[id]/body-scan/page.tsx` | Histórico do especialista |
| Component | `modules/students/components/BodyScanHistory.tsx` | Comparação e medidas |
| Service | `modules/ai/services/bodyScanContext.ts` | Índice no contexto + ferramenta |
| Tool | `modules/ai/tools/bodyScanTools.ts` | `query_body_scan` |

### Mobile (`app/src/modules/assessment/`)

| Tipo | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Screen | `screens/BodyScanCamera.tsx` | Captura guiada, nível, temporizador |
| Screen | `screens/BodyScanProcessing.tsx` | Consentimento, erro, nova tentativa |
| Component | `components/ScanComparison.tsx` | O que mudou |
| Hook | `hooks/useDeviceLevel.ts` | Inclinação do aparelho |
| Service | `services/aiBodyScan.ts` | Erros tipados por causa |
| Store | `store/assessmentStore.ts` | Captura, histórico, mensagens |

### Compartilhado (`shared/src/`)

| Tipo | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Service | `services/bodyScan.service.ts` | `save`, `list`, `compareScans` |
| Types | `types/bodyScan.types.ts` | `BodyScanRecord`, `BodyScanDelta` |

---

## Regras de negócio

1. **Sem consentimento vigente, a foto não sai do aparelho.** Checado no app
   antes de codificar a imagem e no BFF antes de desserializar o corpo da
   requisição. O BFF é a barreira que vale.
2. **Peso e altura entram, nunca saem.** Vêm da última `physical_assessments`;
   sem altura registrada o aluno pode digitar. Sem nenhuma das duas, a rota
   responde `422` — não estima.
3. **A avaliação com fita vence o digitado.** `loadScale` só cai no valor
   informado quando não há avaliação.
4. **O IMC é calculado em código**, sobre altura e peso reais.
5. **Três fotos**, frente, costas e uma lateral.
6. **O disparo só libera com o aparelho nivelado** (6° de tolerância), e o nível
   é revalidado no momento da foto, não no toque.
7. **A imagem nunca é espelhada.** A análise reporta lado; espelhar faria o
   laudo apontar o ombro errado.
8. **A comparação aparece antes do valor absoluto**, no app e no web.
9. **Campo nulo não entra na comparação.** "Não medido" não é zero.
10. **Falha de gravação não invalida a análise** — volta com `persisted: false`.

## Decisões técnicas não-óbvias

- **A régua é a altura do próprio aluno.** A referência de escala não vem da
  câmera nem de um objeto no quadro: sabendo que o corpo mede N cm e quantos
  pixels ocupa, qualquer largura converte por regra de três.
- **O valor está no delta, não no número.** O erro sistemático da estimativa se
  repete entre dois escaneamentos e se cancela na diferença. Por isso a
  comparação vem primeiro na tela e o aviso de estimativa fica **acima** da
  tabela — lido depois, não muda mais o que o especialista anotou.
- **Índice no contexto, detalhe por ferramenta.** O contexto do coach só diz
  quantas análises existem e quando foi a última; o corpo vem por
  `query_body_scan`. O contexto vai em todo turno e a análise inteira
  encareceria a conversa por um dado que a maioria dos turnos não usa.
- **`skipProcessing: false`** na captura. Ligado, pula a correção de orientação
  do Android e pode devolver a rotação só na EXIF — com a altura em pixels
  virando régua, largura e altura trocadas quebrariam a escala em silêncio.
- **`quality: 1` no disparo.** A imagem já passa por `compress: 0.6` no envio;
  comprimir duas vezes só piorava a medida de largura sem economizar nada.
- **O enquadramento é gravado** (`0027`, `0028`), incluindo qual lente. Frontal
  e traseira têm distância focal diferente, então "mesma fração do quadro" não
  significa mesma distância entre elas.
- **`framing_level_sensor` existe** para separar "estava nivelado" de "não dava
  para saber". Sem a coluna, os dois casos ficariam idênticos no banco.
- **A silhueta antiga saiu** porque prometia uma verificação que não acontecia.
  As marcas atuais validam de verdade.

## Divergências web ↔ mobile

- **A captura é só mobile.** O web lê o histórico; não há como escanear por lá.
- **O app mostra a comparação da análise recém-feita**; o web mostra o histórico
  completo com a tabela de medidas.

---

## O que ficou fora

- **Calibração px→cm e circunferência por elipse.** O prompt ainda pede
  circunferência direto. Calcular pela elipse exige pedir largura frontal e
  profundidade lateral — mudança de contrato do modelo que merece ser medida.
- **Detecção de pose no dispositivo.** Exige dev build e, no iOS, que o app seja
  buildado pela primeira vez (dívida 15).
- **A galeria continua disponível**, então nada garante que a foto seguiu o
  guia. Decisão de produto pendente.

## Dependência conhecida

A régua vem de `physical_assessments.height_cm`. **Nenhum caminho do sistema
grava essa tabela corretamente hoje** — ver dívida 44 e
[physical-assessment-schema-drift](../PRDs/physical-assessment-schema-drift.md).
Enquanto isso não for corrigido, o aluno precisa digitar a altura.
