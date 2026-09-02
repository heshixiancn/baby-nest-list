import { getBabyReference } from "@/lib/baby-reference";
import {
  getOpenBreastfeedingRecord,
  getOpenSleepRecord,
  getRecentDiaperHistory,
  getRecentFeedingHistory,
  getSleepTimeline
} from "@/lib/mysql";

export interface CarePrediction {
  status: {
    isSleeping: boolean;
    sleepStartedAt: string | null;
    sleepPaused: boolean;
    isBreastfeeding: boolean;
    breastfeedingStartedAt: string | null;
  };
  feeding: {
    minMl: number;
    maxMl: number;
    targetMl: number;
    nextAt: string | null;
    windowStartAt: string | null;
    windowEndAt: string | null;
    conflictsWithSleep: boolean;
    intervalMinutes: number;
    confidence: "low" | "medium" | "high";
    reason: string;
  };
  sleep: {
    nextAt: string | null;
    predictedStartAt: string | null;
    startWindowStartAt: string | null;
    startWindowEndAt: string | null;
    predictedEndAt: string | null;
    wakeWindowMinutes: number;
    expectedNapMinutes: number;
    dailyHoursRange: string;
    confidence: "low" | "medium" | "high";
    reason: string;
  };
  diaper: {
    nextPeeAt: string | null;
    nextPoopAt: string | null;
    peeIntervalMinutes: number;
    poopIntervalMinutes: number | null;
    confidence: "low" | "medium" | "high";
    reason: string;
  };
}

export async function getCarePrediction(
  now = new Date()
): Promise<CarePrediction> {
  const baby = getBabyReference(now);
  const ageDays = baby.ageDays ?? 0;
  const ageBase = getAgeBaseline(ageDays);

  try {
    const [feedings, sleeps, diapers] = await Promise.all([
      getRecentFeedingHistory(32),
      getSleepTimeline(32),
      getRecentDiaperHistory(60)
    ]);
    const [openSleep, openBreastfeeding] = await Promise.all([
      getOpenSleepRecord(),
      getOpenBreastfeedingRecord()
    ]);
    const status = {
      isSleeping: Boolean(openSleep && !openSleep.pauseStartedAt),
      sleepStartedAt: openSleep?.startedAt ?? null,
      sleepPaused: Boolean(openSleep?.pauseStartedAt),
      isBreastfeeding: Boolean(openBreastfeeding),
      breastfeedingStartedAt: openBreastfeeding?.startedAt ?? null
    };

    const sleepPrediction = predictSleep(ageBase, sleeps, feedings, status);
    const feedingPrediction = predictFeeding(
      ageBase,
      feedings,
      sleeps,
      status,
      sleepPrediction,
      now
    );

    return {
      status,
      feeding: feedingPrediction,
      sleep: sleepPrediction,
      diaper: predictDiaper(ageBase, diapers, now)
    };
  } catch {
    return {
      status: {
        isSleeping: false,
        sleepStartedAt: null,
        sleepPaused: false,
        isBreastfeeding: false,
        breastfeedingStartedAt: null
      },
      feeding: {
        ...ageBase.feeding,
        nextAt: null,
        windowStartAt: null,
        windowEndAt: null,
        conflictsWithSleep: false,
        confidence: "low",
        reason: "暂时无法读取历史记录，先按当前日龄估算。"
      },
      sleep: {
        ...ageBase.sleep,
        nextAt: null,
        predictedStartAt: null,
        startWindowStartAt: null,
        startWindowEndAt: null,
        predictedEndAt: null,
        confidence: "low",
        reason: "暂时无法读取历史记录，先按当前日龄估算。"
      },
      diaper: {
        ...ageBase.diaper,
        nextPeeAt: null,
        nextPoopAt: null,
        confidence: "low",
        reason: "暂时无法读取历史记录，先按当前日龄估算。"
      }
    };
  }
}

