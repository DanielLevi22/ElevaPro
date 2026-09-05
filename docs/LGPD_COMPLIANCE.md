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
| Marca de correção do feedback | `workout_sessions.feedback_edited_at` | Execução de contrato (Art. 7°, V) | Carimbo de tempo, não conteúdo: informa ao especialista que a declaração do aluno foi corrigida e quando. Sem ele a correção seria indistinguível de o aluno ter escrito aquilo desde o começo. **Não guarda a versão anterior** — a versão errada é o dado inexato que o Art. 6°, V manda corrigir, e preservá-la contraria o próprio direito exercido |

### 2.2 Dados pessoais sensíveis (Art. 5°, II)

Dados referentes à saúde exigem **base legal específica** e proteção reforçada. O Eleva Pro trata dados de saúde — isso é o núcleo do produto.

| Dado | Tabela | Base legal | Finalidade |
|------|--------|------------|------------|
| Peso, altura | `physical_assessments` | Tutela da saúde (Art. 11, II, f) + Consentimento | Avaliação física, cálculo de composição corporal, e **Escala** que calibra o Body scan. Obrigatórios desde a `0037` |
| % gordura, massa muscular | `physical_assessments` | Tutela da saúde + Consentimento | Acompanhamento de evolução física |
| Dobras cutâneas (7 pontos) | `physical_assessments` | Tutela da saúde + Consentimento | Protocolo Jackson-Pollock para composição corporal |
| Circunferências corporais | `physical_assessments` | Tutela da saúde + Consentimento | Acompanhamento de medidas |
| Histórico de saúde (anamnese) | `student_anamnesis.responses` | Consentimento explícito (Art. 11, I) | Informar o especialista sobre limitações, lesões, medicamentos |
| Altura e peso declarados | `student_anamnesis.responses` (campos `height`, `weight`) | Tutela da saúde (Art. 11, II, f) + Consentimento | **Origem secundária da Escala**: calibram o Body scan quando não há avaliação física. Lidos por campo nomeado no banco, nunca `responses` inteiro |
| Origem da Escala | `body_scans.scale_source` | Tutela da saúde + Consentimento | Registrar se a altura que calibrou o scan foi medida com fita ou declarada pelo aluno — o especialista precisa saber se pondera ou confia no número |
| **Geometria medida no aparelho** — régua px/cm, larguras de silhueta, ângulos de assimetria e postura | `body_scans` (colunas do ADR-0022) | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Substituir a estimativa visual do modelo por medida reprodutível. A régua fica gravada porque sem ela não há como saber se dois escaneamentos são comparáveis — mesma razão de `framing_camera` |
| **Qualidade da captura** — contraluz, luminância, visibilidade mínima | `body_scans` (colunas do ADR-0022) | Mesma base do scan | Dizer ao especialista quanto confiar naquele número (Art. 6°, V). Guarda-se o **veredito**, nunca o histograma ou o recorte de imagem |
| **Imagem do corpo processada ao vivo no aparelho** | *não persiste em lugar nenhum* | Tutela da saúde + **Consentimento informado sobre o processamento local** | Posicionar o aluno e medir. É tratamento pelo Art. 5°, X mesmo sem armazenamento — e por isso precisa estar no texto de consentimento, o que exige `POLICY_VERSION` nova |
| **Imagem do corpo processada ao vivo durante o exercício** (Análise de Técnica) | *não persiste em lugar nenhum* | Tutela da saúde (Art. 11, II, f) + **Consentimento explícito** (Art. 11, I) | Contar repetições e julgar a profundidade do agachamento. Mesma doutrina do Body scan: não armazenar não é não tratar (Art. 5°, X). **Finalidade nova**, e por isso ganhou `consent_type` próprio (`technique_analysis`, migration 0041) em vez de entrar no do Body scan — ver a nota abaixo da Seção 3 |
| **Vídeo de calibração processado no browser** (painel `/admin/tecnica`) | *não persiste em lugar nenhum* — nem banco, nem bucket, nem disco | Consentimento explícito (Art. 11, I) dos dois profissionais filmados, por termo escrito | Calibrar o limiar do Critério. O vídeo morre ao fechar a aba; o que se exporta são os 33 landmarks por quadro — boneco de palito, sem imagem e sem rosto — como fixture versionada no repositório |
| Dados de treino executado (séries, cargas, datas, `intensity`) | `workout_sessions` | Execução de contrato | Acompanhamento de desempenho |
| **Observações do aluno sobre a própria sessão** | `workout_sessions.notes` | **Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I)** | Ajuste de prescrição a partir do que o aluno relata |
| Tipo, duração e calorias da sessão | `workout_sessions.session_type`, `.duration_seconds`, `.active_calories` | Execução de contrato | Distinguir cardio de musculação e medir a sessão |
| Plano alimentar (metas calóricas e macros) | `diet_plans` | Tutela da saúde + Consentimento (Art. 11, II, f + I) | Prescrição nutricional — especialista ou autogerenciado pelo member |
| Refeições e alimentos do plano | `diet_meals`, `diet_meal_items` | Tutela da saúde + Consentimento | Composição do plano alimentar |
| Registro de refeições realizadas e substituições | `meal_logs` | Tutela da saúde + Consentimento | Acompanhamento de aderência nutricional |
| Registro alimentar (campo legado) | `diet_logs` | Tutela da saúde + Consentimento | Acompanhamento nutricional |
| Passos por dia (agregado) | `health_daily_metrics.steps` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Acompanhamento de atividade entre sessões de treino |
| Calorias ativas por dia (agregado) | `health_daily_metrics.active_calories` | Tutela da saúde + Consentimento | Estimativa de gasto energético para ajuste do plano |

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
> escala de esforço (`intensity`, 1 a 10) continua como execução de contrato —
> é medida de carga, não relato clínico.
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
| Histórico de mensagens | Execução de contrato | Art. 7°, V |
| Member cria plano alimentar próprio (sem especialista) | Consentimento explícito | Art. 11, I |
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

