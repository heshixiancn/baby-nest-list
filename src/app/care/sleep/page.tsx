import { SleepRecordForm } from "@/components/SleepRecordForm";
import { getCarePrediction } from "@/lib/care-prediction";

export default async function SleepPage() {
  const prediction = await getCarePrediction();

  return <SleepRecordForm prediction={prediction.sleep} />;
}
