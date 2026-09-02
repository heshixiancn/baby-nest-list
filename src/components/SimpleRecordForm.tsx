"use client";

import { useMemo, useState } from "react";
import { currentDatetimeLocalValue } from "@/lib/time-input";
import { RecordTimePicker } from "@/components/RecordTimePicker";
import { ValueWheel } from "@/components/ValueWheel";

interface SimpleRecordFormProps {
  title: string;
  apiPath: string;
  timeField: string;
  valueField: string;
  valueLabel: string;
  unit: string;
  defaultValue: number;
  step: number;
  min: number;
  quickValues: number[];
  referenceHint?: string;
  warningKind?: "temperature";
  extraField?: {
    name: string;
    label: string;
    options: string[];
  };
}

export function SimpleRecordForm({
  apiPath,
  timeField,
  valueField,
  unit,
  defaultValue,
  step,
  min,
  quickValues,
  referenceHint,
  warningKind,
  extraField
}: SimpleRecordFormProps) {
  const [recordedAt, setRecordedAt] = useState(currentDatetimeLocalValue);
  const [value, setValue] = useState(defaultValue);
  const [extraValue, setExtraValue] = useState(extraField?.options[0] ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSubmit, setLastSubmit] = useState<{
    key: string;
    savedAt: number;
  } | null>(null);

  const summary = useMemo(() => `${value}${unit}`, [unit, value]);
  const valueWarning =
    warningKind === "temperature" ? getTemperatureWarning(value) : "";
  const wheelValues = useMemo(
    () => makeValueRange(min, quickValues, step, defaultValue),
    [defaultValue, min, quickValues, step]
  );

  async function handleSave() {
    if (saving) return;
    const submitKey = makeSubmitKey({
      apiPath,
      recordedAt,
      value,
      extraValue,
      note
    });
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
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [timeField]: recordedAt,
          [valueField]: value,
          ...(extraField ? { [extraField.name]: extraValue } : {}),
          note
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        warning?: string;
      };
      if (!response.ok) throw new Error(payload.error || "保存失败。");

      const warning = payload.warning || valueWarning;
      setMessage(
        warning ? `已记录：${summary}。${warning}` : `已记录：${summary}`
      );
      setLastSubmit({ key: submitKey, savedAt: Date.now() });
      setNote("");
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
          <RecordTimePicker
            label="记录时间"
            value={recordedAt}
            onChange={setRecordedAt}
          />

          <div>
            <div className="apple-hello-text mb-1 flex h-10 items-center justify-center text-3xl">
              {summary}
            </div>
            {referenceHint || valueWarning ? (
              <div
                className={`mb-1 rounded-2xl px-3 py-2 text-center text-xs leading-relaxed ring-1 ${
                  valueWarning
                    ? "bg-rose-50/80 text-rose-700 ring-rose-100"
                    : "bg-white/45 text-slate-500 ring-white/70"
                }`}
              >
                {valueWarning || referenceHint}
              </div>
            ) : null}
            <ValueWheel
              value={value}
              values={wheelValues}
              unit={unit}
              onChange={setValue}
            />
          </div>

          {extraField ? (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {extraField.options.map((option) => (
                  <button
                    key={option}
                    className={`h-11 rounded-2xl px-2 text-sm font-medium transition ${
                      extraValue === option
                        ? "record-selected-button"
                        : "record-soft-button"
                    }`}
                    type="button"
                    onClick={() => setExtraValue(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <details className="group rounded-2xl bg-white/35 px-3 py-1.5 text-sm text-slate-500 ring-1 ring-white/60">
            <summary className="cursor-pointer list-none font-medium">
              备注
              <span className="ml-1 text-slate-400">可不填</span>
            </summary>
            <input
              className="record-field mt-2"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </details>

          {message ? <div className="record-success">{message}</div> : null}
          {error ? <div className="record-error">{error}</div> : null}
        </div>

        <div className="record-save-bar">
          <button
            className="record-primary-button mx-auto flex w-full max-w-md"
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "保存中..." : "立即记录"}
          </button>
        </div>
      </section>
    </main>
  );
}

function makeValueRange(
  min: number,
  quickValues: number[],
  step: number,
  defaultValue: number
) {
  const max = Math.max(defaultValue, ...quickValues);
  const upper = max + step * 8;
  const values: number[] = [];
  for (let current = min; current <= upper; current += step) {
    values.push(Number(current.toFixed(2)));
  }
  return [...values, ...quickValues, defaultValue];
}

function getTemperatureWarning(value: number) {
  if (value >= 38) return "3个月内宝宝体温 ≥38.0℃，建议及时联系医生。";
  if (value >= 37.5)
    return "体温偏高，建议 15–30 分钟后复测，并观察精神和吃奶。";
  if (value < 36) return "体温偏低，注意保暖并复测；仍偏低建议联系医生。";
  return "";
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
