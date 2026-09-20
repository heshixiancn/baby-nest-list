"use client";

import { useEffect, useState } from "react";
import type { CareRecordEdit } from "@/lib/mysql";

type Draft = CareRecordEdit & { happenedAt: string; endedAt?: string | null };

export function CareRecordEditor({
  type,
  id,
  onClose,
  onSaved
}: {
  type: string;
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(
      `/api/care/records?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`,
      { cache: "no-store" }
    )
      .then(async (response) => {
        const payload = (await response.json()) as {
          record?: CareRecordEdit;
          error?: string;
        };
        if (!response.ok || !payload.record)
          throw new Error(payload.error || "读取记录失败。");
        return payload.record;
      })
      .then((record) => {
        if (active)
          setDraft({
            ...record,
            happenedAt: beijingInput(record.happenedAt),
            endedAt: record.endedAt ? beijingInput(record.endedAt) : ""
          });
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "读取记录失败。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [type, id]);

  function change(values: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...values } : current));
  }

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    try {
      const happenedAt = beijingIso(draft.happenedAt);
      const endedAt = draft.endedAt ? beijingIso(draft.endedAt) : null;
      if (!happenedAt || (draft.endedAt && !endedAt))
        throw new Error("请输入有效的记录时间。");
      const response = await fetch("/api/care/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, happenedAt, endedAt })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "修改记录失败。");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "修改记录失败。");
    } finally {
      setSaving(false);
    }
  }

  const title =
    (
      {
        feeding: "喂养",
        diaper: "尿布",
        temperature: "体温",
        weight: "体重",
        sleep: "睡眠"
      } as Record<string, string>
    )[type] ?? "记录";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`修改${title}记录`}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.8rem] border border-white/90 bg-white/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="apple-hello-text text-xl">修改{title}记录</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xl text-slate-500"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            正在读取记录…
          </p>
        ) : draft ? (
          <div className="mt-4 space-y-3">
            <Field label={type === "sleep" ? "入睡时间" : "记录时间"}>
              <input
                className={inputClass}
                type="datetime-local"
                value={draft.happenedAt}
                onChange={(event) => change({ happenedAt: event.target.value })}
              />
            </Field>
            {type === "feeding" ? (
              <>
                <Field label="喂养方式">
                  <select
                    className={inputClass}
                    value={draft.feedingType ?? "瓶喂"}
                    onChange={(event) =>
                      change({
                        feedingType: event.target.value,
                        endedAt:
                          event.target.value === "母乳" ? draft.endedAt : ""
                      })
                    }
                  >
                    {["瓶喂", "母乳", "配方奶"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
                {draft.feedingType === "母乳" ? (
                  <>
                    <Field label="侧别">
                      <input
                        className={inputClass}
                        maxLength={10}
                        value={draft.side ?? ""}
                        onChange={(event) =>
                          change({ side: event.target.value })
                        }
                        placeholder="左 / 右 / 双侧"
                      />
                    </Field>
                    <Field label="结束时间（未结束可留空）">
                      <input
                        className={inputClass}
                        type="datetime-local"
                        value={draft.endedAt ?? ""}
                        onChange={(event) =>
                          change({ endedAt: event.target.value })
                        }
                      />
                    </Field>
                    {!draft.endedAt ? (
                      <Field label="时长（分钟，补录时可填）">
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          max="1440"
                          value={draft.durationMinutes ?? ""}
                          onChange={(event) =>
                            change({
                              durationMinutes: optionalNumber(
                                event.target.value
                              )
                            })
                          }
                        />
                      </Field>
                    ) : null}
                  </>
                ) : (
                  <Field label="奶量（ml）">
                    <input
                      className={inputClass}
                      type="number"
                      min="1"
                      max="1000"
                      step="0.1"
                      value={draft.amountMl ?? ""}
                      onChange={(event) =>
                        change({ amountMl: optionalNumber(event.target.value) })
                      }
                    />
                  </Field>
                )}
              </>
            ) : null}
            {type === "diaper" ? (
              <>
                <Field label="尿布类型">
                  <select
                    className={inputClass}
                    value={draft.diaperType ?? "尿"}
                    onChange={(event) =>
                      change({ diaperType: event.target.value })
                    }
                  >
                    {["尿", "便", "尿+便"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
                {draft.diaperType !== "尿" ? (
                  <Field label="便便颜色">
                    <input
                      className={inputClass}
                      maxLength={40}
                      value={draft.stoolColor ?? ""}
                      onChange={(event) =>
                        change({ stoolColor: event.target.value })
                      }
                    />
                  </Field>
                ) : null}
              </>
            ) : null}
            {type === "temperature" ? (
              <>
                <Field label="体温（℃）">
                  <input
                    className={inputClass}
                    type="number"
                    min="30"
                    max="45"
                    step="0.1"
                    value={draft.temperatureC ?? ""}
                    onChange={(event) =>
                      change({ temperatureC: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="测量方式">
                  <input
                    className={inputClass}
                    maxLength={20}
                    value={draft.measureMethod ?? ""}
                    onChange={(event) =>
                      change({ measureMethod: event.target.value })
                    }
                    placeholder="例如：腋温"
                  />
                </Field>
              </>
            ) : null}
            {type === "weight" ? (
              <>
                <Field label="体重（g）">
                  <input
                    className={inputClass}
                    type="number"
                    min="300"
                    max="30000"
                    step="1"
                    value={draft.weightGrams ?? ""}
                    onChange={(event) =>
                      change({ weightGrams: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="测量地点">
                  <input
                    className={inputClass}
                    maxLength={80}
                    value={draft.place ?? ""}
                    onChange={(event) => change({ place: event.target.value })}
                    placeholder="例如：家里"
                  />
                </Field>
              </>
            ) : null}
            {type === "sleep" ? (
              <>
                <Field label="睡醒时间（仍在睡可留空）">
                  <input
                    className={inputClass}
                    type="datetime-local"
                    value={draft.endedAt ?? ""}
                    onChange={(event) =>
                      change({ endedAt: event.target.value })
                    }
                  />
                </Field>
                {draft.awakeMinutes ? (
                  <p className="text-xs text-slate-500">
                    暂醒 {draft.awakeMinutes} 分钟会从睡眠时长中扣除。
                  </p>
                ) : null}
              </>
            ) : null}
            <Field label="备注">
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                maxLength={1000}
                value={draft.note ?? ""}
                onChange={(event) => change({ note: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="record-soft-button rounded-full py-3 text-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!draft || saving}
            className="record-accent-button rounded-full py-3 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-indigo-300";
function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
function optionalNumber(value: string) {
  return value === "" ? null : Number(value);
}
function beijingInput(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(iso));
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
function beijingIso(value: string) {
  const date = new Date(`${value}:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
