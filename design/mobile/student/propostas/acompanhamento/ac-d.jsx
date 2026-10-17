/* Acompanhamento · D: retenção. Usa Bloqueada e Aviso de ac-c.jsx. */

/* F1 · Aviso do que deu certo, não só do que faltou */
function F1(){
  return <Bloqueada hora="19:42">
    <Aviso icon="trophy" quando="agora" title="Recorde: +2,5 kg no supino" txt="12,5 kg × 12. Na próxima vez, a carga sugerida já é essa."/>
    <Aviso icon="flame" quando="ontem" title="Semana completa: 4 de 4" txt="Sua primeira. A sequência está em 3 semanas."/>
  </Bloqueada>;
}

/* F2 · O horário do aviso aprende com o que a pessoa faz */
function HorasDeTreino(){
  const H=[[18.9,0],[19.1,1],[19.0,2],[19.3,3],[18.8,5],[19.2,6],[19.0,7],[20.4,9],[19.1,10],[18.9,11]],w=300,h=96,X=v=>(v-17)/4*w,Y=i=>10+i*7.5;
  return <svg viewBox={`0 0 ${w} ${h+16}`} width="100%" style={{display:"block"}}>
    <rect x={X(18.75)} y={4} width={X(19.4)-X(18.75)} height={h-2} rx="8" fill={tint(P,14)}/>
    <line x1={X(19.5)} x2={X(19.5)} y1={2} y2={h} stroke={P} strokeWidth="2" strokeDasharray="3 3"/>
    {H.map(([v,i])=><circle key={i} cx={X(v)} cy={Y(i)} r="4" fill="var(--ios-label2)"/>)}
    {[17,18,19,20,21].map(v=><text key={v} x={X(v)} y={h+13} textAnchor={v===17?"start":v===21?"end":"middle"} fontSize="9" fontFamily="var(--font-mono)" fill="var(--ios-label3)">{v}h</text>)}
  </svg>;
}
function F2(){
  return <Phone>
    <Scroll>
      <Row style={{paddingTop:14,gap:12}}><BotaoRedondo/><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>Aviso de treino</div></Row>
      <Label right="últimas 4 semanas">Quando você treina</Label>
      <Vidro style={{padding:"12px 12px 8px"}}>
        <HorasDeTreino/>
        <Row style={{gap:14,marginTop:6,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:"var(--ios-label2)"}}><span style={{width:6,height:6,borderRadius:99,background:"var(--ios-label2)"}}></span>Treino começado</span>
          <span style={{display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:"var(--ios-label2)"}}><span style={{width:14,height:0,borderTop:`2px dashed ${P}`}}></span>Aviso · 19:30</span>
        </Row>
      </Vidro>
      <Label>Avisar</Label>
      <GlassChoice icon="sparkles" title="No meu horário de costume" sub="30 min depois de 19:00, se ainda não começou" active/>
      <GlassChoice icon="clock" title="Sempre no mesmo horário" sub="Escolher a hora"/>
      <Nota style={{marginTop:6}}>O horário muda sozinho se a sua rotina mudar. As refeições seguem a mesma regra.</Nota>
    </Scroll>
  </Phone>;
}

