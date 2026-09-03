import { CareTrendsDashboard } from "@/components/CareTrendsDashboard";
import { CareRecentRecords } from "@/components/CareRecentRecords";
import { SleepChart } from "@/components/SleepChart";
import { HealthMetricChart } from "@/components/HealthMetricChart";
import { FeedingChart } from "@/components/FeedingChart";
import { DiaperChart } from "@/components/DiaperChart";
import {
  getCareTrends,
  getRecentFeedingHistory,
  getRecentDiaperHistory,
  getRecentCareRecords,
  getSleepTimeline
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

export default async function HealthPage({ searchParams }: { searchParams: { type?: string } }) {
  const [trends, sleepTimeline, feedingTimeline, diaperTimeline, recentRecords] = await Promise.all([
    getCareTrends(500),
    getSleepTimeline(500),
    getRecentFeedingHistory(1000),
    getRecentDiaperHistory(1000),
    getRecentCareRecords()
  ]);
  const filteredRecords = searchParams.type ? recentRecords.filter((record) => record.type === searchParams.type) : recentRecords;
  const feedingChart = searchParams.type === "feeding" ? <FeedingChart items={feedingTimeline} /> : null;
  const diaperChart = searchParams.type === "diaper" ? <DiaperChart items={diaperTimeline} /> : null;
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
        {feedingChart}
        {diaperChart}
        <CareRecentRecords records={filteredRecords} />
      </div>
      <main className="page-shell md:hidden">
        <div className="mt-4">
          {searchParams.type === "sleep" ? <SleepChart items={sleepTimeline} /> : null}
          {mobileMetricChart}
          {diaperChart}
          {feedingChart}
          <CareRecentRecords records={filteredRecords} />
        </div>
      </main>
    </>
  );
}
