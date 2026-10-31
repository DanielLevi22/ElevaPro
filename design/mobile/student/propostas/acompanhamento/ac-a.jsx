/* Acompanhamento · A: relatório da semana. Usa Tendencia, Legenda e Status de ajuste-do-plano/aj-a.jsx. */
function Topo({right="share-2"}){
  return <Row style={{paddingTop:14,justifyContent:"space-between"}}><BotaoRedondo/>{right&&<BotaoRedondo icon={right}/>}</Row>;
}
/* novo · Número grande do relatório */
function Numero({label,value,sub,icon,tone=PT}){
  return <Vidro style={{flex:1,padding:"11px 12px"}}>
    <div style={{...mono,fontSize:8.5,display:"flex",alignItems:"center",gap:4}}>{icon&&I(icon,11,tone)}{label}</div>
    <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:4,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:10.5,color:"var(--ios-label2)",marginTop:4,lineHeight:1.3}}>{sub}</div>}
  </Vidro>;
}
/* novo · Pílula de ganho, à direita da linha */
function Ganho({children,icon="arrow-up"}){
  return <span style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:99,background:tint(P,16),fontSize:11.5,fontWeight:700,color:"var(--ios-label)",whiteSpace:"nowrap"}}>{I(icon,12,PT)}{children}</span>;
}
/* novo · Semanas do bloco: feitas, atual e a seguir */
function SemanasDoBloco({atual=3,total=4,descarga=4}){
  return <div style={{display:"flex",gap:5}}>{Array.from({length:total}).map((_,i)=>{const n=i+1,feita=n<atual,agora=n===atual;
    return <div key={n} style={{flex:1,borderRadius:12,padding:"8px 4px",textAlign:"center",background:feita?tint(P,16):agora?P:"var(--glass-strong)",border:`1px solid ${agora?P:"var(--glass-brd)"}`}}>
      <div style={{fontSize:11,fontWeight:800,color:agora?PF:"var(--ios-label)"}}>Sem {n}</div>
      <div style={{fontSize:9,fontWeight:600,marginTop:3,color:agora?PF:"var(--ios-label2)"}}>{n===descarga?"Descarga":feita?"Feita":agora?"Agora":"A seguir"}</div>
    </div>;})}</div>;
}
/* novo · Sequência em semanas: uma semana com 1 treino já conta */
function Constancia({semanas=3,txt}){
  return <Vidro style={{marginTop:12,display:"flex",gap:12,alignItems:"center"}}>
    <CaixaDeIcone icon="flame" size={40}/>
    <div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>{semanas} semanas seguidas treinando</div><div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2,lineHeight:1.35}}>{txt||"Uma semana com pelo menos 1 treino já conta."}</div></div>
  </Vidro>;
}
const SEM=[78.4,78.1,78.3,77.9,78.0,78.2,77.8,77.9,77.7,78.0,77.8,77.6,77.9,77.7];

