import type { TrainingPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

type PhaseStatus = TrainingPlan['status'];

interface PhaseStatusModalProps {
  visible: boolean;
  status: PhaseStatus;
  onClose: () => void;
  onSelectStatus: (status: PhaseStatus) => void;
}

const OPCOES: {
  status: PhaseStatus;
  icon: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  tom: 'orange' | 'green' | 'blue';
}[] = [
  {
    status: 'planned',
    icon: 'document-text',
    titulo: 'Rascunho',
    descricao: 'Fase em planejamento, não visível ao aluno',
    tom: 'orange',
  },
  {
    status: 'active',
    icon: 'play',
    titulo: 'Ativo',
    descricao: 'Fase em execução pelo aluno',
    tom: 'green',
  },
  {
    status: 'completed',
    icon: 'checkmark-done',
    titulo: 'Concluído',
    descricao: 'Fase finalizada e arquivada para consulta',
    tom: 'blue',
  },
];

const FUNDO_ATIVO = {
  orange: 'bg-orange-500/10',
  green: 'bg-green-500/10',
  blue: 'bg-blue-500/10',
};
const BORDA_ATIVA = {
  orange: 'border-orange-500/30',
  green: 'border-green-500/30',
  blue: 'border-blue-500/30',
};
const CAIXA_ATIVA = {
  orange: 'bg-orange-500/20',
  green: 'bg-green-500/20',
  blue: 'bg-blue-500/20',
};

/** As três etapas de uma fase, com a cor combinando com o resto do kit. */
export function PhaseStatusModal({
  visible,
  status,
  onClose,
  onSelectStatus,
}: PhaseStatusModalProps) {
  const cores = useCores();
  const escalar = useEscala();
  const corDoTom = { orange: cores.warning, green: cores.success, blue: cores.secondary };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/80 justify-center px-6"
      >
        <View className="bg-zinc-950 rounded-[2rem] border border-white/10 p-6 shadow-2xl overflow-hidden">
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl" />

          <Text className="text-white text-xl font-extrabold font-display mb-1 text-center">
            Status da Fase
          </Text>
          <Text className="text-zinc-500 text-sm mb-6 text-center">
            Escolha a etapa atual desta periodização
          </Text>

          <View className="gap-3">
            {OPCOES.map((opcao) => {
              const ativa = status === opcao.status;
              return (
                <TouchableOpacity
                  key={opcao.status}
                  onPress={() => onSelectStatus(opcao.status)}
                  className={`flex-row items-center p-4 rounded-2xl border ${
                    ativa
                      ? `${FUNDO_ATIVO[opcao.tom]} ${BORDA_ATIVA[opcao.tom]}`
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${
                      ativa ? CAIXA_ATIVA[opcao.tom] : 'bg-zinc-900'
                    }`}
                  >
                    <Ionicons
                      name={opcao.icon}
                      size={escalar(20)}
                      color={ativa ? corDoTom[opcao.tom] : cores.mutedForeground}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold ${ativa ? 'text-white' : 'text-zinc-300'}`}>
                      {opcao.titulo}
                    </Text>
                    <Text className="text-zinc-500 text-xs text-wrap">{opcao.descricao}</Text>
                  </View>
                  {ativa && (
                    <Ionicons
                      name="checkmark-circle"
                      size={escalar(20)}
                      color={corDoTom[opcao.tom]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="mt-6 bg-zinc-900 py-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white font-bold text-center">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
