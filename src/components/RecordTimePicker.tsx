"use client";

import { useId } from "react";
import { currentDatetimeLocalValue } from "@/lib/time-input";

export function RecordTimePicker({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();

  return (
    <div className="record-time-picker">
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-medium text-slate-500" htmlFor={inputId}>
          {label}
        </label>
        <button
          className="text-xs font-medium text-slate-500"
          type="button"
          onClick={() => onChange(currentDatetimeLocalValue())}
        >
          设为现在
        </button>
      </div>
      <button className="record-time-display" type="button" tabIndex={-1}>
        <span className="apple-hello-text text-lg">
          {formatDisplayTime(value)}
        </span>
      </button>
      <input
        id={inputId}
        className="record-native-time-input"
        type="datetime-local"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function formatDisplayTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "选择时间";
  return date.toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
