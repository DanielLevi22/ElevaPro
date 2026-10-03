# O que os apps de treino e nutrição ensinam para o Praticante

Status: concluído em 03/10/2026, com as pesquisas de conteúdo (seção 4). Lacunas revisadas nos dois arquivos em 03/10/2026: restam 20 no treino (seção 11) e cerca de 25 na nutrição (seção "Lacunas restantes"). Consolida duas pesquisas de 02/10/2026:

- [`apps-treino-e-saude.md`](apps-treino-e-saude.md): Fitbod, Hevy, Strong, JEFIT, Future, Ladder, Caliber, SensAI, WHOOP, Oura (54 fontes primárias).
- [`apps-nutricao.md`](apps-nutricao.md): MacroFactor, Carbon, Cal AI, MyFitnessPal, Lose It!, Noom, Yazio, Lifesum, Nutrola, Fitia, Tecnonutri, FatSecret, Dieta e Saúde (50 primárias, 25 secundárias).

As afirmações abaixo vêm desses arquivos. As referências **[T·Fn]** apontam para as fontes do arquivo de treino e **[N·Fn]** para as do de nutrição. É recomendação de produto, não decisão: cada item vira issue pelo `/to-spec`, e o que toca dado de saúde passa pelo `/lgpd-check`.

---

## 1. As nove lições que valem para os dois lados

1. **O plano nasce de um questionário curto, não de uma conversa.** Fitbod, Hevy e JEFIT geram o treino com seis perguntas: objetivo, experiência, dias, duração, equipamento e limitação [T·F3][T·F13][T·F25]. Noom, Cal AI e Yazio terminam o onboarding com "seu plano está pronto" [N·S5][N·S6][N·S9]. O SensAI pôs o chat no centro e a Future desistiu do coach por IA em junho de 2026 [T·F31][T·S1].
2. **A regra decide e é publicável.** O Hevy sobe a carga quando a pessoa bate o topo da faixa de repetições em todas as séries, e diz que isso é algoritmo, não IA [T·F13][T·F14]; a regra de redução não é publicada. O Fitbod pede RIR de 0 a 4+ depois de cada exercício e usa o valor para decidir carga ou repetições [T·apps-treino-e-saude.md, seção 4]. A meta calórica inicial é sempre fórmula: o Yazio usa Mifflin-St Jeor × atividade, e o MacroFactor admite que a dele pode errar mais de 500 kcal/dia até recalibrar [N·F35][N·F6]. Isso confirma o ADR-0020 e o ADR-0028.
3. **O ajuste semanal é um check-in de um minuto e não pune.** O Carbon pergunta como foi o registro (tudo, parte, não registrei mas segui, outro app); com registro parcial, mantém a meta [N·F15][N·F16]. O MacroFactor é "neutro em aderência" e só pausa com mais de 3 dias sem registro [N·F2]. O Fitbod recalibra depois de uma pausa, sem cobrar reposição [T·F3][T·F4].
4. **Registrar tem que custar poucos toques.** Valor anterior ao lado da série, timer que dispara sozinho e Live Activity no treino [T·F18][T·F23]; repetir refeição, favoritos e "adicionar calorias rápido" na dieta, com o MacroFactor medindo o atrito em toques [N·F9]. A foto com IA funciona melhor quando vira alimentos do banco, editáveis [N·F11].
5. **O registro básico fica grátis, e isso virou diferencial.** Hevy e Strong cresceram deixando registrar sem limite [T·F19][T·F22]. Na nutrição, os líderes estão indo no sentido oposto: o MyFitnessPal pôs o código de barras no pago em 2022, o Lose It! está fazendo o mesmo com o leitor de código e de rótulo em 2026, o Yazio lançou a foto com IA grátis e depois a passou para o Pro, o Lifesum cobra para a pessoa definir a própria meta e o FatSecret cobra até o contador de água (detalhe e fontes em `apps-nutricao.md`, seção 5). Bate com o ADR-0036: nenhum gate tira da pessoa os próprios dados.
6. **Plano antes do preço, e preço honesto.** O valor aparece antes do paywall em todos os líderes. Ladder e SensAI usam "teste sem cartão" como argumento [T·F29][T·F33]. A Apple tirou o Cal AI da loja em abril de 2026 por práticas de assinatura [N·S3]; WHOOP transforma o teste em anuidade com multa [T·F38].
7. **A sequência que retém é semanal e perdoa.** O streak do Hevy conta semanas com pelo menos um treino e se recupera com registro retroativo [T·F17]. O Oura tem Modo Descanso para doença e lesão [T·F47]. Na nutrição, a sequência é de registro, nunca de "dia dentro da meta" [N·F7][N·F14].
8. **A IA de registro dos líderes não fala português.** Meal Scan e voz do MyFitnessPal e Snap It, Scan It e Say It do Lose It! só funcionam com o app em inglês; Carbon e MacroFactor só existem em inglês (e japonês); o Fitia não lista português; o Nutrola é português de Portugal; o Lifesum não usa tabela brasileira. O único global com banco e marcas brasileiras é o FatSecret, que não declara se usa a TACO (`apps-nutricao.md`, seções 4 e 10). Foto e voz em português, com prato brasileiro, são um espaço aberto.

