/* ElevaPro · kit compartilhado do app mobile (base: onb-kit.jsx do onboarding + compare.jsx do uso diário + variações dos fluxos). */
(()=>{
const I=(n,s=20,c)=><i data-lucide={n} style={{width:s,height:s,display:"block",color:c,flexShrink:0}}></i>;
const P="hsl(var(--primary))",PF="hsl(var(--primary-foreground))",PT="hsl(var(--primary-text))";
const AMB="hsl(var(--amber-500))",BLU="hsl(var(--secondary))",PNK="hsl(var(--accent))",RED="hsl(var(--destructive))",OK="hsl(var(--success))";
const tint=(c,p)=>`color-mix(in srgb, ${c} ${p}%, transparent)`;
const mono={fontFamily:"var(--font-mono)",fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ios-label3)"};

function StatusBar(){return <div className="statusbar"><span>9:41</span><span style={{display:"flex",alignItems:"center",gap:6}}>{I("signal",16,"var(--ios-label)")}{I("wifi",16,"var(--ios-label)")}{I("battery-full",20,"var(--ios-label)")}</span></div>;}
function Phone({children,footer,overlay,tabs}){
  return <div className="phone"><div className="island"></div><StatusBar/>{children}{footer}{tabs&&<TabBar active={typeof tabs==="string"?tabs:undefined}/>}{overlay}<div className="homebar"></div></div>;
}
function Scroll({children,pb=150}){return <div className="scroll" style={{paddingBottom:pb}}>{children}</div>;}
function Row({children,style}){return <div style={{display:"flex",alignItems:"center",gap:12,...style}}>{children}</div>;}
function BotaoRedondo({icon="chevron-left",size=38}){
  return <div className="glass" style={{width:size,height:size,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{I(icon,size*0.47,"var(--ios-label)")}</div>;
}
function StepBar({current,total=5}){
  return <div style={{flex:1,display:"flex",alignItems:"center",gap:9}} aria-label={`Etapa ${current} de ${total}`}>
    <div style={{flex:1,display:"flex",gap:5}}>{Array.from({length:total}).map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:99,background:i<current?P:"var(--glass-strong)"}}></div>)}</div>
    <span style={{fontSize:11,fontWeight:700,color:"var(--ios-label3)",letterSpacing:".06em",whiteSpace:"nowrap"}}>{current} de {total}</span>
  </div>;
}
function OnbHeader({step,total=5,skip,back=true}){
  return <Row style={{paddingTop:14,gap:12,minHeight:52}}>
    {back&&<BotaoRedondo/>}
    {step?<StepBar current={step} total={total}/>:<div style={{flex:1}}></div>}
    {skip&&<span style={{fontSize:12,fontWeight:600,color:"var(--ios-label2)",whiteSpace:"nowrap"}}>{skip===true?"Pular por enquanto":skip}</span>}
  </Row>;
}
function Title({children,sub,size=28,eyebrow}){
  return <div style={{marginTop:22}}>
    {eyebrow&&<div style={{...mono,marginBottom:8}}>{eyebrow}</div>}
    <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:size,lineHeight:1.08,letterSpacing:"-.03em",color:"var(--ios-label)",textWrap:"pretty"}}>{children}</div>
    {sub&&<div style={{fontSize:13.5,lineHeight:1.4,color:"var(--ios-label2)",marginTop:8,textWrap:"pretty"}}>{sub}</div>}
  </div>;
}
function Label({children,right}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",margin:"20px 2px 9px"}}><span style={mono}>{children}</span>{right&&<span style={{fontSize:11.5,color:"var(--ios-label3)"}}>{right}</span>}</div>;
}
function Vidro({children,style,strong,active}){
  return <div className="glass" style={{padding:14,...(strong?{background:"var(--glass-strong)"}:null),...(active?{borderColor:tint(P,50)}:null),...style}}>{children}</div>;
}
function CaixaDeIcone({icon,tone=P,size=34,solid}){
  return <div style={{width:size,height:size,borderRadius:Math.round(size*0.32),background:solid?tone:tint(tone,16),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{I(icon,Math.round(size*0.5),solid?PF:tone)}</div>;
}
function GlassChoice({icon,title,sub,active}){
  return <Vidro active={active} style={{padding:13,marginBottom:9,display:"flex",alignItems:"center",gap:12}}>
    <div style={{width:34,height:34,borderRadius:11,background:active?P:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{I(icon,17,active?PF:"var(--ios-label2)")}</div>
    <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.01em"}}>{title}</div>{sub&&<div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2}}>{sub}</div>}</div>
    {I(active?"circle-check":"circle",19,active?PT:"var(--ios-label3)")}
  </Vidro>;
}
/* novo · GlassChoice compacto (3 lado a lado) */
function ChoiceTile({icon,title,active}){
  return <Vidro active={active} style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
    <div style={{alignSelf:"flex-end",marginBottom:-14}}>{I(active?"circle-check":"circle",16,active?PT:"var(--ios-label3)")}</div>
    <div style={{width:34,height:34,borderRadius:11,background:active?P:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center"}}>{I(icon,17,active?PF:"var(--ios-label2)")}</div>
    <div style={{fontSize:12.5,fontWeight:700,color:"var(--ios-label)"}}>{title}</div>
  </Vidro>;
}
/* Chip de escolha única: ativo pintado na primária */
function ChipPick({children,on,w}){
  return <div style={{height:40,minWidth:w,padding:"0 14px",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,background:on?P:"var(--glass-strong)",color:on?PF:"var(--ios-label)",border:`1px solid ${on?P:"var(--glass-brd)"}`,flex:w?1:"none"}} aria-pressed={on}>{children}</div>;
}
/* novo · Chip de múltipla escolha: tique + borda primária */
function ChipMulti({children,on}){
  return <div style={{height:36,padding:on?"0 13px 0 9px":"0 13px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,fontWeight:600,background:on?tint(P,14):"var(--glass-strong)",color:"var(--ios-label)",border:`1px solid ${on?P:"var(--glass-brd)"}`}} aria-pressed={on}>
    {on&&<span style={{width:18,height:18,borderRadius:99,background:P,display:"flex",alignItems:"center",justifyContent:"center"}}>{I("check",12,PF)}</span>}{children}
  </div>;
}
function Chips({children,gap=7}){return <div style={{display:"flex",flexWrap:"wrap",gap}}>{children}</div>;}
function GlassSegmented({opts,value}){
  return <div className="glass" style={{display:"flex",gap:4,padding:4,borderRadius:16}}>
    {opts.map(o=><div key={o} style={{flex:1,height:34,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11.5,fontWeight:700,background:o===value?P:"transparent",color:o===value?PF:"var(--ios-label2)"}}>{o}</div>)}
  </div>;
}
function Campo({label,value,placeholder,unit,error,style}){
  return <div style={{flex:1,minWidth:0,...style}}>
    <div style={{...mono,marginBottom:6,paddingLeft:2}}>{label}</div>
    <div style={{display:"flex",alignItems:"center",gap:8,height:52,padding:"0 14px",borderRadius:14,background:"var(--field)",border:`1px solid ${error?RED:"var(--field-brd)"}`,boxShadow:error?`0 0 0 3px ${tint(RED,16)}`:"none"}}>
      <span style={{flex:1,fontFamily:"var(--font-display)",fontSize:20,fontWeight:value?800:500,color:value?"var(--ios-label)":"var(--ios-label3)",letterSpacing:"-.02em"}}>{value||placeholder}</span>
      {unit&&<span style={{fontSize:12.5,color:"var(--ios-label3)",fontWeight:600}}>{unit}</span>}
    </div>
    {error&&<div style={{display:"flex",gap:6,alignItems:"flex-start",marginTop:7,fontSize:11.5,lineHeight:1.35,color:"var(--ios-label2)"}}>{I("circle-alert",14,RED)}<span><b style={{color:"var(--ios-label)"}}>Fora da faixa.</b> {error}</span></div>}
  </div>;
}
function BarraDeProgresso({pct,color=P,h=6}){
  return <div style={{height:h,borderRadius:99,background:"var(--glass-strong)",overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:99}}></div></div>;
}
/* novo · Precisão do plano */
function Precisao({pct,nivel}){
  return <Vidro style={{padding:"12px 14px"}}>
    <Row style={{justifyContent:"space-between",marginBottom:9}}><span style={mono}>Precisão do plano</span><span style={{fontSize:12,fontWeight:700,color:"var(--ios-label)"}}>{nivel} · {pct}%</span></Row>
    <BarraDeProgresso pct={pct}/>
  </Vidro>;
}
function Nota({icon="info",children,style}){
  return <div style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:11.5,lineHeight:1.4,color:"var(--ios-label2)",...style}}>{I(icon,15,"var(--ios-label3)")}<span>{children}</span></div>;
}
function Anel({pct,size=118,stroke=10,value,unit,sub}){
  const r=(size-stroke)/2,c=2*Math.PI*r;
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--glass-strong)" strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={P} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c*pct/100} ${c}`}/></svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"var(--font-display)",fontSize:size*0.2,fontWeight:800,letterSpacing:"-.04em",color:"var(--ios-label)",lineHeight:1}}>{value}</div>
      {unit&&<div style={{fontSize:10.5,fontWeight:700,color:"var(--ios-label2)",marginTop:3}}>{unit}</div>}
      {sub&&<div style={{...mono,fontSize:8.5,marginTop:3}}>{sub}</div>}
    </div>
  </div>;
}
function LinhaDeVidro({icon,tone=P,title,sub,right,first}){
  return <Row style={{padding:"11px 0",borderTop:first?"none":"1px solid var(--glass-brd)"}}>
    {icon&&<CaixaDeIcone icon={icon} tone={tone} size={32}/>}
    <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.01em"}}>{title}</div>{sub&&<div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2,lineHeight:1.35}}>{sub}</div>}</div>
    {right}
  </Row>;
}
/* novo · Passo da tela de espera */
function PassoDeEspera({state,label}){
  const M={done:["Feito",P,"check",PF],active:["Agora","transparent","loader-circle",PT],todo:["A seguir","transparent",null,null],error:["Parou",tint(RED,16),"x",RED]}[state];
  return <Row style={{padding:"12px 0",borderTop:"1px solid var(--glass-brd)"}}>
    <div style={{width:26,height:26,borderRadius:99,background:M[1],border:state==="done"?"none":`1.5px solid ${state==="active"?P:state==="error"?RED:"var(--glass-brd)"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{M[2]&&I(M[2],14,M[3])}</div>
    <span style={{flex:1,fontSize:14,fontWeight:state==="todo"?500:700,color:state==="todo"?"var(--ios-label3)":"var(--ios-label)"}}>{label}</span>
    <span style={{...mono,fontSize:9,color:state==="todo"?"var(--ios-label3)":"var(--ios-label2)"}}>{M[0]}</span>
  </Row>;
}
function BotaoDeDestaque({children,icon="arrow-right",disabled,hint,bottom=40}){
  return <div style={{position:"absolute",left:18,right:18,bottom,zIndex:6}}>
    {hint&&<div style={{textAlign:"center",fontSize:11.5,color:"var(--ios-label2)",marginBottom:9}}>{hint}</div>}
    <div style={{height:54,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",gap:9,fontWeight:800,fontSize:14.5,letterSpacing:".08em",textTransform:"uppercase",background:disabled?"var(--ios-bg)":P,color:disabled?"var(--ios-label3)":PF,border:disabled?"1px solid var(--glass-brd)":"none",boxShadow:disabled?"none":"0 10px 30px -8px hsl(var(--primary) / .7)",position:"relative",overflow:"hidden"}} aria-disabled={disabled}>
      {disabled&&<div style={{position:"absolute",inset:0,background:"var(--glass-strong)"}}></div>}
      <span style={{position:"relative"}}>{children}</span><span style={{position:"relative"}}>{I(disabled?"lock":icon,17,disabled?"var(--ios-label3)":PF)}</span>
    </div>
  </div>;
}
function BotaoSecundario({children,icon,bottom=40,text}){
  return <div style={{position:"absolute",left:18,right:18,bottom,zIndex:6,height:text?36:48,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:text?13.5:12.5,fontWeight:text?600:800,letterSpacing:text?0:".06em",textTransform:text?"none":"uppercase",color:text?"var(--ios-label2)":"var(--ios-label)",background:text?"transparent":"var(--ios-bg)",border:text?"none":"1px solid var(--glass-brd)",overflow:"hidden"}}>
    {!text&&<div style={{position:"absolute",inset:0,background:"var(--glass-strong)"}}></div>}
    {icon&&<span style={{position:"relative"}}>{I(icon,15,"var(--ios-label)")}</span>}<span style={{position:"relative"}}>{children}</span>
  </div>;
}
function BarraDeDuasAcoes({sec,secIcon,pri,priIcon,bottom=40}){
  const b={height:42,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:11.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",whiteSpace:"nowrap"};
  return <div style={{position:"absolute",left:18,right:18,bottom,zIndex:6,display:"flex",gap:9}}>
    <div style={{...b,padding:"0 16px",background:"var(--ios-bg)",border:"1px solid var(--glass-brd)",color:"var(--ios-label)",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,background:"var(--glass-strong)"}}></div><span style={{position:"relative",display:"flex",gap:7,alignItems:"center"}}>{I(secIcon,15,"var(--ios-label)")}{sec}</span></div>
    <div style={{...b,flex:1,background:P,color:PF,boxShadow:"0 10px 26px -10px hsl(var(--primary) / .8)"}}>{I(priIcon,15,PF)}{pri}</div>
  </div>;
}
function Fade(){return <div style={{position:"absolute",left:0,right:0,bottom:0,height:150,zIndex:4,background:"linear-gradient(180deg,transparent,var(--ios-bg) 55%)",pointerEvents:"none"}}></div>;}
function GlassSheet({title,sub,children}){
  return <div style={{position:"absolute",inset:0,zIndex:8,background:"var(--scrim)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
    <div className="glass" style={{borderRadius:"28px 28px 0 0",padding:"10px 18px 40px",background:"var(--sheet)",borderBottom:"none"}}>
      <div style={{width:38,height:5,borderRadius:99,background:"var(--ios-label3)",margin:"0 auto 14px"}}></div>
      <Row style={{justifyContent:"space-between"}}><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>{title}</div><BotaoRedondo icon="x" size={32}/></Row>
      {sub&&<div style={{fontSize:12.5,color:"var(--ios-label2)",marginTop:4}}>{sub}</div>}
      <div style={{marginTop:10}}>{children}</div>
    </div>
  </div>;
}
/* novo · Linha de ajuste "antes → depois" */
function AntesDepois({icon,title,antes,depois,delta,first}){
  const up=delta.startsWith("+");
  return <Row style={{padding:"11px 0",borderTop:first?"none":"1px solid var(--glass-brd)",alignItems:"flex-start"}}>
    <CaixaDeIcone icon={icon} size={32}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)"}}>{title}</div>
      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,fontSize:11.5,color:"var(--ios-label2)",flexWrap:"wrap"}}><span style={{textDecoration:"line-through",color:"var(--ios-label3)"}}>{antes}</span>{I("arrow-right",12,"var(--ios-label3)")}<span style={{color:"var(--ios-label)",fontWeight:600}}>{depois}</span></div>
    </div>
    <span style={{fontFamily:"var(--font-mono)",fontSize:10.5,fontWeight:700,padding:"4px 8px",borderRadius:99,background:"var(--glass-strong)",color:"var(--ios-label)",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>{I(up?"arrow-up":delta==="0 kcal"?"equal":"arrow-down",11,"var(--ios-label2)")}{delta}</span>
  </Row>;
}
/* Barra real do app (components/navigation/TabBar.tsx): 3 abas | "+" central | 3 abas */
function TabBar({active="Início"}){
  const A=[["house","Início"],["dumbbell","Treinos"],["utensils-crossed","Nutrição"]],B=[["chart-no-axes-column","Progresso"],["watch","Saúde"],["trophy","Ranking"]];
  const item=([i,l])=>{const on=l===active;return <div key={l} className={"tabitem"+(on?" on":"")} style={{flex:1,color:on?PT:"var(--ios-label3)",fontWeight:on?700:600}}>{I(i,23,on?PT:"var(--ios-label3)")}{l}</div>;};
  return <div className="tabbar" style={{padding:"12px 8px 0",justifyContent:"space-between"}}>
    <div style={{flex:1,display:"flex"}}>{A.map(item)}</div>
    <div style={{width:68,height:68,marginTop:-28,display:"flex",alignItems:"center",justifyContent:"center"}} aria-label="Ações rápidas"><div style={{width:60,height:60,borderRadius:99,background:P,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 10px 26px -10px hsl(var(--primary) / .8)"}}>{I("plus",32,PF)}</div></div>
    <div style={{flex:1,display:"flex"}}>{B.map(item)}</div>
  </div>;
}

const UDI=(n,s=20,c)=><i data-lucide={n} style={{width:s,height:s,display:"block",color:c,flexShrink:0}}></i>;
const UDmono={fontFamily:"var(--font-mono)",fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"hsl(var(--muted-foreground))"};
/* Barra real do app: components/navigation/TabBar.tsx */
function UDTabBar({active="Início"}){
  const A=[["house","Início"],["dumbbell","Treinos"],["utensils-crossed","Nutrição"]],B=[["chart-no-axes-column","Progresso"],["watch","Saúde"],["trophy","Ranking"]];
  const PT="hsl(var(--primary-text))";
  const item=([i,l])=>{const on=l===active;return <div key={l} className={"tabitem"+(on?" on":"")} style={{flex:1,color:on?PT:"var(--ios-label3)",fontWeight:on?700:600}}>{UDI(i,23,on?PT:"var(--ios-label3)")}{l}</div>;};
  return <div className="tabbar" style={{padding:"12px 8px 0",justifyContent:"space-between"}}>
    <div style={{flex:1,display:"flex"}}>{A.map(item)}</div>
    <div style={{width:68,height:68,marginTop:-28,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:60,height:60,borderRadius:99,background:"hsl(var(--primary))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 10px 26px -10px hsl(var(--primary) / .8)"}}>{UDI("plus",32,"hsl(var(--primary-foreground))")}</div></div>
    <div style={{flex:1,display:"flex"}}>{B.map(item)}</div>
  </div>;
}
/* Folha de vidro genérica */
function UDSheet({title,sub,children,h}){
  return <div style={{position:"absolute",inset:0,zIndex:20,background:"var(--scrim)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
    <div className="glass" style={{borderRadius:"28px 28px 0 0",padding:"10px 18px 40px",background:"var(--ios-bg)",borderBottom:"none",minHeight:h}}>
      <div style={{width:38,height:5,borderRadius:99,background:"var(--ios-label3)",margin:"0 auto 14px"}}></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div style={{fontFamily:"var(--font-display)",fontSize:21,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>{title}</div><div className="glass" style={{width:32,height:32,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center"}}>{UDI("x",15,"var(--ios-label)")}</div></div>
      {sub&&<div style={{fontSize:12.5,color:"var(--ios-label2)",marginTop:4,lineHeight:1.4}}>{sub}</div>}
      <div style={{marginTop:12}}>{children}</div>
    </div>
  </div>;
}
function UDOpt({icon,title,sub,right,first,strong}){
  return <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderTop:first?"none":"1px solid var(--glass-brd)"}}>
    <div style={{width:34,height:34,borderRadius:11,background:strong?"hsl(var(--primary))":"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{UDI(icon,17,strong?"hsl(var(--primary-foreground))":"var(--ios-label)")}</div>
    <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:"var(--ios-label)"}}>{title}</div>{sub&&<div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2,lineHeight:1.35}}>{sub}</div>}</div>
    {right||UDI("chevron-right",16,"var(--ios-label3)")}
  </div>;
}
function UDToast({icon="check",children,bottom=104}){
  return <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",bottom,zIndex:15,display:"flex",alignItems:"center",gap:9,padding:"10px 16px 10px 10px",borderRadius:99,background:"var(--ios-bg)",border:"1px solid var(--glass-brd)",boxShadow:"0 14px 30px -10px rgba(0,0,0,.5)",whiteSpace:"nowrap"}}>
    <span style={{width:24,height:24,borderRadius:99,background:"hsl(var(--primary))",display:"flex",alignItems:"center",justifyContent:"center"}}>{UDI(icon,14,"hsl(var(--primary-foreground))")}</span>
    <span style={{fontSize:13,fontWeight:600,color:"var(--ios-label)"}}>{children}</span>
  </div>;
}
/* Mapa muscular: silhueta frente/costas, intensidade lime pelo volume */
const UD_MUS={
  front:{peito:"M60 62 Q75 56 88 62 L88 82 Q74 88 60 82 Z|M112 62 Q125 56 140 62 L140 82 Q126 88 112 82 Z",ombros:"M46 58 Q52 50 62 54 L58 74 Q48 72 46 58 Z|M154 58 Q148 50 138 54 L142 74 Q152 72 154 58 Z",biceps:"M44 78 L56 78 L54 108 L42 106 Z|M156 78 L144 78 L146 108 L158 106 Z",abdomen:"M86 90 L114 90 L112 138 L88 138 Z",quadriceps:"M74 150 L98 150 L96 214 L76 214 Z|M102 150 L126 150 L124 214 L104 214 Z",panturrilhas:"M78 226 L94 226 L92 270 L80 270 Z|M106 226 L122 226 L120 270 L108 270 Z"},
  back:{costas:"M64 60 L136 60 L128 112 L72 112 Z",ombros:"M46 58 Q52 50 62 54 L58 74 Q48 72 46 58 Z|M154 58 Q148 50 138 54 L142 74 Q152 72 154 58 Z",triceps:"M44 78 L56 78 L54 108 L42 106 Z|M156 78 L144 78 L146 108 L158 106 Z",lombar:"M78 114 L122 114 L118 140 L82 140 Z",gluteos:"M76 142 L124 142 L124 168 L76 168 Z",posteriores:"M76 172 L98 172 L96 222 L78 222 Z|M102 172 L124 172 L122 222 L104 222 Z",panturrilhas:"M78 226 L94 226 L92 270 L80 270 Z|M106 226 L122 226 L120 270 L108 270 Z"}
};
const UD_BODY="M100 10 a14 16 0 1 1 -0.1 0 Z M84 42 L116 42 L118 50 L150 54 Q160 58 160 76 L162 112 L152 114 L144 82 L140 112 L132 146 L128 222 L124 276 L104 276 L102 160 L98 160 L96 276 L76 276 L72 222 L68 146 L60 112 L56 82 L48 114 L38 112 L40 76 Q40 58 50 54 L82 50 Z";
function UDBody({side,vol}){
  return <svg viewBox="0 0 200 284" width="100%" style={{display:"block"}}>
    <path d={UD_BODY} fill="var(--glass-strong)" stroke="var(--glass-brd)"/>
    {Object.entries(UD_MUS[side]).map(([k,d])=>d.split("|").map((p,i)=><path key={k+i} d={p} fill={vol[k]?`hsl(var(--primary) / ${0.25+0.75*vol[k]})`:"transparent"} stroke={vol[k]?"hsl(var(--primary))":"var(--glass-brd)"} strokeWidth=".8" strokeLinejoin="round"/>))}
  </svg>;
}
function UDMapa({vol,legend,compact}){
  return <div>
    <div style={{display:"flex",gap:10}}>{["front","back"].map(s=><div key={s} style={{flex:1,textAlign:"center"}}><UDBody side={s} vol={vol}/><div style={{...UDmono,fontSize:9,color:"var(--ios-label3)",marginTop:4}}>{s==="front"?"Frente":"Costas"}</div></div>)}</div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,fontSize:10.5,color:"var(--ios-label2)"}}><span>Menos volume</span><div style={{flex:1,height:6,borderRadius:99,background:"linear-gradient(90deg,hsl(var(--primary) / .25),hsl(var(--primary)))"}}></div><span>Mais</span></div>
    {legend&&<div style={{marginTop:compact?8:12}}>{legend.map(([g,s,p],i)=><div key={g} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderTop:i?"1px solid var(--glass-brd)":"none"}}><span style={{flex:1,fontSize:12.5,fontWeight:600,color:"var(--ios-label)"}}>{g}</span><div style={{width:90,height:5,borderRadius:99,background:"var(--glass-strong)",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:"hsl(var(--primary))"}}></div></div><span style={{width:62,textAlign:"right",fontSize:11.5,fontWeight:700,color:"var(--ios-label)"}}>{s}</span></div>)}</div>}
  </div>;
}
/* Comparação Atual × Proposta, escuro e claro */
function Compare({id,title,nota,atual,proposta,novo}){
  const both=(el,lab)=><div style={{display:"flex",flexDirection:"column",gap:10}}>
    <span style={{...UDmono,fontSize:12,color:lab==="Atual"?"hsl(var(--muted-foreground))":"hsl(var(--primary))"}}>{lab}</span>
    <div style={{display:"flex",gap:14}}>{["","light"].map(t=><div key={t} className={t} style={{display:"flex",flexDirection:"column",gap:6}}><span style={{...UDmono,fontSize:9}}>{t?"Claro":"Escuro"}</span>{el}</div>)}</div>
  </div>;
  return <div data-screen-label={id} style={{marginBottom:70}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
      <span style={{padding:"4px 9px",borderRadius:99,background:"hsl(var(--primary))",color:"hsl(var(--primary-foreground))",fontFamily:"var(--font-mono)",fontSize:11,fontWeight:700}}>{id}</span>
      <span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:22,letterSpacing:"-.02em",color:"hsl(var(--foreground))"}}>{title}</span>
      {novo&&<span style={{...UDmono,padding:"3px 8px",borderRadius:99,border:"1px solid hsl(var(--border))"}}>Nova</span>}
    </div>
    <div style={{fontSize:14,color:"hsl(var(--muted-foreground))",marginBottom:18,maxWidth:1100}}>{nota}</div>
    <div style={{display:"flex",gap:40,alignItems:"flex-start"}}>
      {atual&&both(atual,"Atual")}
      {atual&&<div style={{alignSelf:"center",width:44,height:44,borderRadius:99,border:"1px solid hsl(var(--border))",display:"flex",alignItems:"center",justifyContent:"center"}}>{UDI("arrow-right",20,"hsl(var(--primary))")}</div>}
      {both(proposta,"Proposta")}
    </div>
  </div>;
}
function UDPage({title,sub,children}){
  React.useEffect(()=>{window.lucide?.createIcons();});
  return <div><div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:40,letterSpacing:"-.03em",color:"hsl(var(--foreground))",marginBottom:6}}>{title}</div><div style={{fontSize:15,color:"hsl(var(--muted-foreground))",marginBottom:44,maxWidth:1000}}>{sub}</div>{children}</div>;
}

/* ---------- Comuns aos fluxos antigos (variações juntadas) ---------- */
function SectionTitle({children,action}){return <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",margin:"20px 2px 10px"}}><span style={{fontSize:10.5,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ios-label3)"}}>{children}</span>{action&&<span style={{fontSize:11.5,color:"var(--ios-label3)"}}>{action}</span>}</div>;}
function Chip({children,tone,color}){const on=tone==="primary";return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:99,fontSize:10.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",background:on?P:"var(--glass-strong)",color:on?PF:(color||"var(--ios-label2)")}}>{children}</span>;}
function Ring({pct,color=P,size=150,stroke=12,children}){const r=(size-stroke)/2,c=2*Math.PI*r;return <div style={{position:"relative",width:size,height:size,flexShrink:0}}><svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--glass-strong)" strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={(c*Math.min(pct,100)/100)+" "+c}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{children}</div></div>;}
/* Barra real para fluxos antigos: aceita as chaves antigas (home, workouts…) ou o rótulo */
const KIT_ABA={home:"Início",workouts:"Treinos",nutrition:"Nutrição",progress:"Progresso",health:"Saúde",rank:"Ranking",profile:null};
function KitTabBar({active}){const a=active in KIT_ABA?KIT_ABA[active]:active;return <TabBar active={a||"__"}/>;}
/* Barra do Especialista (mantida): Painel, Alunos, Treinos, Nutrição */
function TabBarEspecialista({active="Painel"}){const T=[["layout-dashboard","Painel"],["users","Alunos"],["dumbbell","Treinos"],["apple","Nutrição"]];return <div className="tabbar">{T.map(([i,l])=>{const on=l===active;return <div key={l} className={"tabitem"+(on?" on":"")} style={{color:on?PT:"var(--ios-label3)",fontWeight:on?700:600}}>{I(i,23,on?PT:"var(--ios-label3)")}{l}</div>;})}</div>;}
/* Par escuro + claro de qualquer tela */
function ThemePair({children}){return <div className="kit-pair">{["","light"].map(t=><div key={t} className={"th "+t}>{children}<span className="kit-tag">{t?"Claro":"Escuro"}</span></div>)}</div>;}
function VarianteAluno({children="Variante · Aluno"}){return <span className="kit-variant">{I("user-check",12,"hsl(var(--primary))")}{children}</span>;}

Object.assign(window,{I,P,PF,PT,AMB,BLU,PNK,RED,OK,tint,mono,Phone,Scroll,Row,BotaoRedondo,StepBar,OnbHeader,Title,Label,Vidro,CaixaDeIcone,GlassChoice,ChoiceTile,ChipPick,ChipMulti,Chips,GlassSegmented,Campo,BarraDeProgresso,Precisao,Nota,Anel,LinhaDeVidro,PassoDeEspera,BotaoDeDestaque,BotaoSecundario,BarraDeDuasAcoes,Fade,GlassSheet,AntesDepois,TabBar,SectionTitle,Chip,Ring,KitTabBar,TabBarEspecialista,ThemePair,VarianteAluno,UDI,UDmono,UDTabBar,UDSheet,UDOpt,UDToast,UDMapa,Compare,UDPage});
})();
