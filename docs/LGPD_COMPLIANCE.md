# LGPD — Obrigações e Requisitos do Eleva Pro

> Documento operacional. Traduz a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) em obrigações concretas para o Eleva Pro.
> Toda decisão de schema, feature e arquitetura que envolva dados pessoais deve ser verificada contra este documento.
> **Auditado em 2026-08-29** contra o schema, as migrations e as rotas — as divergências
> encontradas estão corrigidas aqui, e as lacunas reais viraram issue.

---

## 1. Papéis e responsabilidades

### Eleva Pro — Controlador (Art. 5°, VI)

Daniel é o **controlador**: decide quais dados são coletados, por quê, como e por quanto tempo. É quem responde perante a ANPD em caso de infração.

Responsabilidades:
- Definir a finalidade de cada dado coletado
- Garantir que o sistema respeite os direitos dos titulares
- Manter registros de tratamento de dados
- Notificar titulares e ANPD em caso de incidente de segurança

### Supabase — Operador (Art. 5°, VII)

Supabase é o **operador**: executa o armazenamento e processamento conforme configurado pelo controlador. Não decide sobre finalidade ou base legal.

Implicação prática: RLS mal configurado ou queries sem controle de acesso são **falha do controlador**, não do operador. A responsabilidade é de quem modelou o banco.

### Especialistas e alunos — Titulares (Art. 5°, V)

Os usuários do sistema são os titulares dos dados. Têm os seguintes direitos que **o sistema precisa suportar**:

| Direito | O que o sistema precisa ter |
|---------|----------------------------|
| Acesso | Usuário consegue ver todos os seus dados |
| Correção | Usuário consegue editar nome, e-mail, dados pessoais |
| Exclusão | Usuário consegue solicitar remoção da conta e dados |
| Portabilidade | Usuário consegue exportar seus dados em formato legível |
| Revogação do consentimento | Usuário consegue revogar permissões específicas |
| Informação | Usuário sabe quais dados são coletados e por quê |

---

## 2. Mapa de dados — o que coletamos e por quê

> **Última revisão completa:** módulos Auth e Students revisados via `/lgpd-check`. Ver seção 10 para status detalhado por módulo.

### 2.1 Dados pessoais comuns (Art. 5°, I)

Qualquer dado que identifica ou pode identificar uma pessoa.

