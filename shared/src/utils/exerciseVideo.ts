export type ExerciseVideoSource =
  | { kind: "file"; uri: string; poster?: string }
  | { kind: "youtube"; id: string };

/** Resolve MP4 e links existentes sem aceitar URLs executáveis. @example exerciseVideoSource(exercise.video_url) */
export function exerciseVideoSource(value?: string | null): ExerciseVideoSource | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.pathname.toLowerCase().endsWith(".mp4")) {
      const cover = new URL(url.href);
      cover.pathname = cover.pathname.replace(/\.mp4$/, ".jpg");
      const poster = /\/exercises\/[a-z0-9-]+\/v[1-9]\d*\.mp4$/.test(url.pathname)
        ? cover.href
        : undefined;
      return { kind: "file", uri: url.href, poster };
    }
    const host = url.hostname.replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) return null;
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1]);
    return id && /^[\w-]{11}$/.test(id) ? { kind: "youtube", id } : null;
  } catch {
    return null;
  }
}