function predictFeeding(
  ageBase: AgeBaseline,
  feedings: Awaited<ReturnType<typeof getRecentFeedingHistory>>,
  sleeps: Awaited<ReturnType<typeof getSleepTimeline>>,
  status: CarePrediction["status"],
  sleepPrediction: CarePrediction["sleep"],
  now: Date
): CarePrediction["feeding"] {
  const completed = feedings
    .filter((item) => new Date(item.happenedAt).getTime() <= now.getTime())
    .filter((item) => isReliableFeedingForPrediction(item))
    .sort(
      (a, b) =>
        new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime()
    );
  const amountSamples = completed
    .map((item) => item.amountMl)
    .filter((value): value is number => typeof value === "number" && value > 0)
    .slice(-10);
  const intervalSamples = getIntervalMinutes(
    completed.map((item) => item.happenedAt)
  ).slice(-10);
  const historyAmount =
    amountSamples.length >= 3 ? median(amountSamples) : null;
  const historyInterval =
    intervalSamples.length >= 3 ? median(trimOutliers(intervalSamples)) : null;

  const targetMl = roundToStep(
    clamp(
      historyAmount == null
        ? ageBase.feeding.targetMl
        : ageBase.feeding.targetMl * 0.35 + historyAmount * 0.65,
      ageBase.feeding.minMl,
      ageBase.feeding.maxMl
    ),
    5
  );
  const intervalMinutes = Math.round(
    clamp(
      historyInterval == null
        ? ageBase.feeding.intervalMinutes
        : ageBase.feeding.intervalMinutes * 0.35 + historyInterval * 0.65,
      ageBase.feeding.minIntervalMinutes,
      ageBase.feeding.maxIntervalMinutes
    )
  );
  const latestAt = completed.at(-1)?.happenedAt ?? null;
  const rawNextAt = latestAt ? addMinutes(latestAt, intervalMinutes) : null;
  const nextAt = avoidSleepingWindow(rawNextAt, sleeps);
  const intervalSpread = predictionSpread(
    intervalSamples,
    intervalSamples.length >= 5 ? 20 : 40,
    15,
    75
  );
  const windowStartAt = nextAt ? addMinutes(nextAt, -intervalSpread) : null;
  const windowEndAt = nextAt ? addMinutes(nextAt, intervalSpread) : null;
  const conflictsWithSleep = rangesOverlap(
    windowStartAt,
    windowEndAt,
    sleepPrediction.startWindowStartAt ?? sleepPrediction.predictedStartAt,
    sleepPrediction.predictedEndAt
  );

  return {
    minMl: Math.max(ageBase.feeding.minMl, targetMl - 10),
    maxMl: Math.min(ageBase.feeding.maxMl, targetMl + 10),
    targetMl,
    intervalMinutes,
    nextAt,
    windowStartAt,
    windowEndAt,
    conflictsWithSleep,
    confidence:
      amountSamples.length >= 6 && intervalSamples.length >= 4
        ? "high"
        : amountSamples.length >= 3 || intervalSamples.length >= 3
          ? "medium"
          : "low",
    reason:
      amountSamples.length >= 3 || intervalSamples.length >= 3
        ? conflictsWithSleep
          ? "喂养预测区间与睡眠区间重叠，请结合饥饿信号和医生建议判断，不自动修改时间。"
          : status.isSleeping
          ? "宝宝正在睡眠，喂养提醒已顺延到预计醒来后。"
          : `结合日龄和最近 ${Math.max(amountSamples.length, intervalSamples.length)} 条喂养记录动态估算。`
        : "记录还不多，先按当前日龄估算；多记录几次后会自动贴近宝宝习惯。"
  };
}