/* R0 · Início com o relatório chegando: aviso no topo e cartão */
function R0(){
  return <Phone tabs overlay={<div className="glass" style={{position:"absolute",top:58,left:10,right:10,zIndex:10,padding:"11px 13px",borderRadius:20,background:"var(--sheet)",display:"flex",gap:11,alignItems:"center"}}>
      <div style={{width:34,height:34,borderRadius:9,background:P,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontWeight:800,color:PF,fontSize:14}}>E</div>
      <div style={{flex:1,minWidth:0}}><Row style={{justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:"var(--ios-label)"}}>Seu relatório da semana chegou</span><span style={{fontSize:11,color:"var(--ios-label3)"}}>agora</span></Row><div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>4 de 4 treinos e 2 recordes. Veja o que mudou.</div></div>
    </div>}>
    <Scroll pb={110}>
      <Row style={{paddingTop:14,justifyContent:"space-between"}}>
        <div><div style={mono}>Domingo, 4 de outubro</div><div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:4}}>Olá, Marina</div></div>
        <BotaoRedondo icon="bell"/>
      </Row>
      <Vidro active style={{marginTop:18,padding:16}}>
        <Row style={{justifyContent:"space-between"}}><span style={{...mono,color:PT}}>Relatório da semana 3</span><span style={{fontSize:11,color:"var(--ios-label2)"}}>2 min</span></Row>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:8}}>Semana completa</div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          {[["dumbbell","4 de 4","treinos"],["trophy","2","recordes"],["trending-down","−0,4 kg","tendência"]].map(([ic,v,l])=><div key={l} style={{flex:1,padding:"9px 10px",borderRadius:14,background:"var(--glass-strong)"}}><div style={{display:"flex",alignItems:"center",gap:5}}>{I(ic,13,PT)}<span style={{fontSize:14,fontWeight:800,color:"var(--ios-label)"}}>{v}</span></div><div style={{fontSize:10.5,color:"var(--ios-label2)",marginTop:3}}>{l}</div></div>)}
        </div>
        <div style={{marginTop:14,height:42,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:11.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",background:P,color:PF}}>{I("arrow-right",15,PF)}Ver relatório</div>
      </Vidro>
      <Label>Amanhã · segunda</Label>
      <Vidro style={{display:"flex",alignItems:"center",gap:12}}>
        <CaixaDeIcone icon="clipboard-check" size={42}/>
        <div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>Check-in da semana</div><div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>1 minuto · ajusta sua meta</div></div>
      </Vidro>
    </Scroll>
  </Phone>;
}

/* R1 · Relatório da semana, em duas alturas de rolagem */
function R1({parte=1}){
  if(parte===2)return <Phone footer={<><Fade/><BotaoDeDestaque icon="check">Começar a semana 4</BotaoDeDestaque></>}>
    <Scroll>
      <div style={{height:14}}></div>
      <Label right="3 nesta semana">O que ajustamos para você</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="dumbbell" title="Carga subiu em 4 exercícios" sub="Você fez o topo das repetições em todas as séries."/>
        <LinhaDeVidro icon="target" title="Meta 2.150 → 2.000 kcal" sub="Aprovada no check-in: o peso caiu abaixo do ritmo."/>
        <LinhaDeVidro icon="repeat" title="Desenvolvimento → Elevação lateral" sub="Você contou um incômodo no ombro."/>
      </Vidro>
      <Label right="Bloco 1 · Base">Próxima semana</Label>
      <SemanasDoBloco atual={4}/>
      <Vidro style={{marginTop:10,display:"flex",gap:12,alignItems:"flex-start"}}>
        <CaixaDeIcone icon="battery-charging"/>
        <div style={{flex:1,fontSize:12.5,lineHeight:1.45,color:"var(--ios-label2)"}}><b style={{color:"var(--ios-label)"}}>Semana de descarga.</b> Metade das séries para o corpo recuperar. No fim dela, a reavaliação monta o Bloco 2.</div>
      </Vidro>
      <Constancia/>
    </Scroll>
  </Phone>;
  return <Phone>
    <Scroll>
      <Topo/>
      <Title eyebrow="Semana 3 de 4 · 28 set a 4 out" size={28} sub="Você treinou tudo e ficou mais forte em 3 exercícios.">Semana completa, Marina</Title>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <Numero icon="dumbbell" label="Treinos" value="4/4" sub="todos feitos"/>
        <Numero icon="utensils" label="Dieta" value="6/7" sub="dias na meta"/>
        <Numero icon="trending-down" label="Peso" value="−0,4" sub="kg · tendência"/>
      </div>
      <Label right="2 recordes">Você ficou mais forte</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="trophy" title="Supino com halteres" sub="10 kg → 12,5 kg × 12 · recorde" right={<Ganho>+2,5 kg</Ganho>}/>
        <LinhaDeVidro icon="trophy" title="Agachamento goblet" sub="14 kg × 12 → × 14 · recorde" right={<Ganho>+2 rep.</Ganho>}/>
        <LinhaDeVidro icon="timer" title="Prancha" sub="40 s → 50 s" right={<Ganho>+10 s</Ganho>}/>
      </Vidro>
      <Label right="2 semanas">Peso</Label>
      <Vidro style={{padding:"12px 12px 10px"}}>
        <Row style={{justifyContent:"space-between",marginBottom:6}}><Status icon="circle-check">No ritmo</Status><span style={{fontSize:11,color:"var(--ios-label2)"}}>média 77,8 kg</span></Row>
        <Tendencia data={SEM} h={96} band={[78.2,-0.075,0.18]}/>
        <Legenda/>
      </Vidro>
    </Scroll>
  </Phone>;
}
const R1b=()=><R1 parte={2}/>;

/* R1 · Variante: semana difícil, sem bronca */
function R1Dificil(){
  return <Phone footer={<><Fade/><BotaoDeDestaque icon="check">Começar a semana</BotaoDeDestaque></>}>
    <Scroll>
      <Topo right={null}/>
      <Title eyebrow="Semana 3 de 4 · 28 set a 4 out" size={28} sub="Acontece. Com pouco registro, não mexemos na sua meta.">Semana difícil, Marina</Title>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <Numero icon="dumbbell" label="Treinos" value="1/4" sub="terça"/>
        <Numero icon="utensils" label="Dieta" value="2/7" sub="dias registrados"/>
        <Numero icon="trending-down" label="Peso" value="—" sub="sem pesagem"/>
      </div>
      <Label>Para esta semana</Label>
      <GlassChoice icon="feather" title="Semana mais curta" sub="3 treinos de 30 min, mesmas cargas" active/>
      <GlassChoice icon="calendar-days" title="Manter o plano" sub="4 treinos de 45 min"/>
      <Constancia semanas={3} txt="O treino de terça manteve sua sequência."/>
    </Scroll>
  </Phone>;
}

/* R1 · Variante Aluno: o especialista comenta a semana */
function R1Aluno(){
  return <Phone footer={<><Fade/><BarraDeDuasAcoes sec="Responder" secIcon="message-circle" pri="Entendi" priIcon="check"/></>}>
    <Scroll>
      <Topo/>
      <Title eyebrow="Semana 3 · 28 set a 4 out" size={28}>Semana completa, Marina</Title>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <Numero icon="dumbbell" label="Treinos" value="4/4"/>
        <Numero icon="utensils" label="Dieta" value="6/7"/>
        <Numero icon="trending-down" label="Peso" value="−0,4"/>
      </div>
      <Label right="há 2 h">Seu especialista comentou</Label>
      <Vidro style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{width:40,height:40,borderRadius:99,background:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"var(--ios-label)",flexShrink:0}}>DL</div>
        <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)"}}>Daniel Levi</div><div style={{fontSize:12.5,lineHeight:1.45,color:"var(--ios-label2)",marginTop:3}}>Ótima semana! Segura o supino em 12,5 kg e capricha na descida. Troquei o desenvolvimento por causa do ombro.</div></div>
      </Vidro>
      <Label>O que o Daniel ajustou</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="repeat" title="Desenvolvimento → Elevação lateral" sub="Pelo incômodo no ombro"/>
        <LinhaDeVidro icon="target" title="Meta 2.150 → 2.000 kcal" sub="Revisada no seu check-in"/>
      </Vidro>
    </Scroll>
  </Phone>;
}

