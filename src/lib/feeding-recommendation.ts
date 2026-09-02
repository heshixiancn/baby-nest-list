import { getCarePrediction } from "@/lib/care-prediction";

export interface FeedingRecommendation {
  minMl: number;
  maxMl: number;
  targetMl: number;
  source: "age" | "history";
  reason: string;
}

export async function getFeedingRecommendation(): Promise<FeedingRecommendation> {
  const prediction = await getCarePrediction();
  return {
    minMl: prediction.feeding.minMl,
    maxMl: prediction.feeding.maxMl,
    targetMl: prediction.feeding.targetMl,
    source: prediction.feeding.confidence === "low" ? "age" : "history",
    reason: prediction.feeding.reason
  };
}
