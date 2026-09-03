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
import { getCareTrends, getSleepTimeline } from "@/lib/mysql";

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
  }
] as const;

export default async function HomePage() {
  const hasDatabaseConfig = hasCompletePrimaryDatabaseConfig();
  const babyReference = getBabyReference();
  const [countdown, prediction, trends, sleepTimeline] = await Promise.all([
    getHomeCountdown(),
    getCarePrediction(),
    getCareTrends(),
    getSleepTimeline()
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
        <section className="relative mx-auto mb-4 flex w-full max-w-[23rem] items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/50 px-3 py-3 text-center shadow-2xl shadow-slate-200/40 backdrop-blur-2xl">
          <div className="absolute inset-x-10 top-1/2 h-14 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200/30 via-indigo-200/35 to-pink-200/30 blur-xl" />
          <p className="relative whitespace-nowrap rounded-[1.15rem] border border-white/80 bg-white/40 px-5 py-3 font-mono text-[clamp(1.25rem,6.5vw,1.75rem)] font-medium tracking-[0.035em] text-slate-600 shadow-inner shadow-white/80 ring-1 ring-indigo-100/60 tabular-nums">
            <span className="mr-2 text-[0.62rem] font-semibold tracking-[0.22em] text-slate-400">BORN</span>
            {babyReference.ageLabel.replace(/^出生\s*/, "")}
          </p>
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
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/70">
                动态调整
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
              <PredictionCard
                title="推荐奶量"
                value={`${prediction.feeding.targetMl} ml`}
                meta={`${prediction.feeding.minMl}–${prediction.feeding.maxMl} ml`}
                tone="from-cyan-100/80 to-violet-100/80"
              />
              <PredictionCard
                title="下次喂养"
                value={formatPredictionRange(prediction.feeding.windowStartAt, prediction.feeding.windowEndAt)}
                meta={prediction.feeding.conflictsWithSleep ? "与睡眠区间可能重叠" : `约 ${formatMinutes(prediction.feeding.intervalMinutes)} 间隔`}
                tone="from-sky-100/80 to-emerald-100/80"
              />
              <PredictionCard
                title={prediction.status.isSleeping ? "预计醒来" : "预计入睡"}
                value={formatPredictionTime(
                  prediction.status.isSleeping
                    ? prediction.sleep.predictedEndAt
                    : prediction.sleep.predictedStartAt
                )}
                meta={`醒窗约 ${formatMinutes(prediction.sleep.wakeWindowMinutes)}`}
                tone="from-indigo-100/80 to-pink-100/80"
              />
              <PredictionCard
                title="睡眠结束"
                value={formatPredictionTime(prediction.sleep.predictedEndAt)}
                meta={`小睡约 ${formatMinutes(prediction.sleep.expectedNapMinutes)}`}
                tone="from-violet-100/80 to-sky-100/80"
              />
              <PredictionCard
                title="尿布提醒"
                value={formatPredictionTime(prediction.diaper.nextPeeAt)}
                meta={`尿${countdown.diaperPeeToday} · 便${countdown.diaperPoopToday}`}
                tone="from-teal-100/80 to-blue-100/80"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <MiniPrediction
                label="预计小睡"
                value={
                  prediction.status.isSleeping
                    ? `本次约到 ${formatPredictionTime(prediction.sleep.predictedEndAt)}`
                    : `${formatPredictionTime(prediction.sleep.predictedStartAt)}–${formatPredictionTime(
                        prediction.sleep.predictedEndAt
                      )}`
                }
              />
              <MiniPrediction
                label="排便参考"
                value={
                  prediction.diaper.nextPoopAt
                    ? formatPredictionTime(prediction.diaper.nextPoopAt)
                    : "继续观察"
                }
              />
              <MiniPrediction
                label="体温 / 体重"
                value={`${countdown.temperatureMeasuredToday ? "体温已测" : "体温未测"} · ${
                  countdown.weightMeasuredToday ? "体重已测" : "体重未测"
                }`}
              />
            </div>
          </div>
          <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-sky-50/70 via-white/55 to-pink-50/70 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-2xl">
            <div className="absolute -left-12 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-cyan-200/25 blur-3xl" />
            <div className="absolute -right-10 top-1/3 h-36 w-36 rounded-full bg-pink-200/25 blur-3xl" />
            <div className="relative flex w-full items-stretch justify-center gap-5 px-2 xl:gap-7">
              <div className="flex min-h-48 items-center justify-center border-r border-white/70 pr-5 xl:pr-7">
                <span className="flex flex-col items-center gap-2.5 font-mono text-xl font-semibold leading-none text-slate-400" aria-label="BORN">
                  {["B", "O", "R", "N"].map((letter) => <span key={letter} aria-hidden="true">{letter}</span>)}
                </span>
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                {ageParts.map((part, index) => (
                  <div key={`${part.unit}-${index}`} className="flex min-h-48 min-w-0 flex-col items-center justify-center rounded-[1.75rem] border border-white/90 bg-white/40 px-3 py-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_30px_rgba(148,163,184,0.12)] ring-1 ring-indigo-100/50 backdrop-blur-2xl">
                    <span className="font-mono text-[clamp(2.25rem,4vw,4rem)] font-medium leading-none tracking-[-0.06em] text-slate-600 tabular-nums">{part.value}</span>
                    <span className="mt-3 text-sm font-medium tracking-[0.18em] text-slate-400">{part.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CareTrendsDashboard
          trends={trends}
          sleepTimeline={sleepTimeline}
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

function PredictionCard({
  title,
  value,
  meta,
  tone
}: {
  title: string;
  value: string;
  meta: string;
  tone: string;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-white/80 bg-gradient-to-br ${tone} p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-2xl`}
    >
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="apple-hello-text mt-2 text-2xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{meta}</p>
    </div>
  );
}

function MiniPrediction({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-white/45 px-4 py-3 ring-1 ring-white/70">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="apple-hello-text mt-1 text-lg">{value}</p>
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
  if (matches.length === 1) return [matches[0], { value: "00", unit: matches[0].unit === "岁" ? "个月" : "小时" }];
  return [{ value: "--", unit: "年龄" }, { value: "--", unit: "" }];
}
