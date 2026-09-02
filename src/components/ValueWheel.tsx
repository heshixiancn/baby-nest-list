"use client";

import { useEffect, useMemo, useRef } from "react";

export function ValueWheel({
  value,
  values,
  unit,
  onChange
}: {
  value: number;
  values: number[];
  unit: string;
  onChange: (value: number) => void;
}) {
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const normalizedValues = useMemo(
    () => Array.from(new Set(values)).sort((a, b) => a - b),
    [values]
  );

  useEffect(() => {
    itemRefs.current.get(value)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }, [value]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/70 to-transparent" />
      <div className="record-wheel flex snap-x snap-mandatory gap-2 overflow-x-auto px-[36%] py-1.5">
        {normalizedValues.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              ref={(node) => {
                if (node) itemRefs.current.set(option, node);
                else itemRefs.current.delete(option);
              }}
              className={`shrink-0 snap-center rounded-[1.45rem] px-4 py-2.5 text-center transition ${
                active
                  ? "record-selected-button"
                  : "bg-white/55 text-slate-500 ring-1 ring-white/70"
              }`}
              type="button"
              onClick={() => onChange(option)}
            >
              <span className="block text-[1.35rem] font-medium tabular-nums">
                {option}
              </span>
              <span
                className={`mt-0.5 block text-xs ${active ? "text-slate-500" : "text-slate-400"}`}
              >
                {unit}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
