import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

interface VideoPlayerProps {
  videoUrl: string;
  height?: number;
  autoPlay?: boolean;
}

export function VideoPlayer({ videoUrl, height = 220, autoPlay = false }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [loading, setLoading] = useState(true);

  const getVideoId = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    } catch (_error) {
      return null;
    }
  };

  const videoId = getVideoId(videoUrl);

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setIsPlaying(false);
    }
  }, []);

  if (!videoId) {
    return (
      <View
        style={{
          height,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 12,
        }}
      >
        <Text style={{ color: '#FFF' }}>Vídeo indisponível</Text>
      </View>
    );
  }

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      )}
      <YoutubePlayer
        height={height}
        play={isPlaying}
        videoId={videoId}
        onChangeState={onStateChange}
        onReady={() => setLoading(false)}
        webViewProps={{
          androidLayerType: 'hardware', // Helps with performance on Android
        }}
      />
    </View>
  );
}
