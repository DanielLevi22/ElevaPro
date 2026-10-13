/* Objetos-herói em CSS puro: volume, brilho e sombra de palco, sem depender de render externo.
   Carregar como <script type="text/babel" src="hero-objects.js"></script> — expõe em window. */

function Pedestal({ size=230, glow="hsl(var(--primary))", children, lift=0 }){
  return (
    <div style={{position:"relative",width:"100%",height:size,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",width:size*0.95,height:size*0.62,borderRadius:"50%",background:`radial-gradient(closest-side, color-mix(in srgb, ${glow} 38%, transparent) 0%, transparent 72%)`,filter:"blur(16px)",bottom:size*0.06}}></div>
      <div style={{position:"absolute",bottom:size*0.14,width:size*0.52,height:size*0.09,borderRadius:"50%",background:"rgba(0,0,0,.55)",filter:"blur(10px)"}}></div>
      <div style={{position:"absolute",bottom:size*0.13,width:size*0.6,height:size*0.11,borderRadius:"50%",border:`1px dashed color-mix(in srgb, ${glow} 55%, transparent)`,opacity:.8}}></div>
      <div style={{position:"relative",transform:`translateY(${-lift}px)`,filter:"drop-shadow(0 18px 26px rgba(0,0,0,.55))"}}>{children}</div>
    </div>
  );
}

/* Relógio esportivo em 3/4, pulseira em silicone e coroa lateral */
function WatchObject({ scale=1, accent="hsl(var(--primary))" }){
  const band={width:74,background:`linear-gradient(100deg, color-mix(in srgb, ${accent} 88%, #000) 0%, ${accent} 42%, color-mix(in srgb, ${accent} 72%, #fff) 60%, color-mix(in srgb, ${accent} 80%, #000) 100%)`};
  return (
    <div style={{transform:`scale(${scale}) rotate(-7deg)`,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{...band,height:64,borderRadius:"26px 26px 12px 12px",boxShadow:"inset 0 -8px 14px rgba(0,0,0,.35), inset 0 2px 0 rgba(255,255,255,.35)"}}></div>
      <div style={{position:"relative",width:104,height:124,marginTop:-10,marginBottom:-10,borderRadius:32,background:"linear-gradient(145deg,#E8EAEE 0%,#9BA1AB 26%,#5A606B 52%,#C8CDD5 78%,#7A8089 100%)",padding:7,boxShadow:"0 16px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.85)",zIndex:2}}>
        <div style={{position:"absolute",right:-6,top:34,width:8,height:20,borderRadius:3,background:"linear-gradient(180deg,#D7DBE1,#6E747E)",boxShadow:"1px 1px 3px rgba(0,0,0,.5)"}}></div>
        <div style={{position:"absolute",right:-5,top:62,width:6,height:26,borderRadius:3,background:"linear-gradient(180deg,#C3C8D0,#666C76)"}}></div>
        <div style={{width:"100%",height:"100%",borderRadius:26,background:"radial-gradient(120% 90% at 20% 8%, #2B2F36 0%, #0A0B0D 60%)",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5}}>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(128deg, rgba(255,255,255,.22) 0%, transparent 34%, transparent 66%, rgba(255,255,255,.08) 100%)"}}></div>
          <div style={{width:52,height:52,borderRadius:99,border:`5px solid ${accent}`,borderRightColor:"rgba(255,255,255,.14)",borderBottomColor:"rgba(255,255,255,.14)",transform:"rotate(28deg)",boxShadow:`0 0 16px color-mix(in srgb, ${accent} 60%, transparent)`}}></div>
          <div style={{position:"absolute",bottom:16,fontSize:9,fontWeight:800,letterSpacing:".14em",color:"rgba(255,255,255,.62)"}}>9:41</div>
        </div>
      </div>
      <div style={{...band,height:70,borderRadius:"12px 12px 30px 30px",boxShadow:"inset 0 8px 14px rgba(0,0,0,.35), inset 0 -2px 0 rgba(255,255,255,.2)"}}></div>
    </div>
  );
}

/* Cadeado — usado nas telas de consentimento e privacidade */
function LockObject({ scale=1, accent="hsl(var(--primary))" }){
  return (
    <div style={{transform:`scale(${scale}) rotate(-5deg)`,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:74,height:74,borderRadius:"99px 99px 0 0",border:"15px solid",borderColor:"#D8DCE3 #B7BCC5 transparent #B7BCC5",borderBottom:"none",marginBottom:-10,boxShadow:"inset 0 2px 0 rgba(255,255,255,.9), 0 6px 12px rgba(0,0,0,.4)"}}></div>
      <div style={{position:"relative",width:132,height:104,borderRadius:26,background:`linear-gradient(150deg, color-mix(in srgb, ${accent} 68%, #fff) 0%, ${accent} 34%, color-mix(in srgb, ${accent} 78%, #000) 72%, color-mix(in srgb, ${accent} 55%, #000) 100%)`,boxShadow:`0 18px 32px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -10px 18px rgba(0,0,0,.28)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",top:9,left:14,right:40,height:26,borderRadius:"99px",background:"rgba(255,255,255,.3)",filter:"blur(7px)"}}></div>
        <div style={{width:22,height:22,borderRadius:99,background:"rgba(0,0,0,.55)",boxShadow:"inset 0 2px 4px rgba(0,0,0,.7)",position:"relative"}}>
          <div style={{position:"absolute",left:7,top:18,width:8,height:18,borderRadius:"0 0 4px 4px",background:"rgba(0,0,0,.55)"}}></div>
        </div>
      </div>
    </div>
  );
}

/* Halter — telas de treino e resumo */
function DumbbellObject({ scale=1, accent="hsl(var(--primary))" }){
  const plate=(w,h,r)=>({width:w,height:h,borderRadius:r,background:"linear-gradient(145deg,#4A4F58 0%,#22252B 40%,#6A7079 72%,#14161A 100%)",boxShadow:"inset 0 2px 0 rgba(255,255,255,.35), 0 10px 20px rgba(0,0,0,.5)"});
  return (
    <div style={{transform:`scale(${scale}) rotate(-14deg)`,display:"flex",alignItems:"center",gap:0}}>
      <div style={plate(30,92,10)}></div>
      <div style={{...plate(22,72,8),marginLeft:-3}}></div>
      <div style={{width:74,height:22,background:"linear-gradient(180deg,#E4E7EC 0%,#A8AEB8 38%,#5D636D 72%,#8E949E 100%)",boxShadow:"inset 0 2px 0 rgba(255,255,255,.8), 0 8px 16px rgba(0,0,0,.45)",position:"relative"}}>
        <div style={{position:"absolute",inset:"4px 8px",background:`repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 2px, transparent 2px 6px)`}}></div>
      </div>
      <div style={{...plate(22,72,8),marginRight:-3}}></div>
      <div style={plate(30,92,10)}></div>
      <div style={{position:"absolute",width:120,height:8,borderRadius:99,background:accent,opacity:.3,filter:"blur(9px)",bottom:-4}}></div>
    </div>
  );
}

/* Esfera luminosa — coração, chama, gota: um objeto para métricas vitais */
function OrbObject({ scale=1, color="hsl(var(--primary))", icon="heart-pulse", glyph=26 }){
  return (
    <div style={{transform:`scale(${scale})`,position:"relative",width:128,height:128,borderRadius:99,background:`radial-gradient(circle at 32% 26%, color-mix(in srgb, ${color} 30%, #fff) 0%, ${color} 38%, color-mix(in srgb, ${color} 72%, #000) 78%, color-mix(in srgb, ${color} 45%, #000) 100%)`,boxShadow:`inset 0 -14px 26px rgba(0,0,0,.4), inset 0 8px 18px rgba(255,255,255,.28), 0 20px 40px -10px color-mix(in srgb, ${color} 60%, transparent)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",top:14,left:22,width:44,height:26,borderRadius:"50%",background:"rgba(255,255,255,.55)",filter:"blur(7px)"}}></div>
      <i data-lucide={icon} style={{width:glyph*2,height:glyph*2,color:"rgba(255,255,255,.92)",filter:"drop-shadow(0 3px 6px rgba(0,0,0,.4))"}}></i>
    </div>
  );
}

/* Bicicleta / esteira / elíptico: silhueta em arcos com halo, para o palco do cardio */
function CardioObject({ scale=1, accent="hsl(var(--primary))", kind="bike" }){
  const ring=(s,t,o)=>({position:"absolute",width:s,height:s,borderRadius:99,border:`${t}px solid ${accent}`,opacity:o,boxShadow:`0 0 22px color-mix(in srgb, ${accent} 70%, transparent)`});
  return (
    <div style={{transform:`scale(${scale})`,position:"relative",width:230,height:150,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {kind==="bike" && (
        <>
          <div style={{...ring(96,7,1),left:2,bottom:6,borderRightColor:"rgba(255,255,255,.12)"}}></div>
          <div style={{...ring(96,7,1),right:2,bottom:6,borderLeftColor:"rgba(255,255,255,.12)"}}></div>
          <div style={{position:"absolute",left:44,bottom:52,width:142,height:6,borderRadius:99,background:"linear-gradient(90deg,#C9CED6,#6B7079)",transform:"rotate(-9deg)",boxShadow:"0 6px 14px rgba(0,0,0,.5)"}}></div>
          <div style={{position:"absolute",left:70,bottom:46,width:92,height:6,borderRadius:99,background:"linear-gradient(90deg,#8E949E,#4A4F58)",transform:"rotate(26deg)"}}></div>
          <div style={{position:"absolute",left:52,bottom:48,width:6,height:58,borderRadius:99,background:"linear-gradient(180deg,#D7DBE1,#5D636D)",transform:"rotate(18deg)"}}></div>
          <div style={{position:"absolute",right:56,bottom:52,width:6,height:52,borderRadius:99,background:"linear-gradient(180deg,#D7DBE1,#5D636D)",transform:"rotate(-16deg)"}}></div>
          <div style={{position:"absolute",left:104,bottom:44,width:26,height:26,borderRadius:99,background:accent,boxShadow:`0 0 20px ${accent}`}}></div>
        </>
      )}
      {kind==="treadmill" && (
        <>
          <div style={{position:"absolute",bottom:22,width:186,height:22,borderRadius:12,background:"linear-gradient(180deg,#3A3F47,#15171B)",boxShadow:"inset 0 2px 0 rgba(255,255,255,.2), 0 12px 24px rgba(0,0,0,.55)"}}></div>
          <div style={{position:"absolute",bottom:30,width:160,height:6,borderRadius:99,background:`repeating-linear-gradient(90deg, ${accent} 0 8px, transparent 8px 18px)`,opacity:.8}}></div>
          <div style={{position:"absolute",bottom:40,right:38,width:6,height:74,borderRadius:99,background:"linear-gradient(180deg,#D7DBE1,#5D636D)",transform:"rotate(10deg)"}}></div>
          <div style={{position:"absolute",top:12,right:22,width:66,height:44,borderRadius:10,background:"radial-gradient(120% 90% at 20% 8%, #2B2F36, #0A0B0D)",border:"2px solid #5D636D",boxShadow:`0 0 18px color-mix(in srgb, ${accent} 40%, transparent)`}}></div>
        </>
      )}
      {kind==="swim" && (
        <>
          {[0,1,2].map(i=>(
            <div key={i} style={{position:"absolute",bottom:34+i*26,width:170-i*26,height:5,borderRadius:99,background:accent,opacity:.28+i*0.26,boxShadow:`0 0 18px color-mix(in srgb, ${accent} 60%, transparent)`}}></div>
          ))}
          <div style={{position:"absolute",top:26,width:54,height:54,borderRadius:99,background:`radial-gradient(circle at 34% 28%, color-mix(in srgb, ${accent} 25%, #fff), ${accent} 52%, color-mix(in srgb, ${accent} 60%, #000))`,boxShadow:`0 0 26px color-mix(in srgb, ${accent} 70%, transparent)`}}></div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { Pedestal, WatchObject, LockObject, DumbbellObject, OrbObject, CardioObject });
