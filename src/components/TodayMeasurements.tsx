"use client";

import { useState } from "react";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";

type Point = { time: string; value: number };
type Kind = "temperature" | "weight";

export function TodayMeasurements({
  temperatureMeasuredToday,
  weightMeasuredToday,
  temperature,
  weight
}: {
  temperatureMeasuredToday: boolean;
  weightMeasuredToday: boolean;
  temperature: Point[];
  weight: Point[];
}) {
  const [open, setOpen] = useState<Kind | null>(null);
  const latestTemperature = temperature.at(-1);
  const latestWeight = weight.at(-1);

  return (
    <>
      <div className="flex min-h-[7rem] flex-col rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-rose-50/80 to-indigo-50/80 p-3 shadow-sm ring-1 ring-white/70">
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5">
          <MeasurementButton
            label="体温"
            unit="℃"
            measured={temperatureMeasuredToday}
            latest={latestTemperature}
            abnormal={
              latestTemperature ? isAbnormal(latestTemperature.value) : false
            }
            onClick={() => setOpen("temperature")}
          />
          <MeasurementButton
            label="体重"
            unit="g"
            measured={weightMeasuredToday}
            latest={latestWeight}
            onClick={() => setOpen("weight")}
          />
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${open === "temperature" ? "体温" : "体重"}记录详情`}
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-white/90 bg-white/80 p-4 shadow-2xl backdrop-blur-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-xs text-slate-400">最近一次测量</p>
                <h2 className="apple-hello-text mt-1 text-2xl text-slate-700">
                  {open === "temperature" ? "体温记录" : "体重记录"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200"
              >
                关闭
              </button>
            </div>
            <DashboardMetricCard
              kind={open}
              points={open === "temperature" ? temperature : weight}
              range="周"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function MeasurementButton({
  label,
  unit,
  measured,
  latest,
  abnormal = false,
  onClick
}: {
  label: string;
  unit: string;
  measured: boolean;
  latest?: Point;
  abnormal?: boolean;
  onClick: () => void;
}) {
  const value = latest
    ? label === "体重"
      ? formatChineseWeight(latest.value)
      : `${latest.value}${unit}`
    : "暂无记录";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4.75rem] items-stretch rounded-[1.3rem] bg-white/60 p-2 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_20px_rgba(148,163,184,0.08)] ring-1 ring-white/85 transition hover:bg-white/90"
    >
      <span className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-2 border-r border-white/90 pr-2">
        <span className="text-xl leading-none" aria-hidden="true">
          {label === "体温" ? "🌡️" : "⚖️"}
        </span>
        <span className="text-xs font-semibold tracking-wide text-slate-500">
          {label}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-center justify-center px-2">
        <span
          className={`apple-hello-text block text-[clamp(1.4rem,1.7vw,1.8rem)] font-medium leading-none tracking-tight tabular-nums ${abnormal ? "text-rose-600" : label === "体温" ? "text-emerald-600" : "text-slate-700"}`}
        >
          {value}
        </span>
        <span
          className={`mt-1.5 block text-[10px] ${measured ? "text-emerald-600" : "text-slate-400"}`}
        >
          {measured ? "今日已测" : latest ? "今日未测 · 显示最近" : "今日未测"}
        </span>
      </span>
    </button>
  );
}

function isAbnormal(value: number) {
  return value < 36 || value > 37.4;
}

function formatChineseWeight(grams: number) {
  const totalLiang = Math.max(0, Math.round(grams / 50));
  const jin = Math.floor(totalLiang / 10);
  const liang = totalLiang % 10;
  return `${jin}斤${liang}两`;
}
