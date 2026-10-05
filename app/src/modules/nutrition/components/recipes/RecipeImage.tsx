import type { MealImage } from '@elevapro/shared';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

/** Foto remota de cat?logo; falha n?o bloqueia o preparo. @example <RecipeImage image={image} title={title} /> */
export function RecipeImage({ image, title }: { image?: MealImage; title: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!image || failedUrl === image.url)
    return (
      <View className="h-[11rem] items-center justify-center rounded-t-xl bg-muted">
        <Text className="text-legenda text-muted-foreground">Foto ilustrativa indispon?vel</Text>
      </View>
    );
  return (
    <Image
      source={{ uri: image.url }}
      resizeMode="cover"
      onError={() => setFailedUrl(image.url)}
      accessibilityLabel={`Imagem ilustrativa de ${title}`}
      className="h-[11rem] w-full rounded-t-xl"
    />
  );
}
