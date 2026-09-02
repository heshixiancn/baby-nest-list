"use client";

import { useState } from "react";

type CareRecord = {
  id: string;
  type: string;
  happenedAt: string;
  title: string;
  detail: string;
};

const typeLabels: Record<string, string> = {
  feeding: "喂养",
  diaper: "尿布",
  temperature: "体温",
  weight: "体重",
  sleep: "睡眠"
};

export function CareRecentRecords({ records }: { records: CareRecord[] }) {
  const [items, setItems] = useState(records);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  async function handleDelete(record: CareRecord) {
    if (!window.confirm(`删除这条${typeLabels[record.type] ?? "记录"}？`))
      return;
    setDeletingId(record.id);
    setError("");
    try {
      const response = await fetch("/api/care/records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: record.type, id: record.id })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "删除失败。");
      setItems((current) => current.filter((item) => item.id !== record.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除失败。"
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">最近记录</p>
          <h2 className="apple-hello-text mt-1 text-3xl">明细与纠错</h2>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/70">
          {items.length} 条
        </span>
      </div>

      {error ? <div className="record-error mt-4">{error}</div> : null}

      <div className="mt-4 overflow-hidden rounded-[1.5rem] ring-1 ring-white/70">
        {items.length > 0 ? (
          <div className="divide-y divide-white/70">
            {items.slice(0, 30).map((record) => (
              <div
                key={`${record.type}-${record.id}`}
                className="grid grid-cols-[7rem_1fr_auto] items-center gap-4 bg-white/45 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-600">
                    {typeLabels[record.type] ?? record.type}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(record.happenedAt)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">
                    {record.title}
                  </p>
                  {record.detail ? (
                    <p className="truncate text-xs text-slate-500">
                      {record.detail}
                    </p>
                  ) : null}
                </div>
                <button
                  className="record-soft-button rounded-full px-3 py-1.5 text-xs font-medium"
                  type="button"
                  onClick={() => handleDelete(record)}
                  disabled={deletingId === record.id}
                >
                  {deletingId === record.id ? "删除中" : "删除"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/45 p-5 text-center text-sm text-slate-400">
            还没有记录
          </div>
        )}
      </div>
    </section>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