function predictSleep(
  ageBase: AgeBaseline,
  sleeps: Awaited<ReturnType<typeof getSleepTimeline>>,
  feedings: Awaited<ReturnType<typeof getRecentFeedingHistory>>,
  status: CarePrediction["status"]
): CarePrediction["sleep"] {
  const endedSleeps = sleeps
    .filter((item) => item.startedAt && item.endedAt)
    .sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );
  const sleepDurations = endedSleeps
    .map((item) => item.durationMinutes ?? 0)
    .filter((value) => isReliableSleepDuration(value, ageBase))
    .slice(-10);
  const wakeWindows = endedSleeps
    .slice(0, -1)
    .map((item, index) => {
      const endedAt = item.endedAt ? new Date(item.endedAt).getTime() : 0;
      const nextStart = new Date(endedSleeps[index + 1].startedAt).getTime();
      return Math.round((nextStart - endedAt) / 60000);
    })
    .filter(
      (value) =>
        value >= 15 && value <= ageBase.sleep.maxWakeWindowMinutes * 1.8
    )
    .slice(-8);
  const latestSleepEnd = endedSleeps.at(-1)?.endedAt ?? null;
  const historyWakeWindow =
    wakeWindows.length >= 2 ? median(trimOutliers(wakeWindows)) : null;
  const wakeWindowMinutes = Math.round(
    clamp(
      historyWakeWindow == null
        ? ageBase.sleep.wakeWindowMinutes
        : ageBase.sleep.wakeWindowMinutes * 0.45 + historyWakeWindow * 0.55,
      ageBase.sleep.minWakeWindowMinutes,
      ageBase.sleep.maxWakeWindowMinutes
    )
  );
  const expectedNapMinutes = Math.round(
    clamp(
      sleepDurations.length >= 3
        ? ageBase.sleep.expectedNapMinutes * 0.45 +
            median(trimOutliers(sleepDurations)) * 0.55
        : ageBase.sleep.expectedNapMinutes,
      ageBase.sleep.minNapMinutes,
      ageBase.sleep.maxNapMinutes
    )
  );
  // Wake windows start when the previous sleep ends. A feeding during the
  // wake window must not restart the wake-window clock.
  const fallbackFeeding = feedings
    .map((item) => item.happenedAt)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .at(-1);
  const anchors = [latestSleepEnd ?? fallbackFeeding]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);

  const predictedStartAt =
    status.isSleeping || status.sleepPaused
      ? null
      : anchors.length
        ? new Date(
            Math.max(...anchors) + wakeWindowMinutes * 60000
          ).toISOString()
        : null;
  const wakeSpread = predictionSpread(
    wakeWindows,
    wakeWindows.length >= 5 ? 20 : 40,
    15,
    90
  );
  const startWindowStartAt = predictedStartAt
    ? addMinutes(predictedStartAt, -wakeSpread)
    : null;
  const startWindowEndAt = predictedStartAt
    ? addMinutes(predictedStartAt, wakeSpread)
    : null;
  const predictedEndAt =
    status.sleepStartedAt && (status.isSleeping || status.sleepPaused)
      ? addMinutes(status.sleepStartedAt, expectedNapMinutes)
      : predictedStartAt
        ? addMinutes(predictedStartAt, expectedNapMinutes)
        : null;

  return {
    nextAt: predictedStartAt,
    predictedStartAt,
    startWindowStartAt,
    startWindowEndAt,
    predictedEndAt,
    wakeWindowMinutes,
    expectedNapMinutes,
    dailyHoursRange: ageBase.sleep.dailyHoursRange,
    confidence:
      wakeWindows.length >= 4 && sleepDurations.length >= 4
        ? "high"
        : wakeWindows.length >= 2 || sleepDurations.length >= 3
          ? "medium"
          : "low",
    reason:
      wakeWindows.length >= 2 || sleepDurations.length >= 3
        ? status.isSleeping
          ? "宝宝正在睡眠，暂不预测新的入睡时间，只估算本次醒来时间。"
          : "结合最近睡眠时长、醒窗和当前日龄动态估算。"
        : "睡眠样本还少，先按日龄醒窗估算。"
  };
}

