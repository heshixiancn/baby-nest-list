"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MedicationPlan, MedicationRecord } from "@/lib/mysql";

type Dose = {
  plan: MedicationPlan;
  time: string;
  scheduledAt: string;
  record?: MedicationRecord;
};

const methods = ["口服", "滴剂", "外用", "雾化", "其他"];

export function MedicationDashboard({
  plans,
  records,
  initialError
}: {
  plans: MedicationPlan[];
  records: MedicationRecord[];
  initialError?: string;
}) {
  const router = useRouter();
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState(initialError ?? "");
  const [times, setTimes] = useState(["08:00"]);
  const todayKey = shanghaiDateKey(new Date());
  const todayDoses = useMemo(
    () => buildTodayDoses(plans, records, todayKey),
    [plans, records, todayKey]
  );
  const completed = todayDoses.filter((dose) => dose.record?.status === "taken").length;

  async function post(payload: Record<string, unknown>, key: string) {
    if (busyKey) return;
    setBusyKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/care/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "操作失败，请稍后重试。");
      setMessage(payload.action === "createPlan" ? "用药计划已保存" : "用药状态已记录");
      setShowPlanForm(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <main className="page-shell min-h-screen pb-12 pt-4 md:pt-8">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/55 p-5 shadow-2xl shadow-indigo-100/50 backdrop-blur-2xl md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">Medication</p>
              <h1 className="apple-hello-text mt-1 text-3xl md:text-4xl">今日用药</h1>
              <p className="mt-2 text-sm text-slate-500">{completed}/{todayDoses.length} 次已完成</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPlanForm((value) => !value)}
              className="rounded-full bg-gradient-to-r from-emerald-200/90 via-cyan-200/90 to-violet-200/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg shadow-indigo-100/60 ring-1 ring-white"
            >
              {showPlanForm ? "收起" : "+ 添加计划"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {todayDoses.length ? todayDoses.map((dose) => {
              const key = `${dose.plan.id}-${dose.time}`;
              const done = dose.record?.status === "taken";
              const skipped = dose.record?.status === "skipped";
              return (
                <article key={key} className="rounded-[1.55rem] border border-white/90 bg-white/55 p-4 shadow-[0_12px_35px_rgba(148,163,184,0.12)] backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${done ? "bg-emerald-100" : skipped ? "bg-slate-100" : "bg-gradient-to-br from-pink-100 to-violet-100"}`}>💊</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h2 className="truncate text-lg font-semibold text-slate-700">{dose.plan.name}</h2>
                        <time className="font-mono text-xl font-medium text-slate-600">{dose.time}</time>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{dose.plan.dosage} · {dose.plan.administrationMethod}</p>
                      {dose.plan.instructions ? <p className="mt-1 truncate text-xs text-slate-400">{dose.plan.instructions}</p> : null}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      disabled={Boolean(dose.record) || Boolean(busyKey)}
                      onClick={() => post(dosePayload(dose, "skipped"), `${key}-skip`)}
                      className="rounded-2xl border border-white bg-white/65 py-2.5 text-sm font-medium text-slate-500 disabled:opacity-50"
                    >{skipped ? "已跳过" : "跳过"}</button>
                    <button
                      disabled={Boolean(dose.record) || Boolean(busyKey)}
                      onClick={() => post(dosePayload(dose, "taken"), `${key}-take`)}
                      className="rounded-2xl bg-gradient-to-r from-emerald-200 to-indigo-200 py-2.5 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50"
                    >{done ? "✓ 已服用" : "标记已服用"}</button>
                  </div>
                </article>
              );
            }) : (
              <div className="col-span-full rounded-[1.5rem] border border-dashed border-indigo-200 bg-white/35 px-5 py-9 text-center text-slate-500">
                <div className="text-4xl">💊</div>
                <p className="mt-3">今天还没有用药安排</p>
                <p className="mt-1 text-xs text-slate-400">添加计划后会按设定时间提醒</p>
              </div>
            )}
          </div>
        </section>

        {showPlanForm ? (
          <MedicationPlanForm times={times} setTimes={setTimes} busy={Boolean(busyKey)} onSave={(payload) => post(payload, "plan")} />
        ) : null}

        <section className="rounded-[2rem] border border-white/80 bg-white/55 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-2xl md:p-7">
          <div className="flex items-center justify-between">
            <h2 className="apple-hello-text text-2xl">用药记录</h2>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-slate-500">最近 {Math.min(records.length, 20)} 条</span>
          </div>
          <div className="mt-4 divide-y divide-white/80">
            {records.slice(0, 20).map((record) => (
              <div key={record.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
                <span className={`h-2.5 w-2.5 rounded-full ${record.status === "taken" ? "bg-emerald-400" : "bg-slate-300"}`} />
                <div>
                  <p className="font-medium text-slate-700">{record.medicationName} <span className="font-normal text-slate-400">{record.dosage}</span></p>
                  <p className="text-xs text-slate-400">{formatDateTime(record.scheduledAt)} · {record.administrationMethod}</p>
                </div>
                <span className="text-sm text-slate-500">{record.status === "taken" ? "已服用" : "已跳过"}</span>
              </div>
            ))}
            {!records.length ? <p className="py-8 text-center text-sm text-slate-400">暂无实际用药记录</p> : null}
          </div>
        </section>

        {message ? <div className="sticky bottom-4 mx-auto w-fit rounded-full bg-slate-800/85 px-4 py-2 text-sm text-white shadow-xl backdrop-blur-xl">{message}</div> : null}
        <Link href="/" className="mx-auto block w-fit rounded-full bg-white/65 px-6 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-white">返回首页</Link>
      </div>
    </main>
  );
}

function MedicationPlanForm({ times, setTimes, busy, onSave }: { times: string[]; setTimes: (times: string[]) => void; busy: boolean; onSave: (payload: Record<string, unknown>) => void }) {
  const today = shanghaiDateKey(new Date());
  return (
    <form className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-xl backdrop-blur-2xl md:p-7" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      onSave({ action: "createPlan", name: data.get("name"), dosage: data.get("dosage"), administrationMethod: data.get("method"), startDate: data.get("startDate"), endDate: data.get("endDate"), instructions: data.get("instructions"), reminderTimes: times });
    }}>
      <h2 className="apple-hello-text text-2xl">添加用药计划</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="药品名称"><input required name="name" placeholder="例如：维生素 D3" className="glass-input" /></Field>
        <Field label="每次剂量"><input required name="dosage" placeholder="例如：1 滴 / 2.5 ml" className="glass-input" /></Field>
        <Field label="开始日期"><input required name="startDate" type="date" defaultValue={today} className="glass-input" /></Field>
        <Field label="结束日期（可不填）"><input name="endDate" type="date" className="glass-input" /></Field>
      </div>
      <fieldset className="mt-4"><legend className="text-sm font-medium text-slate-500">用药方式</legend><div className="mt-2 grid grid-cols-5 gap-2">{methods.map((method, index) => <label key={method} className="cursor-pointer"><input type="radio" name="method" value={method} defaultChecked={index === 0} className="peer sr-only" /><span className="block rounded-xl bg-white/65 px-1 py-2 text-center text-sm text-slate-500 ring-1 ring-white peer-checked:bg-gradient-to-r peer-checked:from-emerald-200 peer-checked:to-indigo-200 peer-checked:text-slate-700">{method}</span></label>)}</div></fieldset>
      <fieldset className="mt-4"><legend className="text-sm font-medium text-slate-500">每日提醒时间</legend><div className="mt-2 flex flex-wrap gap-2">{times.map((time, index) => <div key={index} className="flex items-center rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-white"><input type="time" value={time} onChange={(event) => setTimes(times.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="bg-transparent font-mono text-slate-600 outline-none" />{times.length > 1 ? <button type="button" onClick={() => setTimes(times.filter((_, itemIndex) => itemIndex !== index))} className="ml-2 text-slate-400">×</button> : null}</div>)}<button type="button" onClick={() => setTimes([...times, "20:00"])} className="rounded-2xl bg-indigo-50/80 px-4 py-2 text-sm text-indigo-500">+ 时间</button></div></fieldset>
      <Field label="用药说明（可不填）"><input name="instructions" placeholder="例如：喂奶后服用" className="glass-input" /></Field>
      <button disabled={busy} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-200 via-cyan-200 to-violet-200 py-3.5 font-semibold text-slate-700 shadow-lg disabled:opacity-50">保存用药计划</button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-4 block text-sm font-medium text-slate-500">{label}<span className="mt-2 block">{children}</span></label>; }
function shanghaiDateKey(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function buildTodayDoses(plans: MedicationPlan[], records: MedicationRecord[], dateKey: string): Dose[] {
  const activePlans = plans.filter((plan) => plan.active && plan.startDate <= dateKey && (!plan.endDate || plan.endDate >= dateKey));
  return activePlans.flatMap((plan) => plan.reminderTimes.map((time) => {
    const scheduledAt = new Date(`${dateKey}T${time}:00+08:00`).toISOString();
    const record = records.find((item) => item.planId === plan.id && Math.abs(new Date(item.scheduledAt).getTime() - new Date(scheduledAt).getTime()) < 60000);
    return { plan, time, scheduledAt, record };
  })).sort((a, b) => a.time.localeCompare(b.time));
}
function dosePayload(dose: Dose, status: "taken" | "skipped") { return { action: "recordDose", planId: dose.plan.id, medicationName: dose.plan.name, dosage: dose.plan.dosage, administrationMethod: dose.plan.administrationMethod, scheduledAt: dose.scheduledAt, status }; }
function formatDateTime(iso: string) { return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)); }
