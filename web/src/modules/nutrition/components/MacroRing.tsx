"use client";

import { motion } from "framer-motion";

interface MacroRingProps {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function MacroRing({
  label,
  value,
  max,
  color,
  unit = "g",
  icon,
  size = "md",
}: MacroRingProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizes = {
    sm: { container: "w-16 h-16", radius: 28, stroke: "4", font: "text-xs", label: "text-[6px]" },
    md: { container: "w-24 h-24", radius: 40, stroke: "6", font: "text-lg", label: "text-[7px]" },
    lg: { container: "w-32 h-32", radius: 52, stroke: "8", font: "text-2xl", label: "text-[9px]" },
  };

  const { container, radius, stroke, font, label: labelSize } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const svgSize = size === "sm" ? 64 : size === "md" ? 96 : 128;
  const center = svgSize / 2;

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className={`relative ${container} flex items-center justify-center`}>
        {/* Track */}
        <svg aria-hidden="true" className="w-full h-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="stroke-overlay-10 fill-none"
            strokeWidth={stroke}
          />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            cx={center}
            cy={center}
            r={radius}
            className="fill-none transition-all duration-300"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && (
            <div
              className={`p-1 rounded-lg mb-0.5 group-hover:scale-110 transition-transform`}
              style={{ color }}
            >
              {icon}
            </div>
          )}
          <div
            className={`${font} font-black text-foreground italic tracking-tighter leading-none`}
          >
            {value}
            <span className="text-[10px] ml-0.5 opacity-50 not-italic font-medium">{unit}</span>
          </div>
          <div
            className={`${labelSize} font-black text-muted-foreground uppercase tracking-widest mt-1`}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
