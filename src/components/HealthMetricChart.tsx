"use client";

import { useMemo, useState } from "react";

type Point = { time: string; value: number };
type Range = "日" | "周" | "月" | "年";

const ranges: Range[] = ["日", "周", "月", "年"];
const zone = "Asia/Shanghai";

export function HealthMetricChart({
  kind,
  points,
  mobile = false
}: {
  kind: "temperature" | "weight";
  points: Point[];
  mobile?: boolean;
}) {
  const [range, setRange] = useState<Range>(mobile ? "周" : "日");
  const availableRanges = mobile ? ranges.filter((value) => value !== "日") : ranges;
  const config = kind === "temperature"
    ? { title: "体温趋势", unit: "℃", color: "#ff6b8a", fill: "#ffd8e1" }
    : { title: "体重趋势", unit: "g", color: "#5b8def", fill: "#d7e6ff" };
  const visible = useMemo(() => filterPoints(points, range), [points, range]);
  const values = visible.map((point) => point.value);
  const latest = visible.at(-1);
  const low = values.length ? Math.min(...values) : null;
  const high = values.length ? Math.max(...values) : null;
  const latestIsAbnormal = kind === "temperature" && latest ? isAbnormalTemperature(latest.value) : false;

  return (
    <section className="mb-4 rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-indigo-200/25 backdrop-blur-2xl md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="apple-hello-text text-2xl text-slate-700 md:text-3xl">{config.title}</h2>
          <div className="mt-2 flex items-end gap-2">
            <span className={`font-mono text-3xl font-medium tracking-tight tabular-nums md:text-4xl ${latestIsAbnormal ? "text-rose-500" : "text-slate-700"}`}>{latest ? formatValue(latest.value, kind) : "--"}</span>
            <span className="pb-1 text-sm text-slate-400">{config.unit}</span>
          </div>
          {latest ? <p className="mt-1 text-xs text-slate-400">{formatDateTime(latest.time)}</p> : null}
        </div>
        <div className="flex rounded-full bg-white/70 p-1 ring-1 ring-white/80">
          {availableRanges.map((value) => (
            <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-full px-3 py-1.5 text-xs transition ${range === value ? "bg-indigo-300/80 text-slate-700 shadow-sm" : "text-slate-500"}`}>{value}</button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <>
          <MetricPlot points={visible} range={range} color={config.color} fill={config.fill} kind={kind} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-white/45 px-3 py-2 ring-1 ring-white/70"><span className="text-xs text-slate-400">范围下限</span><p className="mt-0.5 font-mono text-slate-600 tabular-nums">{formatValue(low!, kind)} {config.unit}</p></div>
            <div className="rounded-2xl bg-white/45 px-3 py-2 ring-1 ring-white/70"><span className="text-xs text-slate-400">范围上限</span><p className="mt-0.5 font-mono text-slate-600 tabular-nums">{formatValue(high!, kind)} {config.unit}</p></div>
          </div>
        </>
      ) : <div className="mt-5 flex h-44 items-center justify-center rounded-[1.5rem] bg-white/35 text-sm text-slate-400">该时段暂无记录</div>}
    </section>
  );
}

function MetricPlot({ points, range, color, fill, kind }: { points: Point[]; range: Range; color: string; fill: string; kind: "temperature" | "weight" }) {
  const width = 720;
  const height = 230;
  const left = 46;
  const right = 16;
  const top = 18;
  const bottom = 38;
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const margin = Math.max((rawMax - rawMin) * 0.2, kind === "temperature" ? 0.15 : 50);
  const min = rawMin - margin;
  const max = rawMax + margin;
  const timeMin = new Date(points[0].time).getTime();
  const timeMax = Math.max(new Date(points.at(-1)!.time).getTime(), timeMin + 1);
  const coords = points.map((point, index) => ({
    x: points.length === 1 ? (left + width - right) / 2 : left + ((new Date(point.time).getTime() - timeMin) / (timeMax - timeMin)) * (width - left - right),
    y: top + ((max - point.value) / (max - min)) * (height - top - bottom),
    point,
    index
  }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords.at(-1)!.x.toFixed(1)},${height - bottom} L${coords[0].x.toFixed(1)},${height - bottom} Z`;

  return (
    <div className="mt-4 overflow-hidden rounded-[1.5rem] bg-white/35 px-2 py-2 ring-1 ring-white/60">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label={`${kind === "temperature" ? "体温" : "体重"}趋势图`}>
        {[0, 1, 2, 3].map((index) => { const y = top + index * (height - top - bottom) / 3; const value = max - index * (max - min) / 3; return <g key={index}><line x1={left} x2={width - right} y1={y} y2={y} stroke="rgba(148,163,184,.18)" /><text x={left - 7} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{formatValue(value, kind)}</text></g>; })}
        <path d={area} fill={fill} opacity="0.42" />
        <path d={line} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.slice(1).map((current, index) => {
          const previous = coords[index];
          const abnormal = kind === "temperature" && (isAbnormalTemperature(previous.point.value) || isAbnormalTemperature(current.point.value));
          return abnormal ? <line key={`alert-${current.point.time}`} x1={previous.x} y1={previous.y} x2={current.x} y2={current.y} stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" /> : null;
        })}
        {coords.map(({ x, y, point, index }) => {
          const abnormal = kind === "temperature" && isAbnormalTemperature(point.value);
          return <circle key={`${point.time}-${index}`} cx={x} cy={y} r={abnormal ? 5.5 : 4.5} fill={abnormal ? "#fff1f2" : "white"} stroke={abnormal ? "#f43f5e" : color} strokeWidth="3"><title>{formatDateTime(point.time)} · {formatValue(point.value, kind)}{kind === "temperature" ? "℃" : "g"}{abnormal ? " · 异常" : ""}</title></circle>;
        })}
        <text x={left} y={height - 12} fill="#94a3b8" fontSize="11">{formatAxisDate(points[0].time, range)}</text>
        <text x={width - right} y={height - 12} textAnchor="end" fill="#94a3b8" fontSize="11">{formatAxisDate(points.at(-1)!.time, range)}</text>
      </svg>
    </div>
  );
}

function filterPoints(points: Point[], range: Range) {
  const now = Date.now();
  if (range === "日") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
    return points.filter((point) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(point.time)) === today);
  }
  const days = range === "周" ? 7 : range === "月" ? 30 : 365;
  return points.filter((point) => { const time = new Date(point.time).getTime(); return Number.isFinite(time) && time >= now - days * 86400000 && time <= now + 60000; });
}

function formatValue(value: number, kind: "temperature" | "weight") { return kind === "temperature" ? value.toFixed(1) : Math.round(value).toString(); }
function isAbnormalTemperature(value: number) { return value < 36 || value > 37.4; }
function formatDateTime(iso: string) { return new Date(iso).toLocaleString("zh-CN", { timeZone: zone, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }
function formatAxisDate(iso: string, range: Range) { return new Date(iso).toLocaleString("zh-CN", range === "日" ? { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false } : { timeZone: zone, month: "numeric", day: "numeric" }); }