**Requisitos recomendados (antes do lançamento):**
- [ ] MFA disponível para especialistas (Supabase suporta nativamente)
- [ ] Rate limiting nas APIs de autenticação
- [ ] Alertas de acesso suspeito (muitas tentativas de login)

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
| Correção (Art. 18, III) | Perfil · anamnese (reabre o questionário) · adesão à refeição (alterna e substitui) · **feedback de sessão** (`intensity` e `notes`, no histórico do mobile — desde 2026-08-28) | **Coberto para o que o titular declarou.** Fora: medida do evento — datas, séries, duração, calorias, `body_scans` e `physical_assessments`. O remédio para medida inexata é medir de novo, não digitar outro número (Art. 6°, V). Desde a `0038` isso deixou de ser só política e virou schema: `body_scans` não tem política de UPDATE para nenhum papel do cliente, e a `verify-rls.sql` conta as linhas afetadas para provar. Pendente: tela "Meus Dados" reunindo os caminhos num lugar só |
| Exclusão (Art. 18, VI) | Por item: **observação da sessão** (apaga o texto, a sessão fica) · **análise corporal** (`body_scans`, apaga a análise) — desde 2026-08-28 | **Parcial, por item.** A sessão de treino em si não é apagável: é execução de contrato (Art. 7°, V) e o inciso VI alcança o que foi tratado com consentimento. Pendente: fluxo "Excluir minha conta", que elimina tudo por `ON DELETE CASCADE` |
| Portabilidade | Exportar dados em JSON/PDF | Pendente |
| Revogação do consentimento | Tela de configurações de privacidade | Pendente |
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
| Anamnese | Enquanto a conta estiver ativa | Auto-relato do aluno |
| Histórico de treinos | Enquanto a conta estiver ativa | Histórico de evolução |
| Histórico de dietas | Enquanto a conta estiver ativa | Histórico de evolução |
| Passos e calorias diários | Enquanto a conta estiver ativa | Comparação de longo prazo é a finalidade; `ON DELETE CASCADE` elimina junto com a conta |
| Conversa com o coach de IA (`ai_chat_sessions`, `ai_chat_messages`) | Enquanto a conta do aluno estiver ativa | É o registro da prescrição assistida. `ON DELETE CASCADE` a partir de `profiles` elimina junto com a conta |
| Análise corporal por imagem (`body_scans`) | Enquanto a conta estiver ativa | A comparação entre escaneamentos é a finalidade, e ela precisa do histórico. **A imagem não é guardada** — as colunas de URL de foto foram removidas na `0026`, para que ninguém as preencha por engano — só o resultado derivado, que é a maior minimização possível para um dado biométrico (`ADR-0010`). `ON DELETE CASCADE` a partir de `profiles` elimina junto com a conta |
| Logs de autenticação | 90 dias | Segurança — detecção de acessos suspeitos |
| Dados após exclusão de conta | 0 dias (eliminar ou anonimizar) | Princípio da necessidade |

