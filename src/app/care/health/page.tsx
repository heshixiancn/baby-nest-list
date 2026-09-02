import { CareTrendsDashboard } from "@/components/CareTrendsDashboard";
import { CareRecentRecords } from "@/components/CareRecentRecords";
import {
  getCareTrends,
  getRecentCareRecords,
  getSleepTimeline
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [trends, sleepTimeline, recentRecords] = await Promise.all([
    getCareTrends(),
    getSleepTimeline(),
    getRecentCareRecords()
  ]);
  return (
    <>
      <div className="hidden space-y-5 md:block">
        <CareTrendsDashboard trends={trends} sleepTimeline={sleepTimeline} />
        <CareRecentRecords records={recentRecords} />
      </div>
      <main className="page-shell md:hidden">
        <section className="rounded-[2rem] border border-white/80 bg-white/60 p-5 text-center shadow-xl shadow-slate-200/40 backdrop-blur-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
            Analytics
          </p>
          <h1 className="apple-hello-text mt-2 text-3xl">成长分析</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            报表和趋势分析更适合在电脑端查看。手机端先专注快速记录，数据记好后，电脑端会自动汇总成图表。
          </p>
        </section>
      </main>
    </>
  );
}
