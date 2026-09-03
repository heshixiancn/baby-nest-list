import { SleepChart } from "@/components/SleepChart";

type TrendPoint = {
  time: string;
  value: number;
};

type Trends = {
  feeding: TrendPoint[];
  temperature: TrendPoint[];
  weight: TrendPoint[];
  sleep: TrendPoint[];
};

type SleepTimelineItem = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  awakeMinutes: number;
  pauseStartedAt: string | null;
};

const cards = [
  {
    key: "feeding",
    title: "奶量",
    unit: "ml",
    tone: "from-emerald-300 to-sky-300"
  },
  {
    key: "sleep",
    title: "睡眠",
    unit: "小时",
    tone: "from-violet-300 to-pink-300"
  },
  {
    key: "temperature",
    title: "体温",
    unit: "℃",
    tone: "from-rose-300 to-orange-300"
  },
  {
    key: "weight",
    title: "体重",
    unit: "g",
    tone: "from-sky-300 to-indigo-300"
  }
] as const;

export function CareTrendsDashboard({
  trends,
  sleepTimeline = [],
  compact = false
}: {
  trends: Trends;
  sleepTimeline?: SleepTimelineItem[];
  compact?: boolean;
}) {
  if (compact) {
    return (
      <section className="grid min-h-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <TrendCard key={card.key} title={card.title} unit={card.unit} tone={card.tone} points={trends[card.key]} compact />
          ))}
        </section>
        <SleepChart items={sleepTimeline} />
      </section>
    );
  }

  return (
    <section className="page-shell space-y-5">
      {(
        <section className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-2xl shadow-slate-200/50 backdrop-blur-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
            Trends
          </p>
          <h1 className="apple-hello-text mt-2 text-4xl">成长记录</h1>
        </section>
      )}

      <AnalysisSummary trends={trends} />

      <section className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <TrendCard
            key={card.key}
            title={card.title}
            unit={card.unit}
            tone={card.tone}
            points={trends[card.key]}
          />
        ))}
      </section>

      <SleepChart items={sleepTimeline} />
    </section>
  );
}

function AnalysisSummary({ trends }: { trends: Trends }) {
  const feeding = getLatest(trends.feeding);
  const sleep = getLatest(trends.sleep);
  const temperature = getLatest(trends.temperature);
  const weight = getLatest(trends.weight);

  return (
    <section className="grid gap-3 rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-2xl lg:grid-cols-4">
      <SummaryItem label="最近奶量" value={formatSummaryValue(feeding, "ml")} />
      <SummaryItem label="最近睡眠" value={formatSummaryValue(sleep, "小时")} />
      <SummaryItem
        label="最近体温"
        value={formatSummaryValue(temperature, "℃")}
      />
      <SummaryItem label="最近体重" value={formatSummaryValue(weight, "g")} />
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/55 px-4 py-3 ring-1 ring-white/70">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="apple-hello-text mt-1 text-2xl">{value}</p>
    </div>
  );
}

function getLatest(points: TrendPoint[]) {
  return points.at(-1)?.value ?? null;
}

function formatSummaryValue(value: number | null, unit: string) {
  return value === null ? "暂无" : `${value}${unit}`;
}

function TrendCard({
  title,
  unit,
  tone,
  points,
  compact = false
}: {
  title: string;
  unit: string;
  tone: string;
  points: TrendPoint[];
  compact?: boolean;
}) {
  const latest = points.at(-1);
  const previous = points.at(-2);
  const change =
    latest && previous
      ? Math.round((latest.value - previous.value) * 10) / 10
      : 0;

  return (
    <article className={`border border-white/80 bg-white/60 shadow-xl shadow-slate-200/40 backdrop-blur-2xl ${compact ? "rounded-[1.5rem] p-3" : "rounded-[2rem] p-5"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`apple-hello-text mt-1 ${compact ? "text-2xl" : "text-3xl"}`}>
            {latest ? `${latest.value}${unit}` : "暂无"}
          </p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/70">
          最近 {points.length} 条
        </span>
      </div>

      <div className={compact ? "mt-2" : "mt-5"}>
        {points.length >= 2 ? (
          <Sparkline points={points} tone={tone} compact={compact} />
        ) : (
          <div className={`flex items-center justify-center rounded-[1.5rem] bg-slate-50/70 text-sm text-slate-400 ${compact ? "h-16" : "h-40"}`}>
            记录几次后显示趋势
          </div>
        )}
      </div>

      <div className={`${compact ? "mt-2" : "mt-4"} flex items-center justify-between text-xs text-slate-500`}>
        <span>{latest ? formatDateTime(latest.time) : "暂无记录"}</span>
        {points.length >= 2 ? (
          <span>
            {change >= 0 ? "+" : ""}
            {change}
            {unit}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Sparkline({ points, tone, compact = false }: { points: TrendPoint[]; tone: string; compact?: boolean }) {
  const width = 420;
  const height = 160;
  const padding = 18;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x =
        padding +
        (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((point.value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-50/70 p-3">
      <div
        className={`absolute inset-x-8 top-8 h-16 rounded-full bg-gradient-to-r ${tone} opacity-20 blur-2xl`}
      />
      <svg
        className={`relative w-full ${compact ? "h-16" : "h-40"}`}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="趋势图"
      >
        <path
          d={path}
          fill="none"
          stroke="rgba(51,65,85,0.84)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {points.map((point, index) => {
          const x =
            padding +
            (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
          const y =
            height -
            padding -
            ((point.value - min) / range) * (height - padding * 2);
          return (
            <circle
              key={`${point.time}-${index}`}
              cx={x}
              cy={y}
              fill="white"
              r={4.5}
              stroke="rgba(51,65,85,0.76)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
