interface StatusBadgeProps {
  status: string;
}

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const classes = STATUS_CLASSES[normalized] || "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {normalized}
    </span>
  );
}
