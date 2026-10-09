function O1(){
  return <Phone footer={<><BotaoDeDestaque bottom={84}>Começar</BotaoDeDestaque><BotaoSecundario text bottom={40}>Já tenho conta</BotaoSecundario></>}>
    <Scroll>
      <div style={{position:"relative",height:330,marginTop:30}}>
        <div style={{position:"absolute",left:"50%",top:40,transform:"translateX(-50%)",width:220,height:220,borderRadius:99,background:"radial-gradient(50% 50% at 50% 50%,hsl(var(--primary) / .28) 0%,transparent 70%)",filter:"blur(18px)"}}></div>
        <div className="glass" style={{position:"absolute",left:"50%",top:58,transform:"translateX(-50%)",width:184,height:184,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center"}}><Anel pct={72} size={150} stroke={11} value="2.150" unit="kcal por dia" sub="estimativa"/></div>
        <div className="glass" style={{position:"absolute",left:6,top:22,padding:"9px 12px",borderRadius:16,display:"flex",gap:8,alignItems:"center"}}>{I("dumbbell",15,PT)}<span style={{fontSize:12,fontWeight:700,color:"var(--ios-label)"}}>Treino · 4x por semana</span></div>
        <div className="glass" style={{position:"absolute",right:4,top:262,padding:"9px 12px",borderRadius:16,display:"flex",gap:8,alignItems:"center"}}>{I("utensils",15,PT)}<span style={{fontSize:12,fontWeight:700,color:"var(--ios-label)"}}>Dieta · 5 refeições</span></div>
      </div>
      <Title eyebrow="Eleva Pro" size={36} sub="Treino e dieta feitos para você, sem precisar conversar com ninguém.">Seu plano em 3 minutos</Title>
    </Scroll>
  </Phone>;
}
const OBJ=[["flame","Perder gordura"],["dumbbell","Ganhar massa"],["heart-pulse","Saúde e disposição"],["trophy","Desempenho no esporte"]];
function O2({none}){
  return <Phone footer={none?<BotaoDeDestaque disabled hint="Escolha um objetivo para continuar">Continuar</BotaoDeDestaque>:<BotaoDeDestaque>Continuar</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader step={1}/>
      <Title sub="Escolha o principal. Você pode mudar depois.">Qual é o seu objetivo?</Title>
      <div style={{marginTop:22}}>{OBJ.map(([i,t],k)=><GlassChoice key={t} icon={i} title={t} active={!none&&k===0}/>)}</div>
    </Scroll>
  </Phone>;
}
const O2Vazio=()=><O2 none/>;
function O3(){
  const L=[["sprout","Iniciante","Nunca treinei ou faz tempo"],["rotate-ccw","Voltando","Já treinei, estou recomeçando"],["activity","Intermediário","Treino com frequência"],["gauge","Avançado","Treino há anos e acompanho carga"]];
  return <Phone footer={<BotaoDeDestaque>Continuar</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader step={2}/>
      <Title sub="Isso define o volume e a dificuldade do treino.">Como você se descreveria?</Title>
      <div style={{marginTop:22}}>{L.map(([i,t,s],k)=><GlassChoice key={t} icon={i} title={t} sub={s} active={k===1}/>)}</div>
    </Scroll>
  </Phone>;
}
function O4({bad}){
  return <Phone footer={bad?<BotaoDeDestaque disabled hint="Corrija a altura para continuar">Continuar</BotaoDeDestaque>:<BotaoDeDestaque>Continuar</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader step={3}/>
      <Title sub="Só três números. É o que usamos para calcular sua meta.">Sobre você</Title>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:22}}>
        <Campo label="Idade" value="29" unit="anos"/>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <Campo label="Altura" value={bad?"1,72":"172"} unit="cm" error={bad&&"Use centímetros, de 100 a 250. Ex.: 172"}/>
          <Campo label="Peso" value={bad?"":"78"} placeholder="—" unit="kg"/>
        </div>
      </div>
      <Label>Sexo biológico</Label>
      <GlassSegmented opts={["Feminino","Masculino"]} value="Feminino"/>
      <Nota style={{marginTop:9}} icon="info">Usado só para calcular seu gasto de energia.</Nota>
      <div style={{marginTop:20}}><Precisao pct={bad?40:85} nivel={bad?"Baixa":"Alta"}/></div>
    </Scroll>
  </Phone>;
}
const O4Erro=()=><O4 bad/>;
function O5(){
  const C=[["Diabetes",1],["Doença renal"],["Gestação ou amamentação"],["Transtorno alimentar (atual ou passado)"],["Lesão ou dor",1],["Nenhum"]];
  return <Phone footer={<><BotaoDeDestaque bottom={84}>Continuar</BotaoDeDestaque><BotaoSecundario text bottom={40}>Prefiro não informar</BotaoSecundario></>}>
    <Scroll>
      <OnbHeader step={3}/>
      <Title sub="Marque quantos quiser.">Algum destes se aplica a você?</Title>
      <div style={{marginTop:22}}><Chips gap={8}>{C.map(([t,on])=><ChipMulti key={t} on={!!on}>{t}</ChipMulti>)}</Chips></div>
      <Vidro style={{marginTop:22,display:"flex",gap:12,alignItems:"center"}}><CaixaDeIcone icon="shield-check"/><div style={{fontSize:12.5,lineHeight:1.4,color:"var(--ios-label2)"}}><b style={{color:"var(--ios-label)"}}>Isso nos ajuda a montar um plano seguro.</b> Fica só entre você e o app.</div></Vidro>
    </Scroll>
  </Phone>;
}
function O5bSemInfo(){
  return <Phone footer={<><BotaoDeDestaque bottom={96} icon="dumbbell">Continuar com o treino</BotaoDeDestaque><BotaoSecundario bottom={40} icon="rotate-ccw">Responder a triagem</BotaoSecundario></>}>
    <Scroll>
      <OnbHeader step={3}/>
      <div style={{marginTop:34}}><CaixaDeIcone icon="shield-check" tone={AMB} size={60}/></div>
      <Title eyebrow="Para sua segurança" size={26} sub="Sem saber da sua saúde, não montamos dieta por enquanto. Seu treino continua normal.">Vamos começar pelo treino</Title>
      <Vidro style={{marginTop:20,padding:"4px 14px"}}>
        <LinhaDeVidro first icon="dumbbell" title="Treino feito para você" sub="Montamos agora, como os outros" right={I("circle-check",18,PT)}/>
        <LinhaDeVidro icon="utensils" tone={AMB} title="Dieta: sem plano por enquanto" sub="Responda a triagem quando quiser para liberar" right={I("chevron-right",18,"var(--ios-label3)")}/>
      </Vidro>
    </Scroll>
  </Phone>;
}
function O5b(){
  return <Phone footer={<><BotaoDeDestaque bottom={96} icon="search">Encontrar um especialista</BotaoDeDestaque><BotaoSecundario bottom={40} icon="dumbbell">Continuar só com o treino</BotaoSecundario></>}>
    <Scroll>
      <OnbHeader step={3}/>
      <div style={{marginTop:34}}><CaixaDeIcone icon="stethoscope" tone={AMB} size={60}/></div>
      <Title eyebrow="Para sua segurança" size={26} sub="Com diabetes, a alimentação pede acompanhamento individual. Por isso o app não monta dieta nesse caso. Seu treino continua normal.">Sua dieta precisa de um especialista</Title>
      <Vidro style={{marginTop:20,padding:"4px 14px"}}>
        <LinhaDeVidro first icon="dumbbell" title="Treino feito para você" sub="Montamos agora, como os outros" right={I("circle-check",18,PT)}/>
        <LinhaDeVidro icon="bandage" title="Lesão ou dor considerada" sub="Evitamos exercícios que pesam no local" right={I("circle-check",18,PT)}/>
        <LinhaDeVidro icon="utensils" tone={AMB} title="Dieta com um especialista" sub="Você conecta o plano dele aqui depois" right={I("chevron-right",18,"var(--ios-label3)")}/>
      </Vidro>
    </Scroll>
  </Phone>;
}
function O6(){
  return <Phone footer={<><Fade/><BotaoDeDestaque>Continuar</BotaoDeDestaque></>}>
    <Scroll pb={130}>
      <OnbHeader step={4} skip/>
      <Title size={26} sub="Conte o tempo que você tem de verdade.">Seu treino</Title>
      <Label>Dias por semana</Label>
      <div style={{display:"flex",gap:7}}>{[2,3,4,5,6].map(d=><ChipPick key={d} w={1} on={d===4}>{d}</ChipPick>)}</div>
      <Label>Tempo por treino</Label>
      <GlassSegmented opts={["30 min","45 min","60 min","90 min"]} value="45 min"/>
      <Label>Onde você treina</Label>
      <div style={{display:"flex",gap:8}}><ChoiceTile icon="building-2" title="Academia"/><ChoiceTile icon="house" title="Casa" active/><ChoiceTile icon="trees" title="Ao ar livre"/></div>
      <Label right="desmarque o que não tem">Equipamento em casa</Label>
      <Chips>{[["Halteres",1],["Elástico",1],["Barra fixa"],["Só o corpo",1]].map(([t,on])=><ChipMulti key={t} on={!!on}>{t}</ChipMulti>)}</Chips>
      <Label right="opcional">Pratica algum esporte?</Label>
      <Chips>{[["Corrida",1],["Beach tennis"],["Futebol"],["Jiu-jitsu"],["Ciclismo"],["Nenhum"]].map(([t,on])=><ChipMulti key={t} on={!!on}>{t}</ChipMulti>)}</Chips>
    </Scroll>
  </Phone>;
}
function O7(){
  return <Phone footer={<><Fade/><BotaoDeDestaque icon="sparkles">Montar meu plano</BotaoDeDestaque></>}>
    <Scroll pb={130}>
      <OnbHeader step={5} skip/>
      <Title size={26} sub="Comida de verdade, do jeito que você já come.">Sua alimentação</Title>
      <Label>Refeições por dia</Label>
      <div style={{display:"flex",gap:7}}>{[3,4,5,6].map(d=><ChipPick key={d} w={1} on={d===5}>{d}</ChipPick>)}</div>
      <Label right="marque quantos quiser">Não como</Label>
      <Chips>{[["Lactose",1],["Glúten"],["Carne vermelha"],["Peixe"],["Ovo"]].map(([t,on])=><ChipMulti key={t} on={!!on}>{t}</ChipMulti>)}</Chips>
      <Label>Estilo</Label>
      <GlassSegmented opts={["Onívoro","Vegetariano","Vegano"]} value="Onívoro"/>
      <Label right="marque quantos quiser">Rotina</Label>
      <Chips>{[["Cozinho",1],["Marmita",1],["Como fora"]].map(([t,on])=><ChipMulti key={t} on={!!on}>{t}</ChipMulti>)}</Chips>
      <Label>Orçamento</Label>
      <GlassSegmented opts={["Econômico","Médio","Livre"]} value="Médio"/>
    </Scroll>
  </Phone>;
}
Object.assign(window,{O1,O2,O2Vazio,O3,O4,O4Erro,O5,O5b,O5bSemInfo,O6,O7});
