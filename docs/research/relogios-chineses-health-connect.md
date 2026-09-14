# Relógios de marcas chinesas no Health Connect e no HealthKit: o que cada ecossistema exporta

> Pesquisa feita em 14/09/2026 para decisões de produto do Eleva Pro. O app lerá dados de relógio **só** pelo Health Connect (Android) e pelo HealthKit (iOS), sem integrar marca nenhuma diretamente.
>
> Fontes primárias (sites e centrais de ajuda oficiais, fichas oficiais na Google Play e na App Store, políticas de privacidade dos apps, developer.android.com, developer.apple.com, bluetooth.com) aparecem como **[Pn]**. Fontes secundárias (imprensa, agregadores, integradores, fóruns) aparecem como **[Sn]** e nunca sustentam sozinhas um fato central. Onde nenhuma fonte primária confirma, está escrito **não confirmado**.
>
> A Zepp/Amazfit já foi pesquisada em [`zepp-coach.md`](zepp-coach.md), seção 4. Aqui só entra o que é novo sobre ela.
>
> Ressalvas de método:
> - Várias páginas (comunidades da Huawei e da OnePlus, suporte da Garmin, parte do suporte da Xiaomi) só renderizam com JavaScript. Quando um fato veio só do trecho que o buscador mostrou, isso está marcado como "trecho de busca".
> - Nenhuma marca chinesa publica, em fonte primária localizada, a **lista de tipos de registro** que escreve no Health Connect. Por isso a matriz tem muitos "?". Isso não quer dizer que o dado não vá: quer dizer que só o teste em aparelho responde (seção 6).

---

## 1. Resumo

1. **Só duas marcas chinesas estão na vitrine oficial do Google** "Funciona com o Health Connect" na Play Store do Brasil: **Mi Fitness (Xiaomi)** e **Zepp (Amazfit)**. Huawei, Honor, OPPO/OnePlus, realme e os apps de relógio barato não aparecem [P14].
2. **Xiaomi (Mi Fitness)** declara na ficha da Play Store a permissão "Health Connect: sincronizar seus dados de fitness e saúde para o Google Health Connect" [P16], e o site da Xiaomi diz que o Watch S4 "agora é compatível com o Health Connect" [P17]. **Quais tipos** vão (sessão de exercício, série de FC, VFC, VO₂ máx.): **não confirmado** em fonte primária.
3. **Huawei Health não escreve no Health Connect.** O app nem está na Google Play (só AppGallery) [P47][S7]. Nenhuma fonte primária mostra integração; fonte secundária afirma que não existe [S6]. No iPhone, a ficha oficial diz que sincroniza **treinos e peso** com o HealthKit [P25].
4. **Honor Health** e **OHealth (OPPO/OnePlus)**: indícios de escrita no Health Connect só em fontes secundárias ou em trecho de busca da comunidade oficial [S5][P34]. **Não confirmado** em fonte primária.
5. **Apps de relógio barato** (FitPro, Da Fit, GloryFit, FitCloudPro, Wearfit Pro, H Band, VeryFit) **não mencionam Health Connect** em nenhuma ficha ou política lida [P47]. No iOS, vários declaram escrita no HealthKit: GloryFit (passos, distância, energia ativa, sono, peso, FC) [P41], Haylou Fun (passos, energia ativa, altura, peso, FC) [P36], Da Fit, FitCloudPro e Wearfit Pro (genérico) [P43][P45][P46]. No Android, Haylou e GloryFit citam **Google Fit**, não Health Connect [P36][P41].
6. **Google Fit:** as APIs têm suporte **até o fim de 2026** e os cadastros de novos desenvolvedores fecharam em 01/05/2024 [P1]. O app Google Fit ainda copia os dados dele para o Health Connect [P15]. Quem hoje só escreve no Google Fit chega ao Health Connect por essa ponte, e **perde o caminho quando o Google Fit sair** [P1][S8].
7. **FC ao vivo por Bluetooth** tem confirmação oficial em **Huawei** (Watch e Band, "HR Data Broadcasts") [P27], **Xiaomi Smart Band 10** e **Watch S4 41mm** ("Share HR"/"HR broadcast") [P19][P21], e na **Amazfit Helio Strap**, que declara usar o protocolo Bluetooth padrão [P49]. Nenhuma dessas páginas da Huawei e da Xiaomi cita o perfil **Heart Rate Service 0x180D** pelo nome: o uso do perfil padrão é **não confirmado** para elas.
8. **Health Connect guarda a FC do treino em registro separado:** `ExerciseSessionRecord` é um intervalo e `HeartRateRecord` é uma série de amostras. Para achar a FC do treino, filtra-se `HeartRateRecord` pelo início e fim da sessão [P3]. A documentação **não define densidade** de amostras. Isso depende de quem escreve.
9. **HealthKit não conta ao app se a leitura foi negada**: `authorizationStatus(for:)` só vale para escrita, e sem permissão "simplesmente parece que não há dados" [P7][P8].
10. **Para o público de relógio barato**, o realista é `dailyActivity` e, com sorte, `sleepAndRestingHr`. `exerciseSessions`, `workoutHeartRate`, `hrv` e `vo2Max` não têm confirmação primária em nenhuma marca chinesa. No Android, a maioria dos apps baratos nem chega ao Health Connect.

---

## 2. Matriz mestra

**Legenda:** ✓ confirmado em fonte primária · ✗ fonte primária indica que não · ? não confirmado · ?ˢ só fonte secundária indica que sim · — não se aplica.
"Passos+cal." = passos e calorias ativas. "Sono" = sessão de sono (fases entre parênteses quando confirmadas). "FC BT" = transmissão de FC ao vivo por Bluetooth.

| Ecossistema (app) | Health Connect | HealthKit | Passos+cal. | Sono | FC repouso | Sessão de exercício | Série FC no exercício | VFC | VO₂ máx. | FC BT |
|---|---|---|---|---|---|---|---|---|---|---|
| **Xiaomi (Mi Fitness)** | ✓ [P14][P16][P17] | ✓ genérico, tipos à escolha do usuário [P18][P19] | ?ˢ [S2][S4] | ?ˢ fases [S2][S4] | ?ˢ [S2] | ?ˢ [S4] | ? | ? | ? (o relógio calcula [P19]) | ✓ Band 10, Watch S4 41mm [P19][P21] |
| **Xiaomi legado (Zepp Life)** | ? (só Google Fit citado [S13]) | ✓ genérico [P24] | ? | ? | ? | ? | ? | ? | ? | ? |
| **Amazfit (Zepp)** | ✓ [P14] + [`zepp-coach.md`](zepp-coach.md) | ✓ [zepp F30] | ?ˢ [zepp S3][zepp S4] | ?ˢ fases [zepp S4] | ?ˢ [zepp S4] | ?ˢ [zepp S3][zepp S4] | ? | HK: ✓ Balance 2 [zepp F23]; HC: ? | ? | ✓ Helio Strap, protocolo padrão [P49]; relógios: ? |
| **Huawei (Huawei Health)** | ✗ (fora da vitrine [P14]; sem fonte de integração) ?ˢ "não" [S6] | ✓ treinos e peso [P25][P26] | HK: ? · HC: ✗ | HK: ? | HK: ? | HK: ✓ [P25] | ? | ? | ? | ✓ "HR Data Broadcasts" [P27]; perfil 0x180D: ? |
| **Honor (Honor Health)** | ?ˢ [S5] | — (app só Android [S5]) | ?ˢ [S5] | ? | ? | ?ˢ [S5] | ? | ? | ? | ? |
| **OPPO / OnePlus (OHealth)** | ?ˢ [S3] + trecho de busca da comunidade oficial [P34] | ? | ?ˢ [S3] | ?ˢ [S3] | ? | ? | ? | ? | ? | ? |
| **realme (realme Link)** | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| **Haylou (Haylou Fun)** | ✗ (política cita só Google Fit, e só passos) [P36] | ✓ passos, energia ativa, altura, peso, FC [P36] | HK ✓ / GFit só passos [P36] | ✗ HK (não listado) [P36] | ? | ✗ (não listado) [P36] | ? | ✗ | ✗ | ? |
| **QCY** | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| **Mibro (Mibro Fit)** | ✗ (site cita Google Fit, não HC) [P39] | ✓ genérico, desde v1.5.12 (30/10/2024) [P38] | ? | ? | ? | ? | ? | ? | ? | ? |
| **Kospet (KOSPET FIT)** | ✓ (FAQ oficial, linha TANK) [P40] | ✓ [P40] | ? | ? | ? | ? | ? | ? | ? | ? |
| **Colmi (COLMI Fit / Da Fit)** | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| **FitPro** (D20, Y68…) | ? (nenhuma menção [P47]) | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| **Da Fit** | ? (nenhuma menção [P44][P47]) | ✓ genérico [P43] | ? | ? | ? | ? | ? | ? | ? | ? |
| **GloryFit** | ✗ (política cita Google Fit) [P41] | ✓ passos, distância, energia ativa, altura, sono, peso, FC [P41] | HK ✓ | HK ✓ (fases ?) | ? | ? | ? | ✗ (não listado) | ✗ (não listado) | ? |
| **FitCloudPro** | ? (nenhuma menção [P47]) | ✓ exercício e sono [P45] | ? | HK ✓ (fases ?) | ? | ? | ? | ? | ? | ? |
| **Wearfit Pro** | ? | ✓ "passos, peso etc." [P46] | HK ✓ passos | ? | ? | ? | ? | ? | ? | ? |
| **H Band / VeryFit** | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |

