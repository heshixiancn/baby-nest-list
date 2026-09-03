import { CareTrendsDashboard } from "@/components/CareTrendsDashboard";
import { CareRecentRecords } from "@/components/CareRecentRecords";
import { SleepChart } from "@/components/SleepChart";
import { HealthMetricChart } from "@/components/HealthMetricChart";
import {
  getCareTrends,
  getRecentCareRecords,
  getSleepTimeline
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

export default async function HealthPage({ searchParams }: { searchParams: { type?: string } }) {
  const [trends, sleepTimeline, recentRecords] = await Promise.all([
    getCareTrends(500),
    getSleepTimeline(500),
    getRecentCareRecords()
  ]);
  const filteredRecords = searchParams.type ? recentRecords.filter((record) => record.type === searchParams.type) : recentRecords;
  const todayRecords = filteredRecords.filter((record) => new Date(record.happenedAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) === new Date().toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }));
  const diaperPee = todayRecords.filter((record) => record.type === "diaper" && (record.title.includes("尿") || record.title.includes("尿布"))).length;
  const diaperPoop = todayRecords.filter((record) => record.type === "diaper" && record.title.includes("便")).length;
  const breastfeeding = todayRecords.filter((record) => record.type === "feeding" && record.title === "母乳");
  const breastfeedingMinutes = breastfeeding.reduce((sum, record) => sum + Number(record.detail.match(/(\d+)分钟/)?.[1] ?? 0), 0);
  const bottleMl = todayRecords.filter((record) => record.type === "feeding" && (record.title === "瓶喂" || record.title === "配方奶")).reduce((sum, record) => sum + Number(record.detail.match(/([\d.]+)ml/)?.[1] ?? 0), 0);
  const feedingSummary = searchParams.type === "feeding" ? <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/60 p-3 text-center text-sm text-slate-600"><div>母乳 {breastfeeding.length} 次</div><div>总时长 {breastfeedingMinutes} 分钟</div><div>平均 {breastfeeding.length ? Math.round(breastfeedingMinutes / breastfeeding.length) : 0} 分钟</div><div>瓶喂 {bottleMl} ml</div></div> : null;
  const metricChart = searchParams.type === "temperature"
    ? <HealthMetricChart kind="temperature" points={trends.temperature} />
    : searchParams.type === "weight"
      ? <HealthMetricChart kind="weight" points={trends.weight} />
      : null;
  const mobileMetricChart = searchParams.type === "temperature"
    ? <HealthMetricChart kind="temperature" points={trends.temperature} mobile />
    : searchParams.type === "weight"
      ? <HealthMetricChart kind="weight" points={trends.weight} mobile />
      : null;
  return (
    <>
      <div className="hidden space-y-5 md:block">
        {!searchParams.type ? <CareTrendsDashboard trends={trends} sleepTimeline={sleepTimeline} /> : null}
        {searchParams.type === "sleep" ? <SleepChart items={sleepTimeline} /> : metricChart}
        {feedingSummary}
        <CareRecentRecords records={filteredRecords} />
      </div>
      <main className="page-shell md:hidden">
        <div className="mt-4">
          {searchParams.type === "sleep" ? <SleepChart items={sleepTimeline} /> : null}
          {mobileMetricChart}
          {searchParams.type === "diaper" ? <div className="mb-3 rounded-2xl bg-white/60 px-4 py-3 text-center text-sm text-slate-600">今日排尿 {diaperPee} 次 · 排便 {diaperPoop} 次</div> : null}
          {feedingSummary}
          <CareRecentRecords records={filteredRecords} />
        </div>
      </main>
    </>
  );
}
