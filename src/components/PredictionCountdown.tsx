"use client";

import { useEffect, useState } from "react";

export function PredictionCountdown({ targetAt }: { targetAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!targetAt)
    return (
      <span className="mt-2 inline-flex min-h-8 items-center justify-center rounded-full border border-white/85 bg-white/45 px-3 text-xs font-medium text-slate-400 shadow-sm">
        等待更多记录
      </span>
    );
  const target = new Date(targetAt).getTime();
  if (!Number.isFinite(target)) return null;
  const difference = target - now;
  const minutes = Math.max(0, Math.round(Math.abs(difference) / 60_000));
  const duration = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  return (
    <span
      className={`mt-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-full border px-3 shadow-sm backdrop-blur-xl ${difference < 0 ? "border-rose-200/80 bg-rose-50/70 text-rose-500" : "border-white/90 bg-white/55 text-slate-600"}`}
    >
      <span className="text-sm leading-none" aria-hidden="true">
        ◷
      </span>
      <span className="text-[11px] font-medium tracking-wide">
        {difference < 0 ? "已超时" : "倒计时"}
      </span>
      <span className="font-mono text-base font-semibold leading-none tracking-[0.08em] tabular-nums">
        {duration}
      </span>
    </span>
  );
}
