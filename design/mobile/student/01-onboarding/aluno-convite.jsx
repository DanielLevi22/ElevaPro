function AlunoSenha(){
  return <Phone footer={<BotaoDeDestaque>Criar senha</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader step={1} total={3}/>
      <Title eyebrow="Convite de Daniel Levi" size={28} sub="Seu especialista te convidou. Crie uma senha para entrar.">Bem-vinda, Marina</Title>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:22}}>
        <Campo label="E-mail" value="marina@email.com"/>
        <Campo label="Senha" value="••••••••"/>
      </div>
      <Nota style={{marginTop:10}} icon="lock">Mínimo de 8 caracteres, com um número.</Nota>
    </Scroll>
  </Phone>;
}
function AlunoVinculo(){
  return <Phone footer={<BotaoDeDestaque icon="check">Confirmar vínculo</BotaoDeDestaque>}>
    <Scroll>
      <OnbHeader step={2} total={3}/>
      <Title size={28} sub="Ele monta seu treino e sua dieta e acompanha sua evolução.">Este é o seu especialista</Title>
      <Vidro style={{marginTop:22,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{width:52,height:52,borderRadius:99,background:"var(--glass-strong)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontWeight:800,fontSize:18,color:"var(--ios-label)"}}>DL</div>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:"var(--ios-label)"}}>Daniel Levi</div><div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>Especialista · treino e dieta</div></div>
      </Vidro>
      <Label>O que ele vê</Label>
      <Vidro style={{padding:"2px 14px"}}>
        <LinhaDeVidro first icon="dumbbell" title="Seus treinos e cargas"/>
        <LinhaDeVidro icon="utensils" title="Suas refeições registradas"/>
        <LinhaDeVidro icon="heart-pulse" title="Dados de saúde que você autorizar"/>
      </Vidro>
    </Scroll>
  </Phone>;
}
function AlunoAnamnese(){
  return <Phone footer={<BarraDeDuasAcoes sec="Depois" secIcon="clock" pri="Próxima etapa" priIcon="arrow-right"/>}>
    <Scroll>
      <OnbHeader step={3} total={3} skip="Responder depois"/>
      <Title eyebrow="Anamnese · etapa 1 de 4" size={26} sub="Daniel usa isso para montar seu plano. Nada é gerado pelo app.">Sua rotina hoje</Title>
      <Label>Treina atualmente?</Label>
      <div style={{display:"flex",gap:7}}><ChipPick w={1}>Não</ChipPick><ChipPick w={1} on>1–2x</ChipPick><ChipPick w={1}>3x ou mais</ChipPick></div>
      <Label>Algum destes se aplica?</Label>
      <Chips gap={8}>{[["Lesão ou dor",1],["Diabetes"],["Hipertensão"],["Nenhum"]].map(([t,on])=><ChipMulti key={t} on={!!on}>{t}</ChipMulti>)}</Chips>
    </Scroll>
  </Phone>;
}
Object.assign(window,{AlunoSenha,AlunoVinculo,AlunoAnamnese});
