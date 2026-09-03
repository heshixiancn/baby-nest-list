import { FeedingQuickRecord } from "@/components/FeedingQuickRecord";
import { getFeedingRecommendation } from "@/lib/feeding-recommendation";

export const dynamic = "force-dynamic";

export default async function FeedingPage() {
  const recommendation = await getFeedingRecommendation();

  return (
    <main className="record-page-shell record-page-shell-compact">
      <FeedingQuickRecord recommendation={recommendation} showModeSwitch={false} />
    </main>
  );
}