### Referência de comparação (não chinesas)

| Ecossistema | Health Connect | HealthKit | Sessão de exercício | Série FC no exercício | VFC | VO₂ máx. |
|---|---|---|---|---|---|---|
| **Samsung Health** | ✓ passos, exercício, FC, sono [P51] | — | ✓ [P51] | ? (relógio segue política de bateria [P51]) | ?ˢ não vai [S17] | ? |
| **Garmin Connect** | ✓ desde 2025 [P53] | ✓ [P52] | ✓ treino com FC, distância, calorias (trecho de busca) [P52] | ✓ "Heart Rate data" do treino (trecho de busca) [P52] | ✗ status de VFC não vai [S15] | ? |
| **Apple Watch** | — | ✓ nativo | ✓ `HKWorkout` [P9] | ✓ amostras associadas ao treino [P9] | ✓ SDNN automático [P10] | ✓ automático (Series 3+) [P11] |

---

## 3. Detalhe por ecossistema

### 3.1 Xiaomi — Mi Fitness (Xiaomi Watch, Redmi Watch, Xiaomi Smart Band 8/9/10)

**Health Connect**
- A ficha oficial na Google Play lista a permissão opcional **"Health Connect: Synchronize your fitness and health data to Google Health Connect"**. App com 50 mi+ downloads, atualizado em 11/09/2026 [P16].
- O Mi Fitness (`com.xiaomi.wearable`) está na coleção oficial "Funciona com o Health Connect" da Play Store, lida com `gl=BR` e `gl=US` [P14].
- A página oficial do **Xiaomi Watch S4 41mm** diz: "Now compatible with Health Connect and popular fitness apps like Suunto" [P17]. A página do S4 aponta o HyperOS 3 por OTA a partir do fim de setembro de 2025, mas não fica claro se a compatibilidade depende dessa atualização. **Não confirmado.**
- **Desde quando:** a imprensa relata que o Google anunciou no I/O 2025 que o Mi Fitness passaria a compartilhar com o Health Connect **a partir de junho de 2025** [S1]. Não localizei a nota primária do Google nem a nota de versão do Mi Fitness. **Versão mínima: não confirmada.**
- **Tipos escritos: não confirmado em fonte primária.** Integradores dizem que vão sono com fases (profundo, leve, REM, acordado), FC, FC de repouso, passos, energia ativa e peso [S2]. Dizem também que há atividades com início, fim e tipo, e FC em série ("hr_granular_data_array") [S4]. **Não confirmado:** se `ExerciseSessionRecord` vem com `HeartRateRecord` denso no intervalo, e se há `HeartRateVariabilityRmssdRecord`, `Vo2MaxRecord` ou `OxygenSaturationRecord`.
- **Atenção à contradição por aparelho:** a FAQ oficial do **Smart Band 9 Active** lista como "acesso de dados de terceiros" só **Google Fit e Strava** [P20]. A do **Smart Band 9** fala só em "Health" [P18]. Nenhuma das duas menciona Health Connect. Pode ser só texto desatualizado, já que a escrita no Health Connect é do app, não do relógio. **Não confirmado.**

**HealthKit**
- FAQ oficial (Band 9 e Band 10): Mi Fitness › Perfil › Dados de terceiros › ligar **[Health]** › "selecione os itens de dados que quer sincronizar". Depois, conferir no app Saúde › Apps › Mi Fitness [P18][P19]. **Tipos: não listados.**

**Google Fit**
- A FAQ do Band 9 Active mantém o vínculo com Google Fit [P20]. O Mi Fitness não depende dele para chegar ao Health Connect, porque escreve direto [P16].

**Latência / sincronização**
- Para qualquer sincronização com terceiros, a Xiaomi manda ligar **"Sync with the cloud"** antes [P18][P19][P20]. Isso sugere que a exportação passa pela conta/nuvem da Xiaomi, mas o caminho técnico **não é confirmado**.
- A FAQ do Band 10 diz que FC, sono, SpO₂ e demais dados "podem ser registrados sem conexão Bluetooth constante, mas é necessária conexão regular com o celular para sincronizar", e recomenda manter o Mi Fitness em segundo plano [P19]. Para o Apple Health: "aguarde um momento para aparecer" [P19]. **Latência exata: não confirmada.**

**FC por Bluetooth**
- **Smart Band 10** (e edições Glimmer/Ceramic): "Bluetooth HR broadcast: a pulseira transmite FC em tempo real via Bluetooth para outros dispositivos que suportam recepção de transmissão de FC". Caminho: lista de apps › Configurações › **Share HR** › Ligar [P19].
- **Watch S4 41mm**: "HR broadcast" aparece nas configurações de sistema [P21].
- Band 9 / Band 9 Active / Redmi Watch 5: não encontrei o recurso nas FAQs lidas [P20]. **Não confirmado.**
- Nenhuma página cita o perfil GATT 0x180D. **Não confirmado** que seja o perfil padrão.

**Métricas calculadas no relógio**
- O Band 10 calcula **VO₂ máx., carga de treino, tempo de recuperação e efeito de treino** [P19]. Não há fonte que mostre essas métricas saindo para Health Connect ou HealthKit.

**Restrições regionais**
- As páginas lidas são globais e do Reino Unido. A FAQ declara que alguns recursos variam por modelo e celular. A ficha brasileira da App Store tem itens pagos (mostradores e VIP) [P22]. Não encontrei restrição regional para o Health Connect. **Não confirmado.**

### 3.2 Xiaomi legado — Zepp Life (Mi Band 1–7)