### Revogação de consentimento — `health_daily_metrics`

Revogar o consentimento de coleta de saúde **interrompe a coleta e fecha o
acesso do especialista**, e não apaga nada: o histórico já gravado continua
visível ao próprio aluno. Revogar não é exercer o direito de eliminação
(Art. 18, VI), que continua disponível separadamente.

> **`meal_logs` e `physical_assessments` ainda não fazem isso.** Este parágrafo
> as citava como tendo o mesmo comportamento; desde a `0043` elas divergem — as
> políticas delas não consultam `student_consents`, e revogar não retira o
> acesso do especialista àquelas tabelas. É a mesma lacuna que a `0043` fechou
> aqui, e vale a mesma leitura do Art. 11: a base do especialista é tutela da
> saúde **mais** consentimento. Fica registrado como pendência, sem migration
> ainda — o helper `private.has_health_consent` já existe e serve às duas.

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
| UPDATE em `workout_sessions` restrito a `intensity`, `notes` e `feedback_edited_at` por privilégio de coluna (`0036`) | Qualidade (Art. 6°, V) + Direito de correção (Art. 18, III): o titular corrige o que **declarou** e não reescreve o que **aconteceu**. Antes, a mesma `FOR ALL` deixava o aluno mudar a data de uma sessão ou transformar cardio em musculação, sem rastro. Privilégio e não trigger porque aparece em `information_schema.role_column_grants` — verificável por guarda |
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

> **Revisão de 2026-08-28 — `student-activity-feed`.** As duas colunas foram
> achadas ao mapear o que o feed de atividades poderia exibir: `photo_url` não
> tinha bucket em migration nenhuma, e `notes` não tinha tela nem serviço que a
> gravasse. O feed mostra refeição como evento — `completed` e `logged_date` —,
> sem texto e sem imagem.

**Decisões pendentes de implementação:**

| Item | Ação necessária |
|------|----------------|
| ~~Consentimento no app mobile antes de `toggleMealCompletion` e `substituteFood`~~ | **Coberto em 2026-08-28.** O gate deixou de ser por chamada e passou a ser de abertura: `HealthDataConsentGate` bloqueia o app do aluno enquanto `student_consents` não estiver na `POLICY_VERSION` corrente, então nenhum caminho de escrita de `meal_logs` é alcançável sem consentimento vigente. Gate na porta cobre os caminhos que ainda não existem; verificação por chamada só cobre as duas que alguém lembrou de instrumentar |
| NutriBotService e ScanFoodService (BFF API routes) sem verificação de consentimento | Adicionar middleware de consentimento nas routes `/api/ai/student/nutribot` e `/api/ai/student/scan-food` |

---

### Módulo Gamification ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| `phone` removido do tipo `LeaderboardEntry` e de todas as queries do leaderboard | Necessidade (Art. 6°, III) — telefone não é necessário para ranking |
| Botão WhatsApp removido da tela de ranking (não existe base legal para exposição de telefone no leaderboard) | Finalidade (Art. 6°, I) |
| Leaderboard global expõe apenas `full_name`, `avatar_url` e pontuação — sem dados de contato | Necessidade + Finalidade |
| `daily_goals`, `student_streaks`, `achievements`: base legal Execução de Contrato (Art. 7°, V) | Base legal documentada |

**Decisões pendentes de implementação:**

