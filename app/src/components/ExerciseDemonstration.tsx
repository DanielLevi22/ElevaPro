import { exerciseVideoSource } from '@elevapro/shared';
import { useState } from 'react';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { VideoPlayer } from './VideoPlayer';

interface ExerciseDemonstrationProps {
  videoUrl?: string | null;
  name?: string;
}

/** Só carrega a mídia quando a pessoa pede a demonstração. @example <ExerciseDemonstration videoUrl={exercise.video_url} name={exercise.name} /> */
export function ExerciseDemonstration({
  videoUrl,
  name = 'exercício',
}: ExerciseDemonstrationProps) {
  const [open, setOpen] = useState(false);
  if (!exerciseVideoSource(videoUrl)) return null;
  return (
    <>
      <Button
        label={`Ver demonstração de ${name}`}
        variant="ghost"
        size="sm"
        onPress={() => setOpen(true)}
      />
      {open ? (
        <BottomSheet
          visible
          onClose={() => setOpen(false)}
          title={name}
          closeLabel="Fechar demonstração"
        >
          <VideoPlayer videoUrl={videoUrl} />
        </BottomSheet>
      ) : null}
    </>
  );
}
