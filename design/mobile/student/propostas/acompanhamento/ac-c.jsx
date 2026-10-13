/* Acompanhamento · C: avisos do dia. A tela bloqueada segue a 6c (uso-diario/pecas.jsx). */
const acPill=pri=>({height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12.5,fontWeight:700,background:pri?P:"var(--glass-strong)",color:pri?PF:"var(--ios-label)"});

/* novo · Notificação do app, recolhida ou aberta com ações */
function Aviso({icon,quando,title,txt,acoes,style}){
  return <div className="glass" style={{padding:13,borderRadius:22,background:"var(--sheet)",...style}}>
    <Row style={{gap:8}}><div style={{width:22,height:22,borderRadius:6,background:P,display:"flex",alignItems:"center",justifyContent:"center"}}>{I(icon,12,PF)}</div><span style={{fontSize:11.5,fontWeight:700,letterSpacing:".04em",textTransform:"uppercase",color:"var(--ios-label2)"}}>Eleva Pro</span><span style={{marginLeft:"auto",fontSize:11.5,color:"var(--ios-label3)"}}>{quando}</span></Row>
    <div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)",marginTop:8}}>{title}</div>
    <div style={{fontSize:12.5,lineHeight:1.4,color:"var(--ios-label2)",marginTop:2}}>{txt}</div>
    {acoes&&<div style={{display:"flex",flexDirection:"column",gap:7,marginTop:12}}>{acoes.map(([ic,t],i)=><div key={t} style={acPill(i===0)}>{I(ic,14,i===0?PF:"var(--ios-label)")}{t}</div>)}</div>}
  </div>;
}
function Bloqueada({hora="18:30",children,escurece}){
  return <div className="phone">
    <div className="island"></div>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:78,zIndex:2,filter:escurece?"blur(6px)":"none",opacity:escurece?.5:1}}>
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"var(--ios-label2)"}}>{I("lock",13,"var(--ios-label2)")}Terça, 6 de outubro</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:84,fontWeight:800,letterSpacing:"-.04em",color:"var(--ios-label)",lineHeight:1,marginTop:4}}>{hora}</div>
    </div>
    <div style={{position:"absolute",left:14,right:14,bottom:120,zIndex:4,display:"flex",flexDirection:"column",gap:8}}>{children}</div>
    <div style={{position:"absolute",bottom:44,left:0,right:0,display:"flex",justifyContent:"space-between",padding:"0 48px",zIndex:3}}>{["flashlight","camera"].map(n=><div key={n} style={{width:48,height:48,borderRadius:99,background:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center"}}>{I(n,20,"var(--ios-label)")}</div>)}</div>
    <div className="homebar"></div>
  </div>;
}

/* E1 · Tela bloqueada no fim da tarde: o que ficou para trás hoje */
function E1(){
  return <Bloqueada>
    <Aviso icon="utensils" quando="14:00" title="Almoço ainda não marcado" txt="Arroz, feijão, frango e salada. Comeu o do plano? Um toque marca."/>
    <Aviso icon="dumbbell" quando="agora" title="Treino B ainda dá tempo hoje" txt="Inferiores · 45 min em casa. Se hoje não der, mudamos para amanhã."/>
  </Bloqueada>;
}
/* E2 · Refeição aberta: marca sem abrir o app */
function E2(){
  return <Bloqueada hora="14:00" escurece>
    <Aviso icon="utensils" quando="agora" title="Almoço ainda não marcado" txt="Arroz, feijão, frango e salada · 580 kcal" acoes={[["check","Comi o do plano"],["pencil","Comi outra coisa"],["x","Pulei esta refeição"]]}/>
  </Bloqueada>;
}
/* E3 · Treino aberto: começar, mover ou deixar */
function E3(){
  return <Bloqueada escurece>
    <Aviso icon="dumbbell" quando="agora" title="Treino B ainda dá tempo hoje" txt="Inferiores · 45 min em casa" acoes={[["play","Começar agora"],["calendar-arrow-up","Mover para amanhã"],["moon","Hoje não"]]}/>
    <Nota style={{padding:"0 6px"}}>"Mover para amanhã" reorganiza a semana sem perder o treino.</Nota>
  </Bloqueada>;
}

/* E4 · Início: o que falta hoje, para quem abriu o app em vez do aviso */
function Pendencia({icon,title,sub,acao,first}){
  return <LinhaDeVidro first={first} icon={icon} title={title} sub={sub} right={<span style={{padding:"7px 12px",borderRadius:11,background:P,color:PF,fontSize:11,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase"}}>{acao}</span>}/>;
}
function E4(){
  return <Phone tabs>
    <Scroll pb={110}>
      <Row style={{paddingTop:14,justifyContent:"space-between"}}>
        <div><div style={mono}>Terça, 6 de outubro</div><div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:4}}>Olá, Marina</div></div>
        <div style={{position:"relative"}}><BotaoRedondo icon="bell"/><span style={{position:"absolute",top:-2,right:-2,width:16,height:16,borderRadius:99,background:P,color:PF,fontSize:9.5,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>2</span></div>
      </Row>
      <Label right="2 de 6">Falta hoje</Label>
      <Vidro active style={{padding:"2px 14px"}}>
        <Pendencia first icon="utensils" title="Almoço" sub="12:30 · ainda não marcado" acao="Marcar"/>
        <Pendencia icon="dumbbell" title="Treino B · Inferiores" sub="45 min · em casa" acao="Começar"/>
      </Vidro>
      <Label>Feito hoje</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="circle-check" title="Café da manhã" sub="07:40 · do plano"/>
        <LinhaDeVidro icon="circle-check" title="Lanche da manhã" sub="10:15 · do plano"/>
        <LinhaDeVidro icon="circle-check" title="Água · 1,2 de 2,5 L" sub="Metade do caminho"/>
      </Vidro>
    </Scroll>
  </Phone>;
}

/* E5 · Preferências de avisos */
function Chave({on}){
  return <div style={{width:46,height:28,borderRadius:99,background:on?P:"var(--glass-strong)",padding:3,display:"flex",justifyContent:on?"flex-end":"flex-start",flexShrink:0}}><div style={{width:22,height:22,borderRadius:99,background:on?PF:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}></div></div>;
}
function E5(){
  const L=[["dumbbell","Treino não feito","18:00 · só em dia de treino",1],["utensils","Refeição não marcada","1 h e meia depois do horário",1],["droplet","Água","a cada 3 h, se estiver abaixo",0],["clipboard-check","Check-in da semana","segunda · 08:00",1],["file-chart-column","Relatório da semana","domingo · 19:00",1]];
  return <Phone>
    <Scroll>
      <Row style={{paddingTop:14,gap:12}}><BotaoRedondo/><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>Avisos</div></Row>
      <Label>O que avisar</Label>
      <Vidro style={{padding:"2px 14px"}}>{L.map(([ic,t,s,on],i)=><LinhaDeVidro key={t} first={i===0} icon={ic} title={t} sub={s} right={<Chave on={on}/>}/>)}</Vidro>
      <Label>Sem exagero</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="moon" title="Silêncio" sub="das 22:00 às 07:00" right={I("chevron-right",16,"var(--ios-label3)")}/>
        <LinhaDeVidro icon="bell-ring" title="Até 3 avisos por dia" sub="O resto espera no Início" right={I("chevron-right",16,"var(--ios-label3)")}/>
      </Vidro>
      <Nota style={{marginTop:12}}>No Modo Descanso e em dia livre, nada de aviso de treino ou refeição.</Nota>
    </Scroll>
  </Phone>;
}

/* E6 · Aviso ignorado 3 vezes: o app pergunta em vez de insistir */
function E6(){
  return <Phone tabs overlay={<GlassSheet title="Mudar o aviso do almoço?" sub="Você não abriu os últimos 3. Talvez o horário esteja ruim.">
      <GlassChoice icon="clock" title="Avisar às 15:00" sub="Depois do seu almoço de costume" active/>
      <GlassChoice icon="bell-off" title="Parar o aviso do almoço" sub="Os outros continuam"/>
      <GlassChoice icon="check" title="Deixar como está"/>
    </GlassSheet>}>
    <Scroll pb={110}><div style={{height:60}}></div></Scroll>
  </Phone>;
}

/* Variante para decidir · o tom do aviso */
const TomDireto=()=><Bloqueada><Aviso icon="dumbbell" quando="agora" title="Você ainda não treinou hoje" txt="Treino B · Inferiores · 45 min. Bora?"/></Bloqueada>;
const TomLeve=()=><Bloqueada><Aviso icon="dumbbell" quando="agora" title="Treino B ainda dá tempo hoje" txt="Inferiores · 45 min em casa. Se hoje não der, mudamos para amanhã."/></Bloqueada>;

Object.assign(window,{Aviso,Bloqueada,E1,E2,E3,E4,E5,E6,TomDireto,TomLeve});
