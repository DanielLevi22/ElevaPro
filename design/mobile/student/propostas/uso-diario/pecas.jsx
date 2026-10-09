(()=>{
const L="hsl(var(--primary))",LT="hsl(var(--primary-text))",LF="hsl(var(--primary-foreground))";
const ic=(n,s,c)=>UDI(n,s,c);
const pill=(pri)=>({flex:1,height:40,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:11.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",background:pri?L:"var(--glass-strong)",color:pri?LF:"var(--ios-label)",border:pri?"none":"1px solid var(--glass-brd)"});
/* Aviso de Prontidão baixa: cartão (Início) ou faixa (Pré-início) */
function ProntidaoAviso({faixa}){
  return <div className="glass" style={{padding:faixa?12:14,marginBottom:10,borderColor:"color-mix(in srgb, "+AMB+" 45%, transparent)",textAlign:"left",width:"100%",boxSizing:"border-box"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:32,height:32,borderRadius:10,background:"color-mix(in srgb, "+AMB+" 18%, transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ic("battery-low",16,AMB)}</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)"}}>Prontidão baixa (54) · sono 5h10</div><div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>Versão leve: 30 min, carga −20%</div></div>
    </div>
    <div style={{display:"flex",gap:8,marginTop:11}}><div style={pill(1)}>{ic("feather",14,LF)}Fazer versão leve</div><div style={pill(0)}>Manter o treino</div></div>
  </div>;
}
/* Folha da sequência semanal */
function SequenciaSheet(){
  const W=[["S30",1,"4 treinos"],["S31",1,"3 treinos"],["S32",0,"2 treinos · 3 dias"],["S33",1,"5 dias de registro"],["S34",1,"3 treinos"],["S35",1,"4 treinos"],["S36",1,"3 treinos"],["S37",2,"2 de 3 treinos"]];
  return <UDSheet title="4 semanas seguidas" sub="Sua sequência conta semanas ativas, não dias.">
    <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6}}>{W.map(([w,s,t],i)=><div key={w} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <div style={{width:"100%",aspectRatio:"1",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:s===1?L:s===2?"color-mix(in srgb, "+L+" 18%, transparent)":"var(--glass-strong)",border:s===2?"1.5px dashed "+L:"1px solid var(--glass-brd)"}}>{s===1?ic("check",15,LF):s===2?ic("loader",14,LT):ic("minus",14,"var(--ios-label3)")}</div>
      <span style={{fontFamily:"var(--font-mono)",fontSize:8.5,fontWeight:700,color:"var(--ios-label3)"}}>{w}</span></div>)}</div>
    <div style={{display:"flex",gap:14,marginTop:10,fontSize:10.5,color:"var(--ios-label2)"}}><span style={{display:"flex",gap:5,alignItems:"center"}}>{ic("check",12,LT)}Ativa</span><span style={{display:"flex",gap:5,alignItems:"center"}}>{ic("minus",12,"var(--ios-label3)")}Não contou</span><span style={{display:"flex",gap:5,alignItems:"center"}}>{ic("loader",12,LT)}Em andamento</span></div>
    <div className="glass" style={{padding:12,marginTop:14,fontSize:12.5,lineHeight:1.45,color:"var(--ios-label2)"}}>Uma semana conta com <b style={{color:"var(--ios-label)"}}>3 treinos</b> ou <b style={{color:"var(--ios-label)"}}>5 dias de registro</b>. Registrar um dia esquecido recupera a semana.</div>
    <div className="glass" style={{padding:"11px 12px",marginTop:10,display:"flex",alignItems:"center",gap:10}}>{ic("calendar-plus",16,LT)}<span style={{flex:1,fontSize:12.5,color:"var(--ios-label)"}}><b>S32</b> · falta 1 treino ou 2 dias de registro</span><span style={{fontSize:12,fontWeight:700,color:LT}}>Registrar</span></div>
    <div style={{fontSize:12,color:"var(--ios-label2)",marginTop:12}}>Esta semana: 2 de 3 treinos. Falta 1.</div>
  </UDSheet>;
}
/* Selo de recorde na série */
function RecordeSelo({children}){
  return <div className="glass" style={{marginTop:10,padding:"9px 12px",display:"flex",alignItems:"center",gap:9,borderColor:L,background:"color-mix(in srgb, "+L+" 12%, var(--glass))",boxShadow:"0 0 24px -6px "+L+", inset 0 1px 0 var(--spec)"}}>
    <div style={{width:26,height:26,borderRadius:99,background:L,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ic("trophy",14,LF)}</div>
    <span style={{fontSize:13,fontWeight:800,color:"var(--ios-label)"}}>{children}</span>
    <span style={{marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:LT}}>Novo recorde</span>
  </div>;
}
/* Notificação do descanso na tela bloqueada */
function TelaBloqueada(){
  return <div className="phone" style={{background:"var(--ios-bg)"}}>
    <div className="glow"></div><div className="island"></div>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:78}}>
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"var(--ios-label2)"}}>{ic("lock",13,"var(--ios-label2)")}Terça, 12 de agosto</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:84,fontWeight:800,letterSpacing:"-.04em",color:"var(--ios-label)",lineHeight:1,marginTop:4}}>9:41</div>
      <div className="glass" style={{width:"calc(100% - 28px)",marginTop:"auto",marginBottom:120,padding:14,borderRadius:24,background:"var(--sheet)",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:22,height:22,borderRadius:6,background:L,display:"flex",alignItems:"center",justifyContent:"center"}}>{ic("dumbbell",12,LF)}</div><span style={{fontSize:11.5,fontWeight:700,letterSpacing:".04em",textTransform:"uppercase",color:"var(--ios-label2)"}}>Eleva Pro</span><span style={{marginLeft:"auto",fontSize:11.5,color:"var(--ios-label3)"}}>agora</span></div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginTop:10}}>
          <div><div style={{fontSize:15,fontWeight:700,color:"var(--ios-label)"}}>Descanso · Remada curvada</div><div style={{fontSize:12.5,color:"var(--ios-label2)",marginTop:3}}>Próxima: série 3 · 10 × 45 kg</div></div>
          <div style={{fontFamily:"var(--font-display)",fontSize:34,fontWeight:800,letterSpacing:"-.03em",color:LT,lineHeight:1}}>0:45</div>
        </div>
        <div style={{height:4,borderRadius:99,background:"var(--glass-strong)",marginTop:12,overflow:"hidden"}}><div style={{width:"50%",height:"100%",background:L}}></div></div>
        <div style={{display:"flex",gap:8,marginTop:12}}><div style={pill(0)}>{ic("plus",14,"var(--ios-label)")}15 s</div><div style={pill(1)}>{ic("skip-forward",14,LF)}Pular</div></div>
      </div>
    </div>
    <div style={{position:"absolute",bottom:44,left:0,right:0,display:"flex",justifyContent:"space-between",padding:"0 48px"}}>{["flashlight","camera"].map(n=><div key={n} style={{width:48,height:48,borderRadius:99,background:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center"}}>{ic(n,20,"var(--ios-label)")}</div>)}</div>
    <div className="homebar"></div>
  </div>;
}
/* Folha Trocar exercício */
function TrocarSheet(){
  const ALT=[["Remada com halteres","Halteres · mesmo músculo"],["Remada com elástico","Elástico · mais leve nas costas"],["Remada unilateral apoiada","Halter + banco ou cadeira"]];
  return <UDSheet title="Trocar exercício" sub="Remada curvada · 4 × 8–10">
    <div style={{display:"flex",gap:7}}>{[["calendar","Trocar só hoje",1],["repeat","Trocar sempre"],["thumbs-down","Recomendar menos"]].map(([i,t,on])=><div key={t} style={{flex:1,padding:"10px 6px",borderRadius:14,textAlign:"center",background:on?"color-mix(in srgb, "+L+" 16%, transparent)":"var(--glass-strong)",border:on?"1.5px solid "+L:"1px solid var(--glass-brd)"}}><div style={{display:"flex",justifyContent:"center"}}>{ic(on?"circle-check":i,17,on?LT:"var(--ios-label2)")}</div><div style={{fontSize:11.5,fontWeight:700,color:"var(--ios-label)",marginTop:6,lineHeight:1.25}}>{t}</div></div>)}</div>
    <div style={{display:"flex",justifyContent:"space-between",margin:"16px 2px 6px"}}><span style={{fontFamily:"var(--font-mono)",fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ios-label3)"}}>Alternativas</span><span style={{fontSize:11.5,color:"var(--ios-label2)"}}>em casa: halteres e elástico</span></div>
    {ALT.map(([t,s],i)=><UDOpt key={t} first={i===0} icon="dumbbell" title={t} sub={s}/>)}
  </UDSheet>;
}
Object.assign(window,{ProntidaoAviso,SequenciaSheet,RecordeSelo,TelaBloqueada,TrocarSheet});
})();