function predictDiaper(
  ageBase: AgeBaseline,
  diapers: Awaited<ReturnType<typeof getRecentDiaperHistory>>,
  now: Date
): CarePrediction["diaper"] {
  const sorted = diapers
    .filter((item) => new Date(item.happenedAt).getTime() <= now.getTime())
    .sort(
      (a, b) =>
        new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime()
    );
  const peeTimes = mergeNearbyEvents(
    sorted
      .filter((item) => item.diaperType.includes("尿"))
      .map((item) => item.happenedAt),
    10
  );
  const poopTimes = mergeNearbyEvents(
    sorted
      .filter((item) => item.diaperType.includes("便"))
      .map((item) => item.happenedAt),
    15
  );
  const peeIntervals = getIntervalMinutes(peeTimes)
    .filter((value) => value >= 20 && value <= 8 * 60)
    .slice(-12);
  const poopIntervals = getIntervalMinutes(poopTimes)
    .filter((value) => value >= 60 && value <= 72 * 60)
    .slice(-8);
  const peeIntervalMinutes = Math.round(
    clamp(
      peeIntervals.length >= 3
        ? ageBase.diaper.peeIntervalMinutes * 0.35 +
            median(trimOutliers(peeIntervals)) * 0.65
        : ageBase.diaper.peeIntervalMinutes,
      ageBase.diaper.minPeeIntervalMinutes,
      ageBase.diaper.maxPeeIntervalMinutes
    )
  );
  const poopIntervalMinutes =
    poopIntervals.length >= 2
      ? Math.round(
          clamp(
            ageBase.diaper.poopIntervalMinutes * 0.35 +
              median(trimOutliers(poopIntervals)) * 0.65,
            ageBase.diaper.minPoopIntervalMinutes,
            ageBase.diaper.maxPoopIntervalMinutes
          )
        )
      : ageBase.diaper.poopIntervalMinutes;

  return {
    nextPeeAt: peeTimes.at(-1)
      ? addMinutes(peeTimes.at(-1)!, peeIntervalMinutes)
      : null,
    nextPoopAt:
      poopTimes.at(-1) && poopIntervalMinutes
        ? addMinutes(poopTimes.at(-1)!, poopIntervalMinutes)
        : null,
    peeIntervalMinutes,
    poopIntervalMinutes,
    confidence:
      peeIntervals.length >= 5 || poopIntervals.length >= 3 ? "medium" : "low",
    reason:
      peeIntervals.length >= 3 || poopIntervals.length >= 2
        ? "结合最近尿布间隔和日龄范围估算。"
        : "尿布记录还少，先按新生儿常见范围提醒。"
  };
}

function isReliableFeedingForPrediction(
  item: Awaited<ReturnType<typeof getRecentFeedingHistory>>[number]
) {
  if (item.feedingType !== "母乳") return true;
  if (!item.durationMinutes) return true;
  return item.durationMinutes <= 45;
}

function isReliableSleepDuration(minutes: number, ageBase: AgeBaseline) {
  return minutes >= 10 && minutes <= ageBase.sleep.maxNapMinutes * 1.6;
}

type AgeBaseline = ReturnType<typeof getAgeBaseline>;

function getAgeBaseline(ageDays: number) {
  if (ageDays <= 1) {
    return baseline(
      5,
      15,
      10,
      150,
      120,
      180,
      60,
      30,
      120,
      "14–17 小时",
      180,
      90,
      240,
      480,
      240,
      1440,
      2880
    );
  }
  if (ageDays <= 3) {
    return baseline(
      20,
      40,
      30,
      150,
      120,
      180,
      75,
      40,
      150,
      "14–17 小时",
      180,
      60,
      240,
      360,
      180,
      720,
      2880
    );
  }
  if (ageDays <= 6) {
    return baseline(
      35,
      60,
      45,
      150,
      120,
      210,
      75,
      45,
      150,
      "14–17 小时",
      180,
      60,
      240,
      300,
      120,
      720,
      2880
    );
  }
  if (ageDays <= 30) {
    return baseline(
      60,
      95,
      80,
      180,
      120,
      240,
      80,
      45,
      170,
      "14–17 小时",
      180,
      60,
      300,
      360,
      120,
      720,
      4320
    );
  }
  if (ageDays <= 90) {
    return baseline(
      90,
      150,
      120,
      210,
      150,
      270,
      95,
      45,
      180,
      "14–16 小时",
      210,
      75,
      360,
      720,
      180,
      1440,
      4320
    );
  }
  if (ageDays <= 180) {
    return baseline(
      120,
      210,
      165,
      240,
      180,
      330,
      140,
      50,
      240,
      "12–16 小时",
      240,
      90,
      420,
      900,
      180,
      1440,
      5760
    );
  }
  return baseline(
    150,
    240,
    190,
    270,
    210,
    360,
    180,
    60,
    300,
    "12–15 小时",
    270,
    120,
    480,
    1200,
    240,
    1440,
    5760
  );
}

