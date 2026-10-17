/* Acompanhamento · B: fim de bloco, mudar o plano antes do fim, histórico e jornada. */

/* B1 · O bloco terminou: o que a reavaliação pede */
function B1(){
  return <Phone footer={<><BotaoDeDestaque bottom={84} icon="arrow-right">Começar</BotaoDeDestaque><BotaoSecundario text bottom={40}>Lembrar amanhã</BotaoSecundario></>}>
    <Scroll>
      <OnbHeader back={false}/>
      <div style={{marginTop:20}}><CaixaDeIcone icon="flag" size={60}/></div>
      <Title eyebrow="Bloco 1 · Base · concluído" size={28} sub="4 semanas. Em 4 minutos a gente mede o que mudou e monta o próximo bloco a partir disso.">Hora da reavaliação</Title>
      <Vidro style={{marginTop:20,padding:"2px 14px"}}>
        <LinhaDeVidro first icon="scan-line" title="Body scan" sub="Duas fotos, frente e lado" right={<span style={{fontSize:11.5,color:"var(--ios-label2)"}}>2 min</span>}/>
        <LinhaDeVidro icon="ruler" title="Peso e cintura" sub="Já vem preenchido do check-in" right={<span style={{fontSize:11.5,color:"var(--ios-label2)"}}>1 min</span>}/>
        <LinhaDeVidro icon="list-checks" title="Mudou alguma coisa?" sub="Objetivo, dias, local e dor" right={<span style={{fontSize:11.5,color:"var(--ios-label2)"}}>1 min</span>}/>
      </Vidro>
      <Nota style={{marginTop:12}}>Sem body scan, o bloco novo sai só com peso e cintura.</Nota>
    </Scroll>
  </Phone>;
}

/* B2 · Mudou alguma coisa? Cada item vem com a resposta do onboarding */
function Pergunta({icon,title,atual,mudou,children}){
  return <Vidro active={mudou} style={{marginBottom:9,padding:13}}>
    <Row><CaixaDeIcone icon={icon} size={32}/><div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)"}}>{title}</div><div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2}}>Hoje: {atual}</div></div></Row>
    <div style={{display:"flex",gap:7,marginTop:10}}><ChipPick w={1} on={!mudou}>Igual</ChipPick><ChipPick w={1} on={mudou}>Mudou</ChipPick></div>
    {children}
  </Vidro>;
}
function B2(){
  return <Phone footer={<><Fade/><BotaoDeDestaque>Montar o Bloco 2</BotaoDeDestaque></>}>
    <Scroll>
      <OnbHeader step={3} total={3}/>
      <Title size={26} sub="Toque em Mudou só no que for diferente.">Mudou alguma coisa?</Title>
      <div style={{marginTop:16}}>
        <Pergunta icon="target" title="Objetivo" atual="perder gordura"/>
        <Pergunta icon="calendar-days" title="Dias por semana" atual="4 dias de 45 min"/>
        <Pergunta icon="map-pin" title="Onde você treina" atual="em casa" mudou>
          <div style={{display:"flex",gap:7,marginTop:9}}><ChoiceTile icon="house" title="Casa"/><ChoiceTile icon="dumbbell" title="Academia" active/><ChoiceTile icon="trees" title="Ao ar livre"/></div>
        </Pergunta>
        <Pergunta icon="bandage" title="Dor ou lesão" atual="nenhuma"/>
      </div>
    </Scroll>
  </Phone>;
}

/* B3 · Montando o próximo bloco */
function B3(){
  return <Phone>
    <Scroll>
      <OnbHeader back={false}/>
      <Title size={26} eyebrow="Leva uns segundos" sub="Comparando com a sua primeira avaliação.">Montando seu Bloco 2</Title>
      <Vidro style={{marginTop:20,padding:"2px 14px"}}><div style={{marginTop:-1}}>
        <PassoDeEspera state="done" label="Comparando seu corpo"/>
        <PassoDeEspera state="done" label="Revendo suas cargas"/>
        <PassoDeEspera state="active" label="Montando os treinos na academia"/>
        <PassoDeEspera state="todo" label="Recalculando sua meta"/>
      </div></Vidro>
    </Scroll>
  </Phone>;
}

