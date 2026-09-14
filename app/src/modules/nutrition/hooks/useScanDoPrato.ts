import type { DietMeal } from '@elevapro/shared';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { mensagemDeErroBff } from '@/shared/bff';
import { getLocalDateISOString } from '@/utils/dateUtils';
import type { Macros } from '../services/consumoDoDia';
import {
  type FoodAnalysisResult,
  FoodRecognitionService,
} from '../services/FoodRecognitionService';
import { refeicaoParaAgora, registrarNoDiario } from '../services/registrarNoDiario';
import { useNutritionStore } from '../store/nutritionStore';
import { usePlanoDoDia } from './usePlanoDoDia';

export interface ScanDoPrato {
  imagem: string | null;
  analisando: boolean;
  resultado: FoodAnalysisResult | null;
  macros: Macros;
  metaDiaria: Macros;
  fotografar: () => void;
  escolherDaGaleria: () => void;
  recomecar: () => void;
  adicionar: () => void;
}

/** A foto vai reduzida: 800 de largura basta ao modelo e corta o que sai do aparelho. */
const LARGURA_ENVIADA = 800;

interface OpcoesDoScan {
  somenteLeitura: boolean;
  /** O token da sessão na hora do envio: a rota o lê do login, e o módulo não importa o de auth. */
  obterToken: () => string;
}

/**
 * O scan do prato: a foto, o reconhecimento pelo BFF e o registro no diário.
 *
 * A imagem não é guardada em lugar nenhum — nem no banco, nem no bucket. Vai ao
 * BFF, que confere o consentimento de saúde antes, e o que fica é o resultado,
 * gravado como item de origem `scan` para o especialista saber que é estimativa.
 *
 * @example
 * const scan = useScanDoPrato(user.id, { somenteLeitura, obterToken: () => session?.access_token ?? '' });
 */
export function useScanDoPrato(
  alunoId: string,
  { somenteLeitura, obterToken }: OpcoesDoScan
): ScanDoPrato {
  const plano = usePlanoDoDia(alunoId, { somenteLeitura });
  const [imagem, setImagem] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<FoodAnalysisResult | null>(null);

  const analisar = async (origem: 'camera' | 'galeria') => {
    const uri = await pegarFoto(origem);
    if (!uri) return;
    setImagem(uri);
    setResultado(null);
    setAnalisando(true);
    try {
      setResultado(await FoodRecognitionService.analyzeFoodImage(uri, obterToken()));
    } catch (erro) {
      showAlert({
        title: 'Não deu para analisar',
        message: mensagemDeErroBff(erro),
        type: 'error',
      });
    } finally {
      setAnalisando(false);
    }
  };

  const adicionar = () => {
    if (!resultado) return;
    if (somenteLeitura) {
      return showAlert({
        title: 'Modo leitura',
        message: 'Você está vendo como o aluno. Não dá para registrar por ele.',
      });
    }
    const refeicao = refeicaoParaAgora(plano.refeicoes.map((r) => r.refeicao));
    if (!refeicao)
      return showAlert({
        title: 'Sem refeição hoje',
        message: 'Seu plano não tem refeição para hoje.',
      });
    confirmarRegistro({ alunoId, resultado, refeicao, aoGravar: plano.recarregar });
  };

  return {
    imagem,
    analisando,
    resultado,
    macros: macrosDoResultado(resultado),
    metaDiaria: plano.meta,
    fotografar: () => analisar('camera'),
    escolherDaGaleria: () => analisar('galeria'),
    recomecar: () => {
      setImagem(null);
      setResultado(null);
    },
    adicionar,
  };
}

function macrosDoResultado(resultado: FoodAnalysisResult | null): Macros {
  return {
    calorias: resultado?.calories ?? 0,
    proteina: resultado?.protein ?? 0,
    carboidrato: resultado?.carbs ?? 0,
    gordura: resultado?.fat ?? 0,
  };
}

const OPCOES_DA_FOTO: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.7,
};

async function pegarFoto(origem: 'camera' | 'galeria'): Promise<string | null> {
  if (origem === 'camera') {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      showAlert({
        title: 'Sem acesso à câmera',
        message: 'Libere a câmera nas configurações para fotografar o prato.',
        type: 'warning',
      });
      return null;
    }
  }
  const escolha =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(OPCOES_DA_FOTO)
      : await ImagePicker.launchImageLibraryAsync(OPCOES_DA_FOTO);
  if (escolha.canceled) return null;
  const reduzida = await ImageManipulator.manipulateAsync(
    escolha.assets[0].uri,
    [{ resize: { width: LARGURA_ENVIADA } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return reduzida.uri;
}

interface Confirmacao {
  alunoId: string;
  resultado: FoodAnalysisResult;
  refeicao: DietMeal;
  aoGravar: () => void;
}

function confirmarRegistro({ alunoId, resultado, refeicao, aoGravar }: Confirmacao) {
  showConfirm({
    title: `Adicionar ao ${refeicao.name}?`,
    message: `${resultado.name}, ${Math.round(resultado.calories)} kcal estimadas pela foto, entra no que você comeu hoje.`,
    confirmText: 'Adicionar',
    onConfirm: () => gravar({ alunoId, resultado, refeicao, aoGravar }),
  });
}

/**
 * O prato vira um item de uma porção com os macros do reconhecimento: a foto
 * não diz gramas, e inventar 100 g seria dar ao número uma precisão que ele
 * não tem.
 */
async function gravar({ alunoId, resultado, refeicao, aoGravar }: Confirmacao) {
  const { currentDietPlan, mealItems } = useNutritionStore.getState();
  if (!currentDietPlan) return;
  try {
    await registrarNoDiario({
      alunoId,
      planoId: currentDietPlan.id,
      refeicaoId: refeicao.id,
      data: getLocalDateISOString(),
      doPlano: mealItems[refeicao.id] ?? [],
      extra: {
        quantity: 1,
        unit: 'porção',
        food: {
          name: resultado.name,
          serving_size: 1,
          serving_unit: 'porção',
          calories: resultado.calories,
          protein: resultado.protein,
          carbs: resultado.carbs,
          fat: resultado.fat,
        },
        origem: 'scan',
      },
    });
    aoGravar();
    showAlert({
      title: 'Registrado',
      message: `${resultado.name} entrou no ${refeicao.name}.`,
      type: 'success',
    });
  } catch {
    showAlert({
      title: 'Não deu para registrar',
      message: 'Confira a conexão e tente de novo.',
      type: 'error',
    });
  }
}
