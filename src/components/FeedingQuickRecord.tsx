"use client";

import { useEffect, useMemo, useState } from "react";
import { currentDatetimeLocalValue } from "@/lib/time-input";
import type { FeedingRecommendation } from "@/lib/feeding-recommendation";
import { RecordTimePicker } from "@/components/RecordTimePicker";
import { ValueWheel } from "@/components/ValueWheel";

type RecordMode = "feeding" | "diaper";
type FeedingType = "母乳" | "瓶喂" | "配方奶";
type DiaperType = "尿" | "便" | "尿+便";

const feedingTypes: FeedingType[] = ["瓶喂", "母乳", "配方奶"];
const diaperTypes: DiaperType[] = ["尿", "便", "尿+便"];
const milkSteps = [30, 60, 90, 120, 150];
const minuteWheelValues = [
  ...Array.from({ length: 60 }, (_, index) => index + 1),
  ...Array.from({ length: 24 }, (_, index) => 65 + index * 5)
];

type OpenBreastfeeding = {
  id: string;
  startedAt: string;
  side: string;
};

export function FeedingQuickRecord({
  recommendation,
  initialMode = "feeding",
  showModeSwitch = true
}: {
  recommendation?: FeedingRecommendation;
  initialMode?: RecordMode;
  showModeSwitch?: boolean;
}) {
  const effectiveRecommendation =
    recommendation ??
    ({
      minMl: 20,
      targetMl: 30,
      maxMl: 40
    } as FeedingRecommendation);
  const [mode, setMode] = useState<RecordMode>(initialMode);
  const [recordedAt, setRecordedAt] = useState(currentDatetimeLocalValue);
  const [endedAt, setEndedAt] = useState(currentDatetimeLocalValue);
  const [endedAtTouched, setEndedAtTouched] = useState(false);
  const [feedingType, setFeedingType] = useState<FeedingType>("瓶喂");
  const [diaperType, setDiaperType] = useState<DiaperType>("尿");
  const [minutes, setMinutes] = useState(10);
  const [amountMl, setAmountMl] = useState(effectiveRecommendation.targetMl);
  const [side, setSide] = useState("左");
  const [stoolColor, setStoolColor] = useState("");
  const [note, setNote] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<{
    key: string;
    savedAt: number;
  } | null>(null);
  const [openBreastfeeding, setOpenBreastfeeding] =
    useState<OpenBreastfeeding | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let ignore = false;
    fetch("/api/care/feeding")
      .then((response) => response.json())
      .then((payload: { openBreastfeeding?: OpenBreastfeeding | null }) => {
        if (!ignore) setOpenBreastfeeding(payload.openBreastfeeding ?? null);
      })
      .catch(() => undefined);

    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!openBreastfeeding || endedAtTouched) return;
    const timer = window.setInterval(
      () => setEndedAt(currentDatetimeLocalValue()),
      1000
    );
    return () => window.clearInterval(timer);
  }, [endedAtTouched, openBreastfeeding]);

  const summary = useMemo(() => {
    if (mode === "diaper") return `${diaperType}`;
    if (feedingType === "母乳") {
      if (openBreastfeeding) {
        return `母乳${openBreastfeeding.side || side}侧 · 已开始 ${formatDuration(
          openBreastfeeding.startedAt,
          now
        )}`;
      }
      return `母乳${side}侧 · 待开始`;
    }
    return `${feedingType} · ${amountMl} ml`;
  }, [amountMl, diaperType, feedingType, mode, now, openBreastfeeding, side]);

  async function refreshOpenBreastfeeding() {
    const response = await fetch("/api/care/feeding");
    const payload = (await response.json()) as {
      openBreastfeeding?: OpenBreastfeeding | null;
      error?: string;
    };
    if (!response.ok)
      throw new Error(payload.error || "读取母乳喂养状态失败。");
    setOpenBreastfeeding(payload.openBreastfeeding ?? null);
    return payload.openBreastfeeding ?? null;
  }

  async function handleStartBreastfeeding() {
    if (saving) return;
    setError("");
    setSavedHint("");
    setSaving(true);

    try {
      const existing = await refreshOpenBreastfeeding();
      if (existing) {
        setSavedHint("已有正在进行的母乳喂养。");
        return;
      }

      const startedAt = recordedAt || currentDatetimeLocalValue();
      const response = await fetch("/api/care/feeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          feedingType: "母乳",
          happenedAt: startedAt,
          side,
          note
        })
      });
      const payload = (await response.json()) as {
        id?: string;
        error?: string;
      };
      if (!response.ok || !payload.id)
        throw new Error(payload.error || "开始记录失败。");

      await refreshOpenBreastfeeding();
      setRecordedAt(startedAt);
      setSavedHint(`已开始：母乳${side}侧`);
      window.setTimeout(() => setSavedHint(""), 2200);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "开始记录失败。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleFinishBreastfeeding() {
    if (saving) return;
    setError("");
    setSavedHint("");
    setSaving(true);

    try {
      if (!openBreastfeeding) throw new Error("还没有开始母乳喂养。");
      const response = await fetch("/api/care/feeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finish",
          id: openBreastfeeding.id,
          endedAt: endedAt || currentDatetimeLocalValue(),
          note
        })
      });
      const payload = (await response.json()) as {
        durationMinutes?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "结束母乳喂养失败。");

      setOpenBreastfeeding(null);
      setEndedAtTouched(false);
      setEndedAt(currentDatetimeLocalValue());
      setNote("");
      setSavedHint(`已记录：母乳 ${payload.durationMinutes ?? 0} 分钟`);
      window.setTimeout(() => setSavedHint(""), 2400);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "结束母乳喂养失败。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    const submitKey = makeSubmitKey({
      mode,
      recordedAt,
      feedingType,
      diaperType,
      amountMl,
      side,
      stoolColor,
      note
    });
    if (isDuplicateSubmit(lastSubmit, submitKey)) {
      setError("");
      setSavedHint("刚刚已记录，已避免重复提交。");
      window.setTimeout(() => setSavedHint(""), 2000);
      return;
    }

    setError("");
    setSavedHint("");
    setSaving(true);

    try {
      const response = await fetch(
        mode === "feeding" ? "/api/care/feeding" : "/api/care/diaper",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "feeding"
              ? {
                  feedingType,
                  happenedAt: recordedAt,
                  side: feedingType === "母乳" ? side : "",
                  durationMinutes: feedingType === "母乳" ? minutes : undefined,
                  amountMl: feedingType === "母乳" ? undefined : amountMl,
                  endedAt:
                    feedingType === "母乳"
                      ? new Date(
                          new Date(recordedAt).getTime() + minutes * 60000
                        ).toISOString()
                      : undefined,
                  note
                }
              : {
                  diaperType,
                  happenedAt: recordedAt,
                  stoolColor,
                  note
                }
          )
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存失败。");

      setSavedHint(`已记录：${summary}`);
      setLastSubmit({ key: submitKey, savedAt: Date.now() });
      setNote("");
      window.setTimeout(() => setSavedHint(""), 2400);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="record-card">
      <div className="space-y-2.5 p-3 pb-24 sm:pb-4">
        {showModeSwitch ? (
          <div className="record-segment">
            <SegmentButton
              active={mode === "feeding"}
              label="喂养"
              onClick={() => setMode("feeding")}
            />
            <SegmentButton
              active={mode === "diaper"}
              label="尿布"
              onClick={() => setMode("diaper")}
            />
          </div>
        ) : null}

        <RecordTimePicker
          label={
            mode === "feeding" && feedingType === "母乳" && !openBreastfeeding
              ? "开始时间"
              : "记录时间"
          }
          value={recordedAt}
          onChange={setRecordedAt}
        />

        {mode === "feeding" ? (
          <div className="space-y-2.5">
            <ButtonGrid
              options={feedingTypes}
              value={feedingType}
              onChange={setFeedingType}
            />

            {feedingType === "母乳" ? (
              <>
                <ButtonGrid
                  options={["左", "右", "双侧"]}
                  value={side}
                  onChange={setSide}
                />
                <div
                  className={`relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/55 p-3 shadow-sm backdrop-blur-2xl ${
                    openBreastfeeding ? "breastfeeding-timer-active" : ""
                  }`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-slate-500">
                        {openBreastfeeding ? "正在母乳喂养" : "母乳计时"}
                      </p>
                      {openBreastfeeding ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-white/80">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 timer-live-dot" />
                          计时中
                        </span>
                      ) : null}
                    </div>
                    <p className="apple-hello-text mt-2 text-center text-[2.8rem] tabular-nums tracking-[-0.06em]">
                      {openBreastfeeding
                        ? formatTimer(openBreastfeeding.startedAt, now)
                        : "00:00"}
                    </p>
                    <p className="mt-1 text-center text-xs text-slate-500">
                      {openBreastfeeding
                        ? `${formatClock(
                            openBreastfeeding.startedAt
                          )} 开始 · ${openBreastfeeding.side || side}侧`
                        : "可先改上方开始时间"}
                    </p>
                  </div>
                  {openBreastfeeding ? (
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
                  <div className="mt-3 flex justify-center">
                    <button
                      className={`record-round-action ${
                        openBreastfeeding ? "record-round-action-stop" : ""
                      }`}
                      type="button"
                      onClick={
                        openBreastfeeding
                          ? handleFinishBreastfeeding
                          : handleStartBreastfeeding
                      }
                      disabled={saving}
                    >
                      <span className="text-xl" aria-hidden="true">
                        {openBreastfeeding ? "✓" : "▶"}
                      </span>
                      <span className="mt-1 text-xs">
                        {openBreastfeeding ? "结束" : "开始"}
                      </span>
                    </button>
                  </div>
                </div>
                <details className="rounded-[1.5rem] bg-white/35 px-3 py-1.5 text-sm text-slate-500 ring-1 ring-white/60">
                  <summary className="cursor-pointer list-none font-medium">
                    补录母乳时长
                  </summary>
                  <div className="mt-3">
                    <Stepper
                      label="时长"
                      value={`${minutes} 分钟`}
                      unit="分钟"
                      values={minuteWheelValues}
                      onChange={setMinutes}
                    />
                  </div>
                </details>
              </>
            ) : (
              <>
                <Stepper
                  label="奶量"
                  value={`${amountMl} ml`}
                  unit="ml"
                  hint={`推荐 ${effectiveRecommendation.targetMl} ml，建议 ${effectiveRecommendation.minMl}–${effectiveRecommendation.maxMl} ml`}
                  values={[
                    effectiveRecommendation.minMl,
                    effectiveRecommendation.targetMl,
                    effectiveRecommendation.maxMl,
                    ...milkSteps,
                    ...Array.from({ length: 19 }, (_, index) => 10 + index * 10)
                  ]}
                  onChange={setAmountMl}
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <ButtonGrid
              options={diaperTypes}
              value={diaperType}
              onChange={setDiaperType}
            />
            <ButtonGrid
              options={["黄色", "绿色", "棕色", "黑色"]}
              value={stoolColor}
              onChange={setStoolColor}
            />
          </div>
        )}

        <details className="group rounded-2xl bg-white/35 px-3 py-1.5 text-sm text-slate-500 ring-1 ring-white/60">
          <summary className="cursor-pointer list-none font-medium">
            备注
            <span className="ml-1 text-slate-400">可不填</span>
          </summary>
          <input
            className="record-field mt-2"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例如：吐奶、很困、便便偏稀"
          />
        </details>

        {savedHint ? <div className="record-success">{savedHint}</div> : null}
        {error ? <div className="record-error">{error}</div> : null}
      </div>

      <div className="record-save-bar">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-500">当前记录</p>
            <p className="apple-hello-text truncate text-base">{summary}</p>
          </div>
          <button
            className="record-primary-button"
            type="button"
            onClick={
              mode === "feeding" && feedingType === "母乳"
                ? openBreastfeeding
                  ? handleFinishBreastfeeding
                  : handleStartBreastfeeding
                : handleSave
            }
            disabled={saving}
          >
            {saving
              ? "处理中..."
              : mode === "feeding" && feedingType === "母乳"
                ? openBreastfeeding
                  ? "结束喂奶"
                  : "开始喂奶"
                : "立即记录"}
          </button>
        </div>
      </div>
    </section>
  );
}

function SegmentButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-10 rounded-full text-sm font-medium transition ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ButtonGrid<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label?: string;
  options: T[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      {label ? (
        <p className="mb-2 text-sm font-medium text-slate-600">{label}</p>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option}
            className={`h-12 rounded-2xl border px-2 text-sm font-medium transition ${
              value === option ? "record-selected-button" : "record-soft-button"
            }`}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  unit,
  hint,
  values,
  onChange
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
  values: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3 px-1">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="apple-hello-text mb-1 flex h-8 items-center justify-center text-2xl">
        {value}
      </div>
      <ValueWheel
        value={Number.parseFloat(value)}
        values={values}
        unit={unit}
        onChange={onChange}
      />
    </div>
  );
}

function formatDuration(startedAt: string, now: Date) {
  const started = new Date(startedAt);
  const diffMinutes = Math.max(
    0,
    Math.floor((now.getTime() - started.getTime()) / 60000)
  );
  if (diffMinutes < 60) return `${diffMinutes} 分钟`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours} 小时 ${minutes} 分钟`;
}

function formatTimer(startedAt: string, now: Date) {
  const started = new Date(startedAt);
  const diffSeconds = Math.max(
    0,
    Math.floor((now.getTime() - started.getTime()) / 1000)
  );
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");

  if (hours > 0) return `${hours}:${minuteText}:${secondText}`;
  return `${minuteText}:${secondText}`;
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
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
