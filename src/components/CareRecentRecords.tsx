"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CareRecordEditor } from "@/components/CareRecordEditor";

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
  const router = useRouter();
  const [items, setItems] = useState(records);
  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CareRecord | null>(null);
  const singleType = new Set(items.map((item) => item.type)).size === 1;

  useEffect(() => {
    setItems(records);
  }, [records]);

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
      router.refresh();
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
          <p className="apple-hello-text text-2xl">今日记录</p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/70">
          {items.length} 条
        </span>
      </div>

      {error ? <div className="record-error mt-4">{error}</div> : null}

      <div className="mt-4 overflow-hidden rounded-[1.5rem] ring-1 ring-white/70">
        {items.length > 0 ? (
          <div className="divide-y divide-white/70">
            {items
              .filter((record) => showAll || isToday(record.happenedAt))
              .slice(0, 30)
              .map((record) => (
                <div
                  key={`${record.type}-${record.id}`}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 bg-white/45 px-3 py-3 text-sm sm:grid-cols-[7rem_1fr_auto] sm:gap-4 sm:px-4"
                >
                  <div>
                    {!singleType ? (
                      <p className="font-medium text-slate-600">
                        {typeLabels[record.type] ?? record.type}
                      </p>
                    ) : null}
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
                  <div className="flex items-center gap-1">
                    <button
                      className="record-soft-button rounded-full px-2 py-1.5 text-xs font-medium sm:px-3"
                      type="button"
                      onClick={() => {
                        setError("");
                        setEditing(record);
                      }}
                    >
                      修改
                    </button>
                    <button
                      className="record-soft-button rounded-full px-2 py-1.5 text-xs font-medium sm:px-3"
                      type="button"
                      onClick={() => handleDelete(record)}
                      disabled={deletingId === record.id}
                    >
                      {deletingId === record.id ? "删除中" : "删除"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white/45 p-5 text-center text-sm text-slate-400">
            还没有记录
          </div>
        )}
      </div>
      {items.some((record) => !isToday(record.happenedAt)) ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="record-soft-button mt-3 w-full rounded-full px-4 py-2 text-sm font-medium"
        >
          {showAll ? "收起历史记录" : "查看更多历史记录"}
        </button>
      ) : null}
      {editing ? (
        <CareRecordEditor
          type={editing.type}
          id={editing.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function isToday(iso: string) {
  const value = new Date(iso).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai"
  });
  const today = new Date().toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai"
  });
  return value === today;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
