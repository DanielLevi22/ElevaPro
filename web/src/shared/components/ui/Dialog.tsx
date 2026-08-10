"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg";
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  maxWidth = "md",
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "w-full bg-surface border border-border rounded-2xl shadow-2xl",
          maxWidthMap[maxWidth],
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <h2 id="dialog-title" className="text-xl font-bold text-foreground">
              {title}
            </h2>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-overlay-10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
