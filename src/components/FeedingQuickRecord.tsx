"use client";

import { useMemo, useRef, useState } from "react";
import { currentDatetimeLocalValue } from "@/lib/time-input";
import type { FeedingRecommendation } from "@/lib/feeding-recommendation";
import { RecordTimePicker } from "@/components/RecordTimePicker";
import { ValueWheel } from "@/components/ValueWheel";
import { ViewRecordsButton } from "@/components/ViewRecordsButton";

type RecordMode = "feeding" | "diaper";
type FeedingType = "母乳" | "瓶喂" | "配方奶";
type DiaperType = "尿" | "便" | "尿+便" | "换尿不湿";

const feedingTypes: FeedingType[] = ["瓶喂", "母乳", "配方奶"];
const diaperTypes: DiaperType[] = ["换尿不湿", "尿", "便", "尿+便"];
const milkSteps = [30, 60, 90, 120, 150];
const minuteWheelValues = [
  ...Array.from({ length: 60 }, (_, index) => index + 1),
  ...Array.from({ length: 24 }, (_, index) => 65 + index * 5)
];

type PendingWake = {
  sleepId: string;
  sleepStartedAt: string;
  careAt: string;
  kind: RecordMode;
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
  const [feedingType, setFeedingType] = useState<FeedingType>("瓶喂");
  const [diaperType, setDiaperType] = useState<DiaperType>("换尿不湿");
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
  const [pendingWake, setPendingWake] = useState<PendingWake | null>(null);
  const [wakeAt, setWakeAt] = useState("");
  const pendingCareAction = useRef<null | (() => Promise<void>)>(null);
  const summary = useMemo(() => {
    if (mode === "diaper") return `${diaperType}`;
    if (feedingType === "母乳") return `母乳${side}侧 · ${minutes} 分钟`;
    return `${feedingType} · ${amountMl} ml`;
  }, [amountMl, diaperType, feedingType, minutes, mode, side]);

  async function checkSleepBeforeCare(
    action: () => Promise<void>,
    careAt: string,
    kind: RecordMode
  ) {
    if (saving || pendingWake) return;
    try {
      const response = await fetch("/api/care/sleep", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as {
          openSleep?: { id: string; startedAt: string } | null;
        };
        const sleep = payload.openSleep;
        const careTime = new Date(careAt).getTime();
        if (
          sleep &&
          Number.isFinite(careTime) &&
          careTime > new Date(sleep.startedAt).getTime()
        ) {
          pendingCareAction.current = action;
          setWakeAt(careAt);
          setPendingWake({
            sleepId: sleep.id,
            sleepStartedAt: sleep.startedAt,
            careAt,
            kind
          });
          return;
        }
      }
    } catch {
      // 睡眠状态暂时无法读取时，仍允许完成当前照护记录。
    }
    await action();
  }

  async function continueCareAfterWake(choice: "wake" | "sleep") {
    if (!pendingWake || saving) return;
    const action = pendingCareAction.current;
    if (!action) return;
    if (choice === "wake") {
      const wakeTime = new Date(wakeAt).getTime();
      const startTime = new Date(pendingWake.sleepStartedAt).getTime();
      const careTime = new Date(pendingWake.careAt).getTime();
      if (
        !Number.isFinite(wakeTime) ||
        wakeTime <= startTime ||
        wakeTime > careTime
      ) {
        setError("睡醒时间应晚于入睡、且不能晚于这次照护的记录时间。");
        return;
      }
      setSaving(true);
      setError("");
      try {
        const response = await fetch("/api/care/sleep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "finish",
            id: pendingWake.sleepId,
            endedAt: wakeAt,
            note: "照护记录时补记睡醒时间"
          })
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "补记睡醒失败。");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "补记睡醒失败。");
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    pendingCareAction.current = null;
    setPendingWake(null);
    await action();
  }

  async function handleSave() {
    if (saving) return;
    const submitKey = makeSubmitKey({
      mode,
      recordedAt,
      feedingType,
      diaperType,
      amountMl,
      minutes,
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
                  stoolColor: diaperType.includes("便") ? stoolColor : "",
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
            mode === "feeding" && feedingType === "母乳"
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
                <div className="rounded-[1.5rem] bg-white/35 p-3 ring-1 ring-white/60">
                  <Stepper
                    label="喂养时长"
                    value={`${minutes} 分钟`}
                    unit="分钟"
                    values={minuteWheelValues}
                    onChange={setMinutes}
                  />
                  <p className="mt-2 text-center text-xs text-slate-400">
                    结束时间将根据开始时间和喂养时长自动计算
                  </p>
                </div>
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
            {diaperType.includes("便") ? (
              <ButtonGrid
                options={["黄色", "绿色", "棕色", "黑色"]}
                value={stoolColor}
                onChange={setStoolColor}
              />
            ) : null}
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
        <div className="mx-auto flex max-w-md items-center gap-3">
          <ViewRecordsButton type={mode} />
          <button
            className="record-primary-button flex h-12 w-[48%]"
            type="button"
            onClick={() =>
              void checkSleepBeforeCare(
                handleSave,
                recordedAt || currentDatetimeLocalValue(),
                mode
              )
            }
            disabled={saving}
          >
            {saving ? "处理中..." : "立即记录"}
          </button>
        </div>
      </div>
      {pendingWake ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="确认是否已睡醒"
        >
          <div className="w-full max-w-md rounded-[1.8rem] border border-white/90 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl">
            <h2 className="apple-hello-text text-xl">孩子已经醒了吗？</h2>
            <p className="mt-1 text-sm text-slate-500">
              {pendingWake.kind === "feeding"
                ? "这次喂养开始时仍在睡眠记录中。"
                : "记录尿布时仍在睡眠记录中。"}
              如果忘了结束睡眠，可以按本次记录时间补记。
            </p>
            <p className="mt-3 text-xs text-slate-400">
              本次记录：{formatClock(pendingWake.careAt)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[0, 5, 10, 15].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() =>
                    setWakeAt(localMinutesBefore(pendingWake.careAt, minutes))
                  }
                  className={`rounded-2xl px-2 py-2.5 text-sm font-medium ${wakeAt === localMinutesBefore(pendingWake.careAt, minutes) ? "record-selected-button" : "record-soft-button"}`}
                >
                  {minutes === 0 ? "记录时醒" : `提前 ${minutes} 分钟`}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <RecordTimePicker
                label="睡醒时间"
                value={wakeAt}
                onChange={setWakeAt}
              />
            </div>
            {error ? (
              <p className="mt-2 text-xs text-rose-600">{error}</p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void continueCareAfterWake("sleep")}
                className="record-soft-button min-h-11 rounded-full px-2 text-sm"
              >
                仍在睡，照常记录
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void continueCareAfterWake("wake")}
                className="record-accent-button min-h-11 rounded-full px-2 text-sm font-medium"
              >
                补记睡醒并记录
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                pendingCareAction.current = null;
                setPendingWake(null);
                setError("");
              }}
              className="mt-3 w-full text-center text-xs text-slate-400"
            >
              取消本次操作
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function localMinutesBefore(localValue: string, minutes: number) {
  const date = new Date(new Date(localValue).getTime() - minutes * 60000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
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

function formatClock(iso: string) {
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
