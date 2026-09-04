import { hasCompleteMysqlConfig } from "@/lib/mysql-config";
import {
  getOpenSleepRecord,
  getLatestTemperatureRecordTime,
  getLatestWeightRecordTime,
  getTodayDiaperSummary,
  getMedicationHomeStatus
} from "@/lib/mysql";
import { getCarePrediction } from "@/lib/care-prediction";

export interface HomeCountdown {
  feedingNextAt: string | null;
  sleepNextAt: string | null;
  sleepStartedAt: string | null;
  sleepExpectedEndAt: string | null;
  temperatureLastAt: string | null;
  temperatureMeasuredToday: boolean;
  weightLastAt: string | null;
  weightMeasuredToday: boolean;
  diaperPeeToday: number;
  diaperPoopToday: number;
  diaperNextPeeAt: string | null;
  diaperNextPoopAt: string | null;
  medicationNextAt: string | null;
  medicationNextName: string | null;
  medicationCompletedToday: number;
  medicationTotalToday: number;
}

export async function getHomeCountdown(): Promise<HomeCountdown> {
  if (!hasCompleteMysqlConfig()) return emptyCountdown();

  try {
    const [prediction, openSleep, temperatureAt, weightAt, diaper, medication] =
      await Promise.all([
        getCarePrediction(),
        getOpenSleepRecord(),
        getLatestTemperatureRecordTime(),
        getLatestWeightRecordTime(),
        getTodayDiaperSummary(),
        getMedicationHomeStatus()
      ]);

    return {
      feedingNextAt: prediction.feeding.nextAt,
      sleepStartedAt: openSleep?.startedAt ?? null,
      sleepExpectedEndAt: openSleep ? prediction.sleep.predictedEndAt : null,
      sleepNextAt: openSleep ? null : prediction.sleep.nextAt,
      temperatureLastAt: temperatureAt,
      temperatureMeasuredToday: isToday(temperatureAt),
      weightLastAt: weightAt,
      weightMeasuredToday: isToday(weightAt),
      diaperPeeToday: diaper.pee,
      diaperPoopToday: diaper.poop,
      diaperNextPeeAt: prediction.diaper.nextPeeAt,
      diaperNextPoopAt: prediction.diaper.nextPoopAt,
      medicationNextAt: medication.nextAt,
      medicationNextName: medication.nextName,
      medicationCompletedToday: medication.completed,
      medicationTotalToday: medication.total
    };
  } catch {
    return emptyCountdown();
  }
}

function emptyCountdown(): HomeCountdown {
  return {
    feedingNextAt: null,
    sleepNextAt: null,
    sleepStartedAt: null,
    sleepExpectedEndAt: null,
    temperatureLastAt: null,
    temperatureMeasuredToday: false,
    weightLastAt: null,
    weightMeasuredToday: false,
    diaperPeeToday: 0,
    diaperPoopToday: 0,
    diaperNextPeeAt: null,
    diaperNextPoopAt: null,
    medicationNextAt: null,
    medicationNextName: null,
    medicationCompletedToday: 0,
    medicationTotalToday: 0
  };
}

function isToday(iso: string | null, now = new Date()) {
  return Boolean(iso && new Date(iso).toDateString() === now.toDateString());
}