/* F3 · Pouco tempo: a versão curta do treino */
function F3(){
  return <Bloqueada escurece>
    <Aviso icon="dumbbell" quando="agora" title="Treino B ainda dá tempo hoje" txt="Inferiores · 45 min em casa" acoes={[["play","Começar agora"],["timer","Só tenho 20 min"],["calendar-arrow-up","Mover para amanhã"]]}/>
  </Bloqueada>;
}
function F3b(){
  const E=[["Agachamento goblet","3 × 10–12 · 14 kg"],["Afundo alternado","2 × 10 cada perna · 8 kg"],["Elevação de quadril","2 × 12 · 16 kg"]];
  return <Phone footer={<BotaoDeDestaque icon="play">Começar</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader/>
      <Title eyebrow="Versão curta · 20 min" size={26} sub="Os 3 exercícios que mais importam hoje, com as suas cargas.">Treino B · Inferiores</Title>
      <Vidro style={{marginTop:18,padding:"2px 14px"}}>{E.map(([n,s],i)=><LinhaDeVidro key={n} first={i===0} icon="dumbbell" title={n} sub={s}/>)}</Vidro>
      <Label>Ficam de fora hoje</Label>
      <div style={{fontSize:12.5,color:"var(--ios-label2)"}}>Cadeira flexora, panturrilha e prancha</div>
      <Vidro style={{marginTop:16,display:"flex",gap:12,alignItems:"center"}}><CaixaDeIcone icon="flame"/><div style={{flex:1,fontSize:12.5,lineHeight:1.4,color:"var(--ios-label2)"}}><b style={{color:"var(--ios-label)"}}>Conta como treino feito.</b> A sequência e o relatório da semana contam igual.</div></Vidro>
    </Scroll>
  </Phone>;
}

/* F4 · Sumiu: um aviso no 3º dia, uma pergunta no 7º, e depois silêncio */
function F4(){
  return <Bloqueada hora="18:30">
    <Aviso icon="dumbbell" quando="agora" title="Sua semana ainda dá para salvar" txt="Um treino de 20 min já conta. Seu plano está esperando do jeito que você deixou."/>
  </Bloqueada>;
}
function F5(){
  return <Phone tabs overlay={<GlassSheet title="Semana corrida?" sub="Faz 7 dias desde o último treino. Tudo bem: escolha como seguir.">
      <GlassChoice icon="pause" title="Pausar o plano" sub="Modo Descanso: nada de aviso, nada se perde" active/>
      <GlassChoice icon="feather" title="Voltar com uma semana leve" sub="3 treinos de 30 min, cargas −20%"/>
      <GlassChoice icon="calendar-days" title="Continuar como está"/>
      <Nota style={{marginTop:8}}>Depois desta pergunta, só voltamos a avisar quando você abrir o app.</Nota>
    </GlassSheet>}>
    <Scroll pb={110}><div style={{height:60}}></div></Scroll>
  </Phone>;
}

/* F6 · Dado de saúde fora da tela bloqueada (LGPD) */
function F6(){
  return <Bloqueada>
    <Aviso icon="bell" quando="agora" title="Eleva Pro" txt="Você tem 2 pendências de hoje."/>
    <Nota style={{padding:"0 6px"}} icon="lock">Detalhes escondidos: refeição, calorias e treino só aparecem com o celular desbloqueado.</Nota>
  </Bloqueada>;
}
function F6b(){
  return <Phone>
    <Scroll>
      <Row style={{paddingTop:14,gap:12}}><BotaoRedondo/><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>Avisos</div></Row>
      <Label>Na tela bloqueada</Label>
      <GlassChoice icon="eye-off" title="Esconder detalhes" sub={"\"Você tem 2 pendências de hoje\""} active/>
      <GlassChoice icon="eye" title="Mostrar tudo" sub={"\"Almoço ainda não marcado · 580 kcal\""}/>
      <Nota style={{marginTop:6}} icon="shield-check">Refeição, calorias, peso e treino são dados de saúde. Na tela bloqueada, qualquer pessoa com o seu celular na mão consegue ler.</Nota>
    </Scroll>
  </Phone>;
}

/* F7 · Widget na tela de início do celular */
function Icone({icon}){return <div style={{width:58,height:58,borderRadius:15,background:"var(--glass-strong)",border:"1px solid var(--glass-brd)",display:"flex",alignItems:"center",justifyContent:"center"}}>{I(icon,24,"var(--ios-label2)")}</div>;}
function F7(){
  const R=[["dumbbell","Treino B · Inferiores","45 min","play",true],["utensils","Almoço · 12:30","580 kcal","check",false],["droplet","Água","1,2 de 2,5 L","plus",false]];
  return <div className="phone">
    <div className="island"></div><div className="statusbar"><span>9:41</span><span style={{display:"flex",alignItems:"center",gap:6}}>{I("signal",16,"var(--ios-label)")}{I("wifi",16,"var(--ios-label)")}{I("battery-full",20,"var(--ios-label)")}</span></div>
    <div style={{position:"relative",zIndex:2,padding:"18px 18px 0"}}>
      <div className="glass" style={{padding:14,borderRadius:24,background:"var(--sheet)"}}>
        <Row style={{justifyContent:"space-between"}}><span style={{...mono,color:PT}}>Hoje · Eleva Pro</span><span style={{fontSize:11,color:"var(--ios-label2)"}}>3 de 6 feitos</span></Row>
        <div style={{marginTop:6}}>{R.map(([ic,t,s,a,pri],i)=><Row key={t} style={{padding:"8px 0",borderTop:i?"1px solid var(--glass-brd)":"none"}}>
          {I(ic,16,PT)}<div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--ios-label)"}}>{t}</div><div style={{fontSize:11,color:"var(--ios-label2)"}}>{s}</div></div>
          <div style={{width:32,height:32,borderRadius:99,background:pri?P:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center"}}>{I(a,15,pri?PF:"var(--ios-label)")}</div>
        </Row>)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,58px)",justifyContent:"space-between",rowGap:22,marginTop:26}}>
        {["calendar","mail","map","camera","music","message-circle","settings","cloud"].map(n=><Icone key={n} icon={n}/>)}
      </div>
    </div>
    <div style={{position:"absolute",left:14,right:14,bottom:28,height:84,borderRadius:30,background:"var(--glass-strong)",zIndex:2,display:"flex",justifyContent:"space-around",alignItems:"center"}}>{["phone","globe","message-square","music"].map(n=><Icone key={n} icon={n}/>)}</div>
    <div className="homebar"></div>
  </div>;
}

/* F8 · Especialista: quem está sumindo, antes de desistir */
function F8(){
  const A=[["MS","Marina Souza","5 dias sem treinar","dumbbell",AMB],["JP","João Pereira","3 refeições sem marcar hoje","utensils",AMB],["LC","Lia Costa","Pulou o check-in da semana","clipboard-check","var(--ios-label3)"]];
  return <Phone footer={<TabBarEspecialista/>}>
    <Scroll pb={110}>
      <Row style={{paddingTop:14,justifyContent:"space-between"}}><div><div style={mono}>Terça, 6 de outubro</div><div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)",marginTop:4}}>Painel</div></div><BotaoRedondo icon="bell"/></Row>
      <Label right="3 alunos">Precisam de atenção</Label>
      <Vidro style={{padding:"2px 14px"}}>{A.map(([ini,n,m,ic,c],i)=><Row key={n} style={{padding:"11px 0",borderTop:i?"1px solid var(--glass-brd)":"none"}}>
        <div style={{width:36,height:36,borderRadius:99,background:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"var(--ios-label)",flexShrink:0}}>{ini}</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)"}}>{n}</div><div style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,color:"var(--ios-label2)",marginTop:2}}>{I(ic,12,c)}{m}</div></div>
        <div style={{width:34,height:34,borderRadius:99,background:P,display:"flex",alignItems:"center",justifyContent:"center"}}>{I("message-circle",15,PF)}</div>
      </Row>)}</Vidro>
      <Nota style={{marginTop:12}}>Uma mensagem sua agora vale mais que qualquer aviso do app.</Nota>
    </Scroll>
  </Phone>;
}