| Item | Ação necessária |
|------|----------------|
| ~~RLS nas tabelas de gamificação (`daily_goals`, `student_streaks`, `achievements`)~~ | ✅ Feito na migration `0019` — aluno lê e escreve o próprio; especialista com vínculo `active` só lê |
| `ranking_scores` não existe no schema Drizzle nem nas migrations | Criar tabela com RLS antes de usar o leaderboard em produção |
| Leaderboard global mostra `full_name` de todos os alunos ranqueados — verificar se há consentimento necessário para participação pública | Avaliar se `ranking_scores` deve ser opt-in (consentimento) ou opt-out |

---

### Student Web Dashboard ✅ Revisado

| Decisão tomada | Princípio atendido |
|---------------|-------------------|
| Consentimento explícito (`HealthDataConsentModal`) antes do primeiro `diet_plans` INSERT por member | Base legal Art. 11, I |
| Leitura de `workout_sessions` coberta pelo RLS existente do módulo Workouts | Segurança |
| Leitura de `student_specialists` + `profiles.full_name` coberta pelo RLS do módulo Students | Segurança |
| `ranking_scores` (leaderboard) não expõe dados de contato após remoção do `phone` | Necessidade |

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
| `/api/ai/nutrition/adherence` | `diet_logs` anonimizados + nome do plano | Anthropic | ✅ Sim | Consentimento explícito — **não verificado na rota** |
| `/api/ai/student/coach/message` | Anamnese, peso, altura, % de gordura e plano do aluno | Anthropic | ✅ Sim (Art. 11) | **Só autenticação** (`authorizeStudent`) — sem checagem de `student_consents` |
| `/api/ai/student/coach/session` | Idem — abre a sessão do coach do aluno | Anthropic | ✅ Sim (Art. 11) | **Só autenticação** — sem checagem de `student_consents` |
| `/api/ai/student/nutribot` | Contexto nutricional do aluno | Anthropic | ✅ Sim | **Só autenticação** — sem checagem de `student_consents` |
| `/api/ai/student/scan-food` | Foto de alimento enviada pelo aluno | Anthropic | ⚠️ Imagem do titular | **Só autenticação** — sem checagem de `student_consents` |
| `/api/ai/voice-command` | Removido — rota e serviço eliminados | — | — | — |
| `/api/ai/workout/negotiate` | Nível do aluno, objetivo, lista de exercícios | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/workout/batch` | Idem | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/nutrition/recipe` | Nome da refeição + ingredientes | Anthropic | ❌ Não sensível | Execução de contrato |
| `/api/ai/nutrition/assistant` | Lista de compras categorizada | Anthropic | ❌ Não sensível | Execução de contrato |

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
| Transmissão via HTTPS (Vercel → Anthropic/Google) | Segurança |
| Dados de `diet_logs` enviados ao Claude não contêm identificadores do aluno (`student_id` nunca incluído no payload) | Necessidade |

**Pendências obrigatórias antes do lançamento:**

| Item | Ação necessária | Responsável |
|------|----------------|-------------|
| ~~Consentimento da tela de Body Scan deve mencionar envio de fotos a serviço de IA externo~~ | ✅ Resolvido — `BodyScanIntroduction.tsx` diz que a imagem vai para a Anthropic nos EUA e que nenhuma foto é guardada. A promessa de "método extremamente preciso" saiu (Art. 6°, VI) | — |
| Anthropic e Google devem ser listados como sub-processadores na Política de Privacidade | Atualizar política de privacidade | Legal |
| ~~Rota `/api/ai/body-scan` deve verificar `student_consents` antes de processar~~ | ✅ Resolvido — a rota checa `hasCollectionConsent` sob a identidade do titular antes de desserializar o corpo, e devolve `403 consent_required`. O app checa antes de ler a foto do aparelho e oferece o fluxo (`ADR-0010`) | — |
| ~~`loadStudentContext` manda a anamnese inteira (`select("*")`)~~ | ✅ Resolvido — `specialistContextLoader.ts` lê seis campos nomeados, e `check-column-refs.js` recusa `select("*")` em tabela sensível no pre-commit | — |
| Rota `/api/ai/nutrition/adherence` deve verificar `student_consents` antes de processar | Idem | Dev |
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