/* novo · Prometido × real: a curva do onboarding (O8) contra o que aconteceu */
function Promessa({h=150}){
  const w=320,l=8,r=14,t=14,b=22,prom=[78.4,78.0,77.6,77.2,76.8],real=[78.4,78.0,77.5,77.0,76.5];
  const mn=76.2,mx=78.6,X=i=>l+i*(w-l-r)/4,Y=v=>t+(mx-v)/(mx-mn)*(h-t-b);
  const line=a=>a.map((v,i)=>`${i?"L":"M"}${X(i)} ${Y(v)}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{display:"block"}}>
    <path d={line(prom)} fill="none" stroke="var(--ios-label3)" strokeWidth="2" strokeDasharray="4 4"/>
    <path d={`${line(real)} L${X(4)} ${h-b} L${X(0)} ${h-b} Z`} fill={tint(P,10)}/>
    <path d={line(real)} fill="none" stroke={P} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    {real.map((v,i)=><circle key={i} cx={X(i)} cy={Y(v)} r={i===4?5:3} fill={P}/>)}
    {["Início","Sem 1","Sem 2","Sem 3","Sem 4"].map((s,i)=><text key={s} x={X(i)} y={h-6} textAnchor={i===0?"start":"middle"} fontSize="9" fontFamily="var(--font-mono)" fill="var(--ios-label3)">{s}</text>)}
  </svg>;
}

/* B4 · Relatório do bloco, em duas alturas de rolagem */
function B4({parte=1}){
  if(parte===2)return <Phone footer={<><Fade/><BotaoDeDestaque>Ver o Bloco 2</BotaoDeDestaque></>}>
    <Scroll>
      <div style={{height:14}}></div>
      <Label>Números do bloco</Label>
      <div style={{display:"flex",gap:8}}><Numero icon="dumbbell" label="Treinos" value="15/16" sub="94% feitos"/><Numero icon="trophy" label="Recordes" value="6" sub="em 5 exercícios"/></div>
      <div style={{display:"flex",gap:8,marginTop:8}}><Numero icon="utensils" label="Dieta" value="24/28" sub="dias na meta"/><Numero icon="flame" label="Sequência" value="4" sub="semanas seguidas"/></div>
      <Vidro active style={{marginTop:12,display:"flex",gap:12,alignItems:"flex-start"}}>
        <CaixaDeIcone icon="sparkles" size={38}/>
        <div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>Seu plano mudou 7 vezes com você</div><div style={{fontSize:12,lineHeight:1.4,color:"var(--ios-label2)",marginTop:3}}>5 cargas subiram, 1 exercício trocado pelo ombro e a meta revista 1 vez.</div></div>
      </Vidro>
      <Label>Composição</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <AntesDepois first icon="percent" title="Gordura" antes="29%" depois="27,5%" delta="−1,5 pt"/>
        <AntesDepois icon="biceps-flexed" title="Massa magra" antes="55,6 kg" depois="55,5 kg · mantida" delta="−0,1 kg"/>
      </Vidro>
    </Scroll>
  </Phone>;
  return <Phone>
    <Scroll>
      <Topo/>
      <Title eyebrow="Bloco 1 · Base · 14 set a 11 out" size={28} sub="Você perdeu mais do que a gente prometeu no primeiro dia, sem perder músculo.">À frente do combinado</Title>
      <Vidro style={{marginTop:16,padding:"12px 12px 8px"}}>
        <Row style={{justifyContent:"space-between",marginBottom:4}}><Status icon="chevrons-up">À frente</Status><span style={{fontSize:11,color:"var(--ios-label2)"}}>tendência semanal</span></Row>
        <Promessa/>
        <Row style={{gap:14,marginTop:8,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:"var(--ios-label2)"}}><span style={{width:14,height:0,borderTop:"2px dashed var(--ios-label3)"}}></span>Prometido no 1º dia · <b style={{color:"var(--ios-label)"}}>−1,6 kg</b></span>
          <span style={{display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:"var(--ios-label2)"}}><span style={{width:14,height:3,borderRadius:99,background:P}}></span>Real · <b style={{color:"var(--ios-label)"}}>−1,9 kg</b></span>
        </Row>
      </Vidro>
      <Label right="body scan de hoje">Antes e depois</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <AntesDepois first icon="scale" title="Peso" antes="78,4 kg" depois="76,5 kg" delta="−1,9 kg"/>
        <AntesDepois icon="ruler" title="Cintura" antes="84 cm" depois="81 cm" delta="−3 cm"/>
      </Vidro>
    </Scroll>
  </Phone>;
}
const B4b=()=><B4 parte={2}/>;

/* novo · Linha do tempo dos blocos */
function Blocos({atual=2,nomes=["Base","Volume","Força"]}){
  return <Row style={{gap:6}}>{nomes.map((n,i)=>{const k=i+1,feito=k<atual,agora=k===atual;
    return <React.Fragment key={n}>{i>0&&<div style={{width:14,height:2,borderRadius:99,background:feito||agora?P:"var(--glass-brd)"}}></div>}
      <div style={{flex:1,padding:"8px 6px",borderRadius:12,textAlign:"center",background:agora?P:feito?tint(P,16):"var(--glass-strong)",border:`1px solid ${agora?P:"var(--glass-brd)"}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontSize:11,fontWeight:800,color:agora?PF:"var(--ios-label)"}}>{feito&&I("check",11,PT)}Bloco {k}</div>
        <div style={{fontSize:9.5,fontWeight:600,marginTop:2,color:agora?PF:"var(--ios-label2)"}}>{n}</div>
      </div></React.Fragment>;})}</Row>;
}

