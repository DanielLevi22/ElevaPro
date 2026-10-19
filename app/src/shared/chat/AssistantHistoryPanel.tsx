import { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { StudentConsentNotice } from '@/components/consent/StudentConsentNotice';
import { AlvoDoVidro } from '@/components/ui/AlvoDoVidro';
import { BRILHO_DA_NUTRICAO, BrilhoAmbiente } from '@/components/ui/BrilhoAmbiente';
import { Row } from '@/components/ui/Row';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { Vidro } from '@/components/ui/Vidro';
import { ABOVE_TAB_BAR, useBottomOffset } from '@/shared/design';
import type { AssistantConversation, AssistantModule } from './assistantConversations';
import { AssistantHeader } from './ChatPieces';
import { useAssistantHistory } from './useAssistantHistory';

interface Props {
  token: string;
  studentId: string;
  canWorkout: boolean;
  canNutrition: boolean;
  onClose: () => void;
  onSelect: (session: { id: string; module: AssistantModule }) => void;
}

/** Histórico único por aluno, com mutações confirmadas pelo mesmo BFF do web.
 * @example <AssistantHistoryPanel {...scope} onSelect={openConversation} onClose={close} />
 */
export function AssistantHistoryPanel({
  token,
  studentId,
  canWorkout,
  canNutrition,
  onClose,
  onSelect,
}: Props) {
  const history = useAssistantHistory(token, studentId);
  const listEnd = useBottomOffset(ABOVE_TAB_BAR);
  const blocked = history.loading || history.pending;
  const allowed = (module: AssistantModule) => (module === 'nutrition' ? canNutrition : canWorkout);
  const create = async (module: AssistantModule) => {
    if (blocked || !allowed(module)) return;
    const session = await history.create(module);
    if (session) onSelect(session);
  };
  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro fundo={<BrilhoAmbiente receita={BRILHO_DA_NUTRICAO} />}>
        <FlatList
          data={history.sessions.filter((session) => allowed(session.module))}
          keyExtractor={(session) => session.id}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-[1.125rem] pt-[3.625rem] gap-3"
          contentContainerStyle={{ paddingBottom: listEnd }}
          ListHeaderComponent={
            <View className="gap-3">
              <AssistantHeader subject="Histórico de conversas" onBack={onClose} />
              <Text className="text-muted-foreground">
                Treino e nutrição deste aluno. Retome uma conversa ou comece outra.
              </Text>
              {canWorkout && (
                <Row
                  icon="barbell-outline"
                  title="Nova conversa de treino"
                  onPress={blocked || history.denied ? undefined : () => void create('workout')}
                />
              )}
              {canNutrition && (
                <Row
                  icon="restaurant-outline"
                  title="Nova conversa de nutrição"
                  onPress={blocked || history.denied ? undefined : () => void create('nutrition')}
                />
              )}
              {history.loading && (
                <Text className="text-muted-foreground">Carregando conversas…</Text>
              )}
              {history.pending && (
                <Text accessibilityRole="alert" className="text-muted-foreground">
                  Salvando alteração…
                </Text>
              )}
              {history.error && (
                <Vidro className="p-3">
                  <Text accessibilityRole="alert" className="text-foreground">
                    {history.error}
                  </Text>
                  <Row
                    icon="refresh-outline"
                    title="Tentar novamente"
                    onPress={blocked ? undefined : () => void history.refresh()}
                  />
                </Vidro>
              )}
              {history.consentRequired && (
                <StudentConsentNotice busy={blocked} onCheck={() => void history.refresh()} />
              )}
            </View>
          }
          ListEmptyComponent={
            !history.loading && !history.error && !history.consentRequired ? (
              <Text className="mt-4 text-muted-foreground">Nenhuma conversa ainda.</Text>
            ) : undefined
          }
          renderItem={({ item }) => (
            <ConversationRow
              session={item}
              blocked={blocked}
              onSelect={() => onSelect(item)}
              onRename={history.rename}
              onArchive={history.archive}
            />
          )}
        />
      </AlvoDoVidro>
    </ScreenLayout>
  );
}

function ConversationRow({
  session,
  blocked,
  onSelect,
  onRename,
  onArchive,
}: {
  session: AssistantConversation;
  blocked: boolean;
  onSelect: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onArchive: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title ?? '');
  const save = async () => {
    if (await onRename(session.id, title)) setEditing(false);
  };
  const updated = new Date(session.updated_at);
  return (
    <Vidro className="p-3">
      <Text className="mb-1 text-xs text-muted-foreground">
        {session.module === 'nutrition' ? 'Nutrição' : 'Treino'}
        {Number.isNaN(updated.getTime()) ? '' : ` · ${updated.toLocaleDateString('pt-BR')}`}
      </Text>
      {editing ? (
        <>
          <TextInput
            accessibilityLabel="Título da conversa"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            editable={!blocked}
            className="rounded-xl border border-glass-border p-3 text-foreground"
          />
          <Row
            icon="checkmark-outline"
            title="Salvar título"
            onPress={blocked || !title.trim() ? undefined : () => void save()}
          />
          <Row
            icon="close-outline"
            title="Cancelar"
            onPress={blocked ? undefined : () => setEditing(false)}
          />
        </>
      ) : (
        <>
          <Row
            icon="chatbubble-outline"
            title={session.title || 'Nova conversa'}
            onPress={blocked ? undefined : onSelect}
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Row
                icon="create-outline"
                title="Renomear"
                onPress={
                  blocked
                    ? undefined
                    : () => {
                        setTitle(session.title ?? '');
                        setEditing(true);
                      }
                }
              />
            </View>
            <View className="flex-1">
              <Row
                icon="archive-outline"
                title="Arquivar"
                onPress={blocked ? undefined : () => void onArchive(session.id)}
              />
            </View>
          </View>
        </>
      )}
    </Vidro>
  );
}
