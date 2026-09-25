import type { TrainingPlan } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Group } from '@/components/ui/Group';
import { Row } from '@/components/ui/Row';

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
}[] = [
  {
    status: 'planned',
    icon: 'document-text-outline',
    titulo: 'Rascunho',
    descricao: 'Fase em planejamento, não visível ao aluno',
  },
  {
    status: 'active',
    icon: 'play-outline',
    titulo: 'Ativo',
    descricao: 'Fase em execução pelo aluno',
  },
  {
    status: 'completed',
    icon: 'checkmark-done-outline',
    titulo: 'Concluído',
    descricao: 'Fase finalizada e arquivada para consulta',
  },
];

/** As três etapas de uma fase, com a cor combinando com o resto do kit. */
export function PhaseStatusModal({
  visible,
  status,
  onClose,
  onSelectStatus,
}: PhaseStatusModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 justify-center bg-veu-da-folha px-6"
      >
        <View className="rounded-lg border border-border bg-background p-6">
          <Text className="mb-1 text-center text-h2 font-bold text-foreground">Status da fase</Text>
          <Text className="mb-6 text-center text-[0.8125rem] text-muted-foreground">
            Escolha a etapa atual desta periodização
          </Text>

          <Group>
            {OPCOES.map((opcao) => (
              <Row
                key={opcao.status}
                icon={opcao.icon}
                title={opcao.titulo}
                sub={opcao.descricao}
                selected={status === opcao.status}
                onPress={() => onSelectStatus(opcao.status)}
              />
            ))}
          </Group>

          <TouchableOpacity
            onPress={onClose}
            className="mt-3 h-[2.625rem] items-center justify-center rounded-md bg-muted"
            accessibilityRole="button"
          >
            <Text className="font-bold text-foreground">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
