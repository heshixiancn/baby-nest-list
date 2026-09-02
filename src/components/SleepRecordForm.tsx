"use client";

import { useEffect, useMemo, useState } from "react";
import { currentDatetimeLocalValue } from "@/lib/time-input";
import { ViewRecordsButton } from "@/components/ViewRecordsButton";
import { RecordTimePicker } from "@/components/RecordTimePicker";
import type { CarePrediction } from "@/lib/care-prediction";

type OpenSleep = {
  id: string;
  startedAt: string;
  pauseStartedAt?: string | null;
  awakeMinutes?: number;
};

export function SleepRecordForm({
  prediction
}: {
  prediction?: CarePrediction["sleep"];
}) {
  const [openSleep, setOpenSleep] = useState<OpenSleep | null>(null);
  const [startedAt, setStartedAt] = useState(currentDatetimeLocalValue);
  const [endedAt, setEndedAt] = useState(currentDatetimeLocalValue);
  const [endedAtTouched, setEndedAtTouched] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSubmit, setLastSubmit] = useState<{
    key: string;
    savedAt: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void refreshOpenSleep();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!openSleep || endedAtTouched) return;
    const timer = window.setInterval(
      () => setEndedAt(currentDatetimeLocalValue()),
      1000
    );
    return () => window.clearInterval(timer);
  }, [endedAtTouched, openSleep]);

  const manualDuration = useMemo(
    () => calculateDurationMinutes(startedAt, endedAt),
    [endedAt, startedAt]
  );

  async function refreshOpenSleep() {
    try {
      const response = await fetch("/api/care/sleep", { cache: "no-store" });
      const payload = (await response.json()) as {
        openSleep?: OpenSleep | null;
      };
      setOpenSleep(payload.openSleep ?? null);
    } catch {
      setOpenSleep(null);
    }
  }

  async function handleStart() {
    await saveSleep({
      action: "start",
      startedAt: startedAt || currentDatetimeLocalValue()
    });
  }

  async function handleFinish() {
    if (!openSleep) return;
    await saveSleep({
      action: "finish",
      id: openSleep.id,
      endedAt: endedAt || currentDatetimeLocalValue()
    });
  }

  async function handlePause() {
    if (!openSleep) return;
    await saveSleep({
      action: "pause",
      id: openSleep.id,
      pauseStartedAt: currentDatetimeLocalValue()
    });
  }

  async function handleResume() {
    if (!openSleep) return;
    await saveSleep({
      action: "resume",
      id: openSleep.id,
      resumedAt: currentDatetimeLocalValue()
    });
  }

  async function handleManualSave() {
    if (!manualDuration || manualDuration < 1) {
      setError("结束时间要晚于开始时间。");
      return;
    }

    await saveSleep({
      action: "manual",
      startedAt,
      endedAt,
      durationMinutes: manualDuration,
      note
    });
  }

  async function saveSleep(payload: Record<string, unknown>) {
    if (saving) return;
    const submitKey = makeSubmitKey(payload);
    if (isDuplicateSubmit(lastSubmit, submitKey)) {
      setError("");
      setMessage("刚刚已记录，已避免重复提交。");
      window.setTimeout(() => setMessage(""), 2000);
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/care/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as {
        error?: string;
        durationMinutes?: number;
        awakeMinutes?: number;
      };
      if (!response.ok) throw new Error(result.error || "保存失败。");

      setMessage(
        payload.action === "finish" && result.durationMinutes
          ? `已记录：${formatDuration(result.durationMinutes)}`
          : payload.action === "pause"
            ? "已标记暂醒"
            : payload.action === "resume"
              ? `已继续睡眠，暂醒 ${result.awakeMinutes ?? 0} 分钟`
              : "已记录"
      );
      setLastSubmit({ key: submitKey, savedAt: Date.now() });
      setNote("");
      setEndedAt(currentDatetimeLocalValue());
      setStartedAt(currentDatetimeLocalValue());
      setEndedAtTouched(false);
      await refreshOpenSleep();
      window.setTimeout(() => setMessage(""), 2400);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="record-page-shell record-page-shell-compact">
      <section className="record-card">
        <div className="space-y-3 p-3 pb-24 sm:pb-4">
          <div className="rounded-[1.8rem] border border-white/70 bg-white/55 px-3 py-4 text-center shadow-sm">
            {prediction ? (
              <div className="mb-3 grid grid-cols-2 gap-2 text-left">
                <div className="rounded-2xl bg-white/55 px-3 py-2 ring-1 ring-white/70">
                  <p className="text-xs font-medium text-slate-500">预计入睡</p>
                  <p className="apple-hello-text mt-1 text-lg">
                    {formatPredictionTime(prediction.predictedStartAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/55 px-3 py-2 ring-1 ring-white/70">
                  <p className="text-xs font-medium text-slate-500">预计醒来</p>
                  <p className="apple-hello-text mt-1 text-lg">
                    {formatPredictionTime(prediction.predictedEndAt)}
                  </p>
                </div>
                <div className="col-span-2 rounded-2xl bg-white/35 px-3 py-2 text-xs text-slate-500 ring-1 ring-white/60">
                  醒窗约 {formatDuration(prediction.wakeWindowMinutes)} · 小睡约{" "}
                  {formatDuration(prediction.expectedNapMinutes)}
                </div>
              </div>
            ) : null}

            {!openSleep ? (
              <div className="mb-3 text-left">
                <RecordTimePicker
                  label="开始时间"
                  value={startedAt}
                  onChange={setStartedAt}
                />
              </div>
            ) : null}

            <div
              className={`relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/55 p-4 shadow-sm backdrop-blur-2xl ${
                openSleep ? "breastfeeding-timer-active" : ""
              }`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">
                    {openSleep?.pauseStartedAt
                      ? "暂醒观察"
                      : openSleep
                        ? "正在睡眠"
                        : "睡眠计时"}
                  </p>
                  {openSleep ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-white/80">
                      <span className="h-2 w-2 rounded-full bg-indigo-400 timer-live-dot" />
                      {openSleep.pauseStartedAt ? "暂醒中" : "计时中"}
                    </span>
                  ) : null}
                </div>
                <p className="apple-hello-text mt-4 text-center text-[3.45rem] tabular-nums tracking-[-0.06em]">
                  {openSleep
                    ? formatTimerFromIso(openSleep.startedAt, now)
                    : "00:00"}
                </p>
                <p className="mt-1 text-center text-xs text-slate-500">
                  {openSleep
                    ? openSleep.pauseStartedAt
                      ? `暂醒 ${formatTimerFromIso(
                          openSleep.pauseStartedAt,
                          now
                        )} · 可继续或确认醒了`
                      : `${formatTime(openSleep.startedAt)} 开始`
                    : "默认从当前时间开始，也可以先改上方开始时间。"}
                </p>
                {openSleep?.awakeMinutes ? (
                  <p className="mt-1 text-center text-xs text-slate-400">
                    已累计暂醒 {openSleep.awakeMinutes} 分钟
                  </p>
                ) : null}
              </div>
              {openSleep ? (
                <div className="relative z-10 mt-3 text-left">
                  <RecordTimePicker
                    label="结束时间"
                    value={endedAt}
                    onChange={(value) => {
                      setEndedAtTouched(true);
                      setEndedAt(value);
                    }}
                  />
                </div>
              ) : null}
              <div className="relative z-10 mt-5 flex justify-center">
                <button
                  className={`record-round-action record-round-action-large ${
                    openSleep ? "record-round-action-stop" : ""
                  }`}
                  type="button"
                  onClick={
                    openSleep
                      ? openSleep.pauseStartedAt
                        ? handleResume
                        : handlePause
                      : handleStart
                  }
                  disabled={saving}
                >
                  <span className="text-3xl" aria-hidden="true">
                    {openSleep?.pauseStartedAt ? "↺" : openSleep ? "Ⅱ" : "▶"}
                  </span>
                  <span className="mt-1.5 text-sm">
                    {openSleep?.pauseStartedAt
                      ? "继续"
                      : openSleep
                        ? "暂醒"
                        : "开始"}
                  </span>
                </button>
              </div>
              {openSleep?.pauseStartedAt ? (
                <button
                  className="record-accent-button relative z-10 mt-3 h-11 w-full rounded-full text-sm font-medium"
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                >
                  确认醒了
                </button>
              ) : null}
            </div>
          </div>

          <details className="group rounded-2xl bg-white/35 px-3 py-1.5 text-sm text-slate-500 ring-1 ring-white/60">
            <summary className="cursor-pointer list-none font-medium">
              补录睡眠
              <span className="ml-1 text-slate-400">忘记点开始时用</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid min-w-0 grid-cols-2 gap-2 overflow-hidden">
                <div className="min-w-0">
                  <RecordTimePicker
                    label="开始"
                    value={startedAt}
                    onChange={setStartedAt}
                  />
                </div>
                <div className="min-w-0">
                  <RecordTimePicker
                    label="结束"
                    value={endedAt}
                    onChange={(value) => {
                      setEndedAtTouched(true);
                      setEndedAt(value);
                    }}
                  />
                </div>
              </div>
              <p className="apple-hello-text text-center text-2xl">
                {formatDuration(manualDuration)}
              </p>
              <input
                className="record-field"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="备注，可不填"
              />
              <button
                className="record-primary-button flex w-full"
                type="button"
                onClick={handleManualSave}
                disabled={saving}
              >
                保存补录
              </button>
            </div>
          </details>

          {message ? <div className="record-success">{message}</div> : null}
          {error ? <div className="record-error">{error}</div> : null}
        </div>
        <div className="record-save-bar flex justify-center">
          <ViewRecordsButton type="sleep" />
        </div>
      </section>
    </main>
  );
}

function calculateDurationMinutes(startedAt: string, endedAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 60000);
}

function formatTimerFromIso(startedAt: string, now: number) {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000)
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(restSeconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${minuteText}:${secondText}`;
  return `${minuteText}:${secondText}`;
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "0 分钟";
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}小时${rest}分` : `${hours}小时`;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai"
  });
}

function formatPredictionTime(iso: string | null) {
  if (!iso) return "待记录";
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai"
  });
}

function makeSubmitKey(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function isDuplicateSubmit(
  lastSubmit: { key: string; savedAt: number } | null,
  submitKey: string
) {
  return Boolean(
    lastSubmit &&
    lastSubmit.key === submitKey &&
    Date.now() - lastSubmit.savedAt < 6000
  );
}
