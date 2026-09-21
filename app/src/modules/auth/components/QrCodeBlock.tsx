import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useEscala } from '@/shared/design';

type QrCodeBlockProps = {
  uri: string;
};

/** O QR Code do autenticador, desenhado a partir da URI `otpauth://` do TOTP. */
export function QrCodeBlock({ uri }: QrCodeBlockProps) {
  const escalar = useEscala();

  return (
    <View className="items-center gap-4 rounded-3xl bg-card p-5">
      <QRCode size={escalar(208)} value={uri} />
      <Text className="text-center text-corpo text-muted-foreground">
        Escaneie o QR Code no aplicativo autenticador e informe o código gerado.
      </Text>
      <Text className="text-center text-corpo text-muted-foreground">
        No aplicativo, toque em adicionar conta e selecione escanear QR Code.
      </Text>
    </View>
  );
}
