import { HomeActionGrid } from "@/components/HomeActionGrid";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CareTrendsDashboard } from "@/components/CareTrendsDashboard";
import {
  getPrimaryDatabaseConfigError,
  getPrimaryDatabaseLabel,
  hasCompletePrimaryDatabaseConfig
} from "@/lib/data-store";
import { getBabyReference } from "@/lib/baby-reference";
import { getHomeCountdown } from "@/lib/care-countdown";
import { getCarePrediction } from "@/lib/care-prediction";
import {
  getCareTrends,
  getRecentFeedingHistory,
  getSleepTimeline
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

const recordActions = [
  {
    href: "/care/feeding",
    label: "喂养",
    icon: "🍼",
    hint: "feeding",
    tone: "siri-feeding",
    motion: "siri-motion-gentle",
    delay: "0ms"
  },
  {
    href: "/care/diaper",
    label: "尿布",
    icon: "💩",
    hint: "diaper",
    tone: "siri-weight",
    motion: "siri-motion-calm",
    delay: "120ms"
  },
  {
    href: "/care/temperature",
    label: "体温",
    icon: "🌡️",
    hint: "temperature",
    tone: "siri-temperature",
    motion: "siri-motion-warm",
    delay: "240ms"
  },
  {
    href: "/care/weight",
    label: "体重",
    icon: "⚖️",
    hint: "weight",
    tone: "siri-weight",
    motion: "siri-motion-calm",
    delay: "360ms"
  },
  {
    href: "/care/sleep",
    label: "睡眠",
    icon: "🌙",
    hint: "sleep",
    tone: "siri-sleep",
    motion: "siri-motion-dream",
    delay: "480ms"
  },
  {
    href: "/care/medication",
    label: "用药",
    icon: "💊",
    hint: "medication",
    tone: "siri-feeding",
    motion: "siri-motion-gentle",
    delay: "600ms"
  }
] as const;

export default async function HomePage() {
  const hasDatabaseConfig = hasCompletePrimaryDatabaseConfig();
  const babyReference = getBabyReference();
  const [countdown, prediction, trends, sleepTimeline, feedingHistory] =
    await Promise.all([
      getHomeCountdown(),
      getCarePrediction(),
      getCareTrends(5000),
      getSleepTimeline(3000),
      getRecentFeedingHistory(5000)
    ]);
  const ageParts = splitAgeLabel(babyReference.ageLabel);

  return (
    <main className="page-shell relative min-h-[calc(100vh-9rem)] overflow-hidden pt-4">
      <AutoRefresh intervalMs={30000} />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-2 h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_35%_30%,rgba(255,255,255,0.65),transparent_30%),linear-gradient(135deg,rgba(125,211,252,0.24),rgba(244,114,182,0.18),rgba(45,212,191,0.2))] blur-3xl" />
        <div className="absolute bottom-20 right-2 h-44 w-44 rounded-full bg-gradient-to-br from-blue-200/25 to-purple-200/30 blur-3xl" />
      </div>

      <div className="flex flex-col pt-4 md:hidden">
        <section className="relative mx-auto mb-4 flex w-[86%] max-w-[20.5rem] items-stretch overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/50 p-2.5 text-center shadow-2xl shadow-slate-200/40 backdrop-blur-2xl">
          <div className="absolute inset-6 rounded-full bg-gradient-to-r from-cyan-200/25 via-indigo-200/30 to-pink-200/25 blur-xl" />
          <div className="relative flex w-full items-stretch gap-2">
            <div className="flex w-10 shrink-0 items-center justify-center border-r border-white/80 pr-2">
              <span
                className="flex flex-col items-center gap-1 font-mono text-[0.68rem] font-semibold leading-none text-slate-400"
                aria-label="BORN"
              >
                {["B", "O", "R", "N"].map((letter) => (
                  <span key={letter} aria-hidden="true">
                    {letter}
                  </span>
                ))}
              </span>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              {ageParts.map((part, index) => (
                <div
                  key={`${part.unit}-mobile-${index}`}
                  className="flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center rounded-[1.3rem] border border-white/90 bg-white/40 px-2 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_8px_20px_rgba(148,163,184,0.1)] ring-1 ring-indigo-100/50 backdrop-blur-2xl"
                >
                  <span className="font-mono text-[1.8rem] font-medium leading-none tracking-[-0.06em] text-slate-600 tabular-nums">
                    {part.value}
                  </span>
                  <span className="mt-2 text-[0.68rem] font-medium tracking-[0.14em] text-slate-400">
                    {part.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HomeActionGrid actions={recordActions} countdown={countdown} />
      </div>

      <div className="hidden space-y-4 md:block xl:h-[calc(100vh-8rem)] xl:min-h-[45rem]">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-2xl shadow-slate-200/50 backdrop-blur-2xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  Today
                </p>
                <h1 className="apple-hello-text mt-2 text-4xl">今日预测</h1>
              </div>
              <span className="text-xs text-slate-500">北京时间</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <PredictionPanel
                label="下次喂养"
                icon="🍼"
                tone="from-cyan-100/75 to-emerald-100/75"
                value={formatPredictionRange(
                  prediction.feeding.windowStartAt,
                  prediction.feeding.windowEndAt
                )}
                detail={`建议 ${prediction.feeding.targetMl} ml · 范围 ${prediction.feeding.minMl}–${prediction.feeding.maxMl} ml`}
                foot={
                  prediction.feeding.conflictsWithSleep
                    ? "可能与睡眠重叠"
                    : `约 ${formatMinutes(prediction.feeding.intervalMinutes)} 后`
                }
              />
              <PredictionPanel
                label={prediction.status.isSleeping ? "预计醒来" : "预计入睡"}
                icon="🌙"
                tone="from-indigo-100/75 to-pink-100/75"
                value={formatPredictionTime(
                  prediction.status.isSleeping
                    ? prediction.sleep.predictedEndAt
                    : prediction.sleep.predictedStartAt
                )}
                detail={
                  prediction.status.isSleeping
                    ? `本次预计睡 ${formatMinutes(prediction.sleep.expectedNapMinutes)}`
                    : `预计 ${formatPredictionTime(prediction.sleep.predictedEndAt)} 醒来`
                }
                foot={`醒窗约 ${formatMinutes(prediction.sleep.wakeWindowMinutes)}`}
              />
              <PredictionPanel
                label="下次尿布"
                icon="💩"
                tone="from-sky-100/75 to-cyan-100/75"
                value={formatPredictionTime(prediction.diaper.nextPeeAt)}
                detail={`今日尿 ${countdown.diaperPeeToday} 次 · 便 ${countdown.diaperPoopToday} 次`}
                foot={`排便参考 ${prediction.diaper.nextPoopAt ? formatPredictionTime(prediction.diaper.nextPoopAt) : "继续观察"}`}
              />
              <div className="flex min-h-[9rem] flex-col justify-between rounded-[1.5rem] border border-white/80 bg-gradient-to-br from-rose-50/80 to-indigo-50/80 p-4 shadow-sm ring-1 ring-white/70">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-600">
                    今日测量
                  </p>
                  <span className="text-xl" aria-hidden="true">
                    🌡️
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MeasureStatus
                    label="体温"
                    measured={countdown.temperatureMeasuredToday}
                  />
                  <MeasureStatus
                    label="体重"
                    measured={countdown.weightMeasuredToday}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-sky-50/70 via-white/55 to-pink-50/70 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-2xl">
            <div className="absolute -left-12 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-cyan-200/25 blur-3xl" />
            <div className="absolute -right-10 top-1/3 h-36 w-36 rounded-full bg-pink-200/25 blur-3xl" />
            <div className="relative flex w-full items-stretch justify-center gap-5 px-2 xl:gap-7">
              <div className="flex min-h-48 items-center justify-center border-r border-white/70 pr-5 xl:pr-7">
                <span
                  className="flex flex-col items-center gap-2.5 font-mono text-xl font-semibold leading-none text-slate-400"
                  aria-label="BORN"
                >
                  {["B", "O", "R", "N"].map((letter) => (
                    <span key={letter} aria-hidden="true">
                      {letter}
                    </span>
                  ))}
                </span>
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                {ageParts.map((part, index) => (
                  <div
                    key={`${part.unit}-${index}`}
                    className="flex min-h-48 min-w-0 flex-col items-center justify-center rounded-[1.75rem] border border-white/90 bg-white/40 px-3 py-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_30px_rgba(148,163,184,0.12)] ring-1 ring-indigo-100/50 backdrop-blur-2xl"
                  >
                    <span className="font-mono text-[clamp(2.25rem,4vw,4rem)] font-medium leading-none tracking-[-0.06em] text-slate-600 tabular-nums">
                      {part.value}
                    </span>
                    <span className="mt-3 text-sm font-medium tracking-[0.18em] text-slate-400">
                      {part.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CareTrendsDashboard
          trends={trends}
          sleepTimeline={sleepTimeline}
          feedingHistory={feedingHistory}
          compact
        />
      </div>

      {!hasDatabaseConfig ? (
        <section className="mx-auto mt-8 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">还没有配置 MySQL</p>
          <p className="mt-1">
            当前主数据源是 {getPrimaryDatabaseLabel()}。
            {getPrimaryDatabaseConfigError()}
          </p>
        </section>
      ) : null}
    </main>
  );
}

function PredictionPanel({
  label,
  icon,
  tone,
  value,
  detail,
  foot
}: {
  label: string;
  icon: string;
  tone: string;
  value: string;
  detail: string;
  foot: string;
}) {
  return (
    <div
      className={`flex min-h-[9rem] min-w-0 flex-col justify-between rounded-[1.5rem] border border-white/80 bg-gradient-to-br ${tone} p-4 shadow-sm ring-1 ring-white/70`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <span className="text-xl" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="font-mono text-[clamp(1.3rem,2vw,2rem)] leading-tight tracking-tight text-slate-700 tabular-nums">
        {value}
      </p>
      <div>
        <p className="text-xs font-medium text-slate-600">{detail}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{foot}</p>
      </div>
    </div>
  );
}

function MeasureStatus({
  label,
  measured
}: {
  label: string;
  measured: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/65 px-3 py-2.5 ring-1 ring-white/80">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 text-base font-semibold ${measured ? "text-emerald-700" : "text-slate-600"}`}
      >
        {measured ? "已测" : "未测"}
      </p>
    </div>
  );
}

function formatPredictionTime(iso: string | null) {
  if (!iso) return "待记录";
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai"
  });
}

function formatPredictionRange(start: string | null, end: string | null) {
  if (!start || !end) return "待记录";
  return `${formatPredictionTime(start)}–${formatPredictionTime(end)}`;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}小时${rest}分` : `${hours}小时`;
}

function splitAgeLabel(label: string) {
  const normalized = label.replace(/^出生\s*/, "");
  const matches = [...normalized.matchAll(/(\d+)\s*(岁|个月|天|小时)/g)]
    .slice(0, 2)
    .map((match) => ({ value: match[1], unit: match[2] }));
  if (matches.length === 2) return matches;
  if (matches.length === 1)
    return [
      matches[0],
      { value: "00", unit: matches[0].unit === "岁" ? "个月" : "小时" }
    ];
  return [
    { value: "--", unit: "年龄" },
    { value: "--", unit: "" }
  ];
}
