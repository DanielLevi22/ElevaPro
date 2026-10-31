import type { WorkoutDifficulty } from '@elevapro/shared';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Chip } from '@/components/ui/Chip';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';

export interface NewWorkoutInput {
  title: string;
  description: string;
  difficulty: WorkoutDifficulty;
}

interface NewWorkoutModalProps {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onCreate: (workout: NewWorkoutInput) => void;
}

const LEVELS: { value: WorkoutDifficulty; label: string }[] = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
];

/**
 * O "Novo Treino" da fase, como no web: o identificador vira o título
 * ("D" → "Treino D"), com descrição e nível opcionais.
 *
 * @example {aberto && <NewWorkoutModal visible saving={false} onClose={fechar} onCreate={criar} />}
 */
export function NewWorkoutModal({ visible, saving, onClose, onCreate }: NewWorkoutModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<WorkoutDifficulty>('intermediate');

  // Quem abre monta o modal a cada abertura: o rascunho some ao fechar sem
  // precisar zerar campo por campo.
  const close = () => {
    if (!saving) onClose();
  };

  const create = () => {
    const id = identifier.trim();
    if (!id || saving) return;
    onCreate({ title: `Treino ${id}`, description: description.trim(), difficulty });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center bg-veu-da-folha px-6"
      >
        <View className="rounded-lg border border-border bg-background p-6">
          <Text className="mb-4 text-center text-h2 font-bold text-foreground">Novo treino</Text>
          <Group>
            <Input
              icon="pricetag-outline"
              placeholder="Identificador (ex.: D)"
              value={identifier}
              onChangeText={(text) => setIdentifier(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={5}
            />
            <Input
              icon="document-text-outline"
              placeholder="Descrição (opcional)"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </Group>
          {identifier.trim() ? (
            <Text className="mt-2 text-legenda text-muted-foreground">
              Será criado como Treino {identifier.trim()}
            </Text>
          ) : null}

          <Text className="mb-2 mt-4 text-legenda font-bold uppercase tracking-wide text-placeholder">
            Nível de dificuldade
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => setDifficulty(level.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: difficulty === level.value }}
              >
                <Chip tom={difficulty === level.value ? 'destaque' : 'neutro'}>{level.label}</Chip>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mt-6 gap-2.5">
            <BotaoDeDestaque
              rotulo={saving ? 'Criando…' : 'Criar treino'}
              icone="add"
              tamanho="cartao"
              disabled={!identifier.trim() || saving}
              onPress={create}
            />
            <TouchableOpacity
              onPress={close}
              className="h-[2.625rem] items-center justify-center rounded-md bg-muted"
              accessibilityRole="button"
            >
              <Text className="font-bold text-foreground">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
