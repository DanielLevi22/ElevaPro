import { useState } from 'react';
import { View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useEscala } from '@/shared/design';

/** Preserva o vídeo vinculado pelo especialista. @example <YoutubeVideo videoId="abcdefghijk" autoPlay={false} /> */
export function YoutubeVideo({ videoId, autoPlay }: { videoId: string; autoPlay: boolean }) {
  const scale = useEscala();
  const [playing, setPlaying] = useState(autoPlay);
  return (
    <View className="h-[13.75rem] w-full overflow-hidden rounded-lg bg-muted">
      <YoutubePlayer
        height={scale(220)}
        videoId={videoId}
        play={playing}
        onChangeState={(state: string) => {
          if (state === 'ended') setPlaying(false);
        }}
      />
    </View>
  );
}