- Ficha Play: 100 mi+ downloads, atualizado em 22/05/2026, sem menção a Health Connect ou Google Fit na descrição [P23].
- Ficha App Store: "This App version supports using Apple Healthkit within app" [P24]. **Tipos: não listados.**
- A integração com **Google Fit** e a ausência de escrita direta no Health Connect vêm só de fonte secundária [S13]. Se for assim, o Zepp Life chega ao Health Connect **só pela ponte do app Google Fit** [P15], que acaba com o Google Fit [P1][S8]. **Não confirmado em fonte primária.**
- Mi Band 7 Pro e posteriores usam o Mi Fitness [S13].

### 3.3 Amazfit — Zepp (complemento à pesquisa anterior)

O que já estava em [`zepp-coach.md`](zepp-coach.md) §4 continua valendo. O que há de novo:
- **Primária nova:** o Zepp (`com.huami.watch.hmwatchmanager`) aparece na coleção oficial "Funciona com o Health Connect" da Play Store no Brasil e nos EUA [P14].
- **Primária nova:** a **Helio Strap** transmite FC "usando o protocolo Bluetooth padrão" e conecta a "todos os dispositivos de terceiros que também usam o protocolo padrão", com ressalva de designs proprietários [P49]. Ativação: Zepp › Dispositivo › Helio Strap › Monitoramento de saúde › **Heart Rate Push** [P50].
- **Secundária:** Zepp 9.10.0 (ago/2025) passou a **ler** peso do Apple Health e do Health Connect [S9]. A Helio Strap 3.3.10.3 (out/2025) passou a enviar **VFC ao Apple Health**, sem menção a Health Connect [S10].
- **Continua não confirmado:** série de FC do treino, VFC e VO₂ máx. no Health Connect.

### 3.4 Huawei — Huawei Health (Huawei Watch, Watch Fit, Band)

