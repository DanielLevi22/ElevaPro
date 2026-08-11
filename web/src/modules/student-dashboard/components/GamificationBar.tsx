"use client";

import type { Achievement, StudentStreak } from "@elevapro/shared";

interface Props {
  streak: StudentStreak | null | undefined;
  achievements: Achievement[];
}

export function GamificationBar({ streak, achievements }: Props) {
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const recentBadges = achievements.slice(0, 3);

  return (
    <div className="flex items-center gap-6 bg-surface/40 border border-overlay-08 rounded-2xl px-6 py-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-xl font-black text-foreground leading-none">{currentStreak}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            streak dias
          </p>
        </div>
      </div>

      <div className="w-px h-8 bg-overlay-05" />

      <div className="flex items-center gap-2">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="text-xl font-black text-foreground leading-none">{longestStreak}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            recorde
          </p>
        </div>
      </div>

      {recentBadges.length > 0 && (
        <>
          <div className="w-px h-8 bg-overlay-05" />
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              badges
            </p>
            <div className="flex gap-1">
              {recentBadges.map((a) => (
                <span key={a.id} className="text-lg" title={a.title}>
                  {a.icon || "🎖️"}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
