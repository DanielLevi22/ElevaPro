function smooth(pts){
  if(pts.length<2)return "";let d=`M${pts[0][0]} ${pts[0][1]}`;
  for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    d+=` C${p1[0]+(p2[0]-p0[0])/6} ${p1[1]+(p2[1]-p0[1])/6}, ${p2[0]-(p3[0]-p1[0])/6} ${p2[1]-(p3[1]-p1[1])/6}, ${p2[0]} ${p2[1]}`;}
  return d;
}
/* novo · Tendência de peso: pesagens em pontos, tendência lime, faixa do ritmo, marcos */
function Tendencia({data,h=120,band,ms=[],axis,xl=[],faded,pct=100,win=5}){
  const w=320,l=axis?34:6,r=8,t=axis?22:10,b=axis?22:8,n=data.length;
  const bl=band?data.map((_,i)=>band[0]+band[1]*i):[];
  const all=[...data,...bl.map(v=>v+band?.[2]||0),...bl.map(v=>v-(band?.[2]||0))];
  const mn=Math.min(...all)-.15,mx=Math.max(...all)+.15;
  const X=i=>l+i*(w-l-r)/(n-1),Y=v=>t+(mx-v)/(mx-mn)*(h-t-b);
  const tr=data.map((_,i)=>{const s=data.slice(Math.max(0,i-(win>>1)),i+(win>>1)+1);return s.reduce((a,c)=>a+c,0)/s.length;});
  const up=bl.map((v,i)=>[X(i),Y(v+band[2])]),lo=bl.map((v,i)=>[X(i),Y(v-band[2])]).reverse();
  const ticks=axis?[mx-.15,(mx+mn)/2,mn+.15]:[];
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{display:"block",opacity:faded?.4:1}}>
    {ticks.map(v=><g key={v}><line x1={l} x2={w-r} y1={Y(v)} y2={Y(v)} stroke="var(--glass-brd)" strokeDasharray="2 4"/><text x={l-6} y={Y(v)+3} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ios-label3)">{v.toFixed(1).replace(".",",")}</text></g>)}
    {band&&<><path d={`M${up.map(p=>p.join(" ")).join(" L")} L${lo.map(p=>p.join(" ")).join(" L")} Z`} fill={tint(P,12)}/><path d={`M${up.map(p=>p.join(" ")).join(" L")}`} fill="none" stroke={tint(P,45)} strokeDasharray="3 3"/><path d={`M${lo.reverse().map(p=>p.join(" ")).join(" L")}`} fill="none" stroke={tint(P,45)} strokeDasharray="3 3"/></>}
    {ms.map(m=><g key={m.i}><line x1={X(m.i)} x2={X(m.i)} y1={t-8} y2={h-b} stroke="var(--ios-label3)" strokeDasharray="2 3"/><circle cx={X(m.i)} cy={h-b} r="4" fill="var(--ios-bg)" stroke={P} strokeWidth="2"/><text x={X(m.i)+5} y={t-10} fontSize="9.5" fontWeight="700" fill="var(--ios-label2)">{m.label}</text></g>)}
    {data.map((v,i)=><circle key={i} cx={X(i)} cy={Y(v)} r={n>30?2:2.8} fill="var(--ios-label3)"/>)}
    <path d={smooth(tr.map((v,i)=>[X(i),Y(v)]))} fill="none" stroke={P} strokeWidth="2.6" strokeLinecap="round" pathLength="100" strokeDasharray={`${pct} 100`}/>
    {pct===100&&<circle cx={X(n-1)} cy={Y(tr[n-1])} r="4.5" fill={P}/>}
    {xl.map(x=><text key={x.i} x={X(x.i)} y={h-6} textAnchor={x.i===0?"start":x.i===n-1?"end":"middle"} fontSize="9" fontFamily="var(--font-mono)" fill="var(--ios-label3)">{x.label}</text>)}
  </svg>;
}
function Legenda({band=true}){
  const it={display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:"var(--ios-label2)"};
  return <Row style={{gap:14,marginTop:8,flexWrap:"wrap"}}><span style={it}><span style={{width:6,height:6,borderRadius:99,background:"var(--ios-label3)"}}></span>Pesagem</span><span style={it}><span style={{width:14,height:3,borderRadius:99,background:P}}></span>Tendência</span>{band&&<span style={it}><span style={{width:14,height:8,borderRadius:3,background:tint(P,12),border:`1px dashed ${tint(P,45)}`}}></span>Ritmo escolhido</span>}</Row>;
}
const W2=[78.4,78.1,78.3,77.9,78.0,78.2,77.8,77.9,77.7,78.0,77.8,77.6,77.9,77.7];
/* novo · Chip de motivo da carga sugerida */
function ChipDeMotivo({icon,delta,txt}){
  return <span style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 11px 5px 5px",borderRadius:99,background:"var(--glass-strong)",border:"1px solid var(--glass-brd)",fontSize:11.5,color:"var(--ios-label2)"}}>
    <span style={{width:20,height:20,borderRadius:99,background:tint(P,18),display:"flex",alignItems:"center",justifyContent:"center"}}>{I(icon,12,PT)}</span><span><b style={{color:"var(--ios-label)"}}>{delta}</b> · {txt}</span>
  </span>;
}
function Exercicio({nome,series,carga,motivo,active}){
  return <Vidro active={active} style={{marginBottom:9,padding:13}}>
    <Row style={{justifyContent:"space-between"}}><span style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>{nome}</span><span style={{fontSize:11.5,color:"var(--ios-label2)"}}>{series}</span></Row>
    <Row style={{marginTop:10,gap:10,alignItems:"center"}}>
      <div style={{padding:"6px 12px",borderRadius:12,background:"var(--field)",border:"1px solid var(--field-brd)",flexShrink:0}}><div style={{...mono,fontSize:8.5}}>Carga sugerida</div><div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:800,color:"var(--ios-label)"}}>{carga}</div></div>
      <ChipDeMotivo {...motivo}/>
    </Row>
  </Vidro>;
}
function SessaoHeader({sub}){return <><OnbHeader/><Title size={24} sub={sub}>Treino A · Superiores</Title></>;}
function A1(){
  return <Phone footer={<BotaoDeDestaque icon="play">Começar série 1</BotaoDeDestaque>}>
    <Scroll>
      <SessaoHeader sub="6 exercícios · 45 min · em casa"/>
      <Label>Cargas de hoje</Label>
      <Exercicio active nome="Supino com halteres" series="3 × 10–12" carga="12,5 kg" motivo={{icon:"arrow-up",delta:"+2,5 kg",txt:"você fez 12 nas 3 séries"}}/>
      <Exercicio nome="Remada curvada" series="3 × 10–12" carga="10 kg" motivo={{icon:"equal",delta:"Mantém",txt:"tente mais repetições"}}/>
      <Exercicio nome="Desenvolvimento" series="3 × 8–10" carga="7,5 kg" motivo={{icon:"arrow-down",delta:"−5%",txt:"duas falhas seguidas"}}/>
      <Nota style={{marginTop:6}} icon="info">A carga sugerida se ajusta sozinha. Toque nela para trocar quando quiser.</Nota>
    </Scroll>
  </Phone>;
}
function A2(){
  return <Phone footer={<><div className="glass" style={{position:"absolute",left:18,right:18,bottom:110,zIndex:6,padding:14,background:"var(--sheet)"}}>
      <Row style={{justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:14,fontWeight:700,color:"var(--ios-label)"}}>Como foi?</span><span style={{fontSize:12,fontWeight:600,color:"var(--ios-label2)"}}>Pular</span></Row>
      <div style={{display:"flex",gap:7}}><ChipPick w={1}>Fácil</ChipPick><ChipPick w={1} on>Ok</ChipPick><ChipPick w={1}>Difícil</ChipPick></div>
      <Nota style={{marginTop:9}}>Ajuda a sugerir a carga da próxima vez.</Nota>
    </div><BotaoDeDestaque>Próximo exercício</BotaoDeDestaque></>}>
    <Scroll>
      <SessaoHeader sub="Exercício 1 de 6 · concluído"/>
      <Vidro style={{marginTop:18,padding:"4px 14px"}}>
        <div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)",padding:"10px 0 4px"}}>Supino com halteres</div>
        {[1,2,3].map(s=><LinhaDeVidro key={s} title={`Série ${s}`} sub="12 repetições · 12,5 kg" right={<span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,color:"var(--ios-label2)"}}>{I("circle-check",17,PT)}Feita</span>}/>)}
      </Vidro>
    </Scroll>
  </Phone>;
}
function A3(){
  const N=[["Supino com halteres","+2,5 kg","arrow-up"],["Remada curvada","Mantém","equal"],["Desenvolvimento","+1 repetição","plus"],["Agachamento goblet","+2,5 kg","arrow-up"],["Prancha","+10 s","plus"]];
  return <Phone footer={<BotaoDeDestaque icon="check">Concluir</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader back={false}/>
      <Title eyebrow="Treino concluído" size={28} sub="Treino A · Superiores">Bom treino, Marina</Title>
      <div style={{display:"flex",gap:8,marginTop:18}}>
        {[["Tempo","43 min"],["Volume","2.840 kg"]].map(([l,v])=><Vidro key={l} style={{flex:1,padding:"11px 12px"}}><div style={{...mono,fontSize:9}}>{l}</div><div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:800,color:"var(--ios-label)",marginTop:3}}>{v}</div></Vidro>)}
        <Vidro active style={{flex:1.2,padding:"11px 12px"}}><div style={{...mono,fontSize:9,color:PT,display:"flex",gap:4,alignItems:"center"}}>{I("trophy",11,PT)}Recorde</div><div style={{fontSize:12,fontWeight:700,color:"var(--ios-label)",marginTop:4,lineHeight:1.3}}>Supino 12,5 kg × 12</div></Vidro>
      </div>
      <Label right="já salvo no plano">Na próxima vez</Label>
      <Vidro style={{padding:"2px 14px"}}>{N.map(([e,d,i],k)=><LinhaDeVidro key={e} first={k===0} title={e} right={<span style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:99,background:"var(--glass-strong)",fontSize:11.5,fontWeight:700,color:"var(--ios-label)"}}>{I(i,12,PT)}{d}</span>}/>)}</Vidro>
    </Scroll>
  </Phone>;
}
function A4({diaria,erro}){
  const Q=["Registrei tudo","Registrei parte","Não registrei, mas segui o plano","Não segui"];
  const D=[["Seg","77,9"],["Ter","77,7"],["Qua","78,0"],["Qui","77,8"],["Sex","77,6"],["Sáb","—"],["Dom","77,7"]];
  return <Phone footer={erro?<BotaoDeDestaque disabled hint="Corrija o peso para continuar">Ver meu ajuste</BotaoDeDestaque>:<BotaoDeDestaque>Ver meu ajuste</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader skip="Agora não"/>
      <Title eyebrow="Segunda, 12 de outubro" size={28} sub="1 minuto para ajustar seu plano.">Sua semana</Title>
      <Label>Como foi o registro?</Label>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>{Q.map((q,i)=><div key={q} style={{display:"flex"}}><ChipPick w={1} on={i===0}>{q}</ChipPick></div>)}</div>
      {diaria?<>
        <Label right="média da semana">Suas pesagens</Label>
        <Vidro style={{padding:10}}>
          <div style={{display:"flex",gap:4}}>{D.map(([d,v])=><div key={d} style={{flex:1,textAlign:"center",padding:"6px 0",borderRadius:10,background:v==="—"?"transparent":"var(--glass-strong)"}}><div style={{...mono,fontSize:8.5}}>{d}</div><div style={{fontSize:11.5,fontWeight:700,color:v==="—"?"var(--ios-label3)":"var(--ios-label)",marginTop:3}}>{v}</div></div>)}</div>
          <Row style={{justifyContent:"space-between",marginTop:10,padding:"0 4px"}}><span style={{fontSize:12,color:"var(--ios-label2)"}}>Média · 6 pesagens</span><span style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:800,color:"var(--ios-label)"}}>77,8 kg</span></Row>
        </Vidro>
      </>:<>
        <div style={{marginTop:20}}><Campo label="Seu peso hoje" value={erro?"778":"77,6"} unit="kg" error={erro&&"Use quilos, de 30 a 300, com vírgula. Ex.: 77,6"}/></div>
        {!erro&&<Nota style={{marginTop:9}}>De manhã, em jejum, depois do banheiro. Uma vez por semana basta.</Nota>}
      </>}
    </Scroll>
  </Phone>;
}
const A4Diaria=()=><A4 diaria/>,A4Erro=()=><A4 erro/>;
function Status({icon,children}){return <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:99,background:"var(--glass-strong)",border:"1px solid var(--glass-brd)",fontSize:11.5,fontWeight:700,color:"var(--ios-label)"}}>{I(icon,13,PT)}{children}</span>;}
const A5V={
  base:{st:["trending-down","Abaixo do ritmo"],motivo:"Você cumpriu 6 de 7 dias e perdeu 0,3 kg, abaixo do ritmo que escolheu.",rows:[["target","Meta diária","2.150 kcal","2.000 kcal · menos arroz no jantar","−150 kcal"]],acao:"dois"},
  a:{st:["circle-check","No ritmo"],motivo:"Tudo no ritmo, seguimos igual. Você perdeu 0,5 kg, dentro da faixa que escolheu.",rows:[["target","Meta diária","2.150 kcal","2.150 kcal · sem mudança","0 kcal"]],acao:"Seguir igual",data:[78.4,78.1,78.3,77.9,78.0,78.2,77.8,77.8,77.5,77.7,77.4,77.3,77.6,77.4]},
  b:{st:["circle-dashed","Dados insuficientes"],motivo:"Com registro parcial mantemos a meta. Registre mais esta semana.",rows:[],acao:"Entendi",data:[78.4,null,null,78.0,null,null,null,77.9,null,null,null,null,77.8,null],tip:true},
  c:{st:["list-checks","Plano mais simples"],motivo:"Você seguiu 2 de 7 dias. Em vez de cortar calorias, vamos deixar o plano mais fácil de seguir.",rows:[["utensils","Refeições por dia","5","4 · mesma meta","0 kcal"],["timer","Tempo das receitas","até 35 min","até 15 min","0 kcal"]],acao:"dois"},
  d:{st:["trending-down","Mais rápido que o ritmo"],motivo:"Você perdeu 1,2 kg, mais rápido que o ritmo que escolheu. Vamos subir um pouco a meta.",rows:[["target","Meta diária","2.150 kcal","2.300 kcal · um lanche maior","+150 kcal"]],acao:"dois",data:[78.4,78.1,78.0,77.7,77.6,77.4,77.3,77.2,77.0,76.9,77.0,76.8,76.9,76.8]},
};
function A5({v="base"}){
  const c=A5V[v],data=(c.data||W2);const pts=data.filter(x=>x!=null);
  const foot=c.acao==="dois"?<><Fade/><BarraDeDuasAcoes sec="Manter mais uma semana" secIcon="pause" pri="Aprovar" priIcon="check"/></>:<BotaoDeDestaque icon="check">{c.acao}</BotaoDeDestaque>;
  return <Phone footer={foot}>
    <Scroll>
      <OnbHeader/>
      <Title size={26} eyebrow="Ajuste da semana">Seu plano para esta semana</Title>
      <Vidro style={{marginTop:16,padding:"12px 12px 10px"}}>
        <Row style={{justifyContent:"space-between",marginBottom:6}}><Status icon={c.st[0]}>{c.st[1]}</Status><span style={{fontSize:11,color:"var(--ios-label2)"}}>2 semanas</span></Row>
        <Tendencia data={pts} h={110} band={c.data&&v==="b"?null:[78.2,-0.075,0.18]} win={v==="b"?1:5}/>
        <Legenda band={v!=="b"}/>
      </Vidro>
      <div style={{fontSize:14,lineHeight:1.45,color:"var(--ios-label)",marginTop:14,textWrap:"pretty"}}>{c.motivo}</div>
      {c.rows.length>0&&<><Label right={c.rows.length>1?"o cardápio é refeito":"o Assistente refaz o cardápio"}>Proposta</Label>
      <Vidro style={{padding:"2px 14px"}}>{c.rows.map((r,i)=><AntesDepois key={r[1]} first={i===0} icon={r[0]} title={r[1]} antes={r[2]} depois={r[3]} delta={r[4]}/>)}</Vidro></>}
      {c.tip&&<Vidro style={{marginTop:16,display:"flex",gap:12,alignItems:"center"}}><CaixaDeIcone icon="bell"/><div style={{flex:1,fontSize:12.5,color:"var(--ios-label2)"}}><b style={{color:"var(--ios-label)"}}>Lembrete às 20h</b> · para registrar o dia</div><span style={{...mono,fontSize:9,color:"var(--ios-label2)"}}>Ligar</span></Vidro>}
    </Scroll>
  </Phone>;
}
function A5Aluno(){
  return <Phone footer={<BotaoDeDestaque icon="check">Entendi</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader/>
      <Title size={26} eyebrow="Check-in enviado">Seu especialista vai revisar sua semana</Title>
      <Vidro style={{marginTop:16,padding:"12px 12px 10px"}}><Tendencia data={W2} h={110} band={[78.2,-0.075,0.18]}/><Legenda/></Vidro>
      <Vidro style={{marginTop:14,display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:99,background:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"var(--ios-label)"}}>DL</div><div style={{flex:1,fontSize:12.5,lineHeight:1.4,color:"var(--ios-label2)"}}><b style={{color:"var(--ios-label)"}}>Daniel Levi recebe seu check-in</b> e decide se o plano muda. Você será avisada quando ele atualizar.</div></Vidro>
      <Nota style={{marginTop:12}}>Nada muda no seu plano até o especialista revisar.</Nota>
    </Scroll>
  </Phone>;
}
const A5a=()=><A5 v="a"/>,A5b=()=><A5 v="b"/>,A5c=()=><A5 v="c"/>,A5d=()=><A5 v="d"/>;
function A5Estado({erro}){
  return <Phone footer={erro?<BotaoDeDestaque icon="rotate-cw">Tentar de novo</BotaoDeDestaque>:null}>
    <Scroll>
      <OnbHeader/>
      {erro&&<div style={{marginTop:16}}><CaixaDeIcone icon="wifi-off" tone={RED} size={52}/></div>}
      <Title size={26} eyebrow={erro?"Sem conexão":"Leva uns segundos"} sub={erro?"Suas respostas estão salvas.":"Comparando sua semana com o ritmo que você escolheu."}>{erro?"Não conseguimos calcular agora":"Calculando seu ajuste"}</Title>
      <Vidro style={{marginTop:18,padding:12}}><Tendencia data={W2} h={110} band={[78.2,-0.075,0.18]} pct={erro?35:60} faded={erro}/></Vidro>
      <Vidro style={{marginTop:12,padding:"2px 14px"}}><div style={{marginTop:-1}}>
        <PassoDeEspera state="done" label="Lendo seus registros"/>
        <PassoDeEspera state={erro?"error":"active"} label="Calculando sua tendência"/>
        <PassoDeEspera state="todo" label="Revendo sua meta"/>
      </div></Vidro>
    </Scroll>
  </Phone>;
}
const A5Calc=()=><A5Estado/>,A5Erro=()=><A5Estado erro/>;
Object.assign(window,{A5Aluno,Tendencia,Legenda,Status,ChipDeMotivo,A1,A2,A3,A4,A4Diaria,A4Erro,A5,A5a,A5b,A5c,A5d,A5Calc,A5Erro});
