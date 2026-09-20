"use client";

import { useMemo, useState } from "react";

type Item = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
};
type Segment = {
  id: string;
  day: string;
  start: Date;
  end: Date;
  minutes: number;
};
export type SleepRange = "日" | "周" | "月" | "年";
type Range = SleepRange;
const ranges: Range[] = ["日", "周", "月", "年"];
const zone = "Asia/Shanghai";

export function SleepChart({
  items,
  selectedRange,
  hideRangeSelector = false
}: {
  items: Item[];
  selectedRange?: Range;
  hideRangeSelector?: boolean;
}) {
  const [localRange, setLocalRange] = useState<Range>("日");
  const range = selectedRange ?? localRange;
  const [selected, setSelected] = useState<string | null>(null);
  const today = dateKey(new Date());
  const segments = useMemo(() => splitDays(items), [items]);
  const count = range === "周" ? 7 : range === "月" ? 30 : 365;
  const days = useMemo(() => aggregate(segments, count), [segments, count]);
  const active =
    range === "日"
      ? today
      : selected && days.some((day) => day.key === selected)
        ? selected
        : today;
  const activeSegments = segments
    .filter((item) => item.day === active)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const hasData = days.some((item) => item.minutes > 0);
  return (
    <section className="mb-4 rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-indigo-200/25 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="apple-hello-text text-2xl text-slate-700">睡眠节律</h2>
          <p className="mt-1 text-sm text-slate-500">
            {range === "日"
              ? "今日"
              : range === "周"
                ? "近 7 天"
                : range === "月"
                  ? "近 30 天"
                  : "近 365 天"}{" "}
            · 北京时间
          </p>
        </div>
        {!hideRangeSelector ? (
          <div className="flex shrink-0 rounded-full bg-white/70 p-1">
            {ranges.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLocalRange(value);
                  setSelected(null);
                }}
                className={`rounded-full px-3 py-1 text-xs ${range === value ? "bg-indigo-300 text-slate-700" : "text-slate-500"}`}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {range === "日" ? (
        <DayDetail key={today} day={today} items={activeSegments} />
      ) : (
        <>
          {!hasData ? (
            <p className="py-10 text-center text-sm text-slate-400">
              暂无该时段的睡眠记录
            </p>
          ) : range === "周" ? (
            <WeekBars items={days} selected={active} onSelect={setSelected} />
          ) : (
            <TrendBars items={days} />
          )}
          {range === "周" ? (
            <DayDetail key={active} day={active} items={activeSegments} />
          ) : null}
        </>
      )}
    </section>
  );
}

function WeekBars({
  items,
  selected,
  onSelect
}: {
  items: { key: string; minutes: number }[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  const max = Math.max(...items.map((item) => item.minutes), 1);
  return (
    <div
      className="mt-5 grid grid-cols-7 gap-1 sm:gap-2"
      aria-label="近七天每日睡眠时长"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={selected === item.key}
          onClick={() => onSelect(item.key)}
          className={`min-w-0 rounded-xl px-0.5 py-2 text-center transition ${selected === item.key ? "bg-indigo-100 ring-1 ring-indigo-300" : "bg-white/45 hover:bg-white/80"}`}
        >
          <span className="block h-8 text-[10px] font-semibold text-slate-600 sm:text-xs">
            {item.minutes ? shortDuration(item.minutes) : "—"}
          </span>
          <span className="mx-auto flex h-20 w-3 items-end rounded-full bg-indigo-100/60 sm:w-5">
            <span
              className="w-full rounded-full bg-gradient-to-t from-indigo-500 to-cyan-300"
              style={{
                height: `${item.minutes ? Math.max(5, (item.minutes / max) * 100) : 0}%`
              }}
            />
          </span>
          <span className="mt-2 block text-[10px] text-slate-500 sm:text-xs">
            {item.key.slice(5).replace("-", "/")}
          </span>
        </button>
      ))}
    </div>
  );
}