/* F9 · Check-in com o peso que já veio da balança */
function F9(){
  return <Phone footer={<BotaoDeDestaque>Ver meu ajuste</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader skip="Agora não"/>
      <Title eyebrow="Segunda, 12 de outubro" size={28} sub="Só uma pergunta: o peso já veio da sua balança.">Sua semana</Title>
      <Label>Como foi o registro?</Label>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>{["Registrei tudo","Registrei parte","Não registrei, mas segui o plano","Não segui"].map((q,i)=><div key={q} style={{display:"flex"}}><ChipPick w={1} on={i===0}>{q}</ChipPick></div>)}</div>
      <Label right="média da semana">Peso</Label>
      <Vidro active style={{display:"flex",gap:12,alignItems:"center"}}>
        <CaixaDeIcone icon="heart-pulse" size={40}/>
        <div style={{flex:1}}><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,color:"var(--ios-label)"}}>77,8 kg</div><div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2}}>Do app Saúde · 6 pesagens da balança</div></div>
        <span style={{fontSize:12,fontWeight:600,color:"var(--ios-label2)"}}>Editar</span>
      </Vidro>
    </Scroll>
  </Phone>;
}

Object.assign(window,{F1,F2,F3,F3b,F4,F5,F6,F6b,F7,F8,F9});
