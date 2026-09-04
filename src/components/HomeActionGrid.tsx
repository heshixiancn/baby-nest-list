"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HomeCountdown } from "@/lib/care-countdown";

type Action = {
  href: string;
  label: string;
  icon: string;
  tone: string;
  motion: string;
  delay: string;
  hint: "feeding" | "diaper" | "temperature" | "weight" | "sleep" | "medication";
};

export function HomeActionGrid({
  actions,
  countdown
}: {
  actions: readonly Action[];
  countdown: HomeCountdown;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="mx-auto grid w-full max-w-[20rem] grid-cols-2 gap-x-7 gap-y-6 px-4">
      {actions.map((action) => {
        const hint = getHint(action.hint, countdown, now);

        return (
          <Link
            key={action.href}
            href={action.href}
            className={`voice-orb group relative mx-auto flex h-[7.7rem] w-[7.7rem] items-center justify-center rounded-full transition duration-200 active:scale-95 sm:h-32 sm:w-32 ${action.tone} ${action.motion}`}
            style={{ animationDelay: action.delay }}
            aria-label={action.label}
          >
            <span className="voice-orb-clip absolute inset-0 rounded-full">
              <span className="voice-orb-cloud absolute inset-[-10%] rounded-full" />
              <span className="voice-orb-band absolute inset-[-6%] rounded-full" />
              <span className="voice-orb-mist absolute inset-[4%] rounded-full" />
              <span className="voice-orb-glass absolute inset-[3px] rounded-full" />
            </span>
            <span className="relative z-10 flex h-full w-full -translate-y-1 flex-col items-center justify-center rounded-full px-1 text-center text-slate-950">
              <span
                className="text-[2.5rem] drop-shadow-sm"
                aria-hidden="true"
              >
                {action.icon}
              </span>
              <span
                className={`home-countdown-timer mt-1 max-w-[88%] ${
                  hint.active ? "home-countdown-active" : ""
                }`}
              >
                {hint.label !== "状态" ? (
                  <span className="text-[0.58rem] leading-none text-slate-500">
                    {hint.label.split(" · ")[0]}
                  </span>
                ) : null}
                <span className="apple-hello-text mt-0.5 text-[1.05rem] tabular-nums leading-none">
                  {hint.label.includes(" · ") ? hint.label.split(" · ")[1] : hint.value}
                </span>
                {hint.label.includes(" · ") ? (
                  <span className="mt-0.5 text-[0.55rem] tabular-nums leading-none text-slate-500">
                    倒计时 {hint.value}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}

function getHint(
  hint: Action["hint"],
  countdown: HomeCountdown,
  now: number | null
) {
  if (hint === "feeding") {
    if (!now) {
      return countdown.feedingNextAt
        ? { label: "下次喂养", value: "计算中", active: false }
        : { label: "下次喂养", value: "现在", active: true };
    }

    return countdown.feedingNextAt
      ? formatCountdown("下次喂养", countdown.feedingNextAt, now)
      : { label: "下次喂养", value: "现在", active: true };
  }

  if (hint === "sleep") {
    if (!now) {
      if (countdown.sleepStartedAt)
        return { label: countdown.sleepExpectedEndAt ? `已睡 · ${formatClock(countdown.sleepExpectedEndAt)}` : "已睡", value: "计时中", active: false };
      return countdown.sleepNextAt
        ? { label: "预计睡眠", value: "计算中", active: false }
        : { label: "预计睡眠", value: "待记录", active: false };
    }

    if (countdown.sleepStartedAt) {
      if (countdown.sleepExpectedEndAt) {
        return formatCountdown("预计醒来", countdown.sleepExpectedEndAt, now);
      }
      return formatElapsed("已睡", countdown.sleepStartedAt, now);
    }

    return countdown.sleepNextAt
      ? formatCountdown("预计睡眠", countdown.sleepNextAt, now)
      : { label: "预计睡眠", value: "待记录", active: false };
  }

  if (hint === "diaper") {
    const diaperTimer = countdown.diaperNextPeeAt
      ? now
        ? formatCountdown("查尿布", countdown.diaperNextPeeAt, now)
        : { label: "查尿布", value: "计算中", active: false }
      : null;
    return {
      label: diaperTimer?.active ? diaperTimer.label : "今日尿布",
      value: diaperTimer?.active
        ? diaperTimer.value
        : `尿${countdown.diaperPeeToday} 便${countdown.diaperPoopToday}`,
      active: Boolean(diaperTimer?.active)
    };
  }

  if (hint === "temperature") {
    if (countdown.temperatureMeasuredToday) {
      return { label: "状态", value: "今日已测", active: false };
    }

    return { label: "状态", value: "今日未测", active: false };
  }

  if (hint === "medication") {
    if (!countdown.medicationTotalToday) return { label: "用药", value: "添加计划", active: false };
    if (!countdown.medicationNextAt) return { label: "用药", value: "今日完成", active: false };
    return now
      ? formatCountdown(countdown.medicationNextName || "下次用药", countdown.medicationNextAt, now)
      : { label: countdown.medicationNextName || "下次用药", value: "计算中", active: false };
  }

  if (countdown.weightMeasuredToday) {
    return { label: "状态", value: "今日已测", active: false };
  }

  return countdown.weightLastAt
    ? now
      ? {
          label: "状态",
          value: `未测 ${formatAgo(countdown.weightLastAt, now)}`,
          active: false
        }
      : {
          label: "状态",
          value: "今日未测",
          active: false
        }
    : { label: "状态", value: "今日未测", active: false };
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  });
}

function formatCountdown(label: string, iso: string, now: number) {
  const diffSeconds = Math.floor((new Date(iso).getTime() - now) / 1000);
  const clock = formatClock(iso);
  if (diffSeconds <= 0) {
    return {
      label: `${label} · ${clock}`,
      value: `超 ${formatTimer(Math.abs(diffSeconds))}`,
      active: true
    };
  }

  return {
    label: `${label} · ${clock}`,
    value: formatTimer(diffSeconds),
    active: true
  };
}

function formatElapsed(label: string, iso: string, now: number) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(iso).getTime()) / 1000)
  );
  return {
    label,
    value: formatTimer(elapsedSeconds),
    active: true
  };
}

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${minuteText}`;
  return `${minuteText}:${secondText}`;
}

function formatAgo(iso: string, now: number) {
  const diffSeconds = Math.max(
    0,
    Math.floor((now - new Date(iso).getTime()) / 1000)
  );
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffSeconds < 60) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)}h`;
  return `${Math.floor(diffMinutes / 1440)}天`;
}
