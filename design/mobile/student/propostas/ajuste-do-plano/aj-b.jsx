function HojeTopo(){
  return <Row style={{paddingTop:14,justifyContent:"space-between"}}>
    <div><div style={mono}>Segunda, 12 de outubro</div><div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:4}}>Olá, Marina</div></div>
    <BotaoRedondo icon="bell"/>
  </Row>;
}
const btn=(pri)=>({flex:1,height:42,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:11.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",background:pri?P:"var(--glass-strong)",color:pri?PF:"var(--ios-label)",border:pri?"none":"1px solid var(--glass-brd)"});
function A6({modo="proposta"}){
  const card={
    pendente:<Vidro active style={{marginTop:18,padding:16}}>
      <Row style={{justifyContent:"space-between"}}><span style={{...mono,color:PT}}>Próxima ação</span><span style={{fontSize:11,color:"var(--ios-label2)"}}>1 min</span></Row>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:8}}>Faça o check-in da semana</div>
      <div style={{fontSize:12.5,color:"var(--ios-label2)",marginTop:4}}>Duas perguntas para ajustar seu plano.</div>
      <div style={{display:"flex",marginTop:14}}><div style={btn(1)}>{I("clipboard-check",15,PF)}Começar</div></div>
    </Vidro>,
    proposta:<Vidro active style={{marginTop:18,padding:16}}>
      <Row style={{justifyContent:"space-between"}}><span style={{...mono,color:PT}}>Ajuste da semana</span><Status icon="trending-down">Abaixo do ritmo</Status></Row>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:10}}>Meta proposta: 2.000 kcal</div>
      <div style={{fontSize:12.5,color:"var(--ios-label2)",marginTop:4}}>Você perdeu 0,3 kg, abaixo do ritmo escolhido.</div>
      <div style={{display:"flex",marginTop:14}}><div style={btn(1)}>{I("arrow-right",15,PF)}Ver ajuste</div></div>
    </Vidro>,
    aprovado:<Vidro style={{marginTop:18,padding:14,display:"flex",gap:12,alignItems:"center"}}>
      <CaixaDeIcone icon="circle-check" size={38}/>
      <div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>Plano atualizado · 2.000 kcal</div><div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>Cardápio refeito para a nova meta</div></div>
      <span style={{fontSize:12,fontWeight:600,color:"var(--ios-label2)"}}>Desfazer</span>
    </Vidro>,
  }[modo];
  return <Phone tabs>
    <Scroll pb={110}>
      <HojeTopo/>
      {card}
      <Label>{modo==="aprovado"?"Agora · 12:30":"Depois"}</Label>
      <Vidro style={{padding:14}}>
        <Row style={{justifyContent:"space-between"}}><span style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>Almoço · {modo==="aprovado"?"580":"620"} kcal</span><span style={{fontSize:11,color:"var(--ios-label2)"}}>12:30</span></Row>
        <div style={{fontSize:12,color:"var(--ios-label2)",marginTop:3}}>Arroz, feijão, frango grelhado, salada</div>
        {modo==="aprovado"&&<div style={{display:"flex",gap:9,marginTop:12}}><div style={btn(1)}>{I("check",15,PF)}Comi</div><div style={btn(0)}>{I("repeat",15,"var(--ios-label)")}Trocar</div></div>}
      </Vidro>
      <Label>Treino de hoje</Label>
      <Vidro style={{display:"flex",alignItems:"center",gap:12}}>
        <CaixaDeIcone icon="dumbbell" size={42}/>
        <div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>Treino A · Superiores</div><div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>45 min · 6 exercícios · em casa</div></div>
        <div style={{width:38,height:38,borderRadius:99,background:P,display:"flex",alignItems:"center",justifyContent:"center"}}>{I("play",16,PF)}</div>
      </Vidro>
    </Scroll>
  </Phone>;
}
const A6Pend=()=><A6 modo="pendente"/>,A6Ok=()=><A6 modo="aprovado"/>;
function A7Descarga(){
  return <Phone footer={<BotaoDeDestaque icon="check">Entendi</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader/>
      <div style={{marginTop:28}}><CaixaDeIcone icon="battery-charging" size={60}/></div>
      <Title eyebrow="Fim do bloco 1" size={28} sub="Metade do volume para o corpo recuperar. Já estava no seu plano: a cada 4 semanas.">Semana 4: descarga</Title>
      <Vidro style={{marginTop:20,padding:"2px 14px"}}>
        <AntesDepois first icon="layers" title="Séries por exercício" antes="3" depois="2 · mesma carga" delta="−50% vol."/>
        <AntesDepois icon="timer" title="Tempo por treino" antes="45 min" depois="30 min" delta="−15 min"/>
        <AntesDepois icon="target" title="Meta diária" antes="2.000 kcal" depois="2.000 kcal" delta="0 kcal"/>
      </Vidro>
      <Nota style={{marginTop:12}}>Na semana 5 tudo volta ao normal, com as cargas da semana 3.</Nota>
    </Scroll>
  </Phone>;
}
function NivelMuda(){
  return <Vidro style={{marginTop:18,padding:"2px 14px"}}>
    <AntesDepois first icon="calendar-days" title="Dias por semana" antes="4" depois="5" delta="+1 dia"/>
    <AntesDepois icon="layout-grid" title="Divisão" antes="Corpo todo" depois="Por grupo muscular" delta="nova"/>
    <AntesDepois icon="timer" title="Tempo por treino" antes="45 min" depois="45 min" delta="igual"/>
  </Vidro>;
}
function A7Nivel(){
  return <Phone footer={<BarraDeDuasAcoes sec="Continuar como estou" secIcon="x" pri="Aprovar" priIcon="check"/>}>
    <Scroll>
      <OnbHeader/>
      <div style={{marginTop:28}}><CaixaDeIcone icon="chevrons-up" size={60}/></div>
      <Title eyebrow="Fim do bloco 2 · semana 8" size={26} sub="8 semanas com 80% dos treinos feitos.">Quer passar para intermediário?</Title>
      <NivelMuda/>
      <Nota style={{marginTop:12}}>Se não gostar, você volta para iniciante pelo perfil.</Nota>
    </Scroll>
  </Phone>;
}
function A7Aviso(){
  return <Phone footer={<><BotaoDeDestaque bottom={84} icon="check">Ver nova semana</BotaoDeDestaque><BotaoSecundario text bottom={40}>Voltar para iniciante</BotaoSecundario></>}>
    <Scroll>
      <OnbHeader/>
      <div style={{marginTop:28}}><CaixaDeIcone icon="chevrons-up" size={60}/></div>
      <Title eyebrow="Fim do bloco 2 · semana 8" size={26} sub="8 semanas com 80% dos treinos feitos. Seu plano já foi atualizado.">Você passou para intermediário</Title>
      <NivelMuda/>
    </Scroll>
  </Phone>;
}
function A8(){
  return <Phone footer={<><Fade/><BotaoDeDestaque icon="pause">Pausar plano</BotaoDeDestaque></>}>
    <Scroll pb={130}>
      <OnbHeader/>
      <Title size={26} sub="Metas e sequência ficam pausadas. Nada se perde.">Modo Descanso</Title>
      <Label>Motivo</Label>
      <GlassChoice icon="thermometer" title="Estou doente" active/>
      <GlassChoice icon="bandage" title="Estou machucada"/>
      <GlassChoice icon="plane" title="Viagem ou rotina corrida"/>
      <Label>Até quando</Label>
      <div style={{display:"flex",gap:7}}>{["3 dias","1 semana","2 semanas","Não sei"].map((d,i)=><ChipPick key={d} w={1} on={i===1}>{d}</ChipPick>)}</div>
      <Label>Fica pausado</Label>
      <Chips>{["Meta de calorias","Sequência","Check-in da semana"].map(t=><span key={t} style={{display:"inline-flex",alignItems:"center",gap:6,height:32,padding:"0 12px",borderRadius:99,background:"var(--glass-strong)",fontSize:12,fontWeight:600,color:"var(--ios-label)"}}>{I("pause",12,"var(--ios-label2)")}{t}</span>)}</Chips>
    </Scroll>
  </Phone>;
}
function A8Volta(){
  const S=[["S","Corpo todo",1],["T",null],["Q","Mobilidade",1],["Q",null],["S","Corpo todo",1],["S",null],["D",null]];
  return <Phone footer={<BarraDeDuasAcoes sec="Ajustar" secIcon="sliders-horizontal" pri="Começar a semana" priIcon="check"/>}>
    <Scroll>
      <OnbHeader back={false}/>
      <div style={{marginTop:20}}><CaixaDeIcone icon="sunrise" size={60}/></div>
      <Title eyebrow="Fim do Modo Descanso" size={28} sub="Esta semana começa mais leve.">Bem-vinda de volta</Title>
      <Label right="semana de retorno">Seus treinos</Label>
      <Vidro style={{display:"flex",gap:5,padding:10}}>{S.map(([d,f],i)=><div key={i} style={{flex:1,borderRadius:12,padding:"8px 2px",textAlign:"center",background:f?tint(P,14):"transparent",border:`1px solid ${f?"var(--glass-brd)":"transparent"}`}}><div style={{fontSize:11,fontWeight:800,color:"var(--ios-label)"}}>{d}</div><div style={{fontSize:8.5,fontWeight:600,lineHeight:1.2,color:f?"var(--ios-label2)":"var(--ios-label3)",marginTop:4,minHeight:20}}>{f||"Livre"}</div></div>)}</Vidro>
      <Vidro style={{marginTop:12,padding:"2px 14px"}}>
        <AntesDepois first icon="calendar-days" title="Treinos nesta semana" antes="4" depois="3" delta="−1"/>
        <AntesDepois icon="dumbbell" title="Carga" antes="como antes" depois="−20% para reacostumar" delta="−20%"/>
      </Vidro>
    </Scroll>
  </Phone>;
}
const W9=Array.from({length:22},(_,i)=>+(78-i*0.29+0.22*Math.sin(i*1.9)).toFixed(1));W9[21]=72.0;
function A9(){
  return <Phone footer={<><BotaoDeDestaque bottom={96} icon="check">Passar para manutenção</BotaoDeDestaque><BotaoSecundario bottom={40} icon="target">Definir nova meta</BotaoSecundario></>}>
    <Scroll>
      <OnbHeader back={false}/>
      <Title eyebrow="Meta atingida" size={30} sub="Foram 16 semanas. Agora dá para comer mais e manter.">Você chegou a 72 kg.</Title>
      <Vidro style={{marginTop:16,padding:12}}><Tendencia data={W9} h={100} win={5} xl={[{i:0,label:"Jun"},{i:21,label:"Out"}]}/></Vidro>
      <Label>Proposta</Label>
      <Vidro style={{padding:"2px 14px"}}><AntesDepois first icon="target" title="Meta diária" antes="2.000 kcal" depois="2.350 kcal · manutenção" delta="+350 kcal"/></Vidro>
      <Nota style={{marginTop:10}}>Estimativa; recalibramos com seus dados em 2 a 4 semanas.</Nota>
    </Scroll>
  </Phone>;
}
const W10=Array.from({length:42},(_,i)=>+(78.4-i*0.06+0.25*Math.sin(i*1.7)+0.15*Math.cos(i*0.9)).toFixed(1));
function A10(){
  return <Phone tabs="Progresso">
    <Scroll pb={110}>
      <Row style={{paddingTop:14,gap:12}}><BotaoRedondo/><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>Tendência de peso</div></Row>
      <div style={{marginTop:16}}><GlassSegmented opts={["4 semanas","3 meses","Tudo"]} value="3 meses"/></div>
      <div style={{marginTop:12,padding:"14px 10px 12px",borderRadius:22,background:"hsl(var(--surface))",border:"1px solid var(--glass-brd)"}}>
        <Row style={{justifyContent:"space-between",padding:"0 6px",alignItems:"flex-end"}}><div><div style={{...mono,fontSize:9}}>Tendência hoje</div><div style={{fontFamily:"var(--font-display)",fontSize:30,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>75,9 <span style={{fontSize:14,color:"var(--ios-label2)"}}>kg</span></div></div><Status icon="circle-check">No ritmo</Status></Row>
        <div style={{marginTop:6}}><Tendencia data={W10} h={250} axis band={[78.3,-0.058,0.35]} ms={[{i:10,label:"2.000 kcal"},{i:28,label:"Intermediário"}]} xl={[{i:0,label:"Sem 1"},{i:20,label:"Sem 6"},{i:41,label:"Sem 12"}]}/></div>
        <div style={{padding:"0 6px"}}><Legenda/></div>
      </div>
      <Label>Ajustes aprovados</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="target" title="Meta 2.150 → 2.000 kcal" sub="Semana 3 · abaixo do ritmo"/>
        <LinhaDeVidro icon="chevrons-up" title="Passou para intermediário" sub="Semana 8 · 80% dos treinos"/>
      </Vidro>
    </Scroll>
  </Phone>;
}
Object.assign(window,{A6,A6Pend,A6Ok,A7Descarga,A7Nivel,A7Aviso,A8,A8Volta,A9,A10});
