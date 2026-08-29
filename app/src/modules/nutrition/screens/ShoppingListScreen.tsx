import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusModal } from '@/components/ui/StatusModal';
import { colors as brandColors } from '@/constants/colors';
import { mensagemDeErroBff } from '@/shared/bff';
import { useNutritionStore } from '../routes';
import { type ShoppingCategory, ShoppingListService } from '../services/ShoppingListService';

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  Hortifruti: { icon: 'leaf', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.1)' },
  'Carnes & Proteínas': { icon: 'restaurant', color: '#F87171', bg: 'rgba(248, 113, 113, 0.1)' },
  'Laticínios & Frios': { icon: 'water', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.1)' },
  Mercearia: { icon: 'basket', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)' },
  Bebidas: { icon: 'wine', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.1)' },
  Suplementos: { icon: 'flash', color: '#22D3EE', bg: 'rgba(34, 211, 238, 0.1)' },
  Outros: { icon: 'cart', color: '#A1A1AA', bg: 'rgba(161, 161, 170, 0.1)' },
};

export default function ShoppingListScreen() {
  const router = useRouter();
  const { currentDietPlan, meals, mealItems } = useNutritionStore();

  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [duration, setDuration] = useState(7); // Default 7 days

  /* AI Assistant State */
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResult, setAssistantResult] = useState<string | null>(null);

  /* Shopping Mode State */
  const [isShoppingMode, setIsShoppingMode] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const handleAskAssistant = async (
    type: 'recipes' | 'analysis' | 'tips' | 'meal_prep' | 'cooking_guide'
  ) => {
    setAssistantLoading(true);
    setAssistantResult(null);
    try {
      const result = await ShoppingListService.askAssistant(categories, type);
      setAssistantResult(result);
    } catch (erro) {
      setAssistantResult(mensagemDeErroBff(erro));
    } finally {
      setAssistantLoading(false);
    }
  };

  const AIAssistantModal = () => (
    <View className="absolute inset-0 bg-black/80 z-50 justify-end">
      <TouchableOpacity className="flex-1" onPress={() => setShowAssistant(false)} />
      <View
        className="rounded-t-[40px] p-8 h-[85%] border-t"
        style={{
          backgroundColor: brandColors.background.secondary,
          borderColor: brandColors.border.dark,
        }}
      >
        <View className="flex-row items-center justify-between mb-8">
          <View className="flex-row items-center gap-3">
            <LinearGradient colors={brandColors.gradients.primary} className="p-2.5 rounded-2xl">
              <Ionicons name="sparkles" size={24} color="#FFF" />
            </LinearGradient>
            <View>
              <Text className="text-white text-2xl font-black font-display tracking-tight italic">
                NutriAI
              </Text>
              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                Powered by GPT-4o
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowAssistant(false)}
            className="bg-white/5 p-2 rounded-full border border-white/10"
          >
            <Ionicons name="close" size={24} color={brandColors.text.primary} />
          </TouchableOpacity>
        </View>

        <Text className="text-zinc-400 mb-8 font-medium italic">
          Olá! Analisei sua lista de compras. Como posso otimizar sua jornada nutricional hoje?
        </Text>

        <View className="flex-row gap-2 mb-8 flex-wrap">
          {[
            { id: 'recipes', label: 'RECEITAS', icon: 'restaurant' as const },
            { id: 'analysis', label: 'ANÁLISE', icon: 'stats-chart' as const },
            { id: 'tips', label: 'DICAS', icon: 'bulb' as const },
            { id: 'meal_prep', label: 'MEAL PREP', icon: 'calendar' as const },
            { id: 'cooking_guide', label: 'COZINHAR', icon: 'school' as const },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => handleAskAssistant(opt.id as never)}
              className="items-center justify-center py-3 px-4 rounded-2xl border"
              style={{
                backgroundColor: brandColors.background.primary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Ionicons
                name={opt.icon}
                size={18}
                color={brandColors.primary.start}
                className="mb-2"
              />
              <Text className="text-zinc-300 text-[9px] font-black uppercase tracking-widest text-center">
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          className="flex-1 rounded-3xl p-6 border shadow-inner"
          style={{
            backgroundColor: brandColors.background.primary,
            borderColor: brandColors.border.dark,
          }}
        >
          {assistantLoading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color={brandColors.primary.start} size="large" />
              <Text className="text-zinc-500 mt-6 text-xs uppercase font-black tracking-widest animate-pulse">
                Sincronizando Nutrientes...
              </Text>
            </View>
          ) : assistantResult ? (
            <Text className="text-zinc-300 leading-7 text-base font-sans">{assistantResult}</Text>
          ) : (
            <View className="items-center justify-center py-20 opacity-30">
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                style={{ color: brandColors.text.disabled }}
              />
              <Text className="text-zinc-500 mt-6 text-center font-black text-[10px] uppercase tracking-widest">
                Selecione uma categoria acima
              </Text>
            </View>
          )}
          <View className="h-10" />
        </ScrollView>
      </View>
    </View>
  );

  const ShoppingModeOverlay = () => (
    <View className="absolute inset-0 bg-black z-50 p-6">
      <View className="flex-row items-center justify-between mb-8 mt-4">
        <Text className="text-white text-3xl font-bold font-display text-emerald-400">
          Modo Mercado
        </Text>
        <TouchableOpacity
          onPress={() => setIsShoppingMode(false)}
          className="bg-zinc-800 px-4 py-2 rounded-full border border-zinc-700"
        >
          <Text className="text-zinc-300 font-bold">SAIR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {categories.map((cat, catIdx) => {
          return (
            <View key={cat.category} className="mb-8">
              <Text className="text-zinc-500 font-bold mb-4 uppercase text-sm tracking-widest border-b border-zinc-800 pb-2">
                {cat.category}
              </Text>
              <View className="gap-4">
                {cat.items.map((item, itemIdx) => {
                  return (
                    <TouchableOpacity
                      key={item.name}
                      onPress={() => toggleItem(catIdx, itemIdx)}
                      className="flex-row items-center"
                      activeOpacity={0.8}
                    >
                      <View
                        className={`w-10 h-10 rounded-lg border-2 mr-4 items-center justify-center ${item.checked ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 bg-zinc-900'}`}
                      >
                        {item.checked && <Ionicons name="checkmark" size={28} color="white" />}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-2xl font-bold ${item.checked ? 'text-zinc-600 line-through' : 'text-zinc-100'}`}
                        >
                          {item.name}
                        </Text>
                        <Text className="text-zinc-500 text-lg">{item.quantity}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
        <View className="h-20" />
      </ScrollView>
    </View>
  );

  const generateList = async () => {
    if (!currentDietPlan) {
      setStatusModal({
        visible: true,
        title: 'Erro',
        message: 'Nenhum plano de dieta ativo.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await ShoppingListService.generateShoppingList(meals, mealItems, duration);
      setCategories(result);
      setHasGenerated(true);
    } catch (_e) {
      setStatusModal({
        visible: true,
        title: 'Erro',
        message: 'Falha ao gerar lista.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (catIndex: number, itemIndex: number) => {
    const newCats = [...categories];
    newCats[catIndex].items[itemIndex].checked = !newCats[catIndex].items[itemIndex].checked;
    setCategories(newCats);
  };

  const shareList = async () => {
    const text = categories
      .map((cat) => {
        const items = cat.items
          .map((i) => `[${i.checked ? 'x' : ' '}] ${i.name} (${i.quantity})`)
          .join('\n');
        return `*${cat.category}*\n${items}`;
      })
      .join('\n\n');

    await Share.share({
      message: `Minha Lista de Compras (${duration} dias):\n\n${text}`,
    });
  };

  const DurationOption = ({ days }: { days: number }) => {
    const isSelected = duration === days;
    return (
      <TouchableOpacity
        onPress={() => setDuration(days)}
        className="flex-1 items-center justify-center py-4 rounded-2xl border"
        style={{
          backgroundColor: isSelected
            ? brandColors.primary.start
            : brandColors.background.secondary,
          borderColor: isSelected ? brandColors.primary.start : brandColors.border.dark,
        }}
      >
        <Text
          className={`text-xl font-black font-display italic ${isSelected ? 'text-white' : 'text-zinc-500'}`}
        >
          {days}
        </Text>
        <Text
          className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-white/70' : 'text-zinc-600'}`}
        >
          DIAS
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout>
      <View
        className="px-6 py-5 flex-row items-center justify-between border-b"
        style={{
          backgroundColor: brandColors.background.secondary,
          borderColor: brandColors.border.dark,
        }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-5 p-2 rounded-xl bg-white/5 border border-white/10"
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-white font-display tracking-tight italic">
              MERCADO
            </Text>
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              Logística Nutricional
            </Text>
          </View>
        </View>
        {hasGenerated && (
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setShowAssistant(true)}
              className="p-2.5 rounded-2xl border"
              style={{
                backgroundColor: brandColors.background.primary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Ionicons name="sparkles" size={18} color={brandColors.primary.start} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={shareList}
              className="p-2.5 rounded-2xl border"
              style={{
                backgroundColor: brandColors.background.primary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Ionicons name="share-outline" size={18} color={brandColors.primary.start} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {!hasGenerated ? (
          <View className="mt-8">
            <View className="items-center mb-10">
              <View className="bg-orange-500/10 p-6 rounded-full mb-6 border-4 border-orange-500/20 shadow-xl shadow-orange-500/10">
                <Ionicons name="cart" size={48} color="#FF6B35" />
              </View>
              <Text className="text-white text-2xl font-bold font-display text-center mb-2">
                Planejar Compras
              </Text>
              <Text className="text-zinc-400 text-center px-4 leading-6">
                Selecione o período e geraremos sua lista de compras automaticamente baseada no seu
                plano alimentar.
              </Text>
            </View>

            <Text className="text-white font-bold mb-4 ml-1">Período</Text>
            <View className="flex-row gap-3 mb-4">
              <DurationOption days={3} />
              <DurationOption days={7} />
              <DurationOption days={15} />
              <DurationOption days={30} />
            </View>

            {/* Custom Input */}
            <View className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 mb-8 flex-row items-center justify-between">
              <Text className="text-zinc-400 font-medium">Outro período:</Text>
              <View className="flex-row items-center bg-zinc-900 rounded-lg border border-zinc-600 px-4 py-2 w-32">
                <TextInput
                  value={String(duration)}
                  onChangeText={(text) => {
                    const num = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
                    setDuration(num);
                  }}
                  keyboardType="numeric"
                  className="text-white font-bold text-lg flex-1 text-right mr-2"
                  placeholder="0"
                  placeholderTextColor="#52525B"
                />
                <Text className="text-zinc-500 font-bold">Dias</Text>
              </View>
            </View>

            <Button
              label="Gerar Lista"
              onPress={generateList}
              isLoading={loading}
              variant="primary"
              className="shadow-lg shadow-orange-500/20"
            />
          </View>
        ) : (
          <View className="gap-8">
            <View className="flex-row justify-between items-end mb-4">
              <View>
                <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  PROVISÃO PARA
                </Text>
                <Text className="text-white font-black text-3xl font-display italic">
                  {duration} DIAS
                </Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setIsShoppingMode(true)}
                  className="px-4 py-2.5 rounded-2xl border flex-row items-center gap-2"
                  style={{
                    backgroundColor: `${brandColors.status.success}10`,
                    borderColor: `${brandColors.status.success}20`,
                  }}
                >
                  <Ionicons name="scan" size={16} color={brandColors.status.success} />
                  <Text
                    className="font-black text-[10px] uppercase tracking-widest"
                    style={{ color: brandColors.status.success }}
                  >
                    MERCADO
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setHasGenerated(false)}
                  className="p-2.5 rounded-2xl border"
                  style={{
                    backgroundColor: brandColors.background.secondary,
                    borderColor: brandColors.border.dark,
                  }}
                >
                  <Ionicons name="refresh" size={18} color={brandColors.text.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {categories.map((cat, catIdx) => {
              // biome-ignore lint/complexity/useLiteralKeys: dynamic fallback key required
              const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG['Outros'];

              return (
                <View
                  key={cat.category}
                  className="rounded-[32px] overflow-hidden border shadow-sm mb-2"
                  style={{
                    backgroundColor: brandColors.background.secondary,
                    borderColor: brandColors.border.dark,
                  }}
                >
                  {/* Category Header */}
                  <View
                    className="flex-row items-center p-5 border-b"
                    style={{
                      backgroundColor: config.bg,
                      borderBottomColor: brandColors.border.dark,
                    }}
                  >
                    <View className="p-2.5 bg-black/20 rounded-xl mr-4">
                      <Ionicons
                        name={config.icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={config.color}
                      />
                    </View>
                    <Text className="text-white font-black text-lg flex-1 font-display italic tracking-tight">
                      {cat.category}
                    </Text>
                    <View className="bg-black/20 px-3 py-1.5 rounded-full">
                      <Text className="text-white/60 text-[9px] font-black uppercase tracking-widest">
                        {cat.items.length} itens
                      </Text>
                    </View>
                  </View>

                  {/* Items */}
                  <View className="p-3">
                    {cat.items.map((item, itemIdx) => {
                      return (
                        <TouchableOpacity
                          key={item.name}
                          onPress={() => toggleItem(catIdx, itemIdx)}
                          activeOpacity={0.7}
                          className={`flex-row items-center p-4 rounded-2xl mb-1 ${item.checked ? 'opacity-30' : 'bg-transparent'}`}
                        >
                          <View
                            className="w-10 h-10 rounded-2xl border mr-4 items-center justify-center"
                            style={{
                              backgroundColor: item.checked
                                ? brandColors.status.success
                                : brandColors.background.primary,
                              borderColor: item.checked
                                ? brandColors.status.success
                                : brandColors.border.dark,
                            }}
                          >
                            {item.checked && <Ionicons name="checkmark" size={24} color="white" />}
                          </View>

                          <View className="flex-1">
                            <Text
                              className={`text-base font-bold ${item.checked ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
                            >
                              {item.name}
                            </Text>
                          </View>

                          <View
                            className="px-3 py-1.5 rounded-xl border"
                            style={{
                              backgroundColor: brandColors.background.primary,
                              borderColor: brandColors.border.dark,
                            }}
                          >
                            <Text className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">
                              {item.quantity}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Overlays */}
      {showAssistant && <AIAssistantModal />}
      {isShoppingMode && <ShoppingModeOverlay />}

      <StatusModal
        visible={statusModal.visible}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenLayout>
  );
}
