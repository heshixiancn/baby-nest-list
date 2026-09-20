import type { SleepRange } from "@/components/SleepChart";

type FeedingItem = {
  happenedAt: string;
  endedAt: string | null;
  feedingType: string;
  amountMl: number | null;
  durationMinutes: number | null;
};
type Bucket = {
  key: string;
  label: string;
  breast: number;
  bottle: number;
  formula: number;
};

const dayMs = 86400000;
const beijingOffsetMs = 8 * 60 * 60 * 1000;

export function DashboardFeedingCard({
  items,
  range
}: {
  items: FeedingItem[];
  range: SleepRange;
}) {
  const { records, buckets } = groupFeeding(items, range);
  const breast = records.filter((item) => item.feedingType === "母乳");
  const bottle = records.filter((item) => item.feedingType === "瓶喂");
  const formula = records.filter((item) => item.feedingType === "配方奶");
  const breastMinutes = breast.reduce(
    (sum, item) => sum + (item.durationMinutes ?? 0),
    0
  );
  const bottleMl = bottle.reduce((sum, item) => sum + (item.amountMl ?? 0), 0);
  const formulaMl = formula.reduce(
    (sum, item) => sum + (item.amountMl ?? 0),
    0
  );
  const max = Math.max(
    1,
    ...buckets.map((bucket) => bucket.breast + bucket.bottle + bucket.formula)
  );
  const barWidth = Math.min(24, Math.max(5, (450 / buckets.length) * 0.6));

  return (
    <article className="min-w-0 rounded-[1.5rem] border border-white/80 bg-white/65 p-3 shadow-lg shadow-slate-200/30 backdrop-blur-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-slate-600">喂养</h2>
          <span className="font-mono text-xl text-slate-700 tabular-nums">
            {records.length} 次
          </span>
        </div>
        <span className="rounded-full bg-white/75 px-2 py-1 text-[11px] text-slate-500">
          按{range === "日" ? "小时" : range === "年" ? "月" : "天"}统计次数
        </span>
      </div>
      {records.length ? (
        <>
          <div className="mt-2 rounded-2xl bg-white/45 px-2 py-1 ring-1 ring-white/70">
            <div
              className="flex h-[70px] items-end gap-0.5 border-b border-slate-200/70 px-1"
              role="img"
              aria-label={`喂养${range}视图：母乳亲喂${breast.length}次，瓶喂母乳${bottle.length}次，配方奶${formula.length}次`}
            >
              {buckets.map((bucket) => {
                const total = bucket.breast + bucket.bottle + bucket.formula;
                return (
                  <div
                    key={bucket.key}
                    className="flex h-full min-w-0 flex-1 items-end justify-center"
                    aria-label={`${bucket.label}：亲喂${bucket.breast}次，瓶喂母乳${bucket.bottle}次，配方奶${bucket.formula}次`}
                  >
                    <div
                      className="flex w-full flex-col-reverse overflow-hidden rounded-t-md"
                      style={{
                        maxWidth: `${barWidth}px`,
                        minWidth: total ? "5px" : "0",
                        height: `${total ? Math.max(5, (total / max) * 100) : 0}%`
                      }}
                    >
                      <div
                        className="bg-violet-400"
                        style={{
                          height: `${total ? (bucket.breast / total) * 100 : 0}%`
                        }}
                      />
                      <div
                        className="bg-cyan-300"
                        style={{
                          height: `${total ? (bucket.bottle / total) * 100 : 0}%`
                        }}
                      />
                      <div
                        className="bg-amber-300"
                        style={{
                          height: `${total ? (bucket.formula / total) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>{buckets[0].label}</span>
              <span>{buckets.at(-1)!.label}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-400" />
              亲喂 {breast.length}次 · {formatMinutes(breastMinutes)}
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-300" />
              瓶喂母乳 {bottle.length}次 · {Math.round(bottleMl)}ml
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />
              配方奶 {formula.length}次 · {Math.round(formulaMl)}ml
            </span>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-2xl bg-white/40 py-7 text-center text-sm text-slate-400">
          该时段暂无喂养记录
        </p>
      )}
    </article>
  );
}

function groupFeeding(items: FeedingItem[], range: SleepRange) {
  const now = Date.now();
  const today = dateKey(now);
  const todayStart = new Date(`${today}T00:00:00+08:00`).getTime();
  const days = range === "周" ? 7 : range === "月" ? 30 : 365;
  const start = range === "日" ? todayStart : todayStart - (days - 1) * dayMs;
  const records = items.filter((item) => {
    const time = new Date(item.happenedAt).getTime();
    return Number.isFinite(time) && time >= start && time <= now + 60000;
  });
  const buckets: Bucket[] = [];
  const empty = (key: string, label: string) => ({
    key,
    label,
    breast: 0,
    bottle: 0,
    formula: 0
  });
  if (range === "日") {
    for (let index = 0; index < 12; index++)
      buckets.push(
        empty(
          `${today}T${String(index * 2).padStart(2, "0")}`,
          `${String(index * 2).padStart(2, "0")}:00`
        )
      );
  } else if (range === "年") {
    let month = dateKey(start).slice(0, 7);
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
    if (record.feedingType === "母乳") bucket.breast++;
    else if (record.feedingType === "瓶喂") bucket.bottle++;
    else if (record.feedingType === "配方奶") bucket.formula++;
  }
  return { records, buckets };
}

function dateKey(time: number) {
  return new Date(time + beijingOffsetMs).toISOString().slice(0, 10);
}
function formatMinutes(value: number) {
  const minutes = Math.round(value);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分` : ""}`
    : `${minutes}分钟`;
}
