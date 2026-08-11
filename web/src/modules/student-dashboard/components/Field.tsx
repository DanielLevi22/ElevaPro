export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}