9. **No Brasil, o preço do Eleva está bem posicionado.** Os registradores sem plano adaptativo (Hevy, Strong) cobram de R$ 12,90 a R$ 20,90/mês; os que geram plano ficam acima: Fitbod de R$ 29,90 a R$ 69,90 e JEFIT Elite R$ 64,90 [T·F12][T·F55][T·F7][T·F54]. O teto é o treinador humano do Ladder, R$ 79,99/mês [T·F60]. Os apps de dieta brasileiros estão em `apps-nutricao.md`, seção 5. O Starter de R$ 19 entrega plano gerado ao preço de um registrador.

---

## 2. Design diferenciado: o que torna esses apps memoráveis

Nenhum app documenta tipografia ou paleta exatas. O que as fontes mostram é **onde** a interface se torna memorável:

| Padrão | Quem faz | Como fica no kit de vidro do Eleva |
|---|---|---|
| **Uma coisa importante por dia** | Oura (redesenho de nov/2025) [T·F45] | Já é o ADR-0033. O cartão principal de vidro carrega a ação do dia; o resto fica abaixo |
| **A cor é o dado** | WHOOP (recuperação verde/amarelo/vermelho) [T·F35] | Anel de vidro com a cor do estado da Prontidão e a frase da ação por baixo. Cor nunca sozinha: sempre com rótulo |
| **O gráfico que interpreta** | MacroFactor (tendência de peso, cascata semanal, mostrador de manutenção) [N·F7][N·F8] | **Tela-assinatura do Eleva:** gráfico de tendência de peso em cartão de fundo sólido, linha verde-lima, pontos da pesagem diária, entrada animada |
| **O corpo como painel** | Fitbod (mapa muscular), Hevy, Strong [T·F2][T·F10][T·F21] | Silhueta em SVG com luz verde-lima nos músculos trabalhados na semana. Volume por músculo, não "recuperação %" |
| **Recompensa sem streak** | Oura (coroa ≥ 85) [T·F43] | Selo de vidro no recorde pessoal, com vibração, no momento da série (PR ao vivo do Hevy [T·F10]) |
| **Microfeedback com nome** | Yazio ("Protein Power!") [N·S9] | Frases curtas no registro: "Proteína em dia". Barato e dá personalidade |
| **Projeção desenhada na frente da pessoa** | Noom, Fitbod [N·S6][T·S3] | Na prévia do plano, a curva se desenha enquanto "monta seu plano", com a nota de que recalibra em 2–4 semanas |
| **Objeto compartilhável** | Hevy (cartões mensais e anuais), Oura (personalidade do ano) [T·F16][T·F48] | Cartão vertical de story com treinos, volume e PRs. Só treino, como o ranking (ADR-0032) |
| **Conduzir em vez de preencher** | Ladder (treinador no fone), SensAI (relógio) [T·F30][T·F31] | A voz que já existe na sessão e no cardio, com o ritmo da série |

**Leitura para o kit:** o vidro diferencia superfícies, mas gráfico pede fundo sólido e contraste. O "uau" vem do gráfico que interpreta e da microinteração no momento certo, não de mais efeito.

---

## 3. Prioridade consolidada para o Eleva Pro

Ordem ajustada ao ADR-0036: **ativação antes de cobrança**. As telas de assinatura podem ser desenhadas agora, mas entram depois de medir o primeiro valor.

