type QrCodeBlockProps = {
  qrCode: string;
};

/** O QR Code do autenticador, como imagem `data:` efêmera vinda do Supabase. */
export function QrCodeBlock({ qrCode }: QrCodeBlockProps) {
  return (
    <div className="mx-auto w-fit rounded-xl bg-white p-4">
      {/* biome-ignore lint/performance/noImgElement: QR SVG efêmero em data: não é suportado pelo next/image. */}
      <img alt="QR Code para configurar o autenticador" className="block h-72 w-72" src={qrCode} />
    </div>
  );
}
