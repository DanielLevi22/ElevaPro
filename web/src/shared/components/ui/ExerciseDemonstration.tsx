"use client";

import { exerciseVideoSource } from "@elevapro/shared";
import { useState } from "react";
import { Dialog } from "./Dialog";
import { ExerciseVideo } from "./ExerciseVideo";

/** Carrega só a demonstração solicitada, mesmo em listas longas. @example <ExerciseDemonstration videoUrl={exercise.video_url} name={exercise.name} /> */
export function ExerciseDemonstration({
  videoUrl,
  name = "exercício",
}: {
  videoUrl?: string | null;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!exerciseVideoSource(videoUrl)) return null;
  return (
    <>
      <button
        type="button"
        className="text-sm text-primary hover:underline"
        onClick={() => setOpen(true)}
      >
        Ver demonstração de {name}
      </button>
      {open ? (
        <Dialog open onClose={() => setOpen(false)} title={`Demonstração de ${name}`}>
          <ExerciseVideo videoUrl={videoUrl} name={name} />
        </Dialog>
      ) : null}
    </>
  );
}
