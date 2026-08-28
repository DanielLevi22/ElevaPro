"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface CustomTimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
}

export function CustomTimePicker({ value, onChange }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hours, minutes] = value.split(":").map(Number);
  const [selectedHours, setSelectedHours] = useState(hours);
  const [selectedMinutes, setSelectedMinutes] = useState(minutes);

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = Array.from({ length: 60 / 5 }, (_, i) => i * 5); // 5-minute increments

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirm = () => {
    const h = selectedHours.toString().padStart(2, "0");
    const m = selectedMinutes.toString().padStart(2, "0");
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-left flex justify-between items-center hover:border-white/20 transition-all group"
      >
        <span className="text-foreground font-semibold text-lg">{value}</span>
        <svg
          aria-hidden="true"
          className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 w-full bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 grid grid-cols-2 gap-4 h-64">
              {/* Hours Column */}
              <div className="overflow-y-auto pr-2 scrollbar-hide flex flex-col gap-1 items-stretch">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 sticky top-0 bg-surface/80 py-1">
                  Horas
                </p>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHours(h)}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedHours === h
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                        : "text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    {h.toString().padStart(2, "0")}
                  </button>
                ))}
              </div>

              {/* Minutes Column */}
              <div className="overflow-y-auto pr-2 scrollbar-hide flex flex-col gap-1 items-stretch border-l border-white/5 pl-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 sticky top-0 bg-surface/80 py-1">
                  Minutos
                </p>
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMinutes(m)}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedMinutes === m
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105"
                        : "text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    {m.toString().padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-white/5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-[2] py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