function baseline(
  minMl: number,
  maxMl: number,
  targetMl: number,
  intervalMinutes: number,
  minIntervalMinutes: number,
  maxIntervalMinutes: number,
  wakeWindowMinutes: number,
  minWakeWindowMinutes: number,
  maxWakeWindowMinutes: number,
  dailyHoursRange: string,
  expectedNapMinutes: number,
  minNapMinutes: number,
  maxNapMinutes: number,
  peeIntervalMinutes: number,
  minPeeIntervalMinutes: number,
  maxPeeIntervalMinutes: number,
  poopIntervalMinutes: number
) {
  return {
    feeding: {
      minMl,
      maxMl,
      targetMl,
      intervalMinutes,
      minIntervalMinutes,
      maxIntervalMinutes
    },
    sleep: {
      wakeWindowMinutes,
      minWakeWindowMinutes,
      maxWakeWindowMinutes,
      expectedNapMinutes,
      minNapMinutes,
      maxNapMinutes,
      dailyHoursRange
    },
    diaper: {
      peeIntervalMinutes,
      minPeeIntervalMinutes,
      maxPeeIntervalMinutes,
      poopIntervalMinutes,
      minPoopIntervalMinutes: 120,
      maxPoopIntervalMinutes: Math.max(poopIntervalMinutes * 2, 1440)
    }
  };
}

function getIntervalMinutes(times: string[]) {
  const sorted = times
    .map((time) => new Date(time).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  return sorted
    .slice(1)
    .map((time, index) => Math.round((time - sorted[index]) / 60000))
    .filter((value) => value > 0);
}

function mergeNearbyEvents(times: string[], windowMinutes: number) {
  const sorted = times
    .map((time) => new Date(time).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const merged: number[] = [];

  for (const time of sorted) {
    const latest = merged.at(-1);
    if (latest && time - latest <= windowMinutes * 60000) continue;
    merged.push(time);
  }

  return merged.map((time) => new Date(time).toISOString());
}

function avoidSleepingWindow(
  iso: string | null,
  sleeps: Awaited<ReturnType<typeof getSleepTimeline>>
) {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return iso;

  const overlappingSleep = sleeps.find((sleep) => {
    if (!sleep.startedAt || !sleep.endedAt) return false;
    const startedAt = new Date(sleep.startedAt).getTime();
    const endedAt = new Date(sleep.endedAt).getTime();
    return Number.isFinite(startedAt) && Number.isFinite(endedAt)
      ? time >= startedAt && time <= endedAt
      : false;
  });

  return overlappingSleep?.endedAt ?? iso;
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function trimOutliers(values: number[]) {
  if (values.length < 5) return values;
  const center = median(values);
  const mad = median(values.map((value) => Math.abs(value - center)));
  if (mad === 0) return values.filter((value) => value === center);
  const limit = 3.5 * 1.4826 * mad;
  return values.filter((value) => Math.abs(value - center) <= limit);
}

function predictionSpread(
  values: number[],
  fallback: number,
  minimum: number,
  maximum: number
) {
  const cleaned = trimOutliers(values);
  if (cleaned.length < 3) return fallback;
  const center = median(cleaned);
  const deviations = cleaned.map((value) => Math.abs(value - center));
  return Math.round(clamp(median(deviations) * 1.4826, minimum, maximum));
}

function rangesOverlap(
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null
) {
  if (!startA || !endA || !startB || !endB) return false;
  return (
    new Date(startA).getTime() <= new Date(endB).getTime() &&
    new Date(startB).getTime() <= new Date(endA).getTime()
  );
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
