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
  return (
    <section className={compact ? "space-y-4" : "page-shell space-y-5"}>
      {!compact ? (
        <section className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-2xl shadow-slate-200/50 backdrop-blur-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
            Trends
          </p>
          <h1 className="apple-hello-text mt-2 text-4xl">成长记录</h1>
        </section>
      ) : null}

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

      <SleepTimelinePanel items={sleepTimeline} />
    </section>
  );
}

function SleepTimelinePanel({ items }: { items: SleepTimelineItem[] }) {
  const groups = groupSleepTimeline(items);

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">睡眠片段</p>
          <h2 className="apple-hello-text mt-1 text-3xl">连续睡眠视图</h2>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/70">
          ≤15分钟归为暂醒
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {groups.length > 0 ? (
          groups
            .slice(-6)
            .reverse()
            .map((group) => (
              <div
                key={group.items.map((item) => item.id).join("-")}
                className="rounded-[1.5rem] bg-white/55 p-4 ring-1 ring-white/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {formatTime(group.startedAt)} →{" "}
                      {group.endedAt ? formatTime(group.endedAt) : "进行中"}
                    </p>
                    <p className="apple-hello-text mt-1 text-2xl">
                      {formatMinutes(group.sleepMinutes)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {group.items.length > 1
                      ? `含 ${group.items.length} 段，暂醒 ${group.gapMinutes + group.awakeMinutes} 分钟`
                      : group.awakeMinutes > 0
                        ? `暂醒 ${group.awakeMinutes} 分钟`
                        : "单段睡眠"}
                  </p>
                </div>
                {group.gaps.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.gaps.map((gap, index) => (
                      <span
                        key={`${gap}-${index}`}
                        className="rounded-full bg-white/70 px-2.5 py-1 text-xs text-slate-500 ring-1 ring-white/70"
                      >
                        中间醒 {gap} 分钟
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
        ) : (
          <div className="rounded-[1.5rem] bg-white/50 p-5 text-center text-sm text-slate-400">
            记录几次睡眠后展示连续睡眠片段
          </div>
        )}
      </div>
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
  points
}: {
  title: string;
  unit: string;
  tone: string;
  points: TrendPoint[];
}) {
  const latest = points.at(-1);
  const previous = points.at(-2);
  const change =
    latest && previous
      ? Math.round((latest.value - previous.value) * 10) / 10
      : 0;

  return (
    <article className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="apple-hello-text mt-1 text-3xl">
            {latest ? `${latest.value}${unit}` : "暂无"}
          </p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/70">
          最近 {points.length} 条
        </span>
      </div>

      <div className="mt-5">
        {points.length >= 2 ? (
          <Sparkline points={points} tone={tone} />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-[1.5rem] bg-slate-50/70 text-sm text-slate-400">
            记录几次后显示趋势
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
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

function Sparkline({ points, tone }: { points: TrendPoint[]; tone: string }) {
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
        className="relative h-40 w-full"
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

function groupSleepTimeline(items: SleepTimelineItem[]) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );
  const groups: Array<{
    startedAt: string;
    endedAt: string | null;
    sleepMinutes: number;
    awakeMinutes: number;
    gapMinutes: number;
    gaps: number[];
    items: SleepTimelineItem[];
  }> = [];

  for (const item of sorted) {
    const lastGroup = groups.at(-1);
    const previous = lastGroup?.items.at(-1);
    const gap =
      previous?.endedAt !== null && previous?.endedAt
        ? Math.round(
            (new Date(item.startedAt).getTime() -
              new Date(previous.endedAt).getTime()) /
              60000
          )
        : null;
    const shouldMerge = gap !== null && gap >= 0 && gap <= 15;
    const sleepMinutes = getSleepMinutes(item);

    if (lastGroup && shouldMerge) {
      lastGroup.endedAt = item.endedAt;
      lastGroup.sleepMinutes += sleepMinutes;
      lastGroup.awakeMinutes += item.awakeMinutes;
      lastGroup.gapMinutes += gap;
      lastGroup.gaps.push(gap);
      lastGroup.items.push(item);
      continue;
    }

    groups.push({
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      sleepMinutes,
      awakeMinutes: item.awakeMinutes,
      gapMinutes: 0,
      gaps: [],
      items: [item]
    });
  }

  return groups;
}

function getSleepMinutes(item: SleepTimelineItem) {
  if (item.durationMinutes) return item.durationMinutes;
  const end = item.endedAt ? new Date(item.endedAt).getTime() : Date.now();
  const start = new Date(item.startedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return 0;
  return Math.max(0, Math.round((end - start) / 60000) - item.awakeMinutes);
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}小时${rest}分` : `${hours}小时`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
