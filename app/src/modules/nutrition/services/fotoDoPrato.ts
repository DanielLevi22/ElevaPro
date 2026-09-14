import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from '@/components/ui/appAlert';

/** A foto vai reduzida: 800 de largura basta ao modelo e corta o que sai do aparelho. */
const LARGURA_ENVIADA = 800;

const OPCOES_DA_FOTO: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.7,
};

/**
 * A foto de um prato, reduzida para enviar, da câmera ou da galeria. `null`
 * quando o aluno desiste ou nega a câmera.
 *
 * A foto fica no cache do aparelho: não é guardada pelo app, e o que sai é só
 * o envio ao reconhecimento (LGPD, issue #298).
 *
 * @example const uri = await fotoDoPrato('galeria');
 */
export async function fotoDoPrato(origem: 'camera' | 'galeria'): Promise<string | null> {
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
