import { useLocalSearchParams } from 'expo-router';
import { BlockReportScreen } from '@/modules/block';

/** O relatório de um bloco que já acabou, aberto pelo histórico (#376, C3). */
export default function BlockHistoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BlockReportScreen blockId={id} />;
}
