"use client";

import { useMemo, useState } from "react";

type FeedingItem = {
  happenedAt: string;
  endedAt: string | null;
  feedingType: string;
  amountMl: number | null;
  durationMinutes: number | null;
};
type Range = "日" | "周" | "月" | "年";
const ranges: Range[] = ["日", "周", "月", "年"];
const zone = "Asia/Shanghai";

export function FeedingChart({ items }: { items: FeedingItem[] }) {
  const [range, setRange] = useState<Range>("日");
  const visible = useMemo(() => filterItems(items, range), [items, range]);
  const breast = visible.filter((item) => item.feedingType === "母乳");
  const bottle = visible.filter((item) => item.feedingType !== "母乳");
  const breastMinutes = breast.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0);
  const bottleMl = bottle.reduce((sum, item) => sum + (item.amountMl ?? 0), 0);
  const buckets = useMemo(() => buildBuckets(visible, range), [visible, range]);
  const maxCount = Math.max(...buckets.map((bucket) => bucket.breast + bucket.bottle), 1);

  return (
    <section className="mb-4 rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-indigo-200/25 backdrop-blur-2xl md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="apple-hello-text text-2xl text-slate-700 md:text-3xl">喂养趋势</h2>
          <p className="mt-1 font-mono text-3xl font-medium text-slate-700 tabular-nums">{visible.length}<span className="ml-1 text-sm font-normal text-slate-400">次</span></p>
        </div>
        <div className="flex rounded-full bg-white/70 p-1 ring-1 ring-white/80">
          {ranges.map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-full px-3 py-1.5 text-xs transition ${range === value ? "bg-indigo-300/80 text-slate-700 shadow-sm" : "text-slate-500"}`}>{value}</button>)}
        </div>
      </div>

      {visible.length ? (
        <div className="mt-4 rounded-[1.5rem] bg-white/35 p-3 ring-1 ring-white/60">
          <div className="flex h-36 items-end gap-1.5 border-b border-slate-200/70 px-1">
            {buckets.map((bucket) => {
              const total = bucket.breast + bucket.bottle;
              const height = Math.max(8, total / maxCount * 100);
              const breastRatio = total ? bucket.breast / total * 100 : 0;
              return <div key={bucket.key} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${bucket.label} · 共${total}次，母乳${bucket.breast}次，瓶喂${bucket.bottle}次`}><div className="w-full overflow-hidden rounded-t-lg bg-cyan-300/90" style={{ height: `${height}%` }}><div className="w-full bg-violet-400/90" style={{ height: `${breastRatio}%` }} /></div></div>;
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>{buckets[0]?.label}</span><span>{buckets.at(-1)?.label}</span></div>
          <div className="mt-2 flex gap-4 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-400" />母乳</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-300" />瓶喂/配方奶</span></div>
        </div>
      ) : <div className="mt-4 flex h-36 items-center justify-center rounded-[1.5rem] bg-white/35 text-sm text-slate-400">该时段暂无喂养记录</div>}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-4">
        <Summary label="喂养总次数" value={`${visible.length} 次`} />
        <Summary label="母乳" value={`${breast.length} 次`} />
        <Summary label="母乳总时长" value={formatMinutes(breastMinutes)} />
        <Summary label="瓶喂总量" value={`${Math.round(bottleMl)} ml`} />
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/45 px-2 py-2.5 ring-1 ring-white/70"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 font-mono font-medium text-slate-600 tabular-nums">{value}</p></div>; }
function filterItems(items: FeedingItem[], range: Range) { const now = Date.now(); const today = dateKey(new Date(now)); const days = range === "周" ? 7 : range === "月" ? 30 : 365; return items.filter((item) => { const time = new Date(item.happenedAt).getTime(); if (!Number.isFinite(time) || time > now + 60000) return false; return range === "日" ? dateKey(new Date(time)) === today : time >= now - days * 86400000; }); }
function buildBuckets(items: FeedingItem[], range: Range) {
  const count = range === "日" ? 12 : range === "周" ? 7 : range === "月" ? 15 : 12;
  const now = new Date();
  const result = Array.from({ length: count }, (_, index) => {
    if (range === "日") return { key: String(index), label: `${index * 2}:00`, breast: 0, bottle: 0 };
    if (range === "年") {
      const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: `${date.getMonth() + 1}月`, breast: 0, bottle: 0 };
    }
    const step = range === "月" ? 2 : 1;
    const date = new Date(now.getTime() - (count - 1 - index) * step * 86400000);
    return { key: dateKey(date), label: `${date.getMonth() + 1}/${date.getDate()}`, breast: 0, bottle: 0 };
  });
  const map = new Map(result.map((bucket) => [bucket.key, bucket]));
  for (const item of items) {
    const date = new Date(item.happenedAt);
    let key: string;
    if (range === "日") key = String(Math.min(11, Math.floor(hourInZone(date) / 2)));
    else if (range === "年") key = `${date.getFullYear()}-${date.getMonth()}`;
    else if (range === "月") {
      const diff = Math.floor((startOfToday().getTime() - startOfDay(date).getTime()) / 86400000);
      const index = count - 1 - Math.floor(Math.max(0, diff) / 2);
      key = result[Math.max(0, Math.min(count - 1, index))]?.key ?? "";
    } else key = dateKey(date);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (item.feedingType === "母乳") bucket.breast += 1;
    else bucket.bottle += 1;
  }
  return result;
}
function dateKey(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function hourInZone(date: Date) { return Number(new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "2-digit", hourCycle: "h23" }).format(date)); }
function startOfToday() { return startOfDay(new Date()); }
function startOfDay(date: Date) { return new Date(`${dateKey(date)}T00:00:00+08:00`); }
function formatMinutes(minutes: number) { const rounded = Math.round(minutes); return rounded >= 60 ? `${Math.floor(rounded / 60)}小时${rounded % 60 ? `${rounded % 60}分` : ""}` : `${rounded} 分钟`; }
