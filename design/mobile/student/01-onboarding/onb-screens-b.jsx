function Curva({pct=100,faded}){
  return <Vidro style={{marginTop:22,opacity:faded?.45:1}}>
    <Row style={{justifyContent:"space-between"}}><span style={mono}>Projeção · estimativa</span><span style={{fontSize:11,fontWeight:600,color:"var(--ios-label2)"}}>16 semanas</span></Row>
    <svg viewBox="0 0 320 120" width="100%" height="120" style={{display:"block",marginTop:10}}>
      {[30,60,90].map(y=><line key={y} x1="0" x2="320" y1={y} y2={y} stroke="var(--glass-brd)" strokeDasharray="2 4"/>)}
      <path d="M8 34 C 90 40, 170 64, 312 70 L 312 98 C 170 92, 90 52, 8 34 Z" fill={tint(P,14)} style={{clipPath:`inset(0 ${100-pct}% 0 0)`}}/>
      <path d="M8 34 C 90 44, 170 76, 312 84" fill="none" stroke={P} strokeWidth="3" strokeLinecap="round" pathLength="100" strokeDasharray={`${pct} 100`}/>
      <circle cx="8" cy="34" r="5" fill={P}/>
    </svg>
    <Row style={{justifyContent:"space-between",fontSize:11,color:"var(--ios-label2)",marginTop:4}}><span><b style={{color:"var(--ios-label)"}}>Hoje</b> · 78 kg</span><span>faixa provável</span></Row>
    <Nota style={{marginTop:10}}>Estimativa; recalibramos com seus dados em 2 a 4 semanas.</Nota>
  </Vidro>;
}
function O8({erro}){
  return <Phone footer={erro?<BotaoDeDestaque icon="rotate-cw">Tentar de novo</BotaoDeDestaque>:null}>
    <Scroll>
      <OnbHeader back={!!erro}/>
      {erro?<div style={{marginTop:16}}><CaixaDeIcone icon="wifi-off" tone={RED} size={52}/></div>:null}
      <Title size={28} eyebrow={erro?"Sem conexão":"Leva uns segundos"} sub={erro?"Sua conexão caiu no meio. Suas respostas estão salvas.":"Estamos juntando tudo que você contou."}>{erro?"Não conseguimos montar agora":"Montando seu plano"}</Title>
      <Curva pct={erro?30:62} faded={erro}/>
      <Vidro style={{marginTop:12,padding:"2px 14px"}}>
        <div style={{marginTop:-1}}>
          <PassoDeEspera state="done" label="Calculando sua meta"/>
          <PassoDeEspera state={erro?"error":"done"} label="Escolhendo seus alimentos"/>
          <PassoDeEspera state={erro?"todo":"active"} label="Montando sua semana de treino"/>
        </div>
      </Vidro>
    </Scroll>
  </Phone>;
}
const O8Erro=()=><O8 erro/>;
const MAC=[["Proteína","140 g",BLU,62],["Carboidrato","240 g",P,78],["Gordura","70 g",PNK,45]];
function PlanoConteudo(){
  const DIA=[["coffee","Café da manhã","Tapioca com ovos, mamão","400"],["apple","Lanche da manhã","Banana com pasta de amendoim","250"],["soup","Almoço","Arroz, feijão, frango grelhado, salada","620"],["cookie","Lanche da tarde","Iogurte sem lactose, aveia, morangos","300"],["utensils","Jantar","Arroz, ovos mexidos, legumes","580"]];
  const SEM=[["S","Superiores"],["T","Inferiores"],["Q",null],["Q","Corpo todo"],["S","Core e mobilidade"],["S","Corrida leve"],["D",null]];
  return <Scroll pb={110}>
    <OnbHeader/>
    <Title size={28} sub="Revise e aprove. Você pode ajustar quando quiser.">Seu plano está pronto</Title>
    <Vidro style={{marginTop:16,padding:12,display:"flex",gap:14,alignItems:"center"}}>
      <Anel pct={100} size={96} stroke={9} value="2.150" unit="kcal / dia" sub="estimativa"/>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
        {MAC.map(([l,v,c,p])=><div key={l}><Row style={{justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11.5,fontWeight:600,color:"var(--ios-label2)"}}>{l}</span><span style={{fontSize:12,fontWeight:800,color:"var(--ios-label)"}}>{v}</span></Row><BarraDeProgresso pct={p} color={c} h={5}/></div>)}
      </div>
    </Vidro>
    <Label right="4 treinos · 45 min">Sua semana de treino</Label>
    <Vidro style={{display:"flex",gap:5,padding:10}}>
      {SEM.map(([d,f],i)=>{const opt=i===5;return <div key={i} style={{flex:1,borderRadius:12,padding:"8px 2px",textAlign:"center",background:f?(opt?"transparent":tint(P,14)):"transparent",border:`1px ${opt?"dashed":"solid"} ${f?"var(--glass-brd)":"transparent"}`}}>
        <div style={{fontSize:11,fontWeight:800,color:"var(--ios-label)"}}>{d}</div>
        <div style={{fontSize:8.5,fontWeight:600,lineHeight:1.2,color:f?"var(--ios-label2)":"var(--ios-label3)",marginTop:4,minHeight:20}}>{f||"Livre"}</div>
        {opt&&<div style={{fontFamily:"var(--font-mono)",fontSize:7.5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"var(--ios-label2)",marginTop:3}}>opcional</div>}
      </div>;})}
    </Vidro>
    <Nota style={{marginTop:9}}>Corrida leve: opcional, vem do esporte que você marcou.</Nota>
    <Label right="2.150 kcal">Um dia de exemplo</Label>
    <Vidro style={{padding:"2px 14px"}}>{DIA.map(([i,t,s,k],n)=><LinhaDeVidro key={t} first={n===0} title={t} sub={s} right={<span style={{fontSize:12,fontWeight:800,color:"var(--ios-label)",whiteSpace:"nowrap"}}>{k} <span style={{fontWeight:600,color:"var(--ios-label3)"}}>kcal</span></span>}/>)}</Vidro>
  </Scroll>;
}
function O9(){return <Phone footer={<><Fade/><BarraDeDuasAcoes sec="Ajustar" secIcon="sliders-horizontal" pri="Aprovar plano" priIcon="check"/></>}><PlanoConteudo/></Phone>;}
function O10(){
  return <Phone overlay={<GlassSheet title="Ajustar plano" sub="Toque para aplicar. Dá para desfazer.">
    <AntesDepois first icon="repeat" title="Trocar um alimento" antes="Frango grelhado" depois="Carne moída magra" delta="+20 kcal"/>
    <AntesDepois icon="piggy-bank" title="Mais barato" antes="Iogurte sem lactose" depois="Leite sem lactose" delta="−30 kcal"/>
    <AntesDepois icon="zap" title="Mais rápido" antes="Jantar · 35 min" depois="Omelete · 10 min" delta="−40 kcal"/>
    <AntesDepois icon="beef" title="Mais proteína" antes="140 g" depois="160 g por dia" delta="+80 kcal"/>
    <AntesDepois icon="calendar-days" title="Mudar dias de treino" antes="4 dias" depois="3 dias · Seg, Qua, Sex" delta="−90 kcal"/>
  </GlassSheet>}><PlanoConteudo/></Phone>;
}
function O11(){
  return <Phone footer={<><BotaoDeDestaque bottom={84} icon="link">Conectar</BotaoDeDestaque><BotaoSecundario text bottom={40}>Agora não</BotaoSecundario></>}>
    <Scroll>
      <OnbHeader back={false}/>
      <Row style={{marginTop:22,gap:10}}>
        {[["heart","Saúde"],["activity","Health Connect"]].map(([i,l])=><Vidro key={l} style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:12}}><CaixaDeIcone icon={i} size={36}/><span style={{fontSize:12.5,fontWeight:700,color:"var(--ios-label)"}}>{l}</span></Vidro>)}
      </Row>
      <Title size={24} eyebrow="Opcional" sub="Com isso, a meta se ajusta aos seus dias mais e menos ativos.">Quer que o app use seus passos e seu sono para ajustar o plano?</Title>
      <Label>O que vamos ler</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="footprints" title="Passos" sub="Para ajustar a meta do dia"/>
        <LinhaDeVidro icon="moon" title="Sono" sub="Para aliviar o treino depois de noites ruins"/>
        <LinhaDeVidro icon="watch" title="Treinos do relógio" sub="Para não contar duas vezes"/>
      </Vidro>
      <Nota icon="lock" style={{marginTop:14}}>Só lemos esses dados. Nada é compartilhado, e você desliga quando quiser.</Nota>
    </Scroll>
  </Phone>;
}
function O12(){
  return <Phone tabs>
    <Scroll pb={110}>
      <Row style={{paddingTop:14,justifyContent:"space-between"}}>
        <div><div style={mono}>Segunda, 5 de outubro</div><div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:4}}>Olá, Marina</div></div>
        <BotaoRedondo icon="bell"/>
      </Row>
      <Vidro active style={{marginTop:18,padding:16}}>
        <Row style={{justifyContent:"space-between"}}><span style={{...mono,color:PT}}>Agora · 12:30</span><span style={{fontSize:11,color:"var(--ios-label2)"}}>próxima ação</span></Row>
        <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:8}}>Almoço · 620 kcal</div>
        <div style={{fontSize:12.5,color:"var(--ios-label2)",marginTop:4}}>Arroz, feijão, frango grelhado, salada</div>
        <div style={{display:"flex",gap:9,marginTop:14}}>
          <div style={{flex:1,height:42,borderRadius:13,background:P,color:PF,display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:11.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase"}}>{I("check",15,PF)}Comi</div>
          <div style={{flex:1,height:42,borderRadius:13,background:"var(--glass-strong)",border:"1px solid var(--glass-brd)",color:"var(--ios-label)",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:11.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase"}}>{I("repeat",15,"var(--ios-label)")}Trocar</div>
        </div>
      </Vidro>
      <Label>Treino de hoje</Label>
      <Vidro style={{display:"flex",alignItems:"center",gap:12}}>
        <CaixaDeIcone icon="dumbbell" size={42}/>
        <div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>Treino A · Superiores</div><div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>45 min · 6 exercícios · em casa</div></div>
        <div style={{width:38,height:38,borderRadius:99,background:P,display:"flex",alignItems:"center",justifyContent:"center"}}>{I("play",16,PF)}</div>
      </Vidro>
      <Label>Seu dia</Label>
      <Vidro style={{display:"flex",gap:14,alignItems:"center"}}>
        <Anel pct={30} size={84} stroke={8} value="650" unit="de 2.150"/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
          {[["Proteína","42 / 140 g",BLU,30],["Água","0,5 / 2,5 L",P,20],["Passos","—  conecte o relógio","var(--ios-label3)",0]].map(([l,v,c,p])=><div key={l}><Row style={{justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11.5,color:"var(--ios-label2)"}}>{l}</span><span style={{fontSize:11.5,fontWeight:700,color:"var(--ios-label)"}}>{v}</span></Row><BarraDeProgresso pct={p} color={c} h={5}/></div>)}
        </div>
      </Vidro>
      <Row style={{marginTop:12,padding:"11px 14px",borderRadius:16,border:"1px dashed var(--glass-brd)"}}>
        {I("user-round-pen",17,"var(--ios-label2)")}
        <div style={{flex:1,fontSize:12.5,color:"var(--ios-label2)"}}><b style={{color:"var(--ios-label)"}}>Complete seu perfil</b> · 2 itens, 1 min</div>
        {I("chevron-right",16,"var(--ios-label3)")}
      </Row>
    </Scroll>
  </Phone>;
}
function Board(){
  const box={padding:16,borderRadius:22,background:"var(--ios-bg)",border:"1px solid var(--glass-brd)",position:"relative",overflow:"hidden"};
  const H=({children})=><div style={{...mono,margin:"0 0 10px"}}>{children}</div>;
  return <div style={{width:760,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,color:"var(--ios-label)",fontFamily:"var(--font-sans)"}}>
    <div style={box}><H>ChipMulti · múltipla escolha</H><Chips gap={8}><ChipMulti>Desmarcado</ChipMulti><ChipMulti on>Marcado</ChipMulti></Chips><div style={{height:14}}></div><H>ChipPick · escolha única</H><div style={{display:"flex",gap:7}}><ChipPick w={1}>3</ChipPick><ChipPick w={1} on>4</ChipPick><ChipPick w={1}>5</ChipPick></div></div>
    <div style={box}><H>ChoiceTile · GlassChoice compacto</H><div style={{display:"flex",gap:8}}><ChoiceTile icon="building-2" title="Academia"/><ChoiceTile icon="house" title="Casa" active/></div></div>
    <div style={box}><H>Campo · normal e fora da faixa</H><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><Campo label="Peso" value="78" unit="kg"/><Campo label="Altura" value="1,72" unit="cm" error="Use centímetros. Ex.: 172"/></div></div>
    <div style={box}><H>Precisão do plano</H><Precisao pct={40} nivel="Baixa"/><div style={{height:8}}></div><Precisao pct={85} nivel="Alta"/></div>
    <div style={box}><H>PassoDeEspera · 4 estados</H><PassoDeEspera state="done" label="Feito"/><PassoDeEspera state="active" label="Em andamento"/><PassoDeEspera state="todo" label="Aguardando"/><PassoDeEspera state="error" label="Interrompido"/></div>
    <div style={box}><H>AntesDepois · ajuste</H><AntesDepois first icon="piggy-bank" title="Mais barato" antes="Iogurte grego" depois="Iogurte natural" delta="−30 kcal"/><AntesDepois icon="beef" title="Mais proteína" antes="140 g" depois="160 g" delta="+80 kcal"/></div>
    <div style={{...box,height:180}}><H>BotaoDeDestaque · ativo</H><BotaoDeDestaque bottom={16}>Continuar</BotaoDeDestaque></div>
    <div style={{...box,height:180}}><H>BotaoDeDestaque · desabilitado</H><BotaoDeDestaque bottom={16} disabled hint="Escolha uma opção para continuar">Continuar</BotaoDeDestaque></div>
  </div>;
}
Object.assign(window,{O8,O8Erro,O9,O10,O11,O12,Board});
