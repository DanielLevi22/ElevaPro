import { createHealthService, type Finalidade, SAUDE, TECNICA } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { useCores } from '@/shared/design';

/**
 * O que o aluno autorizou, e o caminho de volta.
 *
 * Art. 8°, §5°: o consentimento pode ser revogado a qualquer momento, por
 * procedimento **gratuito e facilitado**. Até aqui `revokeCollectionConsent`
 * existia no serviço e não tinha um único chamador — a revogação estava
 * implementada e inalcançável, que para o titular é o mesmo que não existir.
 *
 * A tela de introdução da Análise de Técnica promete esta página em texto
 * ("dá para retirar quando quiser, no seu perfil"), e promessa em texto de
 * consentimento não é enfeite: consentimento informado é sobre o que a pessoa
 * leu (Art. 9°).
 *
 * Lista as finalidades **separadas** de propósito. É o que torna a separação da
 * migration 0041 visível para quem decide: dá para revogar a câmera durante o
 * exercício e continuar com a avaliação física.
 */

interface Autorizacao {
  finalidade: Finalidade;
  titulo: string;
  descricao: string;
  concedida: boolean;
}

const CATALOGO: { finalidade: Finalidade; titulo: string; descricao: string }[] = [
  {
    finalidade: SAUDE,
    titulo: 'Dados de saúde',
    // O que o aluno revoga precisa estar escrito aqui, senão ele decide sobre
    // uma lista que não corresponde ao que é coletado. Estava parada na `1.2`:
    // sono e FC de repouso entraram na `1.3` e nunca chegaram nesta tela.
    descricao:
      'Avaliação física, anamnese, body scan, passos e calorias, sono e frequência cardíaca de repouso, a frequência cardíaca média e o tempo em cada zona das corridas, as refeições registradas e a água do dia.',
  },
  {
    finalidade: TECNICA,
    titulo: 'Análise de Técnica',
    descricao: 'A câmera lê seu corpo durante a série. Nada é gravado.',
  },
];

export function MinhasAutorizacoes({ studentId }: { studentId: string | null }) {
  const cores = useCores();
  const [autorizacoes, setAutorizacoes] = useState<Autorizacao[] | null>(null);

  const carregar = useCallback(async () => {
    if (!studentId) return;

    const servico = createHealthService(supabase);
    const lidas = await Promise.all(
      CATALOGO.map(async (item) => ({
        ...item,
        concedida: await servico.hasCollectionConsent(studentId, item.finalidade),
      }))
    );
    setAutorizacoes(lidas);
  }, [studentId]);

  useEffect(() => {
    // Falha de consulta deixa a seção fora da tela em vez de mostrar "não
    // autorizado" para quem autorizou — dizer ao titular que ele não consentiu
    // é pior que não dizer nada.
    carregar().catch(() => undefined);
  }, [carregar]);

  const revogar = useCallback(
    (autorizacao: Autorizacao) => {
      if (!studentId) return;

      showConfirm({
        title: `Retirar "${autorizacao.titulo}"?`,
        // A revogação é prospectiva. Prometer que apaga o passado seria mentir,
        // e o aluno tem o direito do Art. 18, VI por um caminho próprio.
        message:
          'O tratamento para essa finalidade para na hora. O que já foi registrado antes disso continua no seu histórico — para apagá-lo, fale com o suporte.',
        confirmText: 'Retirar',
        type: 'danger',
        onConfirm: () => {
          createHealthService(supabase)
            .revokeCollectionConsent(studentId, autorizacao.finalidade)
            .then(carregar)
            .catch(() =>
              showAlert({
                title: 'Não consegui retirar agora',
                message: 'Tente de novo em instantes. Sua autorização continua como estava.',
                type: 'error',
              })
            );
        },
      });
    },
    [studentId, carregar]
  );

  if (autorizacoes === null) return null;

  return (
    <View className="mb-8">
      <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4 ml-2">
        MINHAS AUTORIZAÇÕES
      </Text>

      {autorizacoes.map((autorizacao) => (
        <View
          className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-3"
          key={autorizacao.finalidade.tipo}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-white font-bold">{autorizacao.titulo}</Text>
              <Text className="text-zinc-500 text-xs mt-1 leading-relaxed">
                {autorizacao.descricao}
              </Text>
            </View>
            <Ionicons
              color={autorizacao.concedida ? cores.success : cores.placeholder}
              name={autorizacao.concedida ? 'checkmark-circle' : 'close-circle-outline'}
              size={22}
            />
          </View>

          {autorizacao.concedida ? (
            <TouchableOpacity className="mt-3 self-start" onPress={() => revogar(autorizacao)}>
              <Text className="text-rose-400 text-xs font-bold uppercase tracking-widest">
                Retirar autorização
              </Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-zinc-600 text-xs mt-3">
              Não autorizado. O app pede quando você abrir a tela que precisa.
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
