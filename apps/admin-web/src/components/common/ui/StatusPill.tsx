import { cn } from "@/components/common/cn";

type StatusTone = "success" | "warning" | "danger" | "neutral";

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

const toneClass: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium", toneClass[tone])}>{label}</span>;
}
