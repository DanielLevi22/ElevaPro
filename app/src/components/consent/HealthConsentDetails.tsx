import { POLICY_VERSION } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Bullet } from '@/components/ui/Bullet';
import { storedItems } from './storedItems';

/**
 * O que a pessoa aceita no consentimento de saúde: o que é guardado, o que sai
 * do aparelho, o que o app decide sozinho e quem lê.
 *
 * Mora fora da folha da porta porque o onboarding do Praticante pede o mesmo
 * aceite como etapa própria (#365). Dois textos para o mesmo aceite divergiriam
 * na primeira mudança, e a pessoa aceitaria coisas diferentes conforme a porta.
 *
 * @example <HealthConsentDetails hasSpecialist={false} />
 */
export function HealthConsentDetails({ hasSpecialist }: { hasSpecialist: boolean }) {
  return (
    <>
      <Heading>O que é armazenado</Heading>
      {storedItems(hasSpecialist).map((item) => (
        <Bullet key={item}>{item}</Bullet>
      ))}

      {/* A 1.5 existe por este parágrafo: o scan e o assistente mandavam foto
          e contexto do dia para fora do aparelho, e o texto não dizia. */}
      <Heading>O que sai do aparelho</Heading>
      <Paragraph>
        Quando você fotografa um prato ou pergunta ao assistente de nutrição, a foto, a pergunta,
        seu plano alimentar e o que falta de calorias e macros do dia vão a um serviço de
        inteligência artificial externo, só para gerar a resposta. A foto não é guardada, e seu nome
        não vai junto.
      </Paragraph>
      {/* A 1.9 existe também por este parágrafo (#365): a geração do plano manda
          ao mesmo serviço as escolhas do onboarding, e só elas. */}
      <Paragraph>
        Para montar o seu plano, vão ao mesmo serviço o seu objetivo, o seu nível, as suas escolhas
        de treino e de alimentação e a meta de calorias que o app calculou. Sua idade, seu peso, sua
        altura e a sua triagem de saúde não vão.
      </Paragraph>

      {/* A 1.9 existe também por este parágrafo: a triagem é decisão automatizada
          (Art. 20), e quem é afetado por ela tem direito de saber o critério e de
          pedir revisão antes de aceitar. */}
      <Heading>O que o app decide sozinho</Heading>
      <Paragraph>
        Se você não tem especialista, o app usa a triagem de saúde para decidir se monta a sua
        dieta. Com uma condição que pede acompanhamento, ou sem a resposta, ele monta só o treino e
        indica um especialista. A meta de calorias sai de uma fórmula, nunca da inteligência
        artificial. Você pode refazer a triagem quando quiser.
      </Paragraph>
      {/* A 1.10 existe por este parágrafo (#376): o peso da semana passou a
          propor mudança na meta, e quem aceita precisa saber o freio e que a
          decisão final é dele. */}
      <View className="mt-2">
        <Paragraph>
          Toda semana, no check-in, o app compara o seu peso com o ritmo da sua meta e pode propor
          um ajuste de até 200 kcal. Nada muda sem você aprovar. Com especialista, o check-in vai
          para ele, e o app não ajusta nada sozinho.
        </Paragraph>
      </View>

      <Heading>Quem lê</Heading>
      <Paragraph>{hasSpecialist ? QUEM_LE_COM_ESPECIALISTA : QUEM_LE_SEM_ESPECIALISTA}</Paragraph>

      {/* Opacidade cheia: com `/70` este parágrafo ficava em 4.04:1 sobre a
          superfície, abaixo do mínimo de 4.5:1 — e é justamente o texto que
          declara a base legal do tratamento. */}
      <Text className="mt-3.5 text-[0.71875rem] leading-[1.08rem] text-muted-foreground">
        Base legal: Tutela da saúde (Art. 11, II, f) e Consentimento (Art. 11, I) da LGPD. Você pode
        revogar quando quiser no seu perfil, em Minhas autorizações — a revogação vale daqui para
        frente e não apaga o que já foi registrado. Versão {POLICY_VERSION} da política.
      </Text>
    </>
  );
}

/**
 * O que a pessoa perde ao recusar. Dizia que sem o aceite o app "para de
 * registrar treinos, refeições e medidas", e não para: o que consulta o aceite é
 * a leitura do relógio, a anotação e a FC da sessão, a água (0052), a anamnese
 * (0083) e as rotas de inteligência artificial. Quem recusa decide pelo que
 * perde, e o texto precisa dizer o que é (#308).
 */
export const CONSENT_REFUSAL_NOTE =
  'Sem o aceite o app continua funcionando e seus treinos e refeições seguem registrados. Ficam de fora a anamnese e a dieta montada pelo app, os dados do relógio, a água do dia, as medidas que você registra, as anotações e a frequência cardíaca dos treinos, e as funções de inteligência artificial.';

/**
 * O Praticante não tem especialista: dizer a ele que "o especialista vinculado"
 * lê seria descrever um tratamento que não acontece. O texto diz o de hoje e o que
 * muda se ele se vincular, porque o aceite de agora vale para esse dia (#308).
 */
const QUEM_LE_COM_ESPECIALISTA =
  'O especialista vinculado a você — inclusive o que você escrever no feedback de fim de treino. É para esse acompanhamento que o feedback existe: é ele que permite ajustar a sua prescrição quando algo dói ou some.';
const QUEM_LE_SEM_ESPECIALISTA =
  'Hoje, só você. Se você se vincular a um especialista, ele passa a ler estes dados — inclusive o que você escrever no feedback de fim de treino, que é para esse acompanhamento que ele existe.';

function Heading({ children }: { children: string }) {
  return (
    <Text className="mb-[0.5625rem] mt-5 text-[0.84375rem] font-bold text-foreground">
      {children}
    </Text>
  );
}

function Paragraph({ children }: { children: string }) {
  return (
    <Text className="text-[0.8125rem] leading-[1.2rem] text-muted-foreground">{children}</Text>
  );
}
