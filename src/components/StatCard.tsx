import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  tone?: "amber" | "green" | "blue" | "rose" | "slate";
}

const toneClass = {
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  green: "bg-green-50 text-green-700 border-green-100",
  blue: "bg-sky-50 text-sky-700 border-sky-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-slate-50 text-slate-700 border-slate-100"
};

export function StatCard({ title, value, hint, tone = "slate" }: StatCardProps) {
  return (
    <section className={cn("rounded-lg border p-4", toneClass[tone])}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}
    </section>
  );
}