/* B5 · O próximo bloco, para aprovar */
function B5(){
  return <Phone footer={<><Fade/><BarraDeDuasAcoes sec="Ajustar" secIcon="sliders-horizontal" pri="Aprovar Bloco 2" priIcon="check"/></>}>
    <Scroll>
      <OnbHeader/>
      <Title eyebrow="Bloco 2 · Volume · 4 semanas" size={26} sub="Começa amanhã, das cargas que você já levanta.">Seu próximo bloco</Title>
      <div style={{marginTop:16}}><Blocos/></div>
      <Label>O que muda</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="map-pin" title="Treinos na academia" sub="Você mudou o local na reavaliação" right={<Ganho icon="sparkles">novo</Ganho>}/>
        <AntesDepois icon="layers" title="Séries nos exercícios principais" antes="3" depois="4" delta="+33% vol."/>
        <AntesDepois icon="dumbbell" title="Exercícios novos" antes="—" depois="Leg press, puxada, supino reto" delta="+3"/>
        <AntesDepois icon="target" title="Meta diária" antes="2.000 kcal" depois="1.950 kcal" delta="−50 kcal"/>
      </Vidro>
      <Nota style={{marginTop:12}} icon="lock">Continua: 4 dias de 45 min, sua meta de proteína e os exercícios de que você gostou.</Nota>
    </Scroll>
  </Phone>;
}

