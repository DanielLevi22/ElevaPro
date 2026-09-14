import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { mensagemDeErroBff } from '@/shared/bff';
import type { Macros } from '../services/consumoDoDia';
import {
  type FoodAnalysisResult,
  FoodRecognitionService,
} from '../services/FoodRecognitionService';
import { type RegistroNoDiario, useRegistroNoDiario } from './useRegistroNoDiario';

export interface ScanDoPrato {
  imagem: string | null;
  analisando: boolean;
  resultado: FoodAnalysisResult | null;
  macros: Macros;
  metaDiaria: Macros;
  fotografar: () => void;
  escolherDaGaleria: () => void;
  adicionar: () => void;
  registro: RegistroNoDiario;
}

interface OpcoesDoScan {
  somenteLeitura: boolean;
  /** O token da sessão na hora do envio: a rota o lê do login, e o módulo não importa o de auth. */
  obterToken: () => string;
}

/** A foto vai reduzida: 800 de largura basta ao modelo e corta o que sai do aparelho. */
const LARGURA_ENVIADA = 800;

/**
 * O scan do prato: a foto, o reconhecimento pelo BFF e o registro no diário.
 *
 * A imagem não é guardada em lugar nenhum — nem no banco, nem no bucket. Vai ao
 * BFF, que confere o consentimento de saúde antes, e o que fica é o resultado,
 * gravado com origem `scan` para o especialista saber que é estimativa.
 *
 * @example
 * const scan = useScanDoPrato(user.id, { somenteLeitura, obterToken: () => token });
 */
export function useScanDoPrato(
  alunoId: string,
  { somenteLeitura, obterToken }: OpcoesDoScan
): ScanDoPrato {
  const registro = useRegistroNoDiario(alunoId, { somenteLeitura });
  const [imagem, setImagem] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<FoodAnalysisResult | null>(null);

  const analisar = async (origem: 'camera' | 'galeria') => {
    const uri = await pegarFoto(origem);
    if (!uri) return;
    setImagem(uri);
    setResultado(null);
    setAnalisando(true);
    FoodRecognitionService.analyzeFoodImage(uri, obterToken())
      .then(setResultado)
      .catch((erro) =>
        showAlert({
          title: 'Não deu para analisar',
          message: mensagemDeErroBff(erro),
          type: 'error',
        })
      )
      .finally(() => setAnalisando(false));
  };

  return {
    imagem,
    analisando,
    resultado,
    macros: macrosDoResultado(resultado),
    metaDiaria: registro.plano.meta,
    fotografar: () => analisar('camera'),
    escolherDaGaleria: () => analisar('galeria'),
    adicionar: () => {
      if (resultado) registro.pedir(pedidoDoPrato(resultado));
    },
    registro,
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

/**
 * O prato vira um item de uma porção com os macros do reconhecimento: a foto
 * não diz gramas, e inventar 100 g daria ao número uma precisão que ele não tem.
 */
function pedidoDoPrato(resultado: FoodAnalysisResult) {
  const { name, calories, protein, carbs, fat } = resultado;
  return {
    descricao: `${name}, ${Math.round(calories)} kcal estimadas pela foto`,
    extra: {
      quantity: 1,
      unit: 'porção',
      food: { name, serving_size: 1, serving_unit: 'porção', calories, protein, carbs, fat },
      origem: 'scan' as const,
    },
  };
}

const OPCOES_DA_FOTO: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.7,
};

async function pegarFoto(origem: 'camera' | 'galeria'): Promise<string | null> {
  if (origem === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
    showAlert({
      title: 'Sem acesso à câmera',
      message: 'Libere a câmera nas configurações para fotografar o prato.',
      type: 'warning',
    });
    return null;
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
