import { exerciseVideoSource } from '@elevapro/shared';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { cssInterop } from 'nativewind';
import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';

cssInterop(VideoView, { className: 'style' });

interface VideoPlayerProps {
  videoUrl?: string | null;
  autoPlay?: boolean;
}

/** Demonstração em loop, preservando links de especialistas. @example <VideoPlayer videoUrl={exercise.video_url} /> */
export function VideoPlayer({ videoUrl, autoPlay }: VideoPlayerProps) {
  const source = exerciseVideoSource(videoUrl);
  if (!source) return null;
  if (source.kind === 'youtube') {
    // O WebView só precisa inicializar quando existe um link do especialista.
    const { YoutubeVideo } = require('./YoutubeVideo') as typeof import('./YoutubeVideo');
    return <YoutubeVideo key={source.id} videoId={source.id} autoPlay={autoPlay ?? false} />;
  }
  return (
    <FileVideo
      key={source.uri}
      uri={source.uri}
      poster={source.poster}
      autoPlay={autoPlay ?? true}
    />
  );
}

function FileVideo({ uri, poster, autoPlay }: { uri: string; poster?: string; autoPlay: boolean }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer({ uri, useCaching: false }, (instance) => {
    instance.loop = true;
    instance.muted = true;
    if (autoPlay) instance.play();
  });

  useEffect(() => {
    const status = player.addListener('statusChange', ({ status }) =>
      setFailed(status === 'error')
    );
    const background = AppState.addEventListener('change', (state) => {
      if (state === 'active' && autoPlay) player.play();
      else player.pause();
    });
    return () => {
      status.remove();
      background.remove();
    };
  }, [player, autoPlay]);

  if (failed)
    return (
      <Text accessibilityRole="alert" className="text-sm text-muted-foreground">
        Demonstração indisponível. Tente abrir novamente.
      </Text>
    );
  return (
    <View className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
      <VideoView
        testID="exercise-video"
        accessibilityLabel="Demonstração do exercício"
        player={player}
        className="h-full w-full"
        nativeControls
        contentFit="contain"
        onFirstFrameRender={() => setReady(true)}
      />
      {!ready && poster ? (
        <Image
          accessibilityLabel="Capa da demonstração"
          source={{ uri: poster }}
          cachePolicy="none"
          contentFit="contain"
          pointerEvents="none"
          className="absolute inset-0 h-full w-full"
        />
      ) : null}
    </View>
  );
}
