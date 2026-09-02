import { CareTrendsDashboard } from "@/components/CareTrendsDashboard";
import { CareRecentRecords } from "@/components/CareRecentRecords";
import { SleepChart } from "@/components/SleepChart";
import {
  getCareTrends,
  getRecentCareRecords,
  getSleepTimeline
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

export default async function HealthPage({ searchParams }: { searchParams: { type?: string } }) {
  const [trends, sleepTimeline, recentRecords] = await Promise.all([
    getCareTrends(),
    getSleepTimeline(500),
    getRecentCareRecords()
  ]);
  const filteredRecords = searchParams.type ? recentRecords.filter((record) => record.type === searchParams.type) : recentRecords;
  const todayRecords = filteredRecords.filter((record) => new Date(record.happenedAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) === new Date().toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }));
  const diaperPee = todayRecords.filter((record) => record.type === "diaper" && (record.title.includes("尿") || record.title.includes("尿布"))).length;
  const diaperPoop = todayRecords.filter((record) => record.type === "diaper" && record.title.includes("便")).length;
  return (
    <>
      <div className="hidden space-y-5 md:block">
        <CareTrendsDashboard trends={trends} sleepTimeline={sleepTimeline} />
        <CareRecentRecords records={filteredRecords} />
      </div>
      <main className="page-shell md:hidden">
        <div className="mt-4">
          {searchParams.type === "sleep" ? <SleepChart items={sleepTimeline} /> : null}
          {searchParams.type === "diaper" ? <div className="mb-3 rounded-2xl bg-white/60 px-4 py-3 text-center text-sm text-slate-600">今日排尿 {diaperPee} 次 · 排便 {diaperPoop} 次</div> : null}
          <CareRecentRecords records={filteredRecords} />
        </div>
      </main>
    </>
  );
}
