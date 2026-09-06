# A corrida se mede, e o caminho não se guarda

A sessão de corrida grava distância, ritmo médio, cadência e frequência cardíaca
média. A série de coordenadas de GPS que produz os dois primeiros **não é
persistida em lugar nenhum**: ela alimenta o cálculo e o desenho do percurso na
tela, e é descartada quando a sessão fecha. E porque cada base legal decide o
seu lugar, a FC média mora em tabela própria, e não numa coluna da sessão.

**Status:** accepted

## Por que o caminho não fica

O pedido era replicar a tela de corrida de um relógio comercial, mapa incluído.

A finalidade declarada é acompanhamento de desempenho, e distância, ritmo e FC a
entregam inteira: nenhuma decisão de prescrição muda em função da rua em que o
aluno correu. O que a série de coordenadas acrescenta é de outra natureza — o
ponto de partida da maioria das corridas é o endereço de casa, o horário
repetido é a janela previsível de ausência, e o conjunto revela trabalho,
academia e clínica.

É o mesmo julgamento que tirou horário de dormir e acordar da `0046`, e a mesma
doutrina do [ADR-0022](0022-o-aparelho-mede-o-modelo-interpreta.md): **processa
no aparelho, persiste o derivado.**

## Por que a FC não entra na tabela da sessão

Porque a RLS decide por **linha**, não por coluna.

`workout_sessions` é execução de contrato (Art. 7°, V) e a política do
especialista ali não consulta consentimento — nem pode: revogar consentimento de
dado de saúde não pode desligar a prescrição de treino nem apagar o aluno do
painel. FC média é Art. 11, e precisa que revogar feche o acesso.

Uma coluna de Art. 11 dentro de uma tabela de Art. 7° fica sob a política
errada, e a proteção acaba morando no cliente. Isso já aconteceu: é a pendência
de `workout_sessions.notes`, aberta em 2026-09-04 e ainda não resolvida.
Repeti-la sabendo seria escolher o furo.

## Consequências

**Não existe histórico de mapa.** Reabrir uma corrida antiga mostra distância,
ritmo e FC; o percurso só existe durante a sessão que o gerou. Foi o custo
aceito explicitamente, e é a parte que surpreende quem usa outros aplicativos de
corrida.

**Não há serviço de mapas no produto.** Sem coordenada persistida não há o que
renderizar depois, e portanto não entram MapLibre, Protomaps, tiles nem chave de
API — nem o egress que qualquer um deles somaria ao plano gratuito do Supabase.

**Reverter é caro, de propósito.** Voltar atrás exige tabela nova,
`consent_type` próprio, `POLICY_VERSION` nova e desmontar a guarda que hoje varre
o schema inteiro atrás de coluna de geolocalização — por nome e por tipo. A
guarda existe justamente para que a decisão não seja revertida por distração,
e ela alcança inclusive a tabela que ainda não foi criada.