**Health Connect: não há integração conhecida**
- O Huawei Health (`com.huawei.health`) **não está na Google Play**: a URL retorna "Not Found" [P47]. A imprensa registra a retirada e a distribuição pela **AppGallery** [S7].
- O app não aparece na coleção oficial do Health Connect [P14].
- Nenhuma fonte primária da Huawei menciona Health Connect: o suporte de sincronização fala só de nuvem [P29]. Fonte secundária afirma que o Huawei Health "não escreve no Health Connect" por ser do ecossistema HMS [S6]. Na comunidade oficial, usuários relatam que a antiga ligação com o Google Fit deixou de existir e recomendam o app de terceiros **Health Sync** como ponte (trecho de busca, sem resposta da Huawei localizada) [S14].
- **Conclusão prática:** para o Eleva Pro, dono de Huawei com Android é, hoje, **usuário sem dado de relógio**, a não ser que instale uma ponte de terceiro. O [**Health Kit** da Huawei](https://developer.huawei.com/consumer/en/hms/huaweihealth/) existe como API de nuvem e SDK (Android, iOS, Web) para ler dados autorizados pelo usuário [P28]. Seria integração direta de marca, fora do escopo desta decisão.

**HealthKit (iOS): sim, parcial**
- Ficha oficial na App Store (EUA e o novo "HUAWEI Health: Global"): "Synchronize with the weight data in healthkit" e "You can automatically synchronize the **exercise data** recorded in Huawei health to healthkit. Similarly, Huawei sports health can also obtain the exercise data from healthkit." [P25][P26].
- **Não confirmado** se passos diários, sono, FC contínua, FC de repouso, série de FC dentro do treino ou VFC vão ao HealthKit.

**FC por Bluetooth: sim**
- Página oficial "HR Data Broadcasts", aplicável a HUAWEI Band e HUAWEI Watch: "o dispositivo medirá sua FC continuamente. Você pode compartilhar sua FC com outros dispositivos que suportam esse recurso ou com apps de terceiros." Caminho: lista de apps › Configurações › HR Data Broadcasts. É possível iniciar um treino e manter a transmissão [P27]. A disponibilidade varia por modelo.
- A página não cita o perfil 0x180D. **Não confirmado** que seja o perfil padrão, embora o texto "apps de terceiros podem procurar e conectar" seja compatível com ele.

**Latência**
- A sincronização relógio → nuvem pede rede móvel ou Wi-Fi, com opção automática ou manual [P29]. Latência até o HealthKit: **não confirmada**.

**Restrições regionais**
- Health Kit declara atender "170+ países e regiões" [P28]. A distribuição no Android fora da Play Store vale para qualquer país (AppGallery) [S7].

### 3.5 Honor — Honor Health

- Ficha Play: 100 mi+ downloads, atualizado em 17/08/2026. A descrição não menciona Health Connect nem Google Fit. Uma avaliação de usuário de ago/2026 diz: "Does not synchronize with Google Fit" [P30].
- A central oficial da Honor diz que "se os dados forem sincronizados automaticamente com frequência demais, a bateria do celular acaba mais rápido, então os dados de saúde **precisam ser sincronizados manualmente** pelo HONOR Health" (puxar a tela para atualizar, reabrir o app ou reconectar o aparelho) [P31]. É um alerta forte de **latência**: o dado pode só chegar quando o usuário abre o app.
- **Health Connect:** só fonte secundária, a central de ajuda da Strove (nov/2025). Caminho: Honor Health › Configurações › Health Connect › Sync with Health Connect, com passos, treinos e FC. Exige conta Honor logada, e o app é só Android [S5]. **Não confirmado em fonte primária.**
- **HealthKit, FC por Bluetooth, tipos: não confirmados.**

### 3.6 OPPO / OnePlus — OHealth (HeyTap Health); realme — realme Link

**OHealth (OPPO Watch, OPPO Band, OnePlus Watch 2)**
- Ficha Play (`com.heytap.health.international`): 1 mi+ downloads, atualizado em 10/09/2026. A descrição não cita Health Connect [P32].
- Comunidade oficial da OnePlus, post "An update about the OHealth App issue" (só trecho de busca, página em JavaScript): "A última atualização do OHealth **migrou com sucesso para o Health Connect** e foi publicada na Google Play para usuários de todas as regiões". A causa foi uma falha de verificação com o Google Fit, citando a descontinuação das APIs do Fit [P34]. Autoria de funcionário: **não confirmada**. Data: **não confirmada**.
- Secundária: escreve passos, FC e sono no Health Connect, só ida, com `dataOrigin` `com.heytap.health.international` [S3].
- O app **OnePlus Health** antigo (`com.oneplus.health.international`) está parado desde 05/06/2025 [P33].
- O OnePlus Watch 3 é Wear OS e sai do escopo "chinês proprietário". **Não pesquisado.**

**realme Link**
- Ficha Play (`com.realme.link`): 10 mi+ downloads, atualizado em 09/09/2026, sem menção a Health Connect ou Google Fit. Uma avaliação reclama de falta de integração com Strava [P35].
- **Health Connect, HealthKit e FC por Bluetooth: não confirmados.** Há relatos de usuários sobre Google Fit na comunidade do Google (secundária, não lida por inteiro).

### 3.7 Haylou — Haylou Fun

A **política de privacidade oficial** é a fonte mais explícita entre as marcas baratas [P36]:
- **Android → Google Fit:** "alguns dos seus dados pessoais (**passos**) serão enviados automaticamente para sua conta Google Fit". Caminho: Meu › Configurações › Serviços de terceiros › Google Fit. **Não menciona Health Connect.**
- **iOS → HealthKit:** "passos, energia ativa, altura, peso, **frequência cardíaca**". Sono e treino não aparecem.
- "O app não recebe dados do Google Fit nem do HealthKit" (só escrita).
- A ficha da App Store repete "sincronizar passos e outros dados de saúde com o app Saúde" [P37]. Na Play: 5 mi+ downloads, atualizado em 09/09/2026 [P47].
- **Implicação:** no Android, o Haylou só chega ao Health Connect **pela ponte do app Google Fit** [P15], e só com passos. A ponte acaba com o Google Fit [P1].

### 3.8 QCY, Mibro, Kospet, Colmi

- **QCY:** não localizei política ou FAQ oficial com Health Connect, Google Fit ou HealthKit. O app QCY é compartilhado entre fones e relógios (secundária). **Tudo não confirmado.**
- **Mibro (Mibro Fit):**
  - Página oficial do Mibro FIT: "Sport Data Sharing: RQ (com GPS), **Google Fit (só Android)**, Strava (com GPS), Apple Health (só iOS)". Na FAQ: "sincroniza com Apple Health / Strava / Google Fit? Sim" [P39]. **Health Connect não aparece.**
  - Notas de versão na App Store: 1.5.12 (30/10/2024) "Supports integration with Apple Health" [P38].
- **Kospet (KOSPET FIT):** FAQ oficial: "os smartwatches KOSPET TANK se conectam a apps de terceiros pelo KOSPET FIT, que hoje suporta integração com **Strava, Apple Health e Health Connect**" [P40]. É a única marca barata com Health Connect em fonte primária. **Tipos: não listados.**
- **Colmi:** relógios Colmi usam **COLMI Fit** (Play: 100 mil+ downloads, atualizado em 08/09/2026) ou apps de terceiros, como Da Fit [P47]. Não localizei declaração oficial de integração. **Não confirmado.**

### 3.9 Apps genéricos de relógio barato

**Quais são os mais comuns no Brasil**
- Não localizei pesquisa de mercado primária por app. Indícios:
  - Na lista dos 20 smartwatches mais vendidos no Mercado Livre em 2025 (blog, secundária), o **"Relógio Smart D20"** genérico aparece em 5º e 13º. Os demais são Galaxy Fit3, Redmi Watch 5 Active/Lite, Smart Band 9 Active, Huawei Band 10, Apple Watch, Garmin e Amazfit T-Rex 3 [S11].
  - O D20 e o Y68 usam o app **FitPro** segundo manuais de vendedor e anúncios (secundárias) [S12].
- Pela Play Store, os de maior base são **FitPro** (100 mi+) e **Da Fit** (100 mi+). Depois vêm GloryFit, FitCloudPro, Wearfit Pro, H Band e VeryFitPro (10 mi+ cada) [P47]. Esses números são globais, não do Brasil.

| App (pacote) | Downloads Play / atualização | Health Connect | Google Fit | HealthKit | Fonte |
|---|---|---|---|---|---|
| **FitPro** (`cn.xiaofengkj.fitpro`) | 100 mi+ / 16/07/2026 | nenhuma menção | nenhuma menção | nenhuma menção na ficha iOS | [P47] |
| **Da Fit** (`com.crrepa.band.dafit`) | 100 mi+ / 27/08/2026 | nenhuma menção (nem na política) | nenhuma menção | "Optionally share supported wellness data with Apple Health" | [P43][P44][P47] |
| **GloryFit** (`com.yc.gloryfit`) | 10 mi+ / 07/09/2026 | nenhuma menção | citado na política (termos do Google Fit) | passos, distância, energia ativa, altura, sono, peso, FC | [P41][P42][P47] |
| **FitCloudPro** (`com.topstep.fitcloudpro`) | 10 mi+ / 04/07/2026 | nenhuma menção | nenhuma menção | "dados de exercício, sono e outros" | [P45][P47] |
| **Wearfit Pro** (`com.wakeup.howear`) | 10 mi+ / 05/09/2026 | nenhuma menção | nenhuma menção | "passos, peso etc."; avaliações dizem que não funciona | [P46][P47] |
| **H Band** (`com.veepoo.hband`) | 10 mi+ / 30/03/2026 | nenhuma menção | nenhuma menção | não verificado | [P47] |
| **VeryFitPro** (`com.veryfit2hr.second`) | 10 mi+ / 08/05/2026 | nenhuma menção | nenhuma menção | não verificado | [P47] |

- **Ausência de menção não prova ausência de integração.** Mas nenhum desses apps está na vitrine oficial do Health Connect [P14], e nenhum documento oficial lido cita o Health Connect.
- Latência e FC por Bluetooth: **não confirmados** para todos.

---

## 4. Health Connect e HealthKit: como os dados chegam

### 4.1 Health Connect (Android)

**Disponibilidade**
- No **Android 14+** o Health Connect faz parte do sistema. No **Android 13 e anteriores** é um APK da Play Store. O SDK suporta Android 8+, mas o app Health Connect só roda no Android 9+ [P6].
- Checar `HealthConnectClient.getSdkStatus()` e `getFeatureStatus()`, porque recursos do módulo de sistema (leitura em segundo plano, por exemplo) não existem no Android 13 e anteriores [P6].

**Representação dos tipos** [P2]

| Capacidade | Registro | Natureza | Permissão de leitura |
|---|---|---|---|
| Passos | `StepsRecord` | intervalo | `android.permission.health.READ_STEPS` |
| Calorias ativas | `ActiveCaloriesBurnedRecord` | intervalo | `READ_ACTIVE_CALORIES_BURNED` |
| Sessão de exercício | `ExerciseSessionRecord` (tipo, início, fim, voltas, segmentos) | intervalo | `READ_EXERCISE` |
| Rota do exercício | `ExerciseRoute` (lido à parte, com consentimento próprio) | — | `READ_EXERCISE_ROUTE` |
| FC | `HeartRateRecord` (lista de `samples`) | **série** | `READ_HEART_RATE` |
| FC de repouso | `RestingHeartRateRecord` | instantâneo | `READ_RESTING_HEART_RATE` |
| VFC | `HeartRateVariabilityRmssdRecord` (ms) | instantâneo | `READ_HEART_RATE_VARIABILITY` |
| VO₂ máx. | `Vo2MaxRecord` (ml/kg/min + `measurementMethod`) | instantâneo | `READ_VO2_MAX` |
| Sono | `SleepSessionRecord` (com `stages`) | intervalo | `READ_SLEEP` |
| SpO₂ | `OxygenSaturationRecord` | instantâneo | `READ_OXYGEN_SATURATION` |
| Peso | `WeightRecord` | instantâneo | `READ_WEIGHT` |
| Histórico > 30 dias | — | — | `READ_HEALTH_DATA_HISTORY` |
| Leitura em segundo plano | — | — | `READ_HEALTH_DATA_IN_BACKGROUND` |

Os nomes curtos da coluna de permissão têm o prefixo `android.permission.health.`.

**FC durante o exercício**
- A sessão e a FC são **registros separados, ligados só pelo tempo**. Documentação: "outros tipos de dado, como `HeartRateRecord` ou `SpeedRecord`, podem ser gravados durante uma sessão e associados a ela" e "para ler dados granulares (como FC) de uma sessão, use `startTime` e `endTime` da sessão para filtrar a requisição" [P3].
- **Consequências:**
  - (a) `READ_EXERCISE` sozinho não traz FC: é preciso `READ_HEART_RATE` também.
  - (b) A FC que cai no intervalo pode ser de **outra fonte** (outro app ou o próprio celular). Filtrar por `dataOriginFilter` com o pacote do app do relógio [P4].
  - (c) Se o app do relógio grava só a FC contínua de baixa frequência, o "treino" terá poucas amostras.
- **Densidade típica de amostras: a documentação oficial não define.** Depende do app que escreve. Nenhuma marca chinesa publica a sua. **Não confirmado**, e é o item principal do teste em aparelho.
- A Samsung, por exemplo, documenta que o celular grava "assim que o dado é criado", mas o relógio Galaxy segue política própria "por bateria" [P51].

**Limites de leitura**
- Por padrão, lê-se até **30 dias antes da primeira permissão concedida**. No Android 14+ esse limite vale para dados de outros apps. Para mais que isso, pedir `READ_HEALTH_DATA_HISTORY` [P4].
- Se o usuário desinstala e reinstala o app, o prazo conta de novo a partir da nova concessão [P4].
- **Changes API** (`getChangesToken` / `getChanges`) para sincronização incremental. Um token sem uso **expira em 30 dias** [P5].

**Status do Google Fit**
- **APIs:** "suportadas até o fim de 2026". Cadastro de novos desenvolvedores fechado desde 01/05/2024. A REST API não tem substituto direto. Os caminhos indicados são Health Connect, Recording API (passos no celular) e Google Health API (nuvem) [P1].
- **App Google Fit:** hoje ainda sincroniza com o Health Connect ("Sync Fit with Health Connect") [P15]. A imprensa relata que o **app** será substituído pelo Google Health, com migração de dados prometida para "mais tarde em 2026", sem data de desligamento [S8]. **Data exata: não confirmada em fonte primária.**
- **Efeito para apps chineses que só falam com Google Fit** (Haylou, GloryFit, Mibro, Zepp Life e possivelmente outros): o dado chega ao Health Connect **só se o usuário tiver o app Google Fit instalado e com a sincronização ligada** [P15]. Esse caminho deixa de existir com o fim das APIs [P1].

**Vitrine oficial**
- A coleção oficial da Play Store (`g.co/android/CompatibleWithHealthConnect` → `promotion_all__health_connect`), lida em 14/09/2026 [P14]:
  - **Brasil:** AllTrails, Cronometer, FatSecret, Fitbit/Google Health, Fitbod, Freeletics, **Garmin Connect**, **Zepp**, MyFitnessPal, Nike Training Club, Nike Run Club, ResMed myAir, Runbuddy, Adidas Running (Runtastic), **Samsung Health**, Lifesum, **Mi Fitness**, Home Workout, Relax Melodies e Flo.
  - **EUA:** acrescenta Dexcom G7, MyNetDiary, Peloton, Oura, WeightWatchers e Withings.
  - **Das marcas chinesas pedidas, só Mi Fitness e Zepp aparecem.** A imprensa já notou que a lista não é exaustiva: apps compatíveis ficam de fora [S16].

### 4.2 HealthKit (iOS)

**Leitura negada é invisível** (confirmado na documentação oficial)
- `authorizationStatus(for:)` "verifica o status de autorização para **salvar** dados" [P7].
- "Para ajudar a prevenir vazamento de informação de saúde sensível, seu app **não consegue determinar se o usuário concedeu permissão de leitura**. Se não recebeu permissão, simplesmente parece que não há dados do tipo pedido no HealthKit." [P7]
- Guia de autorização: se a leitura foi negada, as consultas "retornam só amostras que seu app salvou". O usuário também pode liberar só uma **janela recente** de dados. O app consegue descobrir a data mais antiga liberada, mas "não distingue acesso total de acesso negado". O acesso limitado é o **único estado identificável** [P8].
- **Consequência para o Eleva Pro:** no iOS, "sem dado" pode significar três coisas: relógio que não escreve, permissão negada ou janela limitada. O app não sabe qual. Liberar funcionalidade por dado presente é o único critério possível, e a tela precisa explicar isso ao usuário.

**Tipos relevantes**
- `HKWorkout` resume o treino (duração, distância, energia) e "atua como contêiner": amostras como energia e distância **precisam ser associadas** ao treino por quem grava [P9]. Um app chinês pode gravar FC como amostra solta, sem associar ao treino. Aí a FC do treino também se obtém filtrando por tempo. **Não confirmado** como cada marca faz.
- `heartRateVariabilitySDNN`: VFC em **SDNN**, não RMSSD. "O sistema grava automaticamente no Apple Watch" [P10]. O Health Connect usa RMSSD [P2]: as duas plataformas **não são comparáveis** sem conversão.
- `vo2Max`: gravado automaticamente pelo Apple Watch Series 3+ em caminhada/corrida ao ar livre. Terceiros podem gravar indicando o método de teste [P11].
- `restingHeartRate`: estimativa a partir de amostras sedentárias ao longo do dia [P12].
- Sono (`HKCategoryValueSleepAnalysis`): na cama, acordado, sono principal (core), profundo e REM, com amostras sobrepostas ao "na cama" [P13].

---

## 5. Implicações para o Eleva Pro

Sem decisão. Para cada capacidade: quem provavelmente entrega, com o grau de confirmação, e o que fica de fora para quem usa relógio barato.

### `dailyActivity` (passos e calorias)

- **Provável:**
  - **Xiaomi (Mi Fitness):** Health Connect confirmado como canal [P16]; tipos ?ˢ [S2].
  - **Amazfit (Zepp):** ?ˢ, ver `zepp-coach.md`.
  - **Kospet:** Health Connect confirmado [P40]; tipos ?.
  - **OHealth:** ?ˢ [S3].
  - **Honor:** ?ˢ [S5].
  - **iOS:** Haylou, GloryFit e Wearfit Pro declaram passos [P36][P41][P46]. Haylou e GloryFit declaram energia ativa.
- **Fica de fora:** no Android, Huawei (sem Health Connect), FitPro, Da Fit, H Band, VeryFit, FitCloudPro e Wearfit Pro (nenhuma menção). Haylou, GloryFit e Mibro só chegam pela ponte do Google Fit, que tem prazo [P1][P15].
- **Colchão:** o celular já conta passos. O Health Connect também recebe passos do próprio aparelho, atribuídos a um pacote sintético desde jun/2026 [P4]. Quem não tem relógio integrado ainda tem esta capacidade.

### `sleepAndRestingHr`

- **Sono:**
  - Xiaomi ?ˢ, com fases [S2][S4].
  - Amazfit ?ˢ, com fases.
  - OHealth ?ˢ [S3].
  - iOS: GloryFit declara sono [P41]; FitCloudPro declara sono [P45], com relato de usuário de que só "sono profundo" chega [P45, avaliação].
  - Huawei no iOS: **não confirmado** (a ficha fala só de treino e peso [P25]).
- **FC de repouso:** nenhuma marca chinesa com confirmação primária. Xiaomi ?ˢ [S2].
- **Fica de fora:** Huawei no Android; Haylou no iOS (a política não lista sono) [P36]; FitPro e Da Fit (nada declarado).
- Para quem só tem FC contínua (Haylou e GloryFit no iOS), dá para **derivar** um "repouso" das amostras. Seria cálculo do Eleva Pro, não dado do relógio.

### `exerciseSessions`

- **Confirmado em primária:**
  - **Huawei só no iOS** ("exercise data" ao HealthKit) [P25].
  - FitCloudPro no iOS ("exercise data") [P45], sem detalhe de ser `HKWorkout`.
- **?ˢ:** Xiaomi [S4], Amazfit, Honor [S5].
- **Fica de fora:** Haylou (a política não lista treino) [P36] e GloryFit (não lista) [P41]. Nos demais apps baratos, nada foi declarado.
- **Para quem usa relógio barato, o treino feito só no relógio provavelmente não chega.** O caminho que resta é o treino registrado no próprio Eleva Pro.

### `workoutHeartRate` (série de FC dentro do exercício)

- **Nenhum ecossistema chinês confirmado** em primária, nem no Health Connect nem no HealthKit.
- Candidatos para testar primeiro: **Xiaomi** (integrador cita FC granular [S4]), **Amazfit** e **Huawei no iOS** (treino vai; FC associada: ?).
- **Condição técnica:** mesmo que a FC vá, a densidade pode ser baixa. No Health Connect a série é `HeartRateRecord` filtrado pelo intervalo da sessão, e é preciso pedir `READ_EXERCISE` + `READ_HEART_RATE` [P2][P3].
- **Fica de fora:** praticamente todo relógio barato. Haylou e GloryFit mandam FC ao HealthKit [P36][P41], mas sem vínculo com treino e com densidade desconhecida. Recortar essa FC pelo horário de um treino registrado no Eleva Pro é **possível em tese**. A qualidade só se sabe no teste.

### `exerciseSessions` × `workoutHeartRate`: armadilha de fonte

- No Health Connect, a FC no intervalo de uma sessão pode vir de outra fonte [P3][P4]. Casar a sessão com a FC do **mesmo** `dataOrigin` evita misturar relógio e celular.

### `hrv`

- **Nenhum ecossistema chinês confirmado no Health Connect.**
- **Amazfit no HealthKit:** Balance 2 confirmado [zepp F23]; Helio Strap ?ˢ [S10].
- Xiaomi, Huawei, Honor, OHealth: ?.
- Relógios baratos: não declarado em nenhuma política lida (Haylou e GloryFit listam tipos e VFC não está) [P36][P41].
- **Atenção:** HealthKit guarda SDNN [P10] e Health Connect guarda RMSSD [P2]. Um mesmo "hrv" nas duas plataformas é **grandeza diferente**.
- **Fica de fora:** relógio barato, quase certamente.

### `vo2Max`

- **Nenhum ecossistema chinês confirmado** em Health Connect ou HealthKit.
- O Xiaomi Band 10 **calcula** VO₂ máx. no relógio [P19], mas a exportação não é confirmada. A pesquisa da Zepp também não confirmou.
- **Fica de fora:** relógio barato, e provavelmente também Xiaomi, Huawei e Amazfit até o teste mostrar o contrário. No iOS com Apple Watch, vem nativo [P11].

### `liveHeartRate` (Bluetooth)

- **Não passa por Health Connect nem HealthKit.** É a única capacidade que depende do relógio, não da plataforma.
- **Confirmado que existe o modo:**
  - Huawei Watch/Band ("HR Data Broadcasts") [P27].
  - Xiaomi Smart Band 10 e Watch S4 41mm ("Share HR") [P19][P21].
  - Amazfit Helio Strap, **protocolo padrão confirmado** [P49].
- **Perfil 0x180D:** o Heart Rate Service padrão tem UUID 0x180D, com a característica Heart Rate Measurement 0x2A37 [P48]. Só a Amazfit afirma "protocolo padrão" [P49]. Para Huawei e Xiaomi, **não confirmado** até parear com um app genérico de BLE.
- **Fica de fora:** todos os relógios baratos pesquisados (FitPro, Da Fit, GloryFit etc.) e Haylou, Mibro, Kospet, Colmi, QCY, Honor e OPPO/OnePlus. Não há fonte, e o modo não deve ser prometido.

### Resumo por perfil de usuário (indicativo, a validar no teste)

| Perfil | Android (Health Connect) | iOS (HealthKit) |
|---|---|---|
| Xiaomi / Redmi | `dailyActivity`, `sleepAndRestingHr` prováveis; `exerciseSessions`/`workoutHeartRate` a testar; `liveHeartRate` em Band 10 e Watch S4 | tipos a testar |
| Amazfit | como em `zepp-coach.md`; `hrv` só iOS em alguns modelos | idem |
| Huawei | **nada** sem ponte de terceiro; `liveHeartRate` sim | `exerciseSessions` sim; demais a testar; `liveHeartRate` sim |
| Honor, OPPO/OnePlus | `dailyActivity`, talvez treino (?ˢ); latência possivelmente alta na Honor | — / ? |
| Kospet | canal confirmado, tipos ? | canal confirmado, tipos ? |
| Haylou, GloryFit, Mibro | só via app Google Fit (com prazo) | passos, energia ativa, FC solta; GloryFit também sono |
| FitPro, Da Fit, H Band, VeryFit, Wearfit Pro | **provavelmente nada** | Da Fit e Wearfit Pro genérico; FitPro ? |

### LGPD (sinalização, não parecer)

- **Série de FC, VFC e sono com fases** são dado pessoal sensível de saúde. Ler a série do treino muda volume e sensibilidade frente ao agregado diário. Pede `/lgpd-check` antes de implementar `workoutHeartRate` e `hrv`.
- **`ExerciseRoute`** exige permissão própria [P2][P3] e traria GPS. O projeto já decidiu não guardar coordenadas.
- Para Xiaomi, a exportação a terceiros exige ligar a **sincronização com a nuvem** da Xiaomi [P18][P20]. Isso é escolha do usuário com a Xiaomi, mas vale constar na explicação da tela de conexão.

---

## 6. Roteiro de teste em aparelho real

**Objetivo:** preencher os "?" da matriz com o que de fato aparece no Health Connect e no HealthKit.

### Preparação (uma vez por aparelho)

1. **Android 14+** (Health Connect nativo) e, se possível, um Android 13 com o APK, para ver a diferença de recursos [P6]. **iPhone** com app Saúde.
2. Instalar um **leitor neutro**:
   - **Android:** o próprio app Health Connect (Configurações › Health Connect › Dados e acesso › "Ver todos os dados" mostra cada tipo e a fonte).
   - **iOS:** app Saúde › Explorar › tipo › "Mostrar todos os dados" › fonte.
   - Se houver build de desenvolvimento do Eleva Pro, logar `dataOrigin.packageName`, `startTime`/`endTime`, número de `samples` e intervalo médio entre amostras.
3. **Não** instalar o app Google Fit no primeiro ciclo, para não mascarar a ponte [P15]. Num segundo ciclo, instalar e ligar "Sync Fit with Health Connect" para medir o que só chega por ela.

### Aparelhos em ordem de prioridade

| # | Aparelho | App | O que ativar |
|---|---|---|---|
| 1 | **Xiaomi Smart Band 9 ou 10** / Redmi Watch 5 Active | Mi Fitness | Sync with the cloud + Health Connect (Android) / Health (iOS), todos os tipos [P18][P19] |
| 2 | **Relógio D20/Y68** | FitPro | Procurar qualquer opção de terceiros; anotar se não existe |
| 3 | **Huawei Band 10** ou Watch Fit | Huawei Health (AppGallery / iOS) | Compartilhamento com Saúde (iOS); no Android, confirmar ausência |
| 4 | Amazfit (qualquer) | Zepp | Perfil › Vínculo de contas › Health Connect |
| 5 | Haylou (qualquer) / GloryFit | Haylou Fun / GloryFit | Google Fit (Android), Health (iOS) |
| 6 | Kospet TANK, OPPO/OnePlus, Honor | KOSPET FIT / OHealth / Honor Health | Health Connect onde houver |

### Protocolo por aparelho

**Dia 0, à noite:** parear, dar todas as permissões, dormir com o relógio.

**Dia 1, manhã:**
1. Sem abrir o app da marca, conferir no Health Connect/Saúde se chegou **sono** (sessão e fases), **FC de repouso**, **VFC** e **SpO₂**. Anotar a hora da checagem.
2. Abrir o app da marca, esperar a sincronização terminar e anotar a hora. Checar de novo.
   - A diferença entre os passos 1 e 2 mede se a exportação **só acontece com o app aberto**. É o alerta da Honor [P31].

**Dia 1, treino (30 min):** caminhada ou corrida **ao ar livre** iniciada **no relógio**, com o celular junto.
- Ao ar livre porque há chance de disparar VO₂ máx. e rota.
- Incluir 2 tiros de 1 min forte, para a série de FC ter picos visíveis.

**Logo após o treino**, checar em **T+0, T+5, T+15, T+60 min** e **na manhã seguinte**:
- `ExerciseSessionRecord` / `HKWorkout`: existe? Tipo correto? Início e fim batem com o relógio?
- `HeartRateRecord` / amostras de FC **dentro do intervalo**: quantas? Intervalo médio entre amostras (1 s? 5 s? 1 min? 10 min?). Os picos dos tiros aparecem?
- A FC no intervalo é da **mesma fonte** que a sessão?
- `ActiveCaloriesBurnedRecord` e distância associados.
- `Vo2MaxRecord` / `vo2Max` depois do treino.
- `ExerciseRoute`: existe? (Só inspecionar, não armazenar.)

**Dia 1–2:**
- Passos e calorias: comparar o total do app da marca com o do Health Connect/Saúde (duplicação com o pedômetro do celular?).
- Peso: registrar no app da marca e ver se sai.

**FC ao vivo** (aparelhos 1, 3, 4):
1. Ligar "Share HR" / "HR Data Broadcasts" / "Heart Rate Push" [P19][P27][P50].
2. Num app genérico de BLE (nRF Connect, por exemplo), procurar o serviço **0x180D** e assinar a característica **0x2A37** [P48].
3. Anotar: aparece como sensor padrão? Taxa de atualização? Continua com a tela apagada? Continua durante um treino no relógio?

**iOS, permissão negada:**
1. Negar a leitura de FC ao app de teste.
2. Confirmar que a consulta volta vazia, sem erro [P7][P8].
3. Repetir com a janela de dados limitada, se o iOS instalado oferecer.

### Quanto esperar

- **Mínimo:** 2 noites e 2 treinos por aparelho.
- **Tempo total por aparelho:** cerca de 48 h de calendário e 2 h de atenção ativa.
- Registrar tudo numa planilha com as colunas da matriz da seção 2. Cada "?" vira ✓ ou ✗ com data, versão do app da marca, versão do firmware e do Android/iOS.

---

## 7. Fontes

Todas as páginas foram acessadas em 14/09/2026.

### Primárias

**Google / Android**
- **[P1]** Android Developers, "Google Fit Migration FAQ". https://developer.android.com/health-and-fitness/health-connect/migration/fit/faq (guia: https://developer.android.com/health-and-fitness/health-connect/migration/fit)
- **[P2]** Android Developers, "Health Connect data types". https://developer.android.com/health-and-fitness/health-connect/data-types
- **[P3]** Android Developers, "Workouts" (experiência de exercício no Health Connect). https://developer.android.com/health-and-fitness/health-connect/experiences/workouts
- **[P4]** Android Developers, "Read data" (limite de 30 dias, histórico, segundo plano, `dataOriginFilter`, pacote sintético de passos). https://developer.android.com/health-and-fitness/health-connect/read-data
- **[P5]** Android Developers, "Sync data" (Changes API, expiração do token). https://developer.android.com/health-and-fitness/health-connect/sync-data
- **[P6]** Android Developers, "Get started with Health Connect". https://developer.android.com/health-and-fitness/health-connect/get-started
- **[P14]** Google Play, coleção "Funciona com o Health Connect" (redireciono de https://g.co/android/CompatibleWithHealthConnect). https://play.google.com/store/apps/collection/promotion_all__health_connect — lida com `gl=BR` e `gl=US`
- **[P15]** Google Fit Help, "Health Connect on Google Fit". https://support.google.com/fit/answer/12830119
- **[P53]** Android Developers, "Health & Fitness Google Developer Newsletter – August 2025" (Garmin Connect no Health Connect). https://developer.android.com/health-and-fitness/community/newsletters/2025/08

**Apple**
- **[P7]** Apple Developer, `authorizationStatus(for:)`. https://developer.apple.com/documentation/healthkit/hkhealthstore/authorizationstatus(for:)
- **[P8]** Apple Developer, "Authorizing access to health data". https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- **[P9]** Apple Developer, `HKWorkout`. https://developer.apple.com/documentation/healthkit/hkworkout
- **[P10]** Apple Developer, `heartRateVariabilitySDNN`. https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/heartratevariabilitysdnn
- **[P11]** Apple Developer, `vo2Max`. https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/vo2max
- **[P12]** Apple Developer, `restingHeartRate`. https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/restingheartrate
- **[P13]** Apple Developer, `HKCategoryValueSleepAnalysis`. https://developer.apple.com/documentation/healthkit/hkcategoryvaluesleepanalysis

**Xiaomi**
- **[P16]** Google Play, "Mi Fitness (Xiaomi Wear)" (permissão Health Connect; 50 mi+; atualizado em 11/09/2026). https://play.google.com/store/apps/details?id=com.xiaomi.wearable
- **[P17]** Xiaomi Global, "Xiaomi Watch S4 41mm" (compatível com Health Connect). https://www.mi.com/global/product/xiaomi-watch-s4-41mm/
- **[P18]** Xiaomi UK Support, "Does the Mi Fitness App support third-party data sync when connected to the Xiaomi Smart Band 9?" (KA-230357, modificado em jul/2024). https://www.mi.com/uk/support/faq/details/KA-230357/
- **[P19]** Xiaomi Global Support, "Xiaomi Smart Band 10 FAQ" (Share HR, VO₂ máx., sincronização, Apple Health) (KA-579104); edição Glimmer em KA-611505. https://www.mi.com/global/support/faq/details/KA-579104/ · https://www.mi.com/global/support/faq/details/KA-611505/
- **[P20]** Xiaomi Global Support, "Xiaomi Smart Band 9 Active FAQ" (Google Fit e Strava) (KA-512710). https://www.mi.com/global/support/faq/details/KA-512710/
- **[P21]** Xiaomi UK Support, "Xiaomi Watch S4 41mm FAQ" (HR broadcast nas configurações) (KA-608032). https://www.mi.com/uk/support/faq/details/KA-608032/
- **[P22]** App Store Brasil, "Mi Fitness (Xiaomi Wear Lite)". https://apps.apple.com/br/app/mi-fitness-xiaomi-wear-lite/id1493500777
- **[P23]** Google Play, "Zepp Life". https://play.google.com/store/apps/details?id=com.xiaomi.hm.health
- **[P24]** App Store, "Zepp Life (Formerly MiFit)". https://apps.apple.com/us/app/zepp-life-formerly-mifit/id938688461

**Huawei**
- **[P25]** App Store (EUA), "HUAWEI Health" (HealthKit: peso e exercício). https://apps.apple.com/us/app/huawei-health/id1325481372
- **[P26]** App Store (Japão), "HUAWEI Health: Global". https://apps.apple.com/jp/app/id6740115642
- **[P27]** HUAWEI Support UK, "HR Data Broadcasts" (HUAWEI Band e Watch). https://consumer.huawei.com/uk/support/content/en-gb15827504/
- **[P28]** HUAWEI Developers, "Health Kit". https://developer.huawei.com/consumer/en/hms/huaweihealth/
- **[P29]** HUAWEI Support Global, "Syncing data from the Huawei Health app". https://consumer.huawei.com/en/support/content/en-us01057432/

**Honor, OPPO/OnePlus, realme**
- **[P30]** Google Play, "Honor Health". https://play.google.com/store/apps/details?id=com.hihonor.health
- **[P31]** HONOR UK Support, "Why is the health data in HONOR Health not synced with my device?" (sincronização manual). https://www.honor.com/uk/support/content/en-us15824226/ (introdução: https://www.honor.com/global/support/content/en-us15824220/)
- **[P32]** Google Play, "OHealth". https://play.google.com/store/apps/details?id=com.heytap.health.international
- **[P33]** Google Play, "OnePlus Health". https://play.google.com/store/apps/details?id=com.oneplus.health.international
- **[P34]** OnePlus Community (fórum oficial), "An update about the OHealth App issue" (conteúdo visto só em trecho de busca; autoria e data não confirmadas). https://community.oneplus.com/thread/1595284620985761795
- **[P35]** Google Play, "realme Link". https://play.google.com/store/apps/details?id=com.realme.link

**Haylou, Mibro, Kospet**
- **[P36]** Haylou Fun, política de privacidade (seção "Sharing Data"). https://ls-app-file.haylou.com/private/index.html
- **[P37]** App Store, "Haylou Fun". https://apps.apple.com/app/id1534983357
- **[P38]** App Store, "Mibro Fit" (notas de versão 1.5.12 e 1.5.13). https://apps.apple.com/us/app/mibro-fit/id1530759825
- **[P39]** Mibro, página do "Mibro FIT" (Sport Data Sharing e FAQ). https://www.mibrofit.com/products/fit
- **[P40]** KOSPET Global, "FAQs". https://kospet.com/pages/faqs

**Apps genéricos**
- **[P41]** GloryFit, política de privacidade (HealthKit e Google Fit). https://app.help-document.com/privacy-policy/gloryfit_en.html
- **[P42]** App Store, "GloryFit". https://apps.apple.com/us/app/id1237479843
- **[P43]** App Store, "Da Fit". https://apps.apple.com/us/app/da-fit/id1316004998
- **[P44]** MO YOUNG, política de privacidade do Da Fit (sem menção a Health Connect, Google Fit ou HealthKit). https://cdn.moyoung.com/HTML/dafit_law_and_privacy_en.html
- **[P45]** App Store, "FitCloudPro". https://apps.apple.com/us/app/fitcloudpro/id1452851243
- **[P46]** App Store, "Wearfit Pro". https://apps.apple.com/us/app/wearfit-pro/id1512947756
- **[P47]** Fichas da Google Play (downloads, data de atualização e descrição, lidas com `hl=en&gl=BR`):
  - `cn.xiaofengkj.fitpro`, `com.crrepa.band.dafit`, `com.yc.gloryfit`, `com.topstep.fitcloudpro`, `com.wakeup.howear`, `com.veepoo.hband`, `com.veryfit2hr.second`, `com.yingsheng.hayloufun`, `com.crrepa.band.colmi_fit`
  - `com.huawei.health` retorna "Not Found"
  - Formato: https://play.google.com/store/apps/details?id=PACOTE

**Padrões e comparação**
- **[P48]** Bluetooth SIG, "Heart Rate Service 1.0". https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/
- **[P49]** Amazfit Support (Helio Strap), "Which devices are supported by the heart rate broadcast…". https://support.amazfit.com/us/amazfit_helio_strap/docs/ZRrmdW46GoiwizxBLUacJ6XQn4d
- **[P50]** Amazfit Support (Helio Strap), "How to set the heart rate push function?". https://support.amazfit.com/us/amazfit_helio_strap/docs/GyUIdtHLvoMqNUxOkuNcQB4hn4d
- **[P51]** Samsung Developer, "Health Connect FAQ to Access Samsung Health Data". https://developer.samsung.com/health/health-connect-faq.html
- **[P52]** Garmin Support, "Sharing Your Garmin Connect Data With Health Connect" (página em JavaScript; conteúdo visto via trecho de busca) e "…With Apple Health". https://support.garmin.com/en-US/?faq=JToBEy0jfe6pIygark2Ui5 · https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA
- **[zepp Fn / Sn]** Referências da pesquisa anterior, em [`zepp-coach.md`](zepp-coach.md) §6.

### Secundárias (complemento, não sustentam fato central sozinhas)

- **[S1]** Android Central, "Garmin is getting Health Connect support next month with Runna and more" (I/O 2025; Mi Fitness a partir de junho). https://www.androidcentral.com/wearables/garmin/garmin-io-2025-health-connect-support-details
- **[S2]** Sahha, "Xiaomi Integration". https://sahha.ai/integrations/xiaomi/
- **[S3]** Sahha, "OHealth Integration". https://sahha.ai/integrations/ohealth/
- **[S4]** ROOK, "Mi Fitness (Xiaomi)". https://docs.tryrook.io/data-sources/xiaomi/
- **[S5]** Strove Help Center, "How to Link Your Honor Health App to Strove", 25/11/2025. https://support.strove.ai/en/articles/12928719-how-to-link-your-honor-health-app-to-strove
- **[S6]** FitMesh, "Huawei Health and Health Connect: is there an official sync? (2026)" (fornecedor de ponte; sem fontes citadas). https://www.fitmesh.fit/en/blog/huawei-health-health-connect-sync
- **[S7]** GSMArena, "You can no longer download Huawei Health from the Play Store". https://www.gsmarena.com/you_can_no_longer_download_huawei_health_from_the_play_store-news-58056.php
- **[S8]** 9to5Google, "Google Fit will shut down in favor of Health, migration tool coming later this year", 07/05/2026. https://9to5google.com/2026/05/07/google-fit-shut-down-health-replacement-migration-tool-coming/
- **[S9]** Notebookcheck, "Amazfit wearables get new data sharing function in app update", 02/08/2025. https://www.notebookcheck.net/Amazfit-wearables-get-new-data-sharing-function-in-app-update.1076117.0.html
- **[S10]** Notebookcheck, "Amazfit brings new HRV data sharing feature to wearable", 28/10/2025. https://www.notebookcheck.net/Amazfit-brings-new-HRV-data-sharing-feature-to-wearable.1149080.0.html
- **[S11]** Leandro Abreu, "Os 20 smartwatches mais vendidos no Mercado Livre em 2025", 23/07/2025. https://leandroabreu.com.br/smartwatch-mais-vendido-no-mercado-livre/
- **[S12]** Manual de vendedor "SMARTWATCH – USER MANUAL Supported App: FitPro" e anúncio Meesho "Y68/D20 … connect with FitPro app". https://m.media-amazon.com/images/I/C1cKlP77yuL.pdf · https://www.meesho.com/y68d20-smartwatch-fitness-band-connect-with-fitpro-app/p/20t4hy
- **[S13]** Android Authority, "Zepp Life: Everything you need to know about the Mi Band companion app". https://www.androidauthority.com/zepp-life-mi-fit-app-3266258/
- **[S14]** HUAWEI Community, "Huawei health – Google fit integration" (tópico de usuário; trecho de busca) e Reddit r/hwatch sobre Health Sync. https://consumer.huawei.com/en/community/details/topicId-72902/ · https://www.reddit.com/r/hwatch/comments/11c87yj/is_your_huawei_syncing_with_google_fit_currently/
- **[S15]** Android Police, "Garmin confirms what it will and won't share with Google Health Connect". https://www.androidpolice.com/garmin-data-sharing-google-health-connect-details/
- **[S16]** Android Authority, "What is Google Health Connect and how do I use it?" (a lista oficial não é exaustiva). https://www.androidauthority.com/google-health-connect-app-3234491/
- **[S17]** Samsung Community, "HRV, breathing rate, and resting HR won't write to the health connect app from Samsung Health". https://us.community.samsung.com/t5/Galaxy-Watch/HRV-breathing-rate-and-resting-HR-won-t-write-to-the-health/td-p/3351258
