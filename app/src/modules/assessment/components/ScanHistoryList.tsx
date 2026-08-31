import type { BodyScanRecord } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ScanHistoryListProps {
  scans: BodyScanRecord[];
  onDelete: (scanId: string) => void;
}

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * A linha de resumo, com cada número dizendo de onde veio.
 *
 * Os dois valores tinham a mesma cara: `94 kg · 24% gordura`. Mas o peso é
 * conhecido — veio da Escala, medido com fita pelo especialista ou informado
 * pelo aluno — e a gordura é o modelo estimando a partir de uma foto. Lidos com
 * o mesmo peso tipográfico, o segundo herdava a autoridade do primeiro.
 *
 * O `est.` é curto porque a linha é pequena, e a análise inteira já explica que
 * percentual de gordura é estimativa. O que não podia continuar era o número
 * aparecer sem nenhuma marca.
 */
function resumo(scan: BodyScanRecord): string {
  const partes: string[] = [];
  if (scan.weight_kg !== null) partes.push(`${scan.weight_kg} kg`);
  if (scan.body_fat_pct !== null) partes.push(`~${scan.body_fat_pct}% gordura (est.)`);
  // Sem "—" e sem zero inventado: análise sem métrica mostra só a data, que é o
  // que ela de fato tem.
  return partes.join(' · ');
}

/**
 * O histórico de análises corporais, com o caminho para apagar — Art. 18, VI.
 *
 * `scanHistory` era carregado pelo store desde a entrega do body scan e nunca
 * renderizado em tela nenhuma: o dado mais sensível do schema existia sem que o
 * titular pudesse vê-lo em lista, muito menos removê-lo.
 *
 * Aqui não existe "corrigir", de propósito. `body_scans` é medida derivada por
 * IA; corrigir uma medida é medir de novo, e o botão de nova análise já mora
 * nesta tela. Editar o número produziria um dado falso que o profissional usaria
 * para prescrever — o oposto do Art. 6°, V.
 */
export function ScanHistoryList({ scans, onDelete }: ScanHistoryListProps) {
  const [confirmando, setConfirmando] = useState<BodyScanRecord | null>(null);

  if (scans.length === 0) return null;

  return (
    <View className="mx-6 mt-6">
      <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
        Suas análises
      </Text>

      {scans.map((scan) => (
        <View
          key={scan.id}
          className="flex-row items-center justify-between bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-2"
        >
          <View className="flex-1 pr-3">
            <Text className="text-white text-sm font-bold">{dataCurta(scan.scanned_at)}</Text>
            {resumo(scan).length > 0 && (
              <Text className="text-zinc-500 text-xs mt-0.5">{resumo(scan)}</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setConfirmando(scan)}
            accessibilityRole="button"
            accessibilityLabel={`Apagar análise de ${dataCurta(scan.scanned_at)}`}
            hitSlop={8}
            className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={16} color="#F87171" />
          </TouchableOpacity>
        </View>
      ))}

      {/*
        A confirmação diz o que sai E o que fica. Apagar a análise não apaga o
        peso que o aluno registrou por outros caminhos, e não saber disso é o que
        produz o pedido de suporte seguinte.
      */}
      <ConfirmModal
        visible={confirmando !== null}
        type="danger"
        title="Apagar esta análise?"
        message="A análise e as medidas estimadas por ela somem, e não voltam. Suas outras análises e o restante do histórico continuam."
        confirmText="Apagar análise"
        cancelText="Manter"
        onConfirm={() => {
          const alvo = confirmando;
          setConfirmando(null);
          if (alvo) onDelete(alvo.id);
        }}
        onClose={() => setConfirmando(null)}
      />
    </View>
  );
}
