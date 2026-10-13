# CHANGELOG · Reorganização ElevaPro (outubro 2026)

## Lote 1 · Fundações
- Movido: tokens/ → foundations/tokens/ (colors, typography, spacing, effects)
- Movido: guidelines/*.card.html (12) → foundations/guidelines/ (link para ../../styles.css)
- Movido: assets/ → foundations/assets/ (imagery ×4, illustrations ×1); caminhos atualizados em: ui_kits/mobile-app/home-glass.html, ui_kits/mobile-app/index.html, ui_kits/mobile-app/login.html, ui_kits/mobile-app/ranking-profile-glass.html, ui_kits/mobile-app/specialist-flow-glass.html, ui_kits/mobile-app/workout-flow-glass.html
- styles.css continua na raiz (exigência do painel do Design System) e agora só importa foundations/tokens/*.


## Lote 2 · Kit compartilhado (mobile/kit/)
- Criado mobile/kit/glass.css: tema escuro (:root/.th) e claro (.light), .phone, .glass, .tabbar, .statusbar, .homebar, .island, luz ambiente, pares escuro/claro (.kit-pair) e etiqueta de variante (.kit-variant).
- Criado mobile/kit/kit.jsx (escopo isolado, exporta no window): base onboarding/onb-kit.jsx + uso-diario/compare.jsx + variações dos fluxos (SectionTitle, Chip, Ring), TabBar real, KitTabBar (aceita as chaves antigas), TabBarEspecialista, ThemePair, VarianteAluno.
- Movido: ui_kits/mobile-app/hero-objects.js → mobile/kit/hero-objects.js.

## Lote 3 · Fluxos do Student (mobile/student/)
Em todos: link para kit/glass.css (linhas de CSS idênticas removidas do arquivo; o que é só do fluxo ficou), kit.jsx carregado, barra de abas trocada pela real (KitTabBar), cada tela em escuro e claro lado a lado (ThemePair), botão de alternar tema removido, @dsCard no grupo "Mobile · Student". CTA, rodapés e botão flutuante subiram 22 px por causa do "+" central.
- 00-login.html ← login.html
- 01-onboarding.html + 01-onboarding/ ← onboarding-flow-glass.html + onboarding/onb-screens-a/b.jsx
- 02-inicio.html ← home-glass.html (removidas as telas "Treino em andamento" e "Nutrição", que pertencem a 03 e 05)
- 03-treino.html ← workout-flow-glass.html
- 04-cardio.html ← cardio-flow-glass.html
- 05-nutricao.html ← nutrition-flow-glass.html
- 06-saude.html ← health-flow-glass.html (aba ativa: Saúde)
- 07-progresso.html ← metrics-flow-glass.html (aba ativa: Progresso)
- 08-avaliacao-ia.html ← bodyscan-flow-glass.html (aba ativa: Progresso)
- 09-ranking-perfil.html ← ranking-profile-glass.html

Barra de abas trocada (antiga com "Perfil" → real com "+"): 02-inicio, 03-treino, 04-cardio, 05-nutricao, 06-saude, 07-progresso, 08-avaliacao-ia, 09-ranking-perfil.

## Ajuste semântico
- 00-login.html: "label:"Coach IA"" → "label:"Assistente""
- 00-login.html: "Personal Trainer? <span" → "É especialista? <span"
- 00-login.html: "sub:"Personal trainer ou nutricionista"" → "sub:"Prescrevo treino e dieta""
- 00-login.html: "sub:"Treino com personal trainer dedicado"" → "sub:"Tenho um especialista e recebi convite""
- 00-login.html: "title:"Sou Membro", sub:"Crie seus próprios treinos e dietas"" → "title:"Sou Praticante", sub:"Treino sem especialista, com o Assistente""
- 00-login.html: "title:"Personal Training"" → "title:"Treino""
- 03-treino.html: "Daniel L. (origem do plano)" → "coach:aluno?"Prescrito por Daniel Levi":"Proposta do Assistente · aprovada por você""
- 03-treino.html: "Daniel L." → "{I("sparkles",13,"var(--ios-label3)")} Proposta do Assistente</span>"
- 03-treino.html: "Seu personal vê este feedback." → "{aluno?"Seu feedback vai para Daniel Levi.":"Seu feedback ajusta o seu plano."}"
- 03-treino.html: ">Coach IA<" → ">Assistente<"
- 03-treino.html: ""Nome do personal" (opção removida do card de compartilhar)" → ""
- 04-cardio.html: "Retomar sugestão" → "Retomar proposta"
- 04-cardio.html: ">Coach IA<" → ">Assistente<"
- 05-nutricao.html: "Sugestões do Coach IA" → "Propostas do Assistente"
- 05-nutricao.html: "Seu nutricionista vê a troca." → "{aluno?"Seu especialista vê a troca.":"A troca mantém sua meta do dia."}"
- 05-nutricao.html: ">NutriBot<" → ">Assistente<"
- 05-nutricao.html: "label="NutriBot"" → "label="Assistente""
- 05-nutricao.html: "Do seu nutricionista" → "<SectionTitle>{aluno?"Do seu especialista":"Resumo do Assistente"}</SectionTitle>"
- 06-saude.html: "O especialista vinculado a você — inclusive o que você escrever no feedback de fim de treino." → "{aluno?"Seu especialista vê estes dados, inclusive o que você escrever no feedback de fim de treino.":"Só você vê estes dados."}"
- 06-saude.html: "Seu personal vinculado vê esses dados." → "Só você vê estes dados."
- 06-saude.html: "Seu personal vinculado vê estes dados." → "Só você vê estes dados."
- 07-progresso.html: "Ciclo 2026 · Verão · com Daniel Levi" → "Ciclo 2026 · Verão · Proposta do Assistente"
- 07-progresso.html: ">Daniel Levi</div>" → ">Assistente</div>"
- 09-ranking-perfil.html: "Daniel Levi · Personal Trainer" → "{aluno?<GlassRow icon="user-round" color={LIME} title="Meu especialista" sub="Daniel Levi · Especialista" />:<GlassRow icon="sparkles" color={LIME} title="Meu plano" sub="Proposta do Assistente · aprovada por você" />}"
- 09-ranking-perfil.html: "Sugestão do Coach IA" → "Proposta do Assistente"
- 09-ranking-perfil.html: ">Avaliação IA<" → ">Avaliação com IA<"
- 09-ranking-perfil.html: "label="Avaliação IA"" → "label="Avaliação com IA""

### Variantes Aluno criadas
- 01-onboarding.html: Definir senha · Vínculo com o especialista · Anamnese por etapas (01-onboarding/aluno-convite.jsx) · Variante · Aluno
- 02-inicio.html: Início · Variante · Aluno
- 03-treino.html: Periodizações · Variante · Aluno
- 03-treino.html: Feedback da sessão · Variante · Aluno
- 05-nutricao.html: Substituir alimento · Variante · Aluno
- 05-nutricao.html: Aderência da semana · Variante · Aluno
- 06-saude.html: Consentimento · Variante · Aluno
- 09-ranking-perfil.html: Perfil · Variante · Aluno



## Lote 4 · Especialista, web, propostas e arquivo
- mobile/especialista/especialista.html ← specialist-flow-glass.html (kit, escuro e claro lado a lado; barra do Especialista mantida: Painel, Alunos, Treinos, Nutrição)
- web/dashboard.html ← ui_kits/web-dashboard/index.html (caminhos ajustados)
- mobile/student/propostas/ajuste-do-plano.html + ajuste-do-plano/ ← ajuste-plano-glass.html + ajuste/ (com a variante Aluno do ajuste da semana)
- mobile/student/propostas/uso-diario-nutricao.html ← uso-diario-nutricao-glass.html
- Juntado ao kit: onboarding/onb-kit.jsx e uso-diario/compare.jsx (agora em mobile/kit/kit.jsx)
- Arquivado: explorations/* → archive/explorations/ (as versões finais estão em web/dashboard.html, que já tem briefing, painel claro/escuro, alunos, periodizações e montagem de treino, e em 00-login: login-palettes)
- Arquivado: uploads/* → archive/uploads/; ui_kits/mobile-app/index.html (índice antigo) → archive/

### Ajuste semântico (lote 4)
- web/dashboard.html: "title: "AI Coach"" → "title: "Assistente""
- web/dashboard.html: "Peça ao Coach para montar a Fase 2" → "Peça ao Assistente para montar a Fase 2"
- propostas/ajuste-do-plano/aj-a.jsx: "a IA refaz o cardápio" → "o Assistente refaz o cardápio"
- propostas/uso-diario-nutricao.html: "Sugestões do Coach IA" → "Propostas do Assistente"
- propostas/uso-diario-nutricao.html: "Seu nutricionista vê a troca." → "A troca mantém sua meta do dia."
- propostas/uso-diario-nutricao.html: ">NutriBot<" → ">Assistente<"
- propostas/uso-diario-nutricao.html: "<SectionTitle>Do seu nutricionista</SectionTitle>" → "<SectionTitle>Resumo do Assistente</SectionTitle>"
- propostas/ajuste-do-plano: variante Aluno criada ("Seu especialista vai revisar sua semana", sem botão de aprovar)
- Assinatura (ponto 8): nenhum fluxo do Student nem as propostas mostram preço ou plano; nada a mudar.


## Lote 5 · Índice, limpeza e varredura
- Criado mobile/index.html: seções Student, Especialista, Web, Kit e Propostas em revisão, um cartão por fluxo com número de telas.
- Apagado: screenshots/ (20 capturas de conferência), ui_kits/ (vazio após as mudanças).

### Ajuste semântico (varredura final)
- student/00-login.html: "seu Personal Trainer" → "seu especialista"
- student/00-login.html: "Fale com seu personal" → "Fale com seu especialista"
- student/06-saude.html: "Seu personal perde o acesso a estes dados" → só na variante Aluno: "Seu especialista perde o acesso a estes dados" (nova variante: Retirar autorização · Variante · Aluno)
- student/propostas/uso-diario-nutricao.html: "6. NutriBot" → "6. Assistente"
- student/01-onboarding/onb-screens-a.jsx: "nutricionista" → "especialista"

### Ajuste semântico (web/dashboard.html, revisão)
- web/dashboard.html: "label: "Coach IA"" → "label: "Assistente""
- web/dashboard.html: "label: "AI Coach"" → "label: "Assistente""
- web/dashboard.html: "Suas sessões de IA" → "Suas sessões com o Assistente"
- web/dashboard.html: ""sessões de IA"" → ""sessões com o Assistente""
- web/dashboard.html: "Dieta atualizada pelo Coach IA" → "Dieta atualizada com o Assistente"
- web/dashboard.html: "marginBottom: 20 }}>Coach IA</div>" → "marginBottom: 20 }}>Assistente</div>"
- web/dashboard.html: "· membro desde jun 2026" → "· aluno desde jun 2026"
- Mantido "Rascunho" como status de dieta do especialista (não é proposta do Assistente).

Pendente: conferência visual de cada fluxo (abrir sem erro, barra certa, escuro e claro).

## Uso diário · propostas restantes (mobile/student/propostas/)
- uso-diario-inicio.html: 3a Prontidão normal, 3b Prontidão baixa (aviso + versão leve), 4a folha da sequência semanal (nova; chip conta semanas ativas)
- uso-diario-treino.html: 3c Pré-início com faixa de Prontidão, 6a/6b Execução antes/depois do recorde (selo), 6c Descanso na tela bloqueada (nova), 6d Trocar exercício (folha nova), 7a Resumo com mapa muscular
- uso-diario-progresso.html: 7b Volume por grupo evoluído com o mapa muscular da semana
- Peças novas em propostas/uso-diario/pecas.jsx: ProntidaoAviso, SequenciaSheet, RecordeSelo, TelaBloqueada, TrocarSheet
