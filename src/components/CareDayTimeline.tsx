"use client";

import { useState } from "react";

type Event = { time: string; label: string; color: "violet" | "cyan" | "amber" };

export function CareDayTimeline({ day, events }: { day: string; events: Event[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected !== null ? events[selected] : null;

  return <div className="mt-3 rounded-2xl bg-white/55 px-3 py-3 ring-1 ring-white/75">
    <p className="text-xs font-medium text-slate-600">{day.slice(5).replace("-", "/")} · {events.length} 次</p>
    <div className="relative mt-3 h-12 border-b border-indigo-100">
      {events.map((event, index) => {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(event.time));
        const minutes = Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0);
        return <button key={`${event.time}-${index}`} type="button" aria-label={event.label} aria-pressed={selected === index} onClick={() => setSelected(index)} title={event.label} className={`absolute top-2 h-6 w-2 -translate-x-1/2 rounded-full ring-2 ring-white transition ${event.color === "violet" ? "bg-violet-400" : event.color === "amber" ? "bg-amber-300" : "bg-cyan-300"} ${selected === index ? "scale-125 shadow-md" : ""}`} style={{ left: `${Math.min(99, Math.max(1, minutes / 1440 * 100))}%` }} />;
      })}
    </div>
    <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
    {active ? <p className="mt-2 text-center text-xs font-medium text-slate-600">{active.label}</p> : null}
  </div>;
}
