"use client";

import { useEffect, useRef, useState } from "react";
import type { SleepRange } from "@/components/SleepChart";

type DiaperItem = {
  happenedAt: string;
  diaperType: string;
};

type Bucket = {
  key: string;
  label: string;
  pee: number;
  poop: number;
};

const dayMs = 86_400_000;
const beijingOffsetMs = 8 * 60 * 60 * 1000;

export function DashboardDiaperCard({
  items,
  range
}: {
  items: DiaperItem[];
  range: SleepRange;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { records, buckets } = groupDiapers(items, range);
  const today = dateKey(Date.now());
  const activeDay =
    range === "日"
      ? today
      : selectedDay && buckets.some((bucket) => bucket.key === selectedDay)
        ? selectedDay
        : today;
  const activeRecords = items
    .filter(
      (item) => dateKey(new Date(item.happenedAt).getTime()) === activeDay
    )
    .sort(
      (a, b) =>
        new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime()
    );
  const pee = records.filter((item) => hasPee(item.diaperType)).length;
  const poop = records.filter((item) => hasPoop(item.diaperType)).length;
  const max = Math.max(1, ...buckets.map((bucket) => bucket.pee + bucket.poop));

  return (
    <article className="mb-4 h-full min-w-0 rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-sky-200/25 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="apple-hello-text text-2xl text-slate-700">尿布节律</h2>
        </div>
        <span className="rounded-full bg-white/75 px-3 py-1 text-sm font-semibold text-slate-600">
          尿 {pee} · 便 {poop}
        </span>
      </div>

      {records.length ? (
        <>
          {range !== "日" ? (
            <DiaperBars
              buckets={buckets}
              range={range}
              activeDay={activeDay}
              max={max}
              onSelect={setSelectedDay}
            />
          ) : null}
          <div className="mt-2 flex min-h-4 flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-300" />
              排尿 {pee} 次
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />
              排便 {poop} 次
            </span>
          </div>
          {range !== "年" ? (
            <DiaperDayDetail day={activeDay} items={activeRecords} />
          ) : null}
        </>
      ) : (
        <p className="mt-3 rounded-2xl bg-white/40 py-7 text-center text-sm text-slate-400">
          该时段暂无尿布记录
        </p>
      )}
    </article>
  );
}

function DiaperBars({
  buckets,
  range,
  activeDay,
  max,
  onSelect
}: {
  buckets: Bucket[];
  range: SleepRange;
  activeDay: string;
  max: number;
  onSelect: (day: string) => void;
}) {
  const isMonth = range === "月";
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isMonth && scroller.current)
      scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [isMonth]);
  return (
    <div
      ref={scroller}
      className={`mt-5 gap-1 sm:gap-2 ${isMonth ? "flex snap-x snap-mandatory overflow-x-auto pb-2" : `grid ${range === "周" ? "grid-cols-7" : "grid-cols-12"}`}`}
      aria-label={`尿布${range}视图，可选择日期查看当天记录时刻`}
    >
      {buckets.map((bucket) => {
        const total = bucket.pee + bucket.poop;
        const selected = range !== "年" && activeDay === bucket.key;
        return (
          <button
            key={bucket.key}
            type="button"
            disabled={range === "年"}
            onClick={() => onSelect(bucket.key)}
            aria-pressed={selected}
            aria-label={`${bucket.label}：排尿${bucket.pee}次，排便${bucket.poop}次`}
            className={`rounded-xl px-0.5 py-2 text-center transition ${isMonth ? "min-w-[3.25rem] snap-start" : "min-w-0"} ${selected ? "bg-indigo-100 ring-1 ring-indigo-300" : "bg-white/45 hover:bg-white/80"}`}
          >
            <span className="block h-6 text-[10px] font-semibold text-slate-600 sm:text-xs">
              {total ? `${total}次` : "—"}
            </span>
            <span
              className={`mx-auto flex w-3 flex-col-reverse justify-start overflow-hidden rounded-full bg-indigo-100/50 sm:w-5 ${range === "月" ? "h-14" : "h-20"}`}
            >
              <span
                className="w-full bg-cyan-300"
                style={{ height: `${(bucket.pee / max) * 100}%` }}
              />
              <span
                className="w-full bg-amber-300"
                style={{ height: `${(bucket.poop / max) * 100}%` }}
              />
            </span>
            <span className="mt-2 block truncate text-[9px] text-slate-500 sm:text-[10px]">
              {bucket.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DiaperDayDetail({ day, items }: { day: string; items: DiaperItem[] }) {
  return (
    <div className="mt-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/75">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-600">
          {day.slice(5).replace("-", "月")}日尿布时刻
        </h3>
        <span className="text-sm font-semibold text-slate-700">
          共 {items.length} 次
        </span>
      </div>
      {items.length ? (
        <>
          <div className="relative mt-4 h-16 border-b border-indigo-100">
            {items.map((item, index) => {
              const time = new Date(item.happenedAt);
              const left = (minutesOfDay(time) / 1440) * 100;
              const tone =
                hasPee(item.diaperType) && hasPoop(item.diaperType)
                  ? "bg-gradient-to-b from-cyan-300 to-amber-300"
                  : hasPoop(item.diaperType)
                    ? "bg-amber-300"
                    : "bg-cyan-300";
              const label = `${clock(time)} · ${item.diaperType}`;
              return (
                <span
                  key={`${item.happenedAt}-${index}`}
                  className={`absolute top-4 h-7 min-w-2 rounded-full shadow-sm ${tone}`}
                  style={{ left: `${left}%`, width: "1.8%" }}
                  title={label}
                  aria-label={label}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </>
      ) : (
        <p className="py-5 text-center text-sm text-slate-400">
          当天无尿布记录
        </p>
      )}
    </div>
  );
}

function groupDiapers(items: DiaperItem[], range: SleepRange) {
  const now = Date.now();
  const today = dateKey(now);
  const todayStart = new Date(`${today}T00:00:00+08:00`).getTime();
  const days = range === "周" ? 7 : 30;
  const yearStart = startOfMonthMonthsAgo(today, 11);
  const start =
    range === "日"
      ? todayStart
      : range === "年"
        ? yearStart
        : todayStart - (days - 1) * dayMs;
  const records = items.filter((item) => {
    const time = new Date(item.happenedAt).getTime();
    return Number.isFinite(time) && time >= start && time <= now + 60_000;
  });
  const buckets: Bucket[] = [];
  const empty = (key: string, label: string): Bucket => ({
    key,
    label,
    pee: 0,
    poop: 0
  });
  if (range === "日") {
    for (let index = 0; index < 12; index++) {
      buckets.push(
        empty(
          `${today}T${String(index * 2).padStart(2, "0")}`,
          `${String(index * 2).padStart(2, "0")}:00`
        )
      );
    }
  } else if (range === "年") {
    let month = dateKey(yearStart).slice(0, 7);
    while (month <= today.slice(0, 7)) {
      buckets.push(empty(month, month.replace("-", "/")));
      const [year, number] = month.split("-").map(Number);
      month = `${year + (number === 12 ? 1 : 0)}-${String(number === 12 ? 1 : number + 1).padStart(2, "0")}`;
    }
  } else {
    for (let index = 0; index < days; index++) {
      const key = dateKey(start + index * dayMs);
      buckets.push(empty(key, key.slice(5).replace("-", "/")));
    }
  }
  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const record of records) {
    const time = new Date(record.happenedAt).getTime();
    const date = dateKey(time);
    const hour = new Date(time + beijingOffsetMs).getUTCHours();
    const key =
      range === "日"
        ? `${date}T${String(Math.floor(hour / 2) * 2).padStart(2, "0")}`
        : range === "年"
          ? date.slice(0, 7)
          : date;
    const bucket = map.get(key);
    if (!bucket) continue;
    if (hasPee(record.diaperType)) bucket.pee++;
    if (hasPoop(record.diaperType)) bucket.poop++;
  }
  return { records, buckets };
}

function hasPee(type: string) {
  return type === "尿" || type === "尿+便";
}

function hasPoop(type: string) {
  return type === "便" || type === "尿+便";
}

function startOfMonthMonthsAgo(today: string, monthsAgo: number) {
  const [year, month] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 - monthsAgo, 1));
  return new Date(
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00+08:00`
  ).getTime();
}

function dateKey(time: number) {
  return new Date(time + beijingOffsetMs).toISOString().slice(0, 10);
}

function clock(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function minutesOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return (
    Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  );
}
