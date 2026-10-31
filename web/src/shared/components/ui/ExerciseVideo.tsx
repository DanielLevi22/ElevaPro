"use client";

import { exerciseVideoSource } from "@elevapro/shared";
import { useState } from "react";

interface ExerciseVideoProps {
  videoUrl?: string | null;
  name?: string;
}

/** Demonstração sob demanda; sem endereço válido não ocupa espaço. @example <ExerciseVideo videoUrl={exercise.video_url} /> */
export function ExerciseVideo({ videoUrl, name = "exercício" }: ExerciseVideoProps) {
  const source = exerciseVideoSource(videoUrl);
  if (!source) return null;
  return <VideoContent key={videoUrl} source={source} name={name} />;
}

function VideoContent({
  source,
  name,
}: {
  source: NonNullable<ReturnType<typeof exerciseVideoSource>>;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Demonstração indisponível. Tente abrir novamente.
      </p>
    );
  if (source.kind === "youtube")
    return (
      <iframe
        className="aspect-video w-full rounded-lg"
        title={`Demonstração de ${name}`}
        src={`https://www.youtube-nocookie.com/embed/${source.id}`}
        allowFullScreen
        allow="encrypted-media; fullscreen"
      />
    );
  return (
    // O clipe é deliberadamente mudo, sem fala ou informação que exija legenda (#463).
    <video
      aria-label="Demonstração do exercício"
      className="aspect-video w-full rounded-lg bg-muted"
      src={source.uri}
      poster={source.poster}
      autoPlay
      muted
      loop
      playsInline
      controls
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}
