"use client";

import { useMemo, useState } from "react";

type Item = { id: string; startedAt: string; endedAt: string | null; durationMinutes: number | null };
const ranges = ["日", "周", "月", "年"] as const;
const zone = "Asia/Shanghai";

export function SleepChart({ items }: { items: Item[] }) {
  const [range, setRange] = useState<(typeof ranges)[number]>("日");
  const today = dateKey(new Date());
  const completed = items.filter((item) => item.endedAt);
  const dayItems = completed.filter((item) => dateKey(new Date(item.startedAt)) === today);
  const days = range === "周" ? 7 : range === "月" ? 30 : 365;
  const daily = useMemo(() => aggregateDays(completed, days), [completed, days]);
  const hasData = range === "日" ? dayItems.length > 0 : daily.some((item) => item.minutes > 0);

  return <section className="mb-4 rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-indigo-200/25 backdrop-blur-2xl">
    <div className="flex items-center justify-between"><h2 className="apple-hello-text text-2xl text-slate-700">睡眠节律</h2><div className="flex rounded-full bg-white/70 p-1">{ranges.map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-full px-3 py-1 text-xs ${range === value ? "bg-indigo-300 text-slate-700" : "text-slate-500"}`}>{value}</button>)}</div></div>
    {!hasData ? <p className="py-10 text-center text-sm text-slate-400">暂无该时段的睡眠记录</p> : range === "日" ? <DayTimeline items={dayItems} /> : <TrendBars items={daily} />}
  </section>;
}

function DayTimeline({ items }: { items: Item[] }) {
  return <><div className="relative mt-5 h-24 border-b border-indigo-100">{items.map((item) => { const start = new Date(item.startedAt); const end = new Date(item.endedAt!); const left = minutesOfDay(start) / 1440 * 100; const width = Math.max(1.5, (end.getTime() - start.getTime()) / 864000); return <div key={item.id} className="absolute top-7 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300 shadow-sm" style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} title={`${clock(start)}–${clock(end)}`} />; })}</div><div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></>;
}

function TrendBars({ items }: { items: { key: string; minutes: number }[] }) {
  const max = Math.max(...items.map((item) => item.minutes), 1);
  return <div className="mt-5 flex h-28 items-end gap-1 border-b border-indigo-100">{items.map((item) => <div key={item.key} className="flex h-full flex-1 items-end"><div className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-cyan-300" style={{ height: `${item.minutes ? Math.max(4, item.minutes / max * 100) : 0}%` }} title={`${item.key} · ${(item.minutes / 60).toFixed(1)}小时`} /></div>)}</div>;
}

function aggregateDays(items: Item[], count: number) { const result = Array.from({ length: count }, (_, index) => { const date = new Date(Date.now() - (count - 1 - index) * 86400000); return { key: dateKey(date), minutes: 0 }; }); const map = new Map(result.map((item) => [item.key, item])); for (const item of items) { const bucket = map.get(dateKey(new Date(item.startedAt))); if (bucket && item.endedAt) bucket.minutes += Math.max(0, Math.round((new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime()) / 60000)); } return result; }
function dateKey(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function clock(date: Date) { return date.toLocaleTimeString("zh-CN", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }); }
function minutesOfDay(date: Date) { const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date); return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0); }
