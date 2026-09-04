"use client";

import { StudentCoachChat } from "../components/StudentCoachChat";

export function StudentCoachPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <svg
            aria-hidden="true"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Assistente</h2>
          <p className="text-sm text-muted-foreground">
            Seu personal trainer inteligente — treino e nutrição personalizados
          </p>
        </div>
      </div>

      <StudentCoachChat />
    </div>
  );
}
