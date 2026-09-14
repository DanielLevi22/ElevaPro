import type { ComponenteDoPrato } from '@elevapro/shared';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { mensagemDeErroBff } from '@/shared/bff';
import { MACROS_ZERADOS, type Macros } from '../services/consumoDoDia';
import {
  type FoodAnalysisResult,
  FoodRecognitionService,
} from '../services/FoodRecognitionService';
import { type PratoComPorcoes, pratoComPorcoes } from '../services/porcoesDoPrato';
import { type RegistroNoDiario, useRegistroNoDiario } from './useRegistroNoDiario';

export interface ScanDoPrato {
  imagem: string | null;
  analisando: boolean;
  resultado: FoodAnalysisResult | null;
  /** Os componentes com as gramas que o aluno ajustou. Vazio no contrato antigo. */
  componentes: ComponenteDoPrato[];
  macros: Macros;
  metaDiaria: Macros;
  fotografar: () => void;
  escolherDaGaleria: () => void;
  /** Soma (ou tira) gramas de um componente. */
  ajustarPorcao: (indice: number, deltaGramas: number) => void;
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
 * O scan do prato: a foto, o reconhecimento pelo BFF, as porções ajustáveis e
 * o registro no diário.
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
  const [gramas, setGramas] = useState<Record<number, number>>({});
  const prato = resultado ? pratoComPorcoes(resultado, gramas) : null;

  const analisar = async (origem: 'camera' | 'galeria') => {
    const uri = await pegarFoto(origem);
    if (!uri) return;
    setImagem(uri);
    setResultado(null);
    setGramas({});
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

  const ajustarPorcao = (indice: number, deltaGramas: number) => {
    const atual = prato?.componentes[indice]?.grams ?? 0;
    setGramas((antes) => ({ ...antes, [indice]: Math.max(0, atual + deltaGramas) }));
  };

  return {
    imagem,
    analisando,
    resultado,
    componentes: prato?.componentes ?? [],
    macros: prato?.macros ?? MACROS_ZERADOS,
    metaDiaria: registro.plano.meta,
    fotografar: () => analisar('camera'),
    escolherDaGaleria: () => analisar('galeria'),
    ajustarPorcao,
    adicionar: () => {
      if (resultado && prato) registro.pedir(pedidoDoPrato(resultado, prato));
    },
    registro,
  };
}

/**
 * O que entra no diário. Com componentes, um item por componente, nas gramas
 * ajustadas: o especialista lê "Quinoa 80 g", e não um "Bowl" opaco. Sem
 * componentes, o prato inteiro como uma porção — a foto não diz gramas, e
 * inventar 100 g daria ao número uma precisão que ele não tem.
 */
function pedidoDoPrato(resultado: FoodAnalysisResult, prato: PratoComPorcoes) {
  const descricao = `${resultado.name}, ${Math.round(prato.macros.calorias)} kcal estimadas pela foto`;
  if (prato.componentes.length === 0) {
    const { name, calories, protein, carbs, fat } = resultado;
    return {
      descricao,
      extras: [
        {
          quantity: 1,
          unit: 'porção',
          food: { name, serving_size: 1, serving_unit: 'porção', calories, protein, carbs, fat },
          origem: 'scan' as const,
        },
      ],
    };
  }
  return { descricao, extras: prato.componentes.filter((c) => c.grams > 0).map(itemDoComponente) };
}

/** O componente como item: a porção de referência são as próprias gramas. */
function itemDoComponente(componente: ComponenteDoPrato) {
  const { name, grams, calories, protein, carbs, fat } = componente;
  return {
    quantity: grams,
    unit: 'g',
    food: { name, serving_size: grams, serving_unit: 'g', calories, protein, carbs, fat },
    origem: 'scan' as const,
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
