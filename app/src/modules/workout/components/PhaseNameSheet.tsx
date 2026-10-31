import { useState } from 'react';
import { View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';

interface PhaseNameSheetProps {
  currentName: string;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

/**
 * Renomear a fase. A fase nasce "Fase N", e o web não tem onde trocar o nome
 * (#387, erros do web que o mobile não copia).
 *
 * Quem abre monta a folha a cada abertura, para o rascunho sumir ao fechar.
 *
 * @example {renaming && <PhaseNameSheet currentName={phase.name} saving={false} onClose={close} onSave={rename} />}
 */
export function PhaseNameSheet({ currentName, saving, onClose, onSave }: PhaseNameSheetProps) {
  const [name, setName] = useState(currentName);
  const trimmed = name.trim();
  const canSave = !!trimmed && trimmed !== currentName && !saving;

  return (
    <BottomSheet visible onClose={onClose} title="Nome da fase" closeLabel="Fechar sem renomear">
      <View className="mt-4 gap-4">
        <Group>
          <Input
            icon="pricetag-outline"
            placeholder="Ex.: Semanas 1–4 · Adaptação"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </Group>
        <BotaoDeDestaque
          rotulo={saving ? 'Salvando…' : 'Salvar nome'}
          icone="checkmark"
          tamanho="cartao"
          disabled={!canSave}
          onPress={() => onSave(trimmed)}
        />
      </View>
    </BottomSheet>
  );
}
