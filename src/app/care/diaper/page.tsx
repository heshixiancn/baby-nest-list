import { FeedingQuickRecord } from "@/components/FeedingQuickRecord";

export default function DiaperPage() {
  return (
    <main className="record-page-shell record-page-shell-compact">
      <FeedingQuickRecord initialMode="diaper" showModeSwitch={false} />
    </main>
  );
}