/* B5 · Variante Aluno: a reavaliação vai para o especialista */
function B5Aluno(){
  return <Phone footer={<BotaoDeDestaque icon="check">Entendi</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader back={false}/>
      <Title size={26} eyebrow="Reavaliação enviada" sub="Seu relatório do Bloco 1 já está com ele.">Daniel está montando seu Bloco 2</Title>
      <Vidro style={{marginTop:16,padding:"12px 12px 8px"}}><Promessa h={130}/></Vidro>
      <Vidro style={{marginTop:12,display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:99,background:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"var(--ios-label)"}}>DL</div><div style={{flex:1,fontSize:12.5,lineHeight:1.4,color:"var(--ios-label2)"}}><b style={{color:"var(--ios-label)"}}>Até o Bloco 2 chegar</b>, você segue com os treinos e a dieta do Bloco 1. Avisamos quando ele publicar.</div></Vidro>
    </Scroll>
  </Phone>;
}

/* C · Mudar o plano antes do fim do bloco */
function TreinosFundo(){
  return <Scroll pb={110}>
    <Row style={{paddingTop:14,justifyContent:"space-between"}}><div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>Treinos</div><BotaoRedondo icon="ellipsis"/></Row>
    <Vidro style={{marginTop:16}}><div style={mono}>Bloco 2 · Volume</div><div style={{fontSize:15,fontWeight:700,color:"var(--ios-label)",marginTop:6}}>Semana 2 de 4</div><div style={{marginTop:10}}><BarraDeProgresso pct={40}/></div></Vidro>
  </Scroll>;
}
function C1(){
  return <Phone tabs="Treinos" overlay={<GlassSheet title="Mudar meu plano" sub="Você está na semana 2 de 4 do Bloco 2.">
      <UDOpt first icon="target" title="Mudei de objetivo" sub="Ex.: de perder gordura para ganhar massa"/>
      <UDOpt icon="calendar-days" title="Mudaram meus dias ou horário" sub="Mais ou menos dias, treino mais curto"/>
      <UDOpt icon="map-pin" title="Vou treinar em outro lugar" sub="Casa, academia ou ao ar livre"/>
      <UDOpt icon="bandage" title="Tenho uma dor ou lesão" sub="O plano evita a região"/>
      <Nota style={{marginTop:12}}>Só um exercício incomodando? Troque pelo "…" no treino, sem mudar o plano.</Nota>
    </GlassSheet>}>
    <TreinosFundo/>
  </Phone>;
}
function C2(){
  return <Phone footer={<BarraDeDuasAcoes sec="Voltar" secIcon="chevron-left" pri="Gerar plano novo" priIcon="sparkles"/>}>
    <Scroll>
      <OnbHeader/>
      <div style={{marginTop:20}}><CaixaDeIcone icon="flag" size={60}/></div>
      <Title eyebrow="Novo objetivo: ganhar massa" size={26} sub="Nada é apagado. O bloco atual fecha e o novo começa amanhã.">O Bloco 2 termina hoje</Title>
      <Vidro style={{marginTop:20,padding:"2px 14px"}}>
        <LinhaDeVidro first icon="history" title="Fica no seu histórico" sub="2 semanas, 7 treinos e 2 recordes do Bloco 2"/>
        <LinhaDeVidro icon="dumbbell" title="Suas cargas continuam" sub="O plano novo parte do que você já levanta"/>
        <LinhaDeVidro icon="calendar-plus" title="Bloco 3 · Ganho de massa" sub="Começa amanhã · 4 semanas"/>
      </Vidro>
      <Label>Meta recalculada</Label>
      <Vidro style={{padding:"2px 14px"}}><AntesDepois first icon="target" title="Meta diária" antes="1.950 kcal" depois="2.450 kcal · superávit leve" delta="+500 kcal"/></Vidro>
    </Scroll>
  </Phone>;
}

/* C3 · Histórico de blocos, no Progresso */
function CartaoDeBloco({k,nome,status,tone=P,pct,linhas,active}){
  return <Vidro active={active} style={{marginBottom:9,padding:14}}>
    <Row style={{justifyContent:"space-between"}}><div style={{fontSize:14.5,fontWeight:700,color:"var(--ios-label)"}}>Bloco {k} · {nome}</div><span style={{...mono,fontSize:9,padding:"4px 8px",borderRadius:99,background:tint(tone,16),color:"var(--ios-label)"}}>{status}</span></Row>
    {pct!=null&&<div style={{marginTop:10}}><BarraDeProgresso pct={pct}/></div>}
    <div style={{display:"flex",flexWrap:"wrap",gap:"6px 14px",marginTop:10}}>{linhas.map(([ic,t])=><span key={t} style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,color:"var(--ios-label2)"}}>{I(ic,13,"var(--ios-label3)")}{t}</span>)}</div>
  </Vidro>;
}
function C3(){
  return <Phone tabs="Progresso">
    <Scroll pb={110}>
      <Row style={{paddingTop:14,gap:12}}><BotaoRedondo/><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>Seus blocos</div></Row>
      <div style={{marginTop:16}}>
        <CartaoDeBloco active k={3} nome="Ganho de massa" status="Semana 1 de 4" pct={10} linhas={[["calendar","desde 20 out"],["target","2.450 kcal"]]}/>
        <CartaoDeBloco k={2} nome="Volume" status="Encerrado antes" tone={AMB} linhas={[["calendar","2 de 4 semanas"],["dumbbell","7 treinos"],["trophy","2 recordes"],["info","mudou o objetivo"]]}/>
        <CartaoDeBloco k={1} nome="Base" status="Concluído" linhas={[["dumbbell","15/16 treinos"],["trophy","6 recordes"],["trending-down","−1,9 kg"],["ruler","−3 cm cintura"]]}/>
      </div>
      <Nota style={{marginTop:6}}>Toque num bloco para ver o relatório dele.</Nota>
    </Scroll>
  </Phone>;
}

