import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

/**
 * O que o aluno lê antes de a câmera abrir.
 *
 * Equivalente ao `BodyScanIntroduction`, e pela mesma razão: consentimento
 * informado (Art. 9°) é sobre o texto que a pessoa leu, não sobre o clique. O
 * botão só existe depois do texto de propósito.
 *
 * **Não promete precisão.** O critério é geométrico e o limiar ainda não saiu
 * de corpus rotulado — dizer "o app sabe se você agachou certo" seria prometer
 * o que não se mediu.
 */

function Ponto({ titulo, children }: { titulo: string; children: string }) {
  return (
    <View className="mb-5">
      <Text className="text-white font-bold mb-1">{titulo}</Text>
      <Text className="text-white/70 leading-relaxed">{children}</Text>
    </View>
  );
}

interface IntroducaoProps {
  onAutorizar: () => void;
  onCancelar: () => void;
  erro: string | null;
}

export function IntroducaoDaTecnica({ onAutorizar, onCancelar, erro }: IntroducaoProps) {
  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12" contentContainerClassName="pb-8">
        <Text className="text-white text-2xl font-bold mb-2">Análise de Técnica</Text>
        <Text className="text-white/60 mb-8 leading-relaxed">
          O app conta suas repetições de agachamento e diz se cada uma passou da paralela. Para
          isso, precisa da sua autorização — e você precisa saber o que acontece.
        </Text>

        <Ponto titulo="A câmera fica aberta durante a série">
          Ela não tira fotos: analisa continuamente enquanto a tela está aberta, para conseguir
          contar e falar no meio do movimento.
        </Ponto>

        <Ponto titulo="Nada é gravado">
          Nenhuma imagem é salva, nem no aparelho nem em servidor. O que o app extrai de cada quadro
          é a posição das suas articulações — um boneco de palito, sem imagem e sem rosto.
        </Ponto>

        <Ponto titulo="Nada sai do seu aparelho">
          A análise inteira roda aqui dentro. Nem a imagem nem as posições são enviadas para lugar
          nenhum, e seu personal não recebe nada disso.
        </Ponto>

        <Ponto titulo="O app fala em voz alta">
          Ele diz "fundo" ou "faltou" a cada repetição. Se você estiver numa academia, quem estiver
          por perto vai ouvir.
        </Ponto>

        <Ponto titulo="Ele não substitui o seu personal">
          O app olha uma coisa só: se o quadril passou da linha do joelho. Não avalia joelho,
          coluna, ritmo, nem se o exercício é adequado para você.
        </Ponto>

        <Ponto titulo="Você pode voltar atrás">
          Dá para retirar esta autorização quando quiser, no seu perfil. A análise para na hora.
        </Ponto>

        {erro !== null && (
          <View className="bg-red-950 rounded-lg px-4 py-3 mb-4">
            <Text className="text-red-200">{erro}</Text>
          </View>
        )}
      </ScrollView>

      <View className="px-6 pb-10 pt-2 border-t border-white/10">
        <TouchableOpacity className="bg-white rounded-xl py-4 mb-3" onPress={onAutorizar}>
          <Text className="text-black text-center font-bold">Li e autorizo</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-3" onPress={onCancelar}>
          <Text className="text-white/60 text-center">Agora não</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
