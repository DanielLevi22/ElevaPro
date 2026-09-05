import { createBodyScanService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { PhysicalAssessmentService } from '../services/physicalAssessmentService';
import { type MedidaMaisRecente, medidaMaisRecente } from '../services/ultimaMedida';
import { useAssessmentStore } from '../store/assessmentStore';

/** Ícone por medida. O que não estiver aqui cai no genérico, sem quebrar. */
const ICONE_DA_CIRCUNFERENCIA: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Pescoço: 'human',
  Ombros: 'human-handsup',
  Tórax: 'human-male',
  Cintura: 'human-male-board',
  Abdômen: 'stomach',
  Quadril: 'human-male',
};

const ORIGEM_LABEL: Record<MedidaMaisRecente['origem'], string> = {
  imagem: 'Análise por imagem',
  fita: 'Avaliação com fita',
};

const MetricCard = ({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}) => (
  <View className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 mb-4">
    <View className="p-2 rounded-xl mb-2 self-start" style={{ backgroundColor: `${color}20` }}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <Text className="text-zinc-400 text-xs uppercase font-medium tracking-wider mb-1">{label}</Text>
    <View className="flex-row items-baseline">
      <Text className="text-white text-2xl font-black">{value}</Text>
      {value !== '—' && <Text className="text-zinc-500 text-sm ml-1">{unit}</Text>}
    </View>
  </View>
);

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PhysicalAssessment() {
  const { studentId } = useAssessmentStore();
  const [medida, setMedida] = useState<MedidaMaisRecente | null>(null);

  useEffect(() => {
    if (!studentId) return;
    // As duas fontes, porque a tela promete as duas: o vazio manda escanear
    // pela aba I.A. Vision, e o scan grava em `body_scans`, não em
    // `physical_assessments`. Ler só uma era o que fazia a aba dizer "nenhuma
    // avaliação registrada" logo depois de o aluno escanear.
    //
    // A avaliação física não guarda foto: as colunas `photo_*` nunca existiram
    // no banco, e a imagem da análise por IA também não é persistida
    // (`ADR-0010`).
    Promise.all([
      PhysicalAssessmentService.getLatest(studentId),
      createBodyScanService(supabase).latestWithComparison(studentId),
    ])
      .then(([avaliacao, corporal]) => setMedida(medidaMaisRecente(avaliacao, corporal.latest)))
      .catch((error) => {
        console.log('[PhysicalAssessment] Falha ao carregar:', String(error));
      });
  }, [studentId]);

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cabeçalho: a origem importa tanto quanto a data. Medida estimada por
          imagem e medida tirada com fita não são a mesma coisa, e quem lê um
          número precisa saber qual está vendo antes de decidir carga em cima
          dele. O botão de anamnese saiu daqui — não tem relação com medida, e a
          home já leva para ela. */}
      <View className="px-6 mb-6">
        <Text className="text-zinc-400 text-sm">Última medida</Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="calendar-outline" size={14} color={colors.primary.solid} />
          <Text className="text-white text-lg font-bold ml-2">{fmtDate(medida?.data ?? null)}</Text>
        </View>
        {medida && (
          <View className="flex-row items-center mt-2 self-start rounded-full bg-white/5 px-3 py-1">
            <MaterialCommunityIcons
              name={medida.origem === 'imagem' ? 'scan-helper' : 'tape-measure'}
              size={14}
              color={colors.text.muted}
              style={{ marginRight: 6 }}
            />
            <Text className="text-zinc-400 text-xs">{ORIGEM_LABEL[medida.origem]}</Text>
          </View>
        )}
      </View>

      {/* Empty state */}
      {!medida && (
        <View className="px-6 py-12 items-center">
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={48}
            color={colors.text.muted}
          />
          <Text className="text-zinc-400 text-center mt-4 text-sm">
            Nenhuma avaliação registrada ainda.{'\n'}Realize o escaneamento corporal pela aba I.A.
            Vision.
          </Text>
        </View>
      )}

      {medida && (
        <>
          {/* Composição */}
          <View className="px-6 flex-row flex-wrap justify-between">
            {medida.composicao.map((item) => (
              <View key={item.label} className="w-[48%]">
                <MetricCard
                  label={item.label}
                  value={item.value}
                  unit={item.label === 'Gordura' ? '%' : item.label === 'IMC' ? '' : 'kg'}
                  icon={item.label === 'Peso' ? 'scale-bathroom' : 'human-male-height'}
                  color={colors.secondary.main}
                />
              </View>
            ))}
          </View>

          {medida.circunferencias.length > 0 && (
            <View className="px-6 mt-6">
              <View className="flex-row items-center mb-4">
                <View
                  className="w-1 h-6 mr-3 rounded-full"
                  style={{ backgroundColor: colors.accent.main }}
                />
                <Text className="text-white text-lg font-bold">Circunferências</Text>
              </View>
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
                {medida.circunferencias.map((item) => (
                  <View
                    key={item.label}
                    className="flex-row items-center justify-between py-3 border-b border-white/5 last:border-0"
                  >
                    <View className="flex-row items-center">
                      <MaterialCommunityIcons
                        name={ICONE_DA_CIRCUNFERENCIA[item.label] ?? 'human'}
                        size={18}
                        color={colors.accent.light}
                        style={{ marginRight: 12, opacity: 0.8 }}
                      />
                      <Text className="text-zinc-300 font-medium">{item.label}</Text>
                    </View>
                    <Text className="text-white font-bold">{item.value} cm</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Dobras só existem na medida com fita: imagem não produz prega de
              pele, e uma linha vazia aqui pareceria medida faltando. */}
          {medida.dobras.length > 0 && (
            <View className="px-6 mt-6">
              <View className="flex-row items-center mb-4">
                <View
                  className="w-1 h-6 mr-3 rounded-full"
                  style={{ backgroundColor: colors.status.info }}
                />
                <Text className="text-white text-lg font-bold">Dobras Cutâneas (mm)</Text>
              </View>
              <View className="flex-row flex-wrap justify-between">
                {medida.dobras.map((item) => (
                  <View
                    key={item.label}
                    className="w-[31%] bg-white/5 border border-white/10 rounded-xl p-3 mb-3 items-center"
                  >
                    <Text className="text-zinc-400 text-[10px] uppercase font-bold mb-1 text-center">
                      {item.label}
                    </Text>
                    <Text className="text-white text-lg font-bold">{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* History Button */}
      <View className="px-6 mt-8">
        <TouchableOpacity activeOpacity={0.8}>
          <LinearGradient
            colors={colors.gradients.secondary as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-xl items-center flex-row justify-center"
          >
            <MaterialCommunityIcons
              name="history"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white font-bold text-base uppercase tracking-wider">
              Histórico Completo
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
