"use client";

import { useMemo, useState } from "react";
import { CareDayTimeline } from "@/components/CareDayTimeline";

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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const visible = useMemo(() => filterItems(items, range), [items, range]);
  const breast = visible.filter((item) => item.feedingType === "母乳");
  const bottle = visible.filter((item) => item.feedingType === "瓶喂");
  const formula = visible.filter((item) => item.feedingType === "配方奶");
  const breastMinutes = breast.reduce(
    (sum, item) => sum + (item.durationMinutes ?? 0),
    0
  );
  const bottleMl = bottle.reduce((sum, item) => sum + (item.amountMl ?? 0), 0);
  const formulaMl = formula.reduce(
    (sum, item) => sum + (item.amountMl ?? 0),
    0
  );
  const buckets = useMemo(() => buildBuckets(visible, range), [visible, range]);
  const maxCount = Math.max(
    ...buckets.map((bucket) => bucket.breast + bucket.bottle + bucket.formula),
    1
  );
  const activeDay =
    selectedDay && buckets.some((bucket) => bucket.key === selectedDay)
      ? selectedDay
      : dateKey(new Date());
  const dayRecords =
    range === "周" || range === "月"
      ? visible
          .filter((item) => dateKey(new Date(item.happenedAt)) === activeDay)
          .sort(
            (a, b) =>
              new Date(a.happenedAt).getTime() -
              new Date(b.happenedAt).getTime()
          )
      : [];

  return (
    <section className="mb-4 rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-indigo-200/25 backdrop-blur-2xl md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="apple-hello-text text-2xl text-slate-700 md:text-3xl">
            喂养趋势
          </h2>
          <p className="mt-1 font-mono text-3xl font-medium text-slate-700 tabular-nums">
            {visible.length}
            <span className="ml-1 text-sm font-normal text-slate-400">次</span>
          </p>
        </div>
        <div className="flex rounded-full bg-white/70 p-1 ring-1 ring-white/80">
          {ranges.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRange(value);
                setSelectedDay(null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs transition ${range === value ? "bg-indigo-300/80 text-slate-700 shadow-sm" : "text-slate-500"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="mt-4 rounded-[1.5rem] bg-white/35 p-3 ring-1 ring-white/60">
          <div className="flex h-36 items-end gap-1.5 border-b border-slate-200/70 px-1">
            {buckets.map((bucket) => {
              const total = bucket.breast + bucket.bottle + bucket.formula;
              const height = Math.max(8, (total / maxCount) * 100);
              const breastRatio = total ? (bucket.breast / total) * 100 : 0;
              const bottleRatio = total ? (bucket.bottle / total) * 100 : 0;
              const formulaRatio = total ? (bucket.formula / total) * 100 : 0;
              return (
                <div
                  key={bucket.key}
                  className="group relative flex h-full min-w-0 flex-1 items-end"
                  title={`${bucket.label} · 共${total}次，母乳亲喂${bucket.breast}次，瓶喂母乳${bucket.bottle}次，配方奶${bucket.formula}次`}
                >
                  <div
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-lg"
                    style={{ height: `${height}%` }}
                  >
                    <div
                      className="w-full bg-violet-400/90"
                      style={{ height: `${breastRatio}%` }}
                    />
                    <div
                      className="w-full bg-cyan-300/90"
                      style={{ height: `${bottleRatio}%` }}
                    />
                    <div
                      className="w-full bg-amber-300/90"
                      style={{ height: `${formulaRatio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>{buckets[0]?.label}</span>
            <span>{buckets.at(-1)?.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-400" />
              母乳亲喂
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-300" />
              瓶喂母乳
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />
              配方奶
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex h-36 items-center justify-center rounded-[1.5rem] bg-white/35 text-sm text-slate-400">
          该时段暂无喂养记录
        </div>
      )}

      {range === "周" || range === "月" ? (
        <div className="mt-3 rounded-2xl bg-white/50 p-3">
          <div className="grid grid-cols-7 gap-1">
            {buckets.map((bucket) => (
              <button
                key={bucket.key}
                type="button"
                aria-pressed={activeDay === bucket.key}
                onClick={() => setSelectedDay(bucket.key)}
                className={`rounded-xl px-0.5 py-2 text-center text-[10px] sm:text-xs ${activeDay === bucket.key ? "bg-indigo-100 ring-1 ring-indigo-300" : "bg-white/60"}`}
              >
                <span className="block font-semibold">
                  {bucket.breast + bucket.bottle + bucket.formula}次
                </span>
                <span className="block text-slate-500">{bucket.label}</span>
              </button>
            ))}
          </div>
          <CareDayTimeline
            key={activeDay}
            day={activeDay}
            events={dayRecords.map((item) => ({
              time: item.happenedAt,
              label: `${clock(item.happenedAt)} ${item.feedingType === "母乳" ? "母乳亲喂" : item.feedingType === "瓶喂" ? "瓶喂母乳" : item.feedingType}${item.feedingType === "母乳" ? (item.durationMinutes ? ` · ${Math.round(item.durationMinutes)}分` : "") : item.amountMl ? ` · ${item.amountMl}ml` : ""}`,
              color:
                item.feedingType === "母乳"
                  ? "violet"
                  : item.feedingType === "配方奶"
                    ? "amber"
                    : "cyan"
            }))}
          />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-3">
        <Summary label="喂养总次数" value={`${visible.length} 次`} />
        <Summary
          label="母乳亲喂"
          value={`${breast.length} 次 · ${formatMinutes(breastMinutes)}`}
        />
        <Summary
          label="瓶喂母乳"
          value={`${bottle.length} 次 · ${Math.round(bottleMl)} ml`}
        />
        <Summary
          label="配方奶"
          value={`${formula.length} 次 · ${Math.round(formulaMl)} ml`}
        />
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/45 px-2 py-2.5 ring-1 ring-white/70">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 font-mono font-medium text-slate-600 tabular-nums">
        {value}
      </p>
    </div>
  );
}
function filterItems(items: FeedingItem[], range: Range) {
  const now = Date.now();
  const today = dateKey(new Date(now));
  const days = range === "周" ? 7 : 30;
  const firstDay =
    range === "年"
      ? monthKeyMonthsAgo(11) + "-01"
      : dateKey(new Date(now - (days - 1) * 86400000));
  return items.filter((item) => {
    const time = new Date(item.happenedAt).getTime();
    if (!Number.isFinite(time) || time > now + 60000) return false;
    const day = dateKey(new Date(time));
    return range === "日" ? day === today : day >= firstDay && day <= today;
  });
}
function buildBuckets(items: FeedingItem[], range: Range) {
  const count =
    range === "日" ? 12 : range === "周" ? 7 : range === "月" ? 30 : 12;
  const now = new Date();
  const result = Array.from({ length: count }, (_, index) => {
    if (range === "日")
      return {
        key: String(index),
        label: `${index * 2}:00`,
        breast: 0,
        bottle: 0,
        formula: 0
      };
    if (range === "年") {
      const key = monthKeyMonthsAgo(count - 1 - index);
      return {
        key,
        label: `${Number(key.slice(5))}月`,
        breast: 0,
        bottle: 0,
        formula: 0
      };
    }
    const date = new Date(now.getTime() - (count - 1 - index) * 86400000);
    return {
      key: dateKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      breast: 0,
      bottle: 0,
      formula: 0
    };
  });
  const map = new Map(result.map((bucket) => [bucket.key, bucket]));
  for (const item of items) {
    const date = new Date(item.happenedAt);
    let key: string;
    if (range === "日")
      key = String(Math.min(11, Math.floor(hourInZone(date) / 2)));
    else if (range === "年") key = dateKey(date).slice(0, 7);
    else key = dateKey(date);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (item.feedingType === "母乳") bucket.breast += 1;
    else if (item.feedingType === "瓶喂") bucket.bottle += 1;
    else if (item.feedingType === "配方奶") bucket.formula += 1;
  }
  return result;
}
function monthKeyMonthsAgo(offset: number) {
  const today = dateKey(new Date());
  const [year, month] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 - offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
function clock(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
function hourInZone(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      hourCycle: "h23"
    }).format(date)
  );
}
function formatMinutes(minutes: number) {
  const rounded = Math.round(minutes);
  return rounded >= 60
    ? `${Math.floor(rounded / 60)}小时${rounded % 60 ? `${rounded % 60}分` : ""}`
    : `${rounded} 分钟`;
}