### Agora: o primeiro valor

1. **Onboarding curto que termina com dieta e treino prontos para aprovar.** Seis perguntas de treino, as escolhas rápidas de dieta, meta por Mifflin-St Jeor com piso, plano gerado e "Aprovar / Ajustar". O chat vira opção secundária. [T·F3][T·F13][N·F35][N·F46]
2. **Triagem clínica no questionário.** Menor de 18 não recebe déficit; IMC < 18,5 não recebe meta de perda; gestação, transtorno alimentar ou condição clínica → sem plano gerado e encaminhamento a nutricionista (com a opção de vincular um especialista no próprio Eleva). Piso no mínimo na TMB e ritmo máximo de cerca de 1% do peso por semana. Conversa com a Lei 8.234/1991, art. 3º, VIII [N·F49]. Passa por `/lgpd-check`.
3. **Progressão por dupla progressão, com a regra visível** e recalibração depois de pausa. A IA só verbaliza: "subiu 2,5 kg porque você fez 12 repetições nas 3 séries". [T·F13][T·F4]
4. **Os redutores de atrito no registro do treino:** valor anterior, timer automático, timer na tela bloqueada (notificação contínua no Android) e PSE em um toque, que alimenta o motor de carga. [T·F18][T·F23]
5. **Registro básico de dieta grátis e rápido:** busca, código de barras, repetir refeição, "comi como planejado" e água no Free. [N·S1][N·F9]

### Em seguida: o hábito

6. **Check-in semanal de um minuto** no modelo Carbon + MacroFactor, com fórmula própria documentada em ADR. A IA só explica o ajuste. Regras públicas para copiar: o MacroFactor **suaviza** o ajuste (um platô de 3 semanas que pediria −500 kcal baixa só 200 a 300) e trata cada semana sozinha, sem cobrar atraso; o Carbon não pune quem comeu menos e perdeu mais, e **sobe** as calorias quando a perda passa do ritmo escolhido; o ritmo é medido em % do peso por semana, de 0,25% a 1% no handbook do MacroFactor (`apps-nutricao.md`, seção 3). [N·F15][N·F16][N·F2]
7. **Streak semanal tolerante e Modo Descanso.** [T·F17][T·F47]
8. **Foto do prato e registro por voz em português, decompostos em alimentos do banco e editáveis.** Pratos brasileiros e banco TACO como diferencial (conferir a licença). É onde os líderes deixaram espaço: a IA deles só funciona em inglês. [N·F11]
9. **Gráfico de tendência de peso** como tela-assinatura do kit. [N·F8]
10. **Mapa muscular e PR ao vivo.** [T·F2][T·F10]
11. **Assinatura sobre o funil medido:** teste sem cartão, preço cobrado e data à vista, sem roleta nem segunda oferta. Registro e dados próprios nunca no pago. [T·F29][N·S3][N·S4]

### Depois: profundidade

12. Relatório mensal compartilhável e retrospectiva anual com mínimo de dias. [T·F16][T·F48]
13. Periodização visível em blocos e "Max Effort Day" opcional. [T·F25][T·F1]
14. Modo "sem contar" para iniciante (semáforo por densidade calórica) e estilos de programa (automático, colaborativo, manual) para o avançado. [N·F41][N·F6]
15. Score de força com níveis (Caliber, Fitbod), com fórmula em ADR e `/lgpd-check`. [T·F28][T·F4]
16. App de relógio para registrar a série. [T·F9]

### Evitar

- Chat como caminho único para nascer ou ajustar o plano. [T·F31][T·S1]
- Cortar o registro de quem não assina, como o Fitbod: sem assinatura, a pessoa vê os treinos antigos mas não registra novos (a versão "3 treinos grátis" só aparece em reviews). [T·F8][T·S7]
- Dark patterns de paywall: preço semanal em destaque, folha que imita a nativa, roleta de desconto. [N·S3][N·S4][N·S9]
- Score opaco vendido como verdade fisiológica; mostrar "como calculamos" (a regra já é versionada, ADR-0029). [T·F35][T·F43]
- Compensar excessos automaticamente ("pagar" o fim de semana). [N·F13]
- Antes e depois ou projeção do corpo gerados por IA. [N·S15][N·S16]
- Relatório que expira e teste que vira anuidade com multa. [T·F16][T·F38]