/* Variante para decidir · relatório em cartões, no estilo stories */
function Story({n,total=4,eyebrow,big,unit,txt,icon}){
  return <Phone>
    <div style={{position:"absolute",inset:0,zIndex:0,background:`radial-gradient(90% 60% at 50% 38%, ${tint(P,30)} 0%, transparent 70%)`}}></div>
    <div style={{position:"relative",zIndex:2,padding:"6px 14px 0",display:"flex",gap:4}}>{Array.from({length:total}).map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:99,background:i<n?"var(--ios-label)":"var(--glass-strong)"}}></div>)}</div>
    <Row style={{position:"relative",zIndex:2,padding:"12px 16px 0",justifyContent:"space-between"}}><span style={{...mono,color:"var(--ios-label2)"}}>Sua semana 3</span>{I("x",20,"var(--ios-label)")}</Row>
    <div style={{position:"relative",zIndex:2,flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"0 30px 120px"}}>
      <CaixaDeIcone icon={icon} size={64} solid/>
      <div style={{...mono,marginTop:22,color:PT}}>{eyebrow}</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:76,fontWeight:800,letterSpacing:"-.05em",color:"var(--ios-label)",lineHeight:1,marginTop:10}}>{big}</div>
      <div style={{fontSize:16,fontWeight:700,color:"var(--ios-label)",marginTop:6}}>{unit}</div>
      <div style={{fontSize:13.5,lineHeight:1.45,color:"var(--ios-label2)",marginTop:14,textWrap:"pretty"}}>{txt}</div>
    </div>
    <BotaoSecundario icon="share-2" bottom={40}>Compartilhar</BotaoSecundario>
  </Phone>;
}
const S1=()=><Story n={1} icon="dumbbell" eyebrow="Treinos" big="4 de 4" unit="treinos feitos" txt="Sua primeira semana completa. A sequência está em 3 semanas."/>;
const S2=()=><Story n={2} icon="trophy" eyebrow="Recorde" big="+2,5" unit="kg no supino" txt="12,5 kg × 12. Na próxima vez, a carga sugerida já é essa."/>;

Object.assign(window,{Topo,Numero,Ganho,SemanasDoBloco,Constancia,R0,R1,R1b,R1Dificil,R1Aluno,S1,S2});