/* D · Sua jornada: tudo o que mudou desde o primeiro dia */
function Marco({icon,data,title,sub,last,hoje}){
  return <div style={{display:"flex",gap:12}}>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32}}>
      <div style={{width:32,height:32,borderRadius:99,background:hoje?P:tint(P,16),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{I(icon,15,hoje?PF:PT)}</div>
      {!last&&<div style={{flex:1,width:2,background:"var(--glass-brd)",margin:"4px 0"}}></div>}
    </div>
    <div style={{flex:1,paddingBottom:last?0:14}}><div style={{...mono,fontSize:9}}>{data}</div><div style={{fontSize:13.5,fontWeight:700,color:"var(--ios-label)",marginTop:3}}>{title}</div>{sub&&<div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2,lineHeight:1.35}}>{sub}</div>}</div>
  </div>;
}
function D1(){
  return <Phone tabs="Progresso">
    <Scroll pb={110}>
      <Row style={{paddingTop:14,justifyContent:"space-between"}}><div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:"-.03em",color:"var(--ios-label)"}}>Sua jornada</div><BotaoRedondo icon="share-2"/></Row>
      <div style={{fontSize:12.5,color:"var(--ios-label2)",marginTop:4}}>Desde 14 de setembro · 4 semanas</div>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <Numero label="Peso" value="−1,9" sub="kg"/><Numero label="Recordes" value="6"/><Numero label="Sequência" value="4" sub="semanas"/>
      </div>
      <Label right="ver todos">Linha do tempo</Label>
      <Vidro style={{padding:14}}>
        <Marco hoje icon="flag" data="Hoje" title="Bloco 1 concluído" sub="À frente do combinado: −1,9 kg de −1,6 kg"/>
        <Marco icon="trophy" data="1 out" title="Recorde no supino" sub="12,5 kg × 12"/>
        <Marco icon="target" data="28 set" title="Meta 2.150 → 2.000 kcal" sub="O peso caiu abaixo do ritmo"/>
        <Marco last icon="sparkles" data="14 set" title="Seu plano nasceu" sub="Prometemos −0,4 kg por semana"/>
      </Vidro>
      <Vidro active style={{marginTop:12,display:"flex",gap:12,alignItems:"center"}}>
        <CaixaDeIcone icon="sparkles" size={38}/>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"var(--ios-label)"}}>Seu plano mudou 7 vezes com você</div><div style={{fontSize:11.5,color:"var(--ios-label2)",marginTop:2}}>Cargas, meta e exercícios, sempre com o porquê</div></div>
        {I("chevron-right",16,"var(--ios-label3)")}
      </Vidro>
    </Scroll>
  </Phone>;
}

Object.assign(window,{B1,B2,B3,B4,B4b,B5,B5Aluno,Promessa,Blocos,C1,C2,C3,D1});
