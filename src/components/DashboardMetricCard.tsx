import type { SleepRange } from "@/components/SleepChart";

type Point = { time: string; value: number };
type Kind = "temperature" | "weight";
type Bucket = {
  key: string;
  label: string;
  value: number | null;
  count: number;
};

const configs = {
  temperature: { title: "体温", unit: "℃", color: "#10b981", fill: "#d1fae5" },
  weight: { title: "体重", unit: "g", color: "#778de8", fill: "#dfe6ff" }
} as const;

const width = 560;
const height = 82;
const left = 44;
const right = 10;
const top = 8;
const bottom = 8;
const dayMs = 86400000;
const beijingOffsetMs = 8 * 60 * 60 * 1000;

export function DashboardMetricCard({
  kind,
  points,
  range
}: {
  kind: Kind;
  points: Point[];
  range: SleepRange;
}) {
  const config = configs[kind];
  const { records, buckets } = bucketRecords(points, range);
  const occupied = buckets.filter((bucket) => bucket.value !== null);
  const values = occupied.map((bucket) => bucket.value!);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 0;
  const headline = records.at(-1)?.value;
  const headlineAbnormal =
    kind === "temperature" && headline !== undefined && isAbnormal(headline);
  const scale =
    kind === "temperature"
      ? {
          min: Math.min(35.5, Math.floor((low - 0.2) * 2) / 2),
          max: Math.max(38, Math.ceil((high + 0.2) * 2) / 2)
        }
      : {
          min: Math.floor((low - 50) / 100) * 100,
          max: Math.ceil((high + 50) / 100) * 100
        };
  const y = (value: number) =>
    top +
    ((scale.max - value) / Math.max(scale.max - scale.min, 1)) *
      (height - top - bottom);
  const x = (index: number) =>
    left + ((index + 0.5) / buckets.length) * (width - left - right);
  const coordinates = buckets.flatMap((bucket, index) =>
    bucket.value === null ? [] : [{ bucket, x: x(index), y: y(bucket.value) }]
  );
  const line = coordinates
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    )
    .join(" ");

  return (
    <article className="min-w-0 rounded-[1.5rem] border border-white/80 bg-white/65 p-3 shadow-lg shadow-slate-200/30 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="shrink-0 text-sm font-semibold text-slate-600">
            {config.title}
          </h2>
          <span
            className={`truncate font-mono text-xl tabular-nums ${headlineAbnormal ? "text-rose-600" : kind === "temperature" && headline !== undefined ? "text-emerald-600" : "text-slate-700"}`}
          >
            {headline === undefined
              ? "暂无记录"
              : `${formatValue(headline, kind)} ${config.unit}`}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-white/75 px-2 py-1 text-[11px] text-slate-500">
          区间最新 · {records.length} 次
        </span>
      </div>
      {occupied.length ? (
        <>
          <div className="mt-2 rounded-2xl bg-white/45 px-2 py-1 ring-1 ring-white/70">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[76px] w-full"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${config.title}${range}视图，真实记录${records.length}次`}
            >
              {[0, 0.5, 1].map((fraction) => {
                const value = scale.max - fraction * (scale.max - scale.min);
                const gridY = top + fraction * (height - top - bottom);
                return (
                  <g key={fraction}>
                    <line
                      x1={left}
                      x2={width - right}
                      y1={gridY}
                      y2={gridY}
                      stroke="#dbe4f0"
                      strokeDasharray="3 5"
                    />
                    <text
                      x={left - 5}
                      y={gridY + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                    >
                      {formatValue(value, kind)}
                    </text>
                  </g>
                );
              })}
              {kind === "temperature" ? (
                <rect
                  x={left}
                  y={y(37.4)}
                  width={width - left - right}
                  height={Math.max(0, y(36) - y(37.4))}
                  fill="#d7f5ee"
                  opacity="0.55"
                />
              ) : null}
              <>
                {coordinates.length > 1 ? (
                  <path
                    d={line}
                    fill="none"
                    stroke={config.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {coordinates.map(({ bucket, x: dotX, y: dotY }, index) => (
                  <circle
                    key={bucket.key}
                    cx={dotX}
                    cy={dotY}
                    r={index === coordinates.length - 1 ? 5 : 3.5}
                    fill="white"
                    stroke={
                      kind === "temperature" && isAbnormal(bucket.value!)
                        ? "#e11d48"
                        : config.color
                    }
                    strokeWidth="2.5"
                    aria-label={`${bucket.label} · ${formatValue(bucket.value!, kind)} ${config.unit}`}
                  />
                ))}
              </>
            </svg>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>{buckets[0].label}</span>
            <span className="text-slate-400">
              {range === "日" ? "按小时" : range === "年" ? "按月" : "按天"} ·{" "}
              {formatValue(low, kind)}–{formatValue(high, kind)} {config.unit}
            </span>
            <span>{buckets.at(-1)!.label}</span>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-2xl bg-white/40 py-7 text-center text-sm text-slate-400">
          该时段暂无记录
        </p>
      )}
    </article>
  );
}

function bucketRecords(points: Point[], range: SleepRange) {
  const now = Date.now();
  const today = dateKey(now);
  const todayStart = new Date(`${today}T00:00:00+08:00`).getTime();
  const days = range === "周" ? 7 : range === "月" ? 30 : 365;
  const start = range === "日" ? todayStart : todayStart - (days - 1) * dayMs;
  const records = points.filter((point) => {
    const time = new Date(point.time).getTime();
    return Number.isFinite(time) && time >= start && time <= now + 60000;
  });
  const buckets: Bucket[] = [];
  if (range === "日") {
    for (let hour = 0; hour < 24; hour++)
      buckets.push({
        key: `${today}T${String(hour).padStart(2, "0")}`,
        label: `${String(hour).padStart(2, "0")}:00`,
        value: null,
        count: 0
      });
  } else if (range === "年") {
    let month = dateKey(start).slice(0, 7);
    const lastMonth = today.slice(0, 7);
    while (month <= lastMonth) {
      buckets.push({
        key: month,
        label: month.replace("-", "/"),
        value: null,
        count: 0
      });
      const [year, number] = month.split("-").map(Number);
      month = `${year + (number === 12 ? 1 : 0)}-${String(number === 12 ? 1 : number + 1).padStart(2, "0")}`;
    }
  } else {
    for (let index = 0; index < days; index++) {
      const key = dateKey(start + index * dayMs);
      buckets.push({
        key,
        label: key.slice(5).replace("-", "/"),
        value: null,
        count: 0
      });
    }
  }
  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const point of records) {
    const time = new Date(point.time).getTime();
    const date = dateKey(time);
    const key =
      range === "日"
        ? `${date}T${String(new Date(time + beijingOffsetMs).getUTCHours()).padStart(2, "0")}`
        : range === "年"
          ? date.slice(0, 7)
          : date;
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.value = point.value;
    bucket.count++;
  }
  return { records, buckets };
}

function dateKey(time: number) {
  return new Date(time + beijingOffsetMs).toISOString().slice(0, 10);
}
function isAbnormal(value: number) {
  return value < 36 || value > 37.4;
}
function formatValue(value: number, kind: Kind) {
  return kind === "temperature" ? value.toFixed(1) : String(Math.round(value));
}