function DayDetail({ day, items }: { day: string; items: Segment[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.minutes, 0);
  const active = items.find((item) => item.id === selected);
  const label = (item: Segment) =>
    `${clock(item.start)}–${item.end.getTime() === new Date(`${nextDay(item.day)}T00:00:00+08:00`).getTime() ? "24:00" : clock(item.end)} · ${duration(item.minutes)}`;
  return (
    <div className="mt-4 rounded-2xl bg-white/55 p-3 ring-1 ring-white/75">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-600">
          {day.slice(5).replace("-", "月")}日睡眠时刻
        </h3>
        <span className="text-sm font-semibold text-slate-700">
          累计 {duration(total)}
        </span>
      </div>
      {items.length ? (
        <>
          <div className="relative mt-4 h-16 border-b border-indigo-100">
            {items.map((item) => {
              const left = (minutesOfDay(item.start) / 1440) * 100;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={label(item)}
                  aria-pressed={selected === item.id}
                  onClick={() => setSelected(item.id)}
                  className={`absolute top-4 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300 shadow-sm ${selected === item.id ? "ring-2 ring-indigo-400" : ""}`}
                  style={{
                    left: `${left}%`,
                    width: `${Math.min(Math.max(1.5, item.minutes / 14.4), 100 - left)}%`
                  }}
                  title={label(item)}
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
          {active ? (
            <p className="mt-2 text-center text-xs font-medium text-slate-600">
              {label(active)}
            </p>
          ) : null}
        </>
      ) : (
        <p className="py-7 text-center text-sm text-slate-400">
          当天无睡眠记录
        </p>
      )}
    </div>
  );
}

function TrendBars({ items }: { items: { key: string; minutes: number }[] }) {
  const max = Math.max(...items.map((item) => item.minutes), 1);
  return (
    <>
      <div className="mt-5 flex h-28 items-end gap-1 border-b border-indigo-100">
        {items.map((item) => (
          <div key={item.key} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-cyan-300"
              style={{
                height: `${item.minutes ? Math.max(4, (item.minutes / max) * 100) : 0}%`
              }}
              title={`${item.key} · ${duration(item.minutes)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{items[0]?.key}</span>
        <span>{items.at(-1)?.key}</span>
      </div>
    </>
  );
}
function aggregate(items: Segment[], count: number) {
  const result = Array.from({ length: count }, (_, index) => ({
    key: dateKey(new Date(Date.now() - (count - 1 - index) * 86400000)),
    minutes: 0
  }));
  const map = new Map(result.map((item) => [item.key, item]));
  for (const item of items) {
    const bucket = map.get(item.day);
    if (bucket) bucket.minutes += item.minutes;
  }
  return result;
}
function splitDays(items: Item[]) {
  const result: Segment[] = [];
  for (const item of items) {
    if (!item.endedAt) continue;
    let cursor = new Date(item.startedAt).getTime();
    const end = new Date(item.endedAt).getTime();
    if (!Number.isFinite(cursor) || !Number.isFinite(end) || end <= cursor)
      continue;
    let part = 0;
    while (cursor < end) {
      const day = dateKey(new Date(cursor));
      const boundary = new Date(`${nextDay(day)}T00:00:00+08:00`).getTime();
      const segmentEnd = Math.min(end, boundary);
      result.push({
        id: `${item.id}-${part++}`,
        day,
        start: new Date(cursor),
        end: new Date(segmentEnd),
        minutes: (segmentEnd - cursor) / 60000
      });
      cursor = segmentEnd;
    }
  }
  return result;
}
function nextDay(key: string) {
  return dateKey(
    new Date(new Date(`${key}T12:00:00+08:00`).getTime() + 86400000)
  );
}
function duration(minutes: number) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return hours ? `${hours}小时${rest ? `${rest}分` : ""}` : `${rest}分钟`;
}
function shortDuration(minutes: number) {
  return minutes >= 60
    ? `${Number((minutes / 60).toFixed(1))}h`
    : `${Math.round(minutes)}m`;
}
function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
function clock(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
function minutesOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return (
    Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  );
}