---

## 4. Conteúdo que traz interesse além de treino e dieta

Consolida três pesquisas de 03/10/2026, cada uma com fontes próprias:

- [`conteudo-saude-e-habitos.md`](conteudo-saude-e-habitos.md): hábitos, sono, mente e respiração, hidratação, saúde da mulher, plataformas de saúde, Brasil.
- [`conteudo-esportes.md`](conteudo-esportes.md): corrida, ciclismo, natação, yoga e mobilidade, crossfit, lutas, raquete e coletivos, ao ar livre, calistenia.
- [`conteudo-e-engajamento.md`](conteudo-e-engajamento.md): aulas, gamificação, comunidade, conteúdo educativo, perfis e o ecossistema brasileiro (Wellhub, TotalPass, Smart Fit).

### 4.1 O que esses arquivos mostram

1. **Uma segunda modalidade é a alavanca de retenção mais documentada.** Peloton, Strava e Wellhub publicam ganhos grandes de constância em quem pratica mais de uma atividade (engajamento, seção 1).
2. **A corrida de rua é a maior oportunidade no Brasil.** Provas e estreantes crescendo rápido, e nenhum app em PT-BR com plano de prova e força integrada como o Runna (esportes, seção 1).
3. **Força ligada ao esporte já é padrão** (Runna, Garmin, Wahoo, MySwimPro). O Eleva já tem a musculação periodizada; falta o "foco por esporte" (esportes).
4. **Beach tennis, futevôlei, padel e pelada têm apps de quadra e torneio, mas nenhum cuida do corpo do jogador:** preparo físico, aquecimento e prevenção de lesão (esportes).
5. **O melhor hábito se marca sozinho pelo sensor**, e Prontidão que só dá nota virou commodity: o diferencial é a ação, como trocar o treino do dia por uma versão leve (saúde e hábitos).
6. **Áudio guiado é o conteúdo de melhor custo para time pequeno** e roda por cima do GPS que o app já tem (engajamento; esportes).
7. **Time pequeno renova por algoritmo, temporada ou criador, nunca por vídeo diário.** Gamificação que funciona é configuração: desafio com datas, medalha de edição limitada, evento mensal e retrospectiva (engajamento).
8. **A disputa é justa entre níveis quando usa a meta de cada um**, não o número absoluto (StepBet, Apple) (engajamento).
9. **No Brasil, quem tem Wellhub já recebe meditação genérica.** O espaço livre é conteúdo de saúde ligado ao treino, em PT-BR. O Wellhub tem programa aberto para app parceiro; o TotalPass, não confirmado (saúde e hábitos; engajamento, seção 7).
10. **Ciclo menstrual e humor são dado sensível.** Ciclo × treino é diferencial, mas sem regra fixa por fase e só com `/lgpd-check` (saúde e hábitos).

### 4.2 Prioridade de conteúdo

**Agora**
- Aquecimento e mobilidade de 5 a 10 minutos antes do treino e por esporte. É barato e atende todas as modalidades.
- Água com meta que sobe com atividade e calor, e lembrete que para quando a meta é batida.
- Prontidão que vira ação: "dia leve" troca o treino por uma versão mais curta, com aprovação.

**Em seguida**
- "Foco por esporte" na musculação: corrida de rua (plano de prova 5K a 21K com força), beach tennis e futevôlei, futebol, jiu-jitsu.
- Corridas e caminhadas guiadas por áudio em PT-BR, com voz sintética sobre o GPS atual.
- Desafios mensais com data, medalha de edição limitada e disputa pela meta pessoal.
- Respiração curta com objetivo (antes do treino, para dormir).

**Depois**
- Parceria com o Wellhub como "Pro via benefício", depois de resolver remuneração, regra das lojas e `/lgpd-check` (nenhum dado de treino ou saúde vai para o RH).
- Lições curtas em sequência e receitas como conteúdo pago.
- Ciclo menstrual × treino, só com `/lgpd-check`.
- Coleções por perfil (iniciante, 60+, gestante), revisadas por profissional.

**Evitar**
- Vídeo próprio diário: não cabe num time pequeno.
- Feed aberto com "pessoas próximas": conflita com o ADR-0032.
- Hardware próprio (Zwift, FightCamp, FORM).