| Dado | Tabela | Base legal | Finalidade |
|------|--------|------------|------------|
| Nome completo | `profiles.full_name` | Execução de contrato | Identificação do usuário no sistema |
| E-mail | `profiles.email` | Execução de contrato | Autenticação e comunicação |
| Foto de perfil | `profiles.avatar_url` | Consentimento | Personalização da interface |
| Tipo de conta | `profiles.account_type` | Execução de contrato | Controle de acesso e fluxo de uso |
| Status da conta | `profiles.account_status` | Execução de contrato | Gestão de ciclo de vida do usuário |
| Anotação administrativa | `profiles.admin_notes` | Legítimo interesse (Art. 7°, IX) | Registro do suporte sobre a conta — por que foi suspensa, o que ficou combinado. Escrita pelo admin, não coletada do titular. **Não é dado de saúde.** Entra no direito de acesso (Art. 18, II): é dado pessoal do titular, ainda que escrito por terceiro |
| Tipo de serviço | `specialist_services.service_type` | Execução de contrato | Definir quais funcionalidades o especialista acessa |
| **Pontos da semana** | `ranking_scores` (desde a `0059`, #320) | Execução de contrato (Art. 7°, V) | O placar do ranking. **Derivado só do treino**: 100 por sessão concluída, até 2 por dia, gravado por trigger de `workout_sessions` — o cliente não escreve. Refeição, água e medida não pontuam, porque o placar mostraria a adesão à dieta (Art. 11). O dono e o especialista vinculado leem a linha |
| **Participação no ranking global** | `student_consents` com `consent_type = 'ranking'` (desde a `0058`, #320) | **Consentimento (Art. 7°, I)**, finalidade própria (Art. 8°, §4°) | Mostrar a outros participantes o primeiro nome, a inicial do sobrenome e os pontos da semana. Só quem consentiu **na versão vigente do texto** aparece e só quem consentiu vê (reciprocidade); o especialista não participa. A leitura sai só pela RPC `get_leaderboard`, que não devolve foto nem e-mail. Revogar tira a pessoa do placar na mesma consulta |
| Marca de correção do feedback | `workout_sessions.feedback_edited_at` | Execução de contrato (Art. 7°, V) | Carimbo de tempo, não conteúdo: informa ao especialista que a declaração do aluno foi corrigida e quando. Sem ele a correção seria indistinguível de o aluno ter escrito aquilo desde o começo. **Não guarda a versão anterior** — a versão errada é o dado inexato que o Art. 6°, V manda corrigir, e preservá-la contraria o próprio direito exercido |

### 2.2 Dados pessoais sensíveis (Art. 5°, II)

Dados referentes à saúde exigem **base legal específica** e proteção reforçada. O Eleva Pro trata dados de saúde — isso é o núcleo do produto.

| Dado | Tabela | Base legal | Finalidade |
|------|--------|------------|------------|
| Peso, altura | `physical_assessments` | Tutela da saúde (Art. 11, II, f) + Consentimento | Avaliação física, cálculo de composição corporal, e **Escala** que calibra o Body scan. Obrigatórios desde a `0037` |
| % gordura, massa muscular | `physical_assessments` | Tutela da saúde + Consentimento | Acompanhamento de evolução física |
| Dobras cutâneas (7 pontos) | `physical_assessments` | Tutela da saúde + Consentimento | Protocolo Jackson-Pollock para composição corporal |
| Circunferências corporais | `physical_assessments` | Tutela da saúde + Consentimento | Acompanhamento de medidas |
| **Medida declarada pelo aluno** — peso, altura, % gordura e circunferências digitados por ele | `physical_assessments` com `measured_by = 'self'` (desde a `0056`, #312) | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Dar ao Praticante, que não tem especialista, composição e medidas para acompanhar. Nasce da anamnese do Praticante (a primeira) ou do formulário. Só grava quem não tem especialista ativo, e com consentimento **presente** (`has_health_consent`, o helper estrito): diferente do acervo do especialista, não existe declaração anterior ao portão. Sem dobra cutânea, que é medida de especialista. O texto do consentimento cita a medida desde a `POLICY_VERSION` 1.8 |
| Origem da medida | `physical_assessments.measured_by` | Mesma base da avaliação | Dizer a quem lê se o número veio da fita ou da declaração. As telas nunca comparam uma com a outra (ADR-0030) |
| **Nota do especialista sobre o progresso** — texto livre escrito pelo profissional | `specialist_notes` (desde a `0057`, #312) | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Registro do acompanhamento: o que evoluiu, o que ajustar. Escrita só pelo autor, no web; lida pelo Aluno (sempre) e pelo autor com vínculo ativo e consentimento. **Outro especialista do mesmo aluno não lê.** Limite de 2.000 caracteres para o campo aberto não virar prontuário. O Praticante não tem especialista, e nem leitura pelo CASL |
| Histórico de saúde (anamnese) | `student_anamnesis.responses` | Consentimento explícito (Art. 11, I) | Informar o especialista sobre limitações, lesões, medicamentos |
| Altura e peso declarados | `student_anamnesis.responses` (campos `height`, `weight`) | Tutela da saúde (Art. 11, II, f) + Consentimento | **Origem secundária da Escala**: calibram o Body scan quando não há avaliação física. Lidos por campo nomeado no banco, nunca `responses` inteiro |
| Origem da Escala | `body_scans.scale_source` | Tutela da saúde + Consentimento | Registrar se a altura que calibrou o scan foi medida com fita (`assessment`), declarada numa medida (`self`, desde a `0056`) ou declarada na anamnese — o especialista precisa saber se pondera ou confia no número |
| **Geometria medida no aparelho** — régua px/cm, larguras de silhueta, ângulos de assimetria e postura | `body_scans` (colunas do ADR-0022) | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Substituir a estimativa visual do modelo por medida reprodutível. A régua fica gravada porque sem ela não há como saber se dois escaneamentos são comparáveis — mesma razão de `framing_camera` |
| **Qualidade da captura** — contraluz, luminância, visibilidade mínima | `body_scans` (colunas do ADR-0022) | Mesma base do scan | Dizer ao especialista quanto confiar naquele número (Art. 6°, V). Guarda-se o **veredito**, nunca o histograma ou o recorte de imagem |
| **Imagem do corpo processada ao vivo no aparelho** | *não persiste em lugar nenhum* | Tutela da saúde + **Consentimento informado sobre o processamento local** | Posicionar o aluno e medir. É tratamento pelo Art. 5°, X mesmo sem armazenamento — e por isso precisa estar no texto de consentimento, o que exige `POLICY_VERSION` nova |
| **Imagem do corpo processada ao vivo durante o exercício** (Análise de Técnica) | *não persiste em lugar nenhum* | Tutela da saúde (Art. 11, II, f) + **Consentimento explícito** (Art. 11, I) | Contar repetições e julgar a profundidade do agachamento. Mesma doutrina do Body scan: não armazenar não é não tratar (Art. 5°, X). **Finalidade nova**, e por isso ganhou `consent_type` próprio (`technique_analysis`, migration 0041) em vez de entrar no do Body scan — ver a nota abaixo da Seção 3 |
| **Vídeo de calibração processado no browser** (painel `/admin/tecnica`) | *não persiste em lugar nenhum* — nem banco, nem bucket, nem disco | Consentimento explícito (Art. 11, I) dos dois profissionais filmados, por termo escrito | Calibrar o limiar do Critério. O vídeo morre ao fechar a aba; o que se exporta são os 33 landmarks por quadro — boneco de palito, sem imagem e sem rosto — como fixture versionada no repositório |
| Dados de treino executado (séries, cargas, datas, PSE em `perceived_exertion`) | `workout_sessions` | Execução de contrato | Acompanhamento de desempenho |
| **Observações do aluno sobre a própria sessão** | `workout_sessions.notes` | **Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I)** | Ajuste de prescrição a partir do que o aluno relata |
| Tipo, duração e calorias da sessão | `workout_sessions.session_type`, `.duration_seconds`, `.active_calories` | Execução de contrato | Distinguir cardio de musculação e medir a sessão |
| **Distância, ritmo e cadência da corrida** | `workout_sessions.distance_meters`, `.avg_pace_seconds_per_km`, `.avg_cadence_spm` | Execução de contrato (Art. 7°, V) | Medir a corrida para ajustar a prescrição. Mesma classificação de duração e calorias: é a medida da sessão contratada, não relato clínico. Derivados no aparelho — **a série de coordenadas que os produz não é gravada** (ver §2.3) |
| **FC média da sessão** | `workout_session_vitals.avg_heart_rate` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Esforço real da corrida, para calibrar a carga. Em **tabela própria**, e não numa coluna de `workout_sessions`: a RLS decide por linha, e aquela tabela é de execução de contrato — uma coluna de Art. 11 lá dentro ficaria sob política que não consulta consentimento, que é a pendência de `notes` pela segunda vez. Só a média; a série intradiária é vedada pelo mesmo motivo da FC de repouso |
| **Tempo por zona de FC da sessão** (lote do cardio em vidro, ADR-0026) | `workout_session_vitals`, uma coluna de percentual por zona, na mesma linha da média | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Distinguir 40 minutos constantes de um intervalado, que a média sozinha não mostra. Cinco percentuais pela FC máxima de 220 − idade: não permitem reconstruir a série nem inferir estresse. Nascem na linha da média, sob a mesma RLS que consulta consentimento, e herdam o REVOKE de UPDATE e DELETE. Nulos quando não há idade declarada |
| Plano alimentar (metas calóricas e macros) | `diet_plans` | Tutela da saúde + Consentimento (Art. 11, II, f + I) | Prescrição nutricional — especialista ou autogerenciado pelo member |
| Refeições e alimentos do plano | `diet_meals`, `diet_meal_items` | Tutela da saúde + Consentimento | Composição do plano alimentar |
| Registro de refeições realizadas e substituições | `meal_logs` | Tutela da saúde + Consentimento | Acompanhamento de aderência nutricional |
| **Item extra do que o aluno comeu, com a origem** | `meal_logs.actual_items` (`origem`: `busca`, `scan` ou `assistente`) | Tutela da saúde + Consentimento | O alimento da busca, o prato do scan e a sugestão aceita do assistente entram no registro da refeição. A **origem é gravada em todo item extra** (Art. 6°, V): `scan` e `assistente` são estimativa de modelo, e o especialista precisa distingui-las do que foi prescrito ou pesado. Travado em `diarioAlimentar.test.ts` e `diarioAlimentar.service.test.ts` (issue #298) |
| **Água do dia** | `hydration_daily.water_ml` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Acompanhar a meta de água. **Um total por dia**, e não um registro por copo: a série revelaria a rotina do dia inteiro. **Só o próprio aluno lê e grava**, e gravar exige consentimento vigente no banco; nenhum especialista lê, porque nenhuma tela dele consome o dado (`0052`, issue #298) |
| Registro alimentar (campo legado) | `diet_logs` | Tutela da saúde + Consentimento | Acompanhamento nutricional |
| Passos por dia (agregado) | `health_daily_metrics.steps` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Acompanhamento de atividade entre sessões de treino |
| Calorias ativas por dia (agregado) | `health_daily_metrics.active_calories` | Tutela da saúde + Consentimento | Estimativa de gasto energético para ajuste do plano |
| **Duração do sono por dia** | `health_daily_metrics.sleep_minutes` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Ajuste de carga a partir da recuperação. Guarda **só a duração**: horário de dormir e de acordar revelariam rotina doméstica sem mudar prescrição, e os estágios (leve/profundo/REM) entram quando existir a leitura que os consome. `NULL` é ausência de leitura, nunca zero |
| **FC de repouso por dia** | `health_daily_metrics.resting_heart_rate` | Tutela da saúde + Consentimento | Sinal de fadiga acumulada entre sessões. Um valor por dia — a série intradiária de batimentos permitiria inferir estresse, atividade sexual e crise de ansiedade, muito além de acompanhar treino |
| **Prontidão do dia** (lote Saúde em vidro, ADR-0029) | `health_daily_metrics.readiness_score` e `readiness_version` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Resumir num número o sono e a FC de repouso de hoje contra a média de 14 dias do próprio aluno. **Inferência** gravada, não medida: por isso a finalidade nova e a `1.7`. Gravada com a versão da regra para o número do dia não mudar depois de mostrado. Calculada no aparelho só depois do consentimento, que também é o que libera ler a base. Não decide nada sozinha: ligada ao ajuste do plano, vira decisão automatizada (Art. 20), com direito de revisão. Nula sem base de 3 dias, e no iOS, que não grava métricas diárias |

| Conversa do especialista com o coach de IA | `ai_chat_messages.content` | Consentimento explícito (Art. 11, I) — a mesma do dado de origem | Prescrição assistida |

> **`ai_chat_messages` é um local secundário de dado sensível.** A conversa
> guarda o que o modelo repetir sobre lesão, medicação e medida — em texto
> livre, fora da tabela onde o dado nasceu. Verificado em 2026-08-12: com
> consentimento, o coach responde citando a hérnia de disco e a medicação, e
> essa resposta é persistida. Vale a mesma base legal da anamnese, e o
> `ON DELETE CASCADE` a partir de `profiles` garante a eliminação junto com a
> conta.
>
> **`workout_sessions.notes` é o segundo desses locais.** É o campo aberto do
> `WorkoutFeedbackModal`, onde o aluno escreve com as próprias palavras no fim
> de cada sessão — "senti dor no ombro", "tive tontura", "voltei da cirurgia do
> joelho". Séries, cargas e datas da mesma tabela são execução de contrato;
> este campo não é, e por isso foi separado da linha genérica em 2026-08-28. A
> escala de esforço (`perceived_exertion`, a PSE de 1 a 10 — `intensity` até a
> `0051`) continua como execução de contrato — é medida de carga, não relato
> clínico. A sensação que o app mostra (Leve, Na medida, Puxado) é derivada
> desse número e não é gravada: seria o mesmo dado duas vezes (Art. 6°, III).
>
> A distinção tem consequência prática, e é por ela que a separação importa:
> texto do titular e dado gerado pelo sistema têm tratamento diferente no
> direito de acesso e na eliminação. Enquanto o app escrevia resumo gerado
> dentro de `notes` (o defeito D2 do PRD `student-activity-feed`), não havia
> como saber qual dos dois uma linha continha. Desde a `0035`, `notes` guarda
> só o que o aluno digitou.

| Registro de consentimento | `student_consents` | Consentimento explícito (Art. 11, I) | Provar que o aluno autorizou coleta de dados de saúde |

**Atenção:** O tratamento de dados sensíveis sem base legal adequada é considerado **infração grave** pela ANPD. A base de tutela da saúde exige que o tratamento seja realizado por profissional da área ou sob sua supervisão — o que se aplica ao contexto de personal trainers e nutricionistas usando o sistema.

### 2.3 O que NÃO coletamos (por princípio da necessidade)

Dados que foram explicitamente rejeitados do schema por violar o princípio da necessidade:

- `birth_date` em `profiles` — não pertence à identidade de conta; se necessário para cálculo de tmb, fica em `physical_assessments` ou `student_anamnesis`
- `gender` em `profiles` — mesmo motivo
- `phone` — nunca utilizado funcionalmente
- `cref` / `crn` — credenciais removidas do fluxo de cadastro
- **Traçado da corrida** — a série de coordenadas de GPS (issue #278, `0049`). O
  ponto de partida da maioria das corridas é o endereço de casa; o horário
  repetido é a janela previsível de ausência; o conjunto revela trabalho,
  academia e clínica. Nenhuma decisão de prescrição muda em função da rua, e
  distância e ritmo entregam a finalidade inteira. O GPS mede no aparelho, as
  coordenadas alimentam o desenho da tela de resumo e morrem com a sessão —
  mesma doutrina do Body scan (`ADR-0010`): processa no aparelho, persiste o
  derivado. **A ausência é travada por teste**: a `verify-rls.sql` varre o
  schema inteiro por nome e por tipo de coluna, e alcança a tabela que ainda não
  existe. O custo aceito é não haver histórico de mapa.
- **Série de batimentos da sessão** — só a média entra. A série permitiria
  inferir estresse e crise de ansiedade, pelo mesmo raciocínio já aplicado à FC
  de repouso.
- **Horário de dormir e de acordar** (Onda 1 do relógio, `0046`) — revelam rotina
  doméstica e presença em casa, para uma decisão de treino que a duração do sono já
  informa. Mesmo raciocínio de `birth_date` em `profiles`
- **Estágios do sono** (leve, profundo, REM) — a API entrega, e nenhuma tela consome.
  Entram quando existir a leitura que os usa; "pode ser útil no futuro" é o critério
  que esta seção existe para recusar
- **Pressão arterial, SpO₂ e temperatura corporal** — o campo existe no HealthKit e no
  Health Connect, mas nenhum relógio de consumo os alimenta de forma confiável no
  Brasil. Coletar exigiria entrada manual, e nasceria uma coluna de dado sensível quase
  sempre vazia — a mesma armadilha de `meal_logs.photo_url` na `0035`
- `is_super_admin` — redundante com `account_type`
- **Foto de refeição** (`meal_logs.photo_url`, apagada na `0035`) — foto de prato
  é dado pessoal com rosto, casa e companhia no enquadramento, para uma
  informação que o registro de refeição já dá em texto. Guardar exigiria bucket
  com política, URL assinada, retenção e eliminação: custo de conformidade sem
  contrapartida. A coluna existia sem bucket nenhum — e coluna que nunca deve
  ser preenchida não é neutra, é convite, o mesmo raciocínio da `0026` com
  `body_scans`. Não confundir com a foto da avaliação física, que tem bucket com
  política desde a `0021` e parecer próprio
- **Observação do aluno sobre a refeição** (`meal_logs.notes`, apagada na
  `0035`) — nasceu junto com a tabela e nunca teve caminho de escrita: nenhuma
  tela pedia o texto e nenhum serviço o gravava. Mesma decisão, mesma razão. Se
  vier a ser necessário, nasce com base legal do Art. 11 e lembrete de leitura
  desde o primeiro commit, como `workout_sessions.notes` tem agora
- **Condição indicada no catálogo de exercícios** (`exercises.indicated_for`,
  proposta e recusada na `0042`) — o catálogo ganhou `venue` e `category` para
  servir treino em casa e alongamento, e a tentação seguinte era rotular a linha
  com a condição que ela trata: "hérnia de disco", "impacto do ombro",
  "lombalgia". O rótulo em si é dado de produto, mas ele só é útil sendo
  cruzado: o coach diria ao especialista que sugeriu aquele exercício **porque**
  o aluno tem a condição, e a frase na tela passa a ser inferência sobre saúde
  de titular identificado (Art. 11). O que o produto precisa já existe sem isso —
  a anamnese diz a restrição, e `category` diz que tipo de trabalho o exercício
  é. Se voltar, volta como coluna de `student_anamnesis`, do lado onde já há
  base legal e RLS, nunca no catálogo compartilhado
- **Refeição favorita no servidor** (issue #298) — o favorito só alimenta a
  sugestão do assistente, que parte do aparelho. Uma tabela guardaria preferência
  alimentar associada ao plano de saúde, com RLS, exportação e eliminação, para
  uma finalidade que o aparelho entrega sozinho. Fica no MMKV do aparelho; o
  custo aceito é o favorito não acompanhar a troca de aparelho
- **Marcação da lista de compras no servidor** (issue #298) — é lembrete de
  mercado, e não dado de saúde. Fica no aparelho, por plano e período
- **Capacidades do relógio no servidor** (ADR-0026, fundação do Relógio) — o app
  descobre o que o relógio do aluno entrega (passos e calorias, sono e FC de
  repouso, FC durante o treino) olhando se há dado recente, e usa isso só para
  liberar ou bloquear tela. O resultado fica no aparelho, e o cache guarda o nome da
  capacidade e quando foi verificada, **nunca a medida** que provou a capacidade.
  Gravar no servidor diria ao especialista qual relógio e quais sensores o aluno
  usa, sem decisão de treino que dependa disso
- **Sessões de exercício registradas pelo relógio** (`ExerciseSession` no Health
  Connect, `HKWorkout` no HealthKit) — não são lidas na fundação. A FC durante o
  treino é verificada na janela das sessões de cardio **do próprio app**, que já
  são conhecidas; ler as sessões do relógio revelaria os exercícios feitos fora do
  app, com horário, para uma finalidade que ainda não existe. Entram, com parecer
  próprio, quando existir a importação do cardio feito só com o relógio
- **A série de batimentos da corrida continua não gravada** (lote do cardio em vidro) — com a
  capacidade `workoutHeartRate`, a série da janela da sessão é lida no aparelho,
  vira média e percentual por zona, e morre ali. O que muda em relação à `0049` é
  só o derivado guardado, não a série. Sem consentimento vigente a série nem é
  lida: o portão (`vitalsIfConsented`) vem antes da consulta ao relógio, porque
  ler para descartar ainda é tratamento
- **Leituras do acelerômetro da sessão ao vivo** (lote do cardio em vidro) — as
  dezesseis últimas magnitudes desenham as barras de intensidade e morrem com a
  tela. Não são gravadas, não vão ao log e não se confundem com a PSE, que é o
  que o aluno declara
- **Medicação declarada fora da anamnese** — o cardio lê a resposta "Usa algum
  medicamento contínuo?" só para decidir, no aparelho, se as zonas ganham o aviso
  de que medicação pode alterar a FC. O texto não é gravado em outra tabela, não
  vai ao log e não sai do aparelho; o que existe fora da anamnese é um booleano
  em memória. Da anamnese o cardio lê só `age` e `medications`, nunca `responses`
  inteiro
- **Leitura da água do dia pelo especialista** (`0052`) — a tabela nasce sem
  política para ele. Nenhuma tela do especialista usa o dado; se uma passar a
  usar, a política nasce consultando o consentimento — a `verify-rls.sql` já põe
  `hydration_daily` na lista de Art. 11 e acusa a que não consultar

---

## 3. Bases legais aplicadas (Art. 7° e Art. 11)

Para cada tipo de tratamento, deve existir uma base legal documentada. Não existe "uso genérico" — cada finalidade precisa de justificativa.

| Tratamento | Base legal | Artigo |
|------------|------------|--------|
| Criar conta e autenticar | Execução de contrato | Art. 7°, V |
| Armazenar dados de perfil | Execução de contrato | Art. 7°, V |
| Especialista criar conta do aluno | Execução de contrato + Consentimento posterior | Art. 7°, V + I |
| Avaliações físicas | Tutela da saúde + Consentimento | Art. 11, II, f + I |
| Anamnese de saúde | Consentimento explícito | Art. 11, I |
| Prescrição de treinos | Execução de contrato | Art. 7°, V |
| Prescrição de dietas | Tutela da saúde + Execução de contrato | Art. 11, II, f |
| Logs de acesso ao sistema | Legítimo interesse (segurança) | Art. 7°, IX |
| Dados de gamificação | Execução de contrato | Art. 7°, V |
| **Mostrar nome e pontos a outros participantes do ranking** (#320) | Consentimento, com finalidade e versão próprias (`RANKING`, `1.0`), no padrão da Análise de Técnica: recusar o placar não custa nada além dele | Art. 7°, I; Art. 8°, §4° |
| Histórico de mensagens | Execução de contrato | Art. 7°, V |
| Member cria plano alimentar próprio (sem especialista) | Consentimento explícito | Art. 11, I |
| **Medida corporal declarada pelo próprio aluno** (`measured_by = 'self'`, ADR-0030) | Tutela da saúde + Consentimento — e aqui o **presente**, não só a ausência de revogação: a declaração nasce depois do portão | Art. 11, II, f + I |
| **Nota do especialista sobre o progresso** (`specialist_notes`, ADR-0031) | Tutela da saúde + Consentimento. Lida pelo autor com vínculo ativo; para o titular, a leitura é do próprio dado e não depende do consentimento seguir vigente | Art. 11, II, f + I |
| **Exportação do relatório em PDF, no aparelho** | Mesma base dos dados que ele repete — não há tratamento novo: nada passa pelo servidor, e o arquivo é apagado depois de compartilhado | Art. 11, II, f + I |
| Sinal derivado de inatividade para o especialista vinculado (briefing) | Mesma base do dado de origem — Execução de contrato para `workout_sessions`, Consentimento explícito para a data de conclusão da anamnese | Art. 7°, V + Art. 11, I |
| **Processamento local contínuo da imagem do corpo durante a captura** (ADR-0022) | Tutela da saúde + Consentimento explícito | Art. 11, II, f + I |
| **Processamento local contínuo da imagem do corpo durante o exercício** (Análise de Técnica) | Tutela da saúde + Consentimento explícito **próprio da finalidade** (`technique_analysis`) | Art. 11, II, f + I; Art. 8°, §4° |

**Por que a Análise de Técnica tem consentimento separado.** A issue #194
propunha reusar `health_data_collection` e subir a `POLICY_VERSION` para 1.3.
A implementação divergiu, e o motivo é o Art. 8°, §4°: autorização genérica é
nula. Empacotadas num consentimento só, as duas finalidades ficam presas uma na
outra — quem recusar a câmera contínua durante a série perderia junto a
avaliação física, a anamnese e o acompanhamento de passos, que nada têm a ver
com isso. Consentimento cuja recusa cobra funcionalidade alheia não é livre
(Art. 8°, caput), e é a liberdade que sustenta a base do Art. 11, I.

São finalidades que o titular distingue: o Body scan são fotos que ele tira num
momento que escolhe; a Análise de Técnica é a câmera aberta lendo o corpo
durante a série inteira. É razoável querer uma e não a outra.

Efeito colateral evitado: a `POLICY_VERSION` do Body scan **não sobe**, o texto
da 1.2 continua exato para o que descreve, e ninguém reconsente o que já
consentiu. Reconsentimento pedido à toa é o que ensina a aceitar sem ler.

**Sobre o processamento local.** Não armazenar não é não tratar: o Art. 5°, X
inclui coleta, acesso e processamento. Enquanto a tela de captura está aberta, o
aparelho amostra a imagem do corpo a cada dois segundos e roda o MediaPipe
localmente. Nenhum frame é gravado, nenhum frame sai do aparelho — o que sobe
para o JavaScript é um objeto com booleanos e números, e o que atravessa a
fronteira continuam sendo as três fotos que o aluno tira.

O que muda em relação ao fluxo anterior não é o destino, é o **volume e a
iniciativa**: antes o app só olhava quando o aluno apertava o botão. Isso precisa
estar dito no consentimento, e é o que obriga uma `POLICY_VERSION` nova — pela
mesma razão da `1.1`: não faltava autorização, faltava o aluno saber.

**Feito em 2026-08-31: `POLICY_VERSION` = `1.2`.** O texto passou a ter duas
metades explícitas, porque "as imagens" tinha virado uma palavra para duas
coisas diferentes: *no seu aparelho*, a análise a cada dois segundos que não é
gravada nem enviada; *fora do seu aparelho*, as três fotos que vão ao serviço
externo. Todo aluno que já tinha autorizado é perguntado de novo antes do
próximo scan — `hasCollectionConsent` devolve `false` quando a versão não bate,
e o reconsentimento acontece sozinho.

**Sobre o sinal derivado.** O briefing não é tratamento novo: agrega dado que o
especialista vinculado já pode ler, para a mesma finalidade — acompanhar o
aluno. O que o mantém dentro da minimização é o **recorte**: lê
`student_anamnesis.completed_at` e nunca `responses`; lê a data da última sessão
e nunca carga, repetição ou intensidade. O que chega à tela é "não treina há 12
dias", jamais o treino. Verificado por teste
(`web/src/modules/briefing/__tests__/briefingService.test.ts`).

O sinal também não vai para log: `"João Silva não treina há 5 dias"` é
inferência sobre saúde de titular identificado.

**Regra do consentimento (Art. 8°):** Quando usamos consentimento como base, ele precisa ser:
- **Livre**: o aluno não pode ser forçado a aceitar para usar o serviço principal
- **Informado**: explicar em linguagem simples o que será coletado e por quê
- **Inequívoco**: ação explícita (checkbox, botão confirmar) — nunca pré-marcado
- **Específico**: um consentimento por finalidade, não genérico
- **Demonstrável**: guardar registro de quando e como o consentimento foi dado
- **Revogável**: o usuário consegue revogar a qualquer momento

---

## 4. Os 10 princípios traduzidos em requisitos técnicos (Art. 6°)

### 4.1 Finalidade (Art. 6°, I)
> Dados usados apenas para o propósito declarado no momento da coleta.

**Requisitos:**
- [ ] Cada campo de formulário tem finalidade documentada
- [ ] Dados de saúde do aluno NÃO podem ser usados para fins de marketing
- [ ] Dados de treino NÃO podem ser compartilhados com terceiros sem nova base legal
- [ ] Não usar e-mail coletado para autenticação em campanhas sem consentimento separado

### 4.2 Adequação (Art. 6°, II)
> O uso real dos dados precisa combinar com o que foi informado.

**Requisitos:**
- [ ] O que a política de privacidade diz precisa refletir o que o código faz
- [ ] Se mudar a finalidade de uso de um dado, exige nova comunicação ao titular

### 4.3 Necessidade (Art. 6°, III)
> Coletar o mínimo necessário. Critério: "este dado é essencial para o serviço funcionar?"

**Requisitos:**
- [ ] Formulários de cadastro: apenas nome e e-mail são obrigatórios
- [ ] Foto de perfil é opcional — não bloquear uso sem ela
- [ ] Anamnese é opcional no onboarding — o sistema funciona sem ela
- [ ] Não adicionar campos a formulários sem justificativa de necessidade
- [ ] Antes de adicionar qualquer novo campo ao schema, perguntar: "o serviço deixa de funcionar sem isso?"

### 4.4 Livre Acesso (Art. 6°, IV)
> O titular tem direito de saber como seus dados estão sendo usados.

**Requisitos:**
- [ ] Tela "Meus Dados" acessível no app e no web (mobile + web)
- [ ] Usuário consegue ver todos os dados armazenados sobre ele
- [ ] Usuário consegue exportar seus dados (treinos, avaliações, anamnese)
- [ ] Mostrar com clareza: quais dados, para qual finalidade, por quanto tempo

### 4.5 Qualidade dos Dados (Art. 6°, V)
> Dados precisam estar corretos e o titular pode corrigi-los.

**Requisitos:**
- [ ] Tela de perfil com campos editáveis (nome, foto)
- [ ] Aluno pode atualizar anamnese quando as informações mudarem
- [ ] Especialista pode corrigir avaliação física com erro (mas não deletar histórico)

### 4.6 Transparência (Art. 6°, VI)
> Informações claras, precisas e facilmente acessíveis sobre o tratamento.

**Requisitos:**
- [ ] Política de Privacidade em linguagem acessível — não juridiquês
- [ ] Explicar na tela de cadastro quais dados são coletados e por quê
- [ ] No onboarding do aluno: informar que dados de saúde serão coletados e quem terá acesso
- [ ] Não usar frases genéricas como "para melhorar sua experiência" — ser específico

### 4.7 Segurança (Art. 6°, VII)
> Medidas técnicas para proteger contra acesso não autorizado.

**Requisitos obrigatórios:**
- [ ] **RLS ativo em todas as tabelas** — não existe tabela sem Row Level Security
- [ ] Supabase Auth para autenticação — senhas nunca armazenadas em texto claro
- [ ] HTTPS em todos os endpoints (garantido pelo Supabase + Vercel)
- [ ] Especialista só acessa dados de alunos com vínculo `active` em `student_specialists`
- [ ] Aluno só acessa seus próprios dados
- [ ] Admin não acessa dados de saúde de alunos sem necessidade
- [ ] Tokens de sessão não devem aparecer em logs
- [x] APIs públicas e de IA com limite durável no banco: `private.rate_limit_buckets`
  recebe somente HMAC da origem, não IP, e-mail, token, corpo ou dado de saúde;
  cliente não tem privilégio nem de schema/tabela nem da RPC, e as linhas expiram
  em no máximo 24 horas (`0060`, issue #322)
- [x] Fundação do logger do BFF: `web/src/lib/logger.ts` emite JSON técnico e
  redige por chave credencial, conteúdo e dado pessoal/sensível antes de escrever;
  `logger.test.ts` prova a ausência inclusive em objetos aninhados e erros. A
  migração dos logs legados de web/mobile continua pendente, portanto `OBS-01`
  permanece **não verificado** na matriz (`#322`)
- [x] Fundação de auditoria de segurança: `private.security_audit_events` recebe
  metadados mínimos de eventos de alto impacto sob legítimo interesse (Art. 7º,
  IX), sem corpo, credencial, nome, e-mail ou dado de saúde. A conta apagada
  desidentifica ator/titular por `ON DELETE SET NULL`; a retenção alvo é 365 dias
  e a função remove linhas vencidas a cada nova escrita (`0061`, issue #322)
- [x] Correlação técnica: o BFF gera ou reaproveita somente o `trace-id` W3C
  válido, devolve-o em `X-Request-Id` e o associa aos logs/eventos quando houver.
  São 32 caracteres hexadecimais aleatórios, sem IP, conta, URL ou conteúdo; segue
  a retenção do log/evento correspondente (`#322`)
- [x] Concessão, reconsentimento e revogação de `student_consents` geram evento
  append-only no banco com titular, finalidade e versão da política. O trigger
  roda na mesma transação sob RLS e nunca recebe respostas, métricas ou corpo de
  requisição; a evidência fica por 365 dias (`0063`, issue #322)
- [x] Concessão e encerramento de `student_specialists` geram evento append-only
  no banco com ator, titular e UUID opaco do vínculo. O trigger cobre app, RPC e
  BFF na própria transação, não duplica dados protegidos pelo vínculo e preserva
  a evidência por 365 dias (`0064`, issue #322)

**Requisitos recomendados (antes do lançamento):**
- [ ] MFA disponível para especialistas (Supabase suporta nativamente)
- [x] Rate limiting nas APIs de autenticação e IA (cadastro: 5/h por origem;
  IA: 20/min por origem; a política de borda/WAF continua necessária antes do lançamento)
- [ ] Alertas de acesso suspeito (muitas tentativas de login)
- [x] Limpeza diária e independente da trilha de auditoria: `pg_cron` executa
  `private.purge_expired_security_audit_events()` às 03:17 UTC; a migration falha
  se o módulo não estiver habilitado, e `verify-rls.sql` confere agenda e privilégios
  (`0062`, issue #322)

**Exportação em PDF do relatório (desde a `#312`).** O arquivo é gerado **no
aparelho** (`expo-print`) e entregue pela folha de compartilhar do sistema: nada
passa pelo servidor. Três regras, travadas por teste em
`app/src/modules/progress/services/__tests__/reportPdf.test.ts`:

- o PDF leva **só o que a tela mostra** — sem e-mail e sem identificador interno,
  porque ele sai do controle do app no instante em que é compartilhado;
- a tela **avisa antes de gerar** que o arquivo tem dados de saúde e que quem o
  receber poderá lê-lo;
- o arquivo temporário é **apagado** depois da folha fechar, compartilhado ou não.

### 4.8 Prevenção (Art. 6°, VIII)
> Adotar medidas para prevenir danos antes que aconteçam.

**Requisitos:**
- [ ] Nunca logar dados sensíveis em texto claro (peso, gordura, respostas de anamnese)
- [ ] Variáveis de ambiente nunca hardcoded no código
- [ ] Seeds de desenvolvimento não podem usar dados reais de usuários
- [ ] Ambientes dev/staging separados de produção (ver CLAUDE.md — pendente)
- [ ] Revisão de segurança antes de cada release (npm audit)

### 4.9 Não Discriminação (Art. 6°, IX)
> Proibido tratar dados para fins discriminatórios.

**Requisitos:**
- [ ] Dados de saúde do aluno (peso, composição corporal) não podem ser usados para filtros de acesso ou precificação
- [ ] Se o módulo de IA for implementado no futuro, garantir que não use dados sensíveis para classificações discriminatórias

### 4.10 Responsabilização e Prestação de Contas (Art. 6°, X)
> Não basta fazer o certo — é preciso provar que está fazendo o certo.

**Requisitos:**
- [ ] Manter este documento atualizado
- [ ] Logs de acesso a dados sensíveis preservados (não expostos, mas existentes para auditoria)
- [ ] Documentar decisões de schema que envolvam dados pessoais (já fazemos em `docs/schema/`)
- [ ] Política de Privacidade publicada antes do lançamento
- [ ] Definir responsável pelo contato com titulares (e-mail de privacidade/DPO)

---

## 5. Direitos dos titulares — como o sistema deve suportar

A LGPD garante direitos aos titulares que o sistema precisa implementar. Abaixo o mapeamento de onde cada direito se materializa no produto:

| Direito | Onde implementar | Status |
|---------|-----------------|--------|
| Acesso aos dados | Tela "Meus Dados" (mobile + web) | Pendente |
| Correção (Art. 18, III) | Perfil · anamnese (reabre o questionário) · adesão à refeição (alterna e substitui) · **feedback de sessão** (`perceived_exertion` e `notes`, no histórico do mobile — desde 2026-08-28) | **Coberto para o que o titular declarou**, e desde a `0056` isso inclui a **medida declarada** (`physical_assessments` com `measured_by = 'self'`, no histórico de medidas do mobile), corrigível mesmo depois de contratar um especialista. Fora: medida do evento — datas, séries, duração, calorias, `body_scans` e a avaliação **do especialista**. O remédio para medida inexata é medir de novo, não digitar outro número (Art. 6°, V). Desde a `0038` isso deixou de ser só política e virou schema: `body_scans` não tem política de UPDATE para nenhum papel do cliente, e a `verify-rls.sql` conta as linhas afetadas para provar. Pendente: tela "Meus Dados" reunindo os caminhos num lugar só |
| Exclusão (Art. 18, VI) | Por item: **observação da sessão** (apaga o texto, a sessão fica) · **análise corporal** (`body_scans`, apaga a análise) — desde 2026-08-28 · **medida declarada** (formulário da medida, sem exigir consentimento: quem revogou continua apagando) — desde a `0056`. **A nota do especialista não é apagável pelo titular**: é registro do profissional, e apagá-la reescreve o acompanhamento dele (mesma razão da imutabilidade da avaliação). Os caminhos do aluno são revogar o consentimento, que fecha o acesso do especialista, e excluir a conta, que elimina por cascata | **Parcial, por item.** A sessão de treino em si não é apagável: é execução de contrato (Art. 7°, V) e o inciso VI alcança o que foi tratado com consentimento. Pendente: fluxo "Excluir minha conta", que elimina tudo por `ON DELETE CASCADE` |
| Portabilidade | Exportar dados em JSON/PDF | Pendente |
| Revogação do consentimento | **Minhas autorizações** (perfil → `saude/autorizacoes`, mobile): cada finalidade com data e versão do aceite, e a retirada por finalidade, confirmada numa folha que diz o que para — desde 2026-09-15 (#308) | **Coberto no mobile.** A folha lista só o efeito real (relógio, anotação e FC da sessão, água, body scan e IA, acesso do especialista); treino e refeição continuam, e a trava `EFEITO INVENTADO NA RETIRADA` impede o texto de prometer o contrário. Pendente: o mesmo no web |
| Oposição ao tratamento | Configurações granulares de privacidade | Pendente |
| Informação | Política de Privacidade + onboarding | Pendente |
| Notificação de incidentes | Processo de comunicação definido | Pendente |

### Exclusão vs. Soft Delete

A LGPD distingue **eliminar** de **esconder**:

- **Soft delete** (`account_status = 'inactive'`): dado permanece no banco — **isso não é eliminação** para fins da LGPD
- **Eliminação real**: dado apagado ou anonimizado irreversivelmente

**Posição do Eleva Pro:**

Quando um usuário solicita exclusão da conta:
1. Dados de identificação (`email`, `full_name`, `avatar_url`) devem ser eliminados ou anonimizados
2. Dados de saúde (`physical_assessments`, `student_anamnesis`) devem ser eliminados
3. Histórico de treinos e dietas: decisão pendente — pode ser anonimizado para fins estatísticos (sem nome, sem e-mail, sem vínculo)
4. Dados financeiros e fiscais: podem ser mantidos por obrigação legal (prazo legal de guarda)

> Esta decisão precisa ser aprovada antes de implementar o fluxo de exclusão de conta.

---

## 6. Dados sensíveis de saúde — proteção reforçada (Art. 11)

O Eleva Pro é, na prática, uma plataforma de saúde. Dados de avaliação física e anamnese são **dados sensíveis** pela LGPD. Isso implica:

**No banco de dados:**
- RLS para dados de saúde deve ser mais restritivo: apenas o próprio aluno e especialistas com vínculo `active` acessam
- Especialistas desvinculados perdem acesso via RLS (não precisamos deletar os dados, o vínculo inativo já bloqueia)
- Especialistas diferentes não podem ver dados uns dos outros sobre o mesmo aluno

**No código:**
- Queries que retornam dados de saúde devem incluir verificação de vínculo ativo
- Nunca retornar dados de saúde em listagens genéricas
- Endpoints de saúde devem ter logs de acesso (quem acessou, quando)

**No produto:**
- Consentimento explícito antes de coletar a primeira avaliação física
- Consentimento explícito antes de coletar a anamnese
- O aluno deve conseguir ver quais especialistas têm acesso aos seus dados de saúde

### O que a revogação alcança — levantamento completo, 2026-09-04

Toda tabela em que o especialista alcança dado do aluno foi conferida contra o
banco. O critério é a **base legal**, não o vínculo.

| Base legal | Tabelas | Revogar o consentimento… | Migration |
|---|---|---|---|
| Art. 11 (tutela da saúde **+** consentimento) | `health_daily_metrics`, `meal_logs`, `physical_assessments`, `student_anamnesis`, `body_scans`, `workout_session_vitals`, `specialist_notes` | **fecha** o acesso do especialista | 0043, 0044, 0045, 0049, 0057 |
| Art. 11, só do titular | `hydration_daily` | não há acesso do especialista a fechar; **revogar interrompe a gravação**, que a política de INSERT e UPDATE recusa sem consentimento | 0052 |
| Art. 7°, V (execução de contrato) | `profiles`, `specialist_services`, `workout_sessions`, `workout_session_sets`, `workout_session_exercises`, `achievements`, `daily_goals`, `student_streaks`, `ranking_scores` | não alcança — o caminho é encerrar o vínculo | — |

A segunda linha é decisão, não omissão: revogar o consentimento de dados de
saúde não pode desligar a prescrição de treino nem apagar o aluno do painel.
São o serviço que ele contratou, e somar a checagem ali não tem ganho jurídico.

**A classificação é travada por teste.** A `verify-rls.sql` percorre as duas
listas e falha nos dois sentidos: tabela de Art. 11 cuja política de
especialista não consulta o consentimento (`REVOGAÇÃO SEM EFEITO`), e tabela de
execução de contrato que passou a consultá-lo (`SERVIÇO DESLIGADO POR
REVOGAÇÃO`). É a trava que alcança a tabela que ainda não existe — o defeito da
`0043` reaparece toda vez que alguém copia uma política sem saber qual copiar.
Mexer numa das listas é mexer nesta tabela; as duas mudam juntas.

**Pendência — `workout_sessions.notes`.** A tabela é mista: séries e datas são
execução de contrato, mas o campo aberto onde o aluno escreve sobre dor e
cirurgia é Art. 11 (§2.2, desde 2026-08-28). RLS decide por linha, não por
coluna, e fechar a tabela derrubaria o acompanhamento de desempenho junto. Hoje
a proteção existe e mora no cliente, em `notasSeConsentido`
(`app/src/modules/workout/services/consentimento.ts`) — mesma classe de lacuna
que a `0043` fechou. Resolver pede coluna gerada, view ou trigger: é decisão de
desenho, não de política.

---

### Acesso administrativo — o que o admin alcança e o que não alcança

Administrar a plataforma é aprovar conta, suspender conta e ver métrica de uso.
**Não inclui ler dado de saúde de ninguém.**

Nenhuma política de RLS concede acesso a `account_type = 'admin'` em
`physical_assessments`, `student_anamnesis`, `health_daily_metrics`,
`meal_logs`, `diet_plans`, `body_scans` ou `workout_sessions`. O admin alcança
`profiles` — que é o que o painel lista.

Isso não é afirmação de intenção: é verificado a cada execução de
`scripts/test-rls-isolation.mjs`, que cria um admin de verdade, semeia dado de
saúde para outro usuário e confere que a leitura volta vazia. Testado também no
sentido inverso — abrindo uma política para admin, o teste acusa e nomeia a
tabela.

As métricas de uso do painel foram reescritas para contar `workout_sessions`
por período, sem ler conteúdo: só `student_id` e data.


## 7. Retenção de dados — por quanto tempo guardar

A LGPD exige que dados sejam eliminados quando deixam de ser necessários (Art. 15).

| Dado | Tempo de retenção | Justificativa |
|------|------------------|---------------|
| Dados de perfil | Enquanto a conta estiver ativa | Necessário para o serviço |
| Avaliações físicas | Enquanto existir vínculo com especialista | Histórico clínico necessário ao especialista |
| Nota do especialista (`specialist_notes`) | Enquanto a conta do aluno existir | É o registro do acompanhamento, e some junto com a conta por `ON DELETE CASCADE`. A conta do especialista apagada deixa a nota sem autor (`SET NULL`) em vez de levar o histórico do aluno junto |
| Medida declarada (`measured_by = 'self'`) | Enquanto a conta estiver ativa, ou até o aluno apagar | É o acompanhamento do próprio Praticante e não depende de vínculo. Apagável por item pelo titular; `ON DELETE CASCADE` a partir de `profiles` elimina o resto junto com a conta |
| Anamnese | Enquanto a conta estiver ativa | Auto-relato do aluno |
| Histórico de treinos | Enquanto a conta estiver ativa | Histórico de evolução |
| FC média e tempo por zona das sessões (`workout_session_vitals`) | Enquanto a conta estiver ativa | Comparar esforço entre corridas é a finalidade, e ela precisa do histórico. Eliminada por cascade em dois saltos: a conta apaga a sessão, e a sessão apaga a FC |
| Traçado da corrida | **Não é retido** — existe só na memória da sessão | Não há o que reter: as coordenadas são descartadas quando a tela fecha (§2.3) |
| Histórico de dietas | Enquanto a conta estiver ativa | Histórico de evolução |
| Passos, calorias, sono e FC de repouso diários | Enquanto a conta estiver ativa | Comparação de longo prazo é a finalidade; `ON DELETE CASCADE` elimina junto com a conta |
| Água do dia (`hydration_daily`) | Enquanto a conta estiver ativa | A média da semana é a finalidade. Sem DELETE pelo app: a correção é gravar outro total (Art. 18, III), e a eliminação é o `ON DELETE CASCADE` a partir de `profiles` |
| Conversa com o coach de IA (`ai_chat_sessions`, `ai_chat_messages`) | Enquanto a conta do aluno estiver ativa | É o registro da prescrição assistida. `ON DELETE CASCADE` a partir de `profiles` elimina junto com a conta |
| Análise corporal por imagem (`body_scans`) | Enquanto a conta estiver ativa | A comparação entre escaneamentos é a finalidade, e ela precisa do histórico. **A imagem não é guardada** — as colunas de URL de foto foram removidas na `0026`, para que ninguém as preencha por engano — só o resultado derivado, que é a maior minimização possível para um dado biométrico (`ADR-0010`). **No aparelho, a foto também sai** (#316): as três fotos da câmera (`body-scan-<instante>.jpg` no cache) e a cópia reduzida que a análise grava em `ImageManipulator/` são apagadas assim que a análise é gravada, ao refazer e ao sair do fluxo sem analisar; na falha ficam só para o "Tentar de novo". Começar um scan varre o que sobrou de um scan interrompido, porque o store não é persistido e só o nome do arquivo ainda leva até a foto. Travas em `capturedPhotos.test.ts` e `assessmentStore.test.ts`. `ON DELETE CASCADE` a partir de `profiles` elimina junto com a conta |
| Pontos da semana (`ranking_scores`) | Enquanto a conta estiver ativa | O ranking lê só a semana corrente e a anterior; as outras ficam para o próprio aluno. `ON DELETE CASCADE` a partir de `profiles`, e o trigger não regrava o placar de uma conta que está sendo apagada (trava em `verify-rls.sql`) |
| Logs de autenticação | 90 dias | Segurança — detecção de acessos suspeitos |
| Dados após exclusão de conta | 0 dias (eliminar ou anonimizar) | Princípio da necessidade |

### Revogação de consentimento — `health_daily_metrics`

Revogar o consentimento de coleta de saúde **interrompe a coleta e fecha o
acesso do especialista**, e não apaga nada: o histórico já gravado continua
visível ao próprio aluno. Revogar não é exercer o direito de eliminação
(Art. 18, VI), que continua disponível separadamente.

> **`meal_logs` e `physical_assessments` seguiram na `0044`**, com uma diferença
> deliberada. Elas usam `private.health_consent_not_revoked`, que só nega diante
> de **revogação explícita**; `health_daily_metrics` usa
> `private.has_health_consent`, que exige consentimento presente e nega também
> na ausência de registro.
>
> A diferença não é descuido. Métrica diária só existe se houve consentimento —
> `healthSync.ts` recusa a escrita antes de gravar —, então ausência de registro
> e ausência de dado são a mesma coisa. Avaliação física e registro de refeição
> nascem por caminhos que nunca checaram consentimento: o especialista cria a
> avaliação presencialmente, o aluno registra a refeição. Existe acervo sem
> linha nenhuma em `student_consents`, e o helper estrito o apagaria do painel
> — inclusive a avaliação recém-tirada, que o próprio especialista não releria.
>
> Ausência de consentimento continua sendo problema real; o remédio dela é o
> portão de coleta no app, não retirar do profissional o histórico clínico do
> aluno que está na frente dele. **Para apertar depois**, troque o helper nas
> duas políticas — mas antes meça quantos alunos com vínculo ativo não têm linha
> em `student_consents`: é o número de painéis que ficariam vazios.
>
> A `0044` fecha também o **INSERT** de `physical_assessments`: coletar dado de
> saúde novo de quem revogou é o caso mais claro do Art. 11, e sem isso o
> especialista criaria avaliação que ninguém consegue reler.
>
> As duas metades — revogou some, sem registro permanece — são travadas na
> `verify-rls.sql`. Trocar um helper pelo outro é a falha provável deste
> desenho, e o teste acusa nos dois sentidos.

> **Corrigido na `0043`, em 2026-09-04.** Até essa migration este parágrafo
> afirmava que, revogado o consentimento, "o especialista perde o acesso pela
> RLS" — e não era verdade. Nenhuma política de `health_daily_metrics` consultava
> `student_consents`: a do especialista olhava só
> `student_specialists.status = 'active'`. A única checagem de consentimento
> morava no cliente, em `healthSync.ts`, onde alcança a escrita e nada mais.
> Quem revogava interrompia a coleta e seguia com o histórico inteiro visível ao
> especialista. Mesmo padrão que a auditoria de 2026-08-11 encontrou em
> `workout_sessions`: controle documentado que o banco não tem.
>
> A partir da `0043` o aluno tem **dois caminhos de saída, com escopos
> diferentes, e os dois são reais**:
>
> | Ação do aluno | O que o especialista perde |
> |---|---|
> | Revogar o consentimento de saúde | o dado de saúde coletado |
> | Encerrar o vínculo | tudo do aluno |
>
> O segundo já valia desde a `0015`. O primeiro passa a valer pela política
> `specialist_read_consented_health_metrics`, que soma
> `private.is_linked_specialist` a `private.has_health_consent`. Para o
> especialista ler dado de saúde o Art. 11 pede tutela da saúde (II, f) **e**
> consentimento (I) — caiu o consentimento, caiu a base.
>
> O helper **não compara `policy_version` de propósito**, e o cliente compara. As
> duas coisas respondem a perguntas diferentes: texto desatualizado é motivo para
> parar de coletar, não para retirar do profissional o que já foi coletado sob
> autorização válida. Comparar no banco faria toda subida de `POLICY_VERSION`
> esvaziar o painel de todos os especialistas até cada aluno reabrir o app.
>
> Ambos os caminhos, mais a permanência do histórico para o próprio aluno, são
> verificados por comportamento na `verify-rls.sql`, com prova negativa.

> Política de retenção detalhada deve ser definida e publicada na Política de Privacidade antes do lançamento.

---

## 8. Sanções — o que pode acontecer se descumprir (Art. 52)

A ANPD pode aplicar as seguintes sanções, em ordem crescente de gravidade:

1. **Advertência** — com prazo para correção
2. **Multa simples** — até 2% do faturamento, limitado a R$ 50 milhões por infração
3. **Multa diária** — enquanto a irregularidade persistir
4. **Publicização da infração** — dano à reputação
5. **Bloqueio dos dados** — operação paralisada até correção
6. **Suspensão do banco de dados** — até 6 meses
7. **Proibição de atividade** — medida extrema

**O que reduz a sanção:** boa-fé, resposta rápida ao incidente, cooperação com a ANPD, ter documentação e processo.

**O que agrava:** reincidência, omissão, não ter DPO/canal de contato, não avisar os titulares.

---

## 9. Checklist pré-lançamento

Itens obrigatórios antes de abrir para o público:

**Legal:**
- [ ] Política de Privacidade publicada e acessível sem login
- [ ] Termos de Uso publicados
- [ ] E-mail de contato para titulares exercerem seus direitos (ex: privacidade@meupersonal.com.br)
- [ ] Consentimento explícito para dados de saúde implementado no onboarding do aluno

**Técnico:**
- [ ] RLS ativo e testado em todas as tabelas com dados pessoais
- [ ] Nenhum dado sensível em logs de aplicação
- [ ] Fluxo de exclusão de conta implementado (eliminar ou anonimizar)
- [ ] Tela "Meus Dados" disponível no app e no web
- [ ] Campos editáveis de perfil funcionando

**Processo:**
- [ ] Processo definido para responder a solicitações de titulares (prazo: 15 dias úteis conforme LGPD)
- [ ] Processo definido para notificar titulares e ANPD em caso de incidente (prazo: 72 horas)
- [ ] Ambientes de dev/staging separados de produção (dados reais apenas em produção)

---

## 10. Impacto no schema — status por módulo

### Estado real da RLS — verificado em 2026-08-11

As tabelas abaixo registravam decisões de RLS como tomadas desde a revisão de
cada módulo. A auditoria de 2026-08-11 foi ao banco e encontrou **18 das 27
tabelas sem RLS nenhuma**: a decisão estava documentada, a migration nunca
existiu. Fotos corporais, anamneses, avaliações físicas e histórico de treino
eram legíveis por qualquer conta autenticada falando direto com o PostgREST —
falha do **controlador**, na definição da seção 1 deste documento.

Corrigido pelas migrations `0016`–`0020` (PRD
[rls-security-hardening](https://github.com/DanielLevi22/ElevaPro/issues/136)).

| Módulo | Tabelas | RLS | Migration |
|---|---|---|---|
| Auth / Students | `profiles`, `student_specialists`, `student_consents`, `student_link_codes` | ✅ | 0016 |
| Saúde | `student_anamnesis`, `physical_assessments`, `body_scans`, `workout_sessions`, `workout_session_exercises` | ✅ | 0017 |
| Prescrição e catálogo | `workouts`, `workout_exercises`, `training_periodizations`, `training_plans`, `exercises`, `specialist_services` | ✅ | 0018 |
| Gamificação | `achievements`, `daily_goals`, `student_streaks` | ✅ | 0019 |
| Ranking | `ranking_scores` | ✅ só leitura para o cliente | 0059 |
| Nutrição | `diet_plans`, `diet_meals`, `diet_meal_items`, `meal_logs`, `foods` | ✅ | 0013 |
| Saúde diária | `health_daily_metrics` | ✅ | 0015 |
| IA | `ai_chat_sessions`, `ai_chat_messages` | ✅ | 0003 |
| Treino (séries) | `workout_session_sets` | ✅ | 0011 + 0017 |

**O escalonamento que invalidava as políticas existentes.** `student_specialists`
aceitava INSERT de qualquer autenticado, e as políticas de `meal_logs`,
`health_daily_metrics` e dos planos de dieta consultam essa tabela para decidir
acesso. Inserir uma linha de vínculo concedia acesso *legitimamente* ao dado de
saúde de qualquer aluno. A tabela agora não tem política de INSERT nem de
DELETE: o vínculo só nasce pela função `public.link_student_by_code`, que tira o
especialista de `auth.uid()` no servidor em vez de aceitá-lo por parâmetro.

**Garantias verificadas por teste, não por leitura de migration.**
`scripts/test-rls-isolation.mjs` autentica dois alunos e dois especialistas
reais, semeia dado de saúde para os dois lados e afirma tabela a tabela quem
enxerga o quê — incluindo o especialista desvinculado perdendo acesso na mesma
consulta, sem job de limpeza. `scripts/check-rls.js` roda no pre-commit e no CI
e falha se uma tabela nova nascer sem RLS.

`health_daily_metrics` era a única tabela de saúde sem teste de **comportamento**
na `verify-rls.sql` — tinha só a checagem estrutural de que a RLS está ligada.
Coberta em 2026-09-04, antes das colunas da Onda 1 do relógio: isolamento por
vínculo nos dois sentidos, imutabilidade para o especialista, perda de acesso ao
desvincular e invisibilidade para o admin. Prova negativa registrada no parecer
que a originou. Um detalhe do caminho vale para quem escrever o próximo teste: o
`admin` semeado por `auth.users` nasce **rebaixado a `member`** pelo trigger da
`0040`, e sem a promoção explícita a asserção "o admin não lê" passa sem nunca
ter existido um admin.

**O que a RLS não cobre — 1: o Storage.** A RLS protege a linha; arquivo em
bucket precisa de política própria. O bucket `assessments`, para onde o mobile
envia as fotos de análise postural, **não existia** em ambiente nenhum até a
migration `0021`, que o cria privado e com política de dono + especialista
vinculado. **`body_scans` não tem bucket pendente:** as quatro colunas
`photo_*_url` saíram na `0026` e a imagem nunca é persistida — guarda-se só o
resultado derivado (`ADR-0018`, `ADR-0010`). Esta seção afirmou o contrário até
2026-08-29, contradizendo a seção 7 do próprio documento.

**O que a RLS não cobre — 2: as rotas com `service_role`.** As rotas do BFF em
`web/src/app/api/` usam a chave de serviço, que ignora RLS por definição. Ali a
única barreira é a checagem do próprio código. Em 2026-08-11, duas rotas de IA
recebiam o `studentId` pela URL e não checavam vínculo: um token de aluno
qualquer obtinha `HTTP 200` e a anamnese de qualquer outro aluno no contexto do
modelo. Fechado pelo PRD
[api-security-hardening](https://github.com/DanielLevi22/ElevaPro/issues/126), com helper único
(`web/src/lib/api-auth.ts`), guarda no CI e teste com quatro usuários reais.

---

### Módulo Auth ✅ Revisado

| Decisão | Princípio atendido |
|---------|-------------------|
| `birth_date` e `gender` fora de `profiles` | Necessidade |
| `is_super_admin` removido | Necessidade |
| `account_status = 'inactive'` em vez de DELETE | Preservação de integridade referencial |
| `avatar_url` opcional | Necessidade — personalização, não essencial |

**Decisões tomadas nesta revisão:**

| Decisão | Impacto |
|---------|---------|
| Fluxo de exclusão: anonimizar `profiles` (não deletar) | Preserva integridade referencial com dados de outros módulos |
| Contas `invited` sem ativação: anonimizar após 90 dias | Princípio da Necessidade — dado sem finalidade ativa |
| RLS `profiles`: usuário vê apenas próprio registro | Segurança — implementar na migration |

---

### Módulo Students ⚠️ Revisado — nova tabela necessária

| Decisão já tomada | Princípio atendido |
|---------|-------------------|
| `specialist_id SET NULL` em `physical_assessments` | Preservação do histórico do aluno |
| `student_anamnesis UNIQUE(student_id)` | Evitar duplicação de dados sensíveis |
| RLS bloqueia especialistas desvinculados | Segurança |
| `student_link_codes expires_at` | Segurança — tempo de vida limitado |
| `physical_assessments` imutável (nunca UPDATE) | Qualidade dos dados — histórico preservado. Aplicado no código em 2026-08-28: `/api/students/[id]` fazia UPDATE pelo `service_role`, contornando a RLS que concede só INSERT; agora sempre insere nova avaliação. **Exceção registrada em 2026-08-29 (migration `0037`)**: a migration roda como owner e apagou as linhas sem altura ou peso antes de tornar as duas colunas `NOT NULL`. DELETE e não backfill — preencher uma medida que ninguém fez violaria o Art. 6º, V, que é o mesmo princípio que esta linha protege. Autorizado pelo mantenedor: ambiente de teste, sem nada em produção |

**Decisões tomadas nesta revisão:**

| Decisão | Impacto |
|---------|---------|
| Nova tabela `student_consents` | Rastreia consentimento explícito para dados de saúde — obrigatório Art. 11, I |
| Consentimento antes da primeira avaliação/anamnese | Fluxo de onboarding precisa de tela de consentimento |
| Revogação de consentimento: bloqueia novos registros via RLS, mantém existentes | Princípio da revogabilidade |
| Exclusão de conta do aluno: deletar `physical_assessments` e `student_anamnesis` | Eliminação real — soft delete não é suficiente aqui |
| Conteúdo de `student_anamnesis.responses` nunca logado em texto claro | Prevenção |

---

### Módulo Workouts ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| `workout_sessions.workout_id SET NULL` (não RESTRICT) | Dado do aluno preservado mesmo após deleção do treino pelo specialist |
| `workout_session_exercises.workout_exercise_id SET NULL` | Mesma garantia — sets_data jamais deletado por cascade do specialist |
| RLS bloqueia INSERT de sessões por specialists | Specialist não pode inserir histórico falso em nome do aluno |
| RLS bloqueia specialist após desvínculo | Specialist desvinculado perde acesso ao histórico de sessões do aluno |
| DELETE em `workout_sessions` fechado para todos os papéis do cliente — **desde a migration `0036` (2026-08-28)** | Histórico é imutável. **Até a `0036` esta linha descrevia um controle que o banco não tinha:** a `sessions_own` da `0017` era `FOR ALL`, o que inclui DELETE, e o aluno podia apagar a própria sessão. Verificado no banco em 2026-08-28. Agora são políticas por comando e não existe política de DELETE — provado em `scripts/verify-rls.sql` |
| UPDATE em `workout_sessions` restrito a `perceived_exertion` (antes `intensity`), `notes` e `feedback_edited_at` por privilégio de coluna (`0036`; a `0051` renomeou a coluna e o privilégio acompanhou) | Qualidade (Art. 6°, V) + Direito de correção (Art. 18, III): o titular corrige o que **declarou** e não reescreve o que **aconteceu**. Antes, a mesma `FOR ALL` deixava o aluno mudar a data de uma sessão ou transformar cardio em musculação, sem rastro. Privilégio e não trigger porque aparece em `information_schema.role_column_grants` — verificável por guarda |
| Correção carimba `feedback_edited_at`; a versão anterior **não** é guardada | Prestação de contas (Art. 6°, X) precisa do fato da correção, não do conteúdo antigo. Guardar a versão errada para sempre conserva exatamente o que o Art. 6°, V manda remover |
| O especialista nunca escreve em `workout_sessions` — só SELECT com vínculo ativo | Terceiro editando declaração alheia não é correção, é falsificação. Provado em `verify-rls.sql` |
| Erro da mutação de correção logado sem corpo | Prevenção (Art. 6°, VIII): o erro do PostgREST carrega o payload, e o payload aqui é `notes` |
| CASCADE DELETE em student_id de workout_sessions | Exclusão de conta do aluno elimina todo o histórico de sessões |
| Dados de performance não são dados sensíveis (Art. 5°, II) | Base legal: execução de contrato (Art. 7°, V) — sem necessidade de consentimento explícito |
| Briefing lê `workout_sessions.completed_at` e nada mais — nem carga, nem repetição, nem intensidade | Necessidade (Art. 6°, III): o sinal é "não treina há N dias", não o treino |
| `workout_sessions.notes` reclassificado como dado sensível (Art. 11) e separado da linha genérica de performance | Base legal adequada — é texto livre onde o aluno relata dor, tontura e cirurgia |
| `notes` guarda só o que o aluno digitou; duração e calorias do cardio em colunas próprias | Qualidade (Art. 6°, V) e direito de acesso: texto do titular e texto do sistema não podem ocupar o mesmo campo |
| O bloco recente do briefing atravessa a fronteira já resumido — nunca a linha de sessão | Necessidade + Segurança: dado de saúde cru não vai para o HTML da página |
| Erro de gravação de sessão logado sem corpo | Prevenção (Art. 6°, VIII): o erro do PostgREST pode carregar o payload, inclusive `notes` |
| Distância, ritmo e cadência em `workout_sessions`; FC média em `workout_session_vitals` (`0049`) | Base legal correta para cada dado (Art. 7°, V e Art. 11). A separação é o que permite a política de FC consultar consentimento sem que revogar desligue o acompanhamento de desempenho |
| A série de coordenadas do GPS não é persistida em tabela nenhuma | Necessidade (Art. 6°, III): distância e ritmo entregam a finalidade inteira, e o traçado acrescenta endereço de casa e janela de ausência. Travado por varredura de schema na `verify-rls.sql`, por nome **e** por tipo de coluna |
| As novas colunas de medida nascem sem GRANT de UPDATE | Qualidade (Art. 6°, V): distância e ritmo são o que o especialista usa para prescrever; editáveis pelo aluno, viram o número que ele gostaria de ter feito. A guarda da `0036` afirma a lista exata e falha se alguém conceder |
| `workout_session_vitals` sem política de UPDATE e sem política de DELETE, e com `REVOKE` explícito dos dois | Segurança (Art. 6°, VII) em camada dupla. A `0020` concede UPDATE e DELETE por *default privileges* a **toda tabela nova**: sem o REVOKE, só a ausência de política seguraria — que é exatamente a proteção que a `0017` achou que tinha e não tinha |
| Permissão de localização em background removida do app (`#278`) | Finalidade e Necessidade (Art. 6°, I e III). **Até aqui esta era uma violação viva:** a tela pedia `ACCESS_BACKGROUND_LOCATION` e ligava o rastreamento sem nenhuma tarefa registrada no app — o sistema concedia a permissão mais invasiva que existe e nenhuma coordenada era recebida nem usada. Coleta sem finalidade, e motivo de rejeição na Play Store. O rastreio passou a serviço de primeiro plano iniciado pelo aluno |
| Portão de consentimento na gravação da FC, além da RLS na leitura | Art. 11, I nas duas pontas. A RLS impede o **especialista de ler**; `batimentoSeConsentido` impede o app de **gravar**. A primeira sozinha deixaria o dado de quem já disse não entrar no banco e apenas deixar de ser exibido |

> **Revisão de 2026-08-28 — `session-feedback-correction`.** A lição da abertura
> desta seção valeu de novo, na mesma tabela: **decisão documentada não é
> controle implementado.** A linha "DELETE proibido via RLS em sessions" existia
> desde a revisão do módulo e o banco concedia DELETE ao aluno — a `sessions_own`
> da `0017` era `FOR ALL`, e `FOR ALL` inclui UPDATE e DELETE. Ninguém decidiu
> conceder; ninguém percebeu que estava concedido.
>
> Duas coisas mudaram para que isto não volte por baixo. A primeira: o controle
> passou a ser **verificável por guarda** — privilégio de coluna aparece em
> `information_schema.role_column_grants`, e a ausência de política de DELETE
> aparece em `pg_policies`. A auditoria de 2026-08-11 teria encontrado o furo
> sozinha se o controle tivesse essa forma. A segunda: `scripts/verify-rls.sql`
> passou a **afirmar as quatro proibições contra o banco**, com prova negativa
> feita — o estado pré-`0036` foi restaurado numa transação e a guarda falhou,
> como tem de falhar.
>
> E o direito que faltava passou a existir: o Art. 18, III não tinha caminho
> nenhum para o feedback de sessão. O aluno apertava "Salvar e Finalizar" e o
> texto ficava como estava para sempre. Ficou grave quando o especialista passou
> a ler `notes` no feed de atividades — quem escreveu "senti dor no ombro
> direito" quando era o esquerdo não tinha como consertar antes de a prescrição
> ser ajustada para o lado errado.


> **Revisão de 2026-08-28 — `student-activity-feed`.** O módulo passou a ser lido
> pela primeira vez: até aqui o app coletava RPE e observação a cada sessão e
> nenhuma query do web tocava as duas colunas. Coletar sem usar é violação de
> finalidade pelo avesso (Art. 6°, I), e a correção — exibir — foi o que obrigou
> a reclassificar `notes`. Expor o campo sob a base antiga, de execução de
> contrato, seria a infração grave.

> **Revisão de 2026-08-11 — reprovou em RLS.** As decisões acima falavam em "RLS
> bloqueia" desde a revisão do módulo, mas a auditoria foi ao banco e encontrou
> `workout_sessions` e `workout_session_exercises` **sem RLS nenhuma**. Corrigido
> na migration `0017`. O caso está registrado na abertura da seção 10: decisão
> documentada não é controle implementado.


> **Revisão de 2026-09-06 — `#278`, a corrida vira medida.** Duas coisas
> merecem registro. A primeira: a feature nasceu de um pedido para replicar a
> tela de corrida de um relógio comercial, mapa incluído, e o mapa **não** foi
> feito. O parecer reprovou o traçado na necessidade, o produto aceitou, e o
> que entrou foi a medida. Vale anotar porque é o caso raro em que a decisão de
> LGPD foi tomada antes de o dado existir, e não depois de uma auditoria achar
> a coluna cheia.
>
> A segunda: a revisão encontrou uma coleta **já em produção** sem finalidade
> nenhuma — permissão de localização em background pedida, concedida e nunca
> usada, porque a tarefa que receberia as posições nunca foi registrada. Ela
> não veio da feature nova; estava lá havia meses, invisível para todas as
> guardas, porque nenhuma delas olha para permissão declarada. É a mesma classe
> do que a auditoria de 2026-08-11 encontrou, com o sinal trocado: lá o
> documento prometia um controle que o banco não tinha, aqui o app pedia uma
> autorização que o código não usava.

---

### Módulo Nutrition ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| RLS habilitado em `diet_plans`, `diet_meals`, `diet_meal_items`, `meal_logs`, `foods` (migration 0013) | Segurança (Art. 6°, VII) |
| Especialista só acessa `meal_logs` de alunos com vínculo `active` em `student_specialists` | Segurança — especialista desvinculado perde acesso |
| Especialista não pode inserir `meal_logs` em nome do aluno (RLS: FOR SELECT only) | Integridade — histórico pertence ao aluno |
| Member cria `diet_plans` com `specialist_id IS NULL` — dados protegidos por `student_id = auth.uid()` | Segurança |
| Consentimento explícito obrigatório antes do primeiro INSERT em `diet_plans` por member (`student_consents`, tipo `health_data_collection`) | Base legal Art. 11, I |
| `meal_logs.actual_items` (JSONB com substituições) nunca deve ser logado em texto claro | Prevenção (Art. 6°, VIII) |
| `foods` públicos legíveis por todos os autenticados; customizados protegidos por `created_by = auth.uid()` | Necessidade + Segurança |
| `meal_logs.photo_url` e `meal_logs.notes` apagadas na `0035` — nenhuma das duas tinha caminho de escrita | Necessidade (Art. 6°, III): coluna que nunca é preenchida é convite, não neutralidade |
| Item extra de `actual_items` leva só os campos do alimento que a soma usa — sem `created_by` nem datas do catálogo — e sempre a `origem` (issue #298) | Necessidade (Art. 6°, III) + Qualidade (Art. 6°, V) |
| O prato do scan entra em `actual_items` **um item por componente**, nas gramas que o aluno ajustou e com a origem `scan`; a sugestão aceita do assistente, um item por alimento com a origem `assistente`. O especialista lê "Quinoa 80 g" estimado pela foto, e não um prato opaco. Componente incompleto na resposta do modelo derruba a lista inteira, e o prato entra pelo total (issue #298) | Qualidade (Art. 6°, V) |
| O registro do item extra lê o `meal_logs` do dia no banco, e não o que a tela tem em memória: juntar com o dia errado apagaria a troca de outro dia | Qualidade (Art. 6°, V) |
| `hydration_daily` (`0052`): RLS só do titular, `TO authenticated`, INSERT e UPDATE com `private.has_health_consent`, sem DELETE (mais restrito que o parecer, que previa o DELETE do próprio: a correção é outro total e a eliminação é o CASCADE), sem `anon`, CHECK de 0 a 10.000 ml. Travado na `verify-rls.sql` por comportamento, com prova negativa (política sem consentimento e leitura de especialista, as duas acusadas) | Segurança (Art. 6°, VII) + Base legal Art. 11, I |
| `diet_meals.prep_minutes`, `difficulty` e `servings` (`0053`) são metadado de receita, e não dado sobre o titular — ficam sob a RLS da `0013` | Necessidade |
| `diet_plans.notes` passa a aparecer ao aluno ("Do seu especialista"). É dado dele, ainda que escrito por terceiro, como `admin_notes`. A nota nasce da proposta de dieta do assistente, e o cartão da proposta avisa o especialista, antes de aprovar, de que o aluno lê a observação — o web não tem campo de nota no editor do plano | Livre acesso (Art. 18, II) + Transparência (Art. 6°, VI) |

> **Revisão de 2026-08-28 — `student-activity-feed`.** As duas colunas foram
> achadas ao mapear o que o feed de atividades poderia exibir: `photo_url` não
> tinha bucket em migration nenhuma, e `notes` não tinha tela nem serviço que a
> gravasse. O feed mostra refeição como evento — `completed` e `logged_date` —,
> sem texto e sem imagem.

**Decisões pendentes de implementação:**

| Item | Ação necessária |
|------|----------------|
| ~~Consentimento no app mobile antes de `toggleMealCompletion` e `substituteFood`~~ | **Coberto em 2026-08-28.** O gate deixou de ser por chamada e passou a ser de abertura: `HealthDataConsentGate` bloqueia o app do aluno enquanto `student_consents` não estiver na `POLICY_VERSION` corrente, então nenhum caminho de escrita de `meal_logs` é alcançável sem consentimento vigente. Gate na porta cobre os caminhos que ainda não existem; verificação por chamada só cobre as duas que alguém lembrou de instrumentar |
| ~~NutriBotService e ScanFoodService (BFF API routes) sem verificação de consentimento~~ | ✅ Resolvido em 2026-09-05 — as duas passaram a usar `authorizeStudentWithHealthConsent` |

---

### Módulo Gamification ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| `phone` removido do tipo `LeaderboardEntry` e de todas as queries do leaderboard | Necessidade (Art. 6°, III) — telefone não é necessário para ranking |
| Botão WhatsApp removido da tela de ranking (não existe base legal para exposição de telefone no leaderboard) | Finalidade (Art. 6°, I) |
| Leaderboard global expõe apenas o primeiro nome, a inicial do sobrenome e a pontuação — sem foto e sem contato (#320) | Necessidade + Finalidade |
| Ranking global é **opt-in** com reciprocidade: só aparece e só vê quem consentiu (`consent_type = 'ranking'`, #320) | Consentimento (Art. 7°, I) |
| `daily_goals`, `student_streaks`, `achievements`: base legal Execução de Contrato (Art. 7°, V) | Base legal documentada |

**Decisões pendentes de implementação:**

| Item | Ação necessária |
|------|----------------|
| ~~RLS nas tabelas de gamificação (`daily_goals`, `student_streaks`, `achievements`)~~ | ✅ Feito na migration `0019` — aluno lê e escreve o próprio; especialista com vínculo `active` só lê |
| ~~`ranking_scores` não existe no schema Drizzle nem nas migrations~~ | ✅ Criada na `0059` (#320), com RLS de leitura, escrita só por trigger e travas em `verify-rls.sql` |
| ~~Leaderboard global mostra `full_name` de todos os alunos ranqueados~~ | ✅ Opt-in na `0058` (#320); a RPC abrevia o nome e não devolve foto |

---

### Student Web Dashboard ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| Consentimento explícito (`HealthDataConsentModal`) antes do primeiro `diet_plans` INSERT por member | Base legal Art. 11, I |
| Leitura de `workout_sessions` coberta pelo RLS existente do módulo Workouts | Segurança |
| Leitura de `student_specialists` + `profiles.full_name` coberta pelo RLS do módulo Students | Segurança |
| `ranking_scores` (leaderboard) não expõe dados de contato; a leitura com outros participantes sai só pela `get_leaderboard` (#320) | Necessidade |

**Itens pendentes de lançamento:**

| Item | Ação necessária |
|------|----------------|
| Módulo Nutrition (diet_plans) sem revisão LGPD no app mobile | Verificar consentimento antes de gravar `meal_logs` no mobile |
| Tela "Meus Dados" para o aluno ver e exportar seus dados | Pendente — obrigatório antes do lançamento (Art. 18) |
| Fluxo de exclusão de conta | Pendente — eliminar dados de saúde (`physical_assessments`, `student_anamnesis`, `meal_logs`) |

---

### Módulo AI BFF ⚠️ Revisado — pendências antes do lançamento

Rotas criadas em `web/src/app/api/ai/` que processam dados de saúde via terceiros (Anthropic Claude e Google Gemini).

| Rota | Dado transmitido | Destinatário | Sensível? | Base legal |
|------|-----------------|--------------|-----------|------------|
| `/api/ai/nutrition/chat/[studentId]` | Os mesmos campos do coach de treino: objetivo, experiência, **lesões**, **condições de saúde**, peso, altura, % gordura. **Sem o nome do titular** | Anthropic | ✅ Sim (Art. 11) | Consentimento explícito — verificado na rota |
| `/api/ai/chat/[studentId]` | Objetivo, experiência, frequência, dias, **lesões**, **condições de saúde**, peso, altura, % gordura, periodizações. **Sem o nome do titular** | Anthropic | ✅ Sim (Art. 11) | Consentimento explícito — verificado na rota desde 2026-08-12 |
| `/api/ai/body-scan` | Fotos corporais (base64, 3 imagens) + métricas estimadas | Anthropic | ✅ Sim (Art. 5°, II) | Consentimento explícito (Art. 11, I) — **verificado na rota**. A imagem não é persistida: guarda-se só o resultado |
| `/api/ai/nutrition/adherence` | `diet_logs` anonimizados + nome do plano | Anthropic | ✅ Sim | Consentimento explícito — **verificado na rota** desde 2026-09-05. Também passou de `authorizeUser` para conta de aluno: antes, qualquer autenticado pedia análise do log que enviasse |
| `/api/ai/student/coach/message` | Anamnese, peso, altura, % de gordura e plano do aluno | Anthropic | ✅ Sim (Art. 11) | Consentimento explícito — **verificado na rota** desde 2026-09-05 (`authorizeStudentWithHealthConsent`) |
| `/api/ai/student/coach/session` | Idem — abre a sessão do coach do aluno | Anthropic | ✅ Sim (Art. 11) | Consentimento explícito — **verificado na rota** desde 2026-09-05 |
| `/api/ai/student/nutribot` | Contexto nutricional do aluno e o histórico da conversa (só papel e texto). Volta com a resposta e, quando aplicável, a sugestão estruturada (`sugestao`: refeição e itens com gramas e macros), que **não volta ao provedor** no histórico | Anthropic | ✅ Sim | Consentimento explícito — **verificado na rota** desde 2026-09-05 |
| `/api/ai/student/scan-food` | Foto de alimento enviada pelo aluno — pelo scan ou anexada na conversa do assistente. Volta com o prato e os `components` (nome, gramas e macros de cada um). A imagem não é guardada, e na conversa **só o resultado em texto** entra no histórico | Anthropic | ⚠️ Imagem do titular | Consentimento explícito — **verificado na rota** desde 2026-09-05 |
| `/api/ai/student/sugestoes` | Só os quatro macros que faltam no dia e até 5 nomes de refeições favoritas (60 caracteres cada). Nenhum id, nome ou e-mail do aluno | Anthropic | ✅ Sim (derivado do plano) | Consentimento explícito — **verificado na rota** (`authorizeStudentWithHealthConsent`, issue #298) |
| `/api/ai/voice-command` | Removido — rota e serviço eliminados | — | — | — |
| `/api/ai/workout/negotiate` | Nível do aluno, objetivo, lista de exercícios | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/workout/batch` | Idem | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/nutrition/recipe` | Nome da refeição + ingredientes | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/nutrition/assistant` | Lista de compras categorizada. Para o preço estimado (`promptType: "price"`), só nome e quantidade de cada item — sem o id do Food | Anthropic | ❌ Não sensível | Execução de contrato |

**Decisões tomadas nesta revisão:**

| Decisão | Princípio atendido |
|---------|-------------------|
| `studentName` removido do prompt da rota `/nutrition/adherence` — IA não precisa do nome para analisar aderência | Necessidade (Art. 6°, III) |
| Nome do titular removido do prompt do coach do especialista — o modelo diz "o aluno" | Necessidade (Art. 6°, III) |
| `/api/ai/chat/[studentId]` só monta o contexto de saúde com `student_consents` vigente; sem consentimento o coach avisa e segue por estrutura | Base legal Art. 11, I |
| O contexto lê seis campos nomeados da anamnese, nunca `responses` inteiro | Necessidade (Art. 6°, III) |
| Erro do chat não expõe texto técnico ao usuário; o log registra a sessão, nunca o conteúdo do contexto | Prevenção (Art. 6°, VIII) |
| O coach de nutrição reusa o mesmo carregador de contexto, então herda a checagem de consentimento e a ausência do nome do titular — não existe um segundo caminho para o dado sair do banco | Base legal Art. 11, I + Necessidade |
| A IA não cria alimento no catálogo: `foods` é compartilhado entre todos os especialistas | Qualidade dos dados (Art. 6°, V) |
| Nenhum dado é persistido nas rotas BFF — processamento em memória e descartado | Necessidade + Segurança |
| Autenticação obrigatória (Bearer token validado via Supabase) antes de qualquer processamento | Segurança (Art. 6°, VII) |
| O consentimento é conferido num portão só, `authorizeStudentWithHealthConsent`, e não em cinco cópias. Cinco rotas ficaram abertas porque cada uma decidia sozinha: portão único é o que impede a sexta de nascer aberta. A consulta roda sob a identidade do titular, não com `service_role` | Base legal Art. 11, I + Segurança (Art. 6°, VII) |
| Falha ao consultar `student_consents` recusa com `503`, não libera. "Não consegui perguntar" não é "pode", e o código separa a falha de infraestrutura da recusa (`403 consent_required`), que pedem ações diferentes de quem lê | Prevenção (Art. 6°, VI) |
| Transmissão via HTTPS (Vercel → Anthropic/Google) | Segurança |
| O texto de consentimento `1.5` (issue #298) diz que a foto do prato, a pergunta ao assistente, o plano e o que falta de calorias e macros do dia vão a um serviço de IA externo, que a foto não é guardada e que o nome do aluno não vai junto. O scan e o assistente já transmitiam; o que faltava era o aluno saber antes de fotografar (Art. 9°) | Transparência (Art. 6°, VI) |
| O texto de consentimento `1.7` (issue #308) diz que a prontidão do dia é calculada do sono e da FC de repouso contra a média do próprio aluno e guardada. A nota é inferência sobre recuperação, finalidade que guardar a duração do sono não cobria (`0055`, ADR-0029). O texto do portão passa a listar também sono e FC de repouso, que estavam no consentimento desde a `1.3` e faltavam na lista | Transparência (Art. 6°, VI) |
| O texto de consentimento `1.6` (issue #304) diz que da corrida ficam guardados a FC média **e o tempo em cada zona de esforço**, que a idade da anamnese calcula as zonas, e que os batimentos um a um são lidos no aparelho e descartados. As zonas são dado de saúde novo guardado (`0054`) e a idade ganhou finalidade nova: não faltava autorização, faltava o aluno saber | Transparência (Art. 6°, VI) |
| A saudação do assistente de nutrição, que tem o primeiro nome do aluno, é montada no aparelho e **não entra no histórico enviado** à rota. Achado da revisão de código do PR 1 da #298 | Necessidade (Art. 6°, III) |
| A rota de sugestões monta a mensagem ao provedor **campo a campo** — os macros validados e os nomes das favoritas cortados — e nunca repassa o corpo do pedido. Travado em `rotasDeNutricaoDoAluno.test.ts`, que confere que nenhum id, nome ou e-mail do aluno chega ao provedor (issue #298) | Necessidade (Art. 6°, III) |
| As sugestões da busca e o preço da lista ficam **só no aparelho**: as sugestões até o dia virar, num registro por aluno que o dia novo sobrescreve; o preço só na memória da sessão do app. Nada disso vai ao banco | Necessidade (Art. 6°, III) |
| Dados de `diet_logs` enviados ao Claude não contêm identificadores do aluno (`student_id` nunca incluído no payload) | Necessidade |

**Pendências obrigatórias antes do lançamento:**

| Item | Ação necessária | Responsável |
|------|----------------|-------------|
| ~~Consentimento da tela de Body Scan deve mencionar envio de fotos a serviço de IA externo~~ | ✅ Resolvido — `BodyScanIntroduction.tsx` diz que a imagem vai para a Anthropic nos EUA e que nenhuma foto é guardada. A promessa de "método extremamente preciso" saiu (Art. 6°, VI) | — |
| Anthropic e Google devem ser listados como sub-processadores na Política de Privacidade | Atualizar política de privacidade | Legal |
| ~~Rota `/api/ai/body-scan` deve verificar `student_consents` antes de processar~~ | ✅ Resolvido — a rota checa `hasCollectionConsent` sob a identidade do titular antes de desserializar o corpo, e devolve `403 consent_required`. O app checa antes de ler a foto do aparelho e oferece o fluxo (`ADR-0010`) | — |
| ~~`loadStudentContext` manda a anamnese inteira (`select("*")`)~~ | ✅ Resolvido — `specialistContextLoader.ts` lê seis campos nomeados, e `check-column-refs.js` recusa `select("*")` em tabela sensível no pre-commit | — |
| ~~Rota `/api/ai/nutrition/adherence` deve verificar `student_consents` antes de processar~~ | ✅ Resolvido em 2026-09-05, junto das quatro rotas do aluno que tinham o mesmo buraco. `consentimentoNaSaida.test.ts` recusa rota nova que autentique o aluno sem checar consentimento, nomeando o arquivo e o artigo | — |
| ~~Verificar DPA Google (Gemini) para dado biométrico de voz~~ | Eliminado — voice command removido do escopo | — |

---

### Módulo Technique ⚠️ Revisado — pendências antes de alcançar aluno

Revisado em 2026-09-01. A Análise de Técnica lê a imagem do corpo continuamente
para contar repetições e julgar profundidade. **Nada é persistido:** nenhuma
tabela, nenhum campo, nenhum bucket, nenhum frame ou landmark saindo do
aparelho. O julgador é função pura em `shared/src/technique/`.

| Decisão | Princípio |
|---------|-----------|
| Nenhuma tabela, coluna ou bucket criado — a minimização é total, não parcial | Necessidade (Art. 6°, III) |
| A tela do app vive atrás de `__DEV__` e não tem rota nem card na Home: enquanto não houver caminho, nenhum aluno chega | Prevenção (Art. 6°, VIII) |
| O painel de calibração processa vídeo **no browser** e não o envia a lugar nenhum; o que sai é o boneco de palito | Necessidade + Segurança |
| A gravação guarda os 33 landmarks e não o recorte do agachamento — o que permite calibrar outro Critério sem regravar, em vez de acumular corpus de uso único | Necessidade (Art. 6°, III) |
| A voz fala só sobre o movimento — "fundo", "faltou" —, nunca inferência sobre a pessoa: o aparelho fala em voz alta numa academia | Segurança (Art. 6°, VII) |
| `@mediapipe/tasks-vision` fixado na mesma versão do AAR do Android, e o modelo vem da mesma URL — o limiar calibrado responde pelo runtime que julga | Qualidade dos dados (Art. 6°, V) |

**Pendências obrigatórias antes de a tela sair do `__DEV__`:**

| Item | Ação necessária | Responsável |
|------|----------------|-------------|
| `consent_type` `technique_analysis` (migration 0041) | Análise de Técnica é finalidade nova, e o Art. 8°, §4° exige consentimento específico por finalidade — resolvido com tipo próprio, não com versão nova do consentimento do Body scan. Travas em `app/src/modules/technique/__tests__/`: consentimento antes da câmera, nada atravessa para o Supabase, nada de corpo no log — as três com prova negativa feita em 2026-09-03 | Feito |
| `hasCollectionConsent` antes de a câmera abrir | No padrão de `aiBodyScan.ts` — hoje não existe checagem nenhuma, porque não existe aluno alcançando a tela | Dev |
| Tela de introdução | Equivalente ao `BodyScanIntroduction.tsx`: que a câmera analisa continuamente, que nada é gravado, que nada sai do aparelho. Sem prometer precisão (Art. 6°, VI) | Dev |
| Travas com prova negativa | `producao.test.ts` (a tela não é alcançável em produção), `consentimento.test.ts`, `fronteira.test.ts`, `log.test.ts` | Dev |
| Termo escrito entre os profissionais filmados na calibração, com prazo de retenção dos JSONs | Documento assinado, fora do código | Legal |

---

### Módulos pendentes de revisão LGPD

| Módulo | Status LGPD |
|--------|-------------|
| **Chat** | ⏳ Aguardando discussão do schema |
| **System** | ⏳ Aguardando discussão do schema |

> Regra: cada módulo passa por `/lgpd-check` antes de ser marcado como ✅ Aprovado.

---

*Fonte: Lei nº 13.709/2018 (LGPD). Material de referência: Faculdade de Tecnologia Rocketseat — Carlos Fábio Andrade.*
