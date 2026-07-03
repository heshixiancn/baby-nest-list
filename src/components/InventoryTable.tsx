"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/FilterBar";
import { ITEM_GROUPS, INVENTORY_STATUSES, type InventoryItem } from "@/types";
import { cn, formatNumber, normalizeText } from "@/lib/utils";

interface InventoryTableProps {
  items: InventoryItem[];
  groupOptions: string[];
}

const statusTone: Record<string, string> = {
  正常: "bg-green-100 text-green-800",
  需要补货: "bg-amber-100 text-amber-800",
  已下单: "bg-sky-100 text-sky-800",
  已停用: "bg-slate-100 text-slate-500"
};

export function InventoryTable({ items, groupOptions }: InventoryTableProps) {
  const router = useRouter();
  const groups = useMemo(() => (groupOptions.length > 0 ? groupOptions : [...ITEM_GROUPS]), [groupOptions]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [localItems, setLocalItems] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const keyword = normalizeText(search);
    return localItems.filter((item) => {
      const matchesSearch =
        !keyword ||
        normalizeText(item.name).includes(keyword) ||
        normalizeText(item.preferredBrandModel).includes(keyword);
      return matchesSearch && (!group || item.group === group) && (!status || item.status === status);
    });
  }, [group, localItems, search, status]);

  const groupedItems = useMemo(() => {
    const knownGroups = groups.filter((groupName) => filteredItems.some((item) => item.group === groupName));

    return knownGroups.map((groupName) => ({
      group: groupName,
      items: filteredItems.filter((item) => item.group === groupName)
    }));
  }, [filteredItems, groups]);

  const replenishItems = filteredItems.filter((item) => item.status === "需要补货");

  async function patchItem(
    itemId: string,
    endpoint: "stock" | "status",
    body: Record<string, string | number>
  ) {
    setError("");
    setPendingId(itemId);
    const previousItems = localItems;

    try {
      const response = await fetch(`/api/inventory/${itemId}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "库存更新失败。");
      }

      startTransition(() => router.refresh());
    } catch (updateError) {
      setLocalItems(previousItems);
      setError(updateError instanceof Error ? updateError.message : "库存更新失败。");
    } finally {
      setPendingId(null);
    }
  }

  function handleStockChange(itemId: string, value: string, fallbackStock: number) {
    if (value.trim() === "") return;
    const nextStock = Number(value);
    if (Number.isNaN(nextStock) || nextStock < 0 || nextStock === fallbackStock) return;

    setLocalItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const nextStatus =
          nextStock <= item.minimumStock && item.rawStatus !== "已下单" && item.rawStatus !== "已停用"
            ? "需要补货"
            : item.rawStatus;
        return { ...item, currentStock: nextStock, status: nextStatus };
      })
    );
    void patchItem(itemId, "stock", { currentStock: nextStock });
  }

  function handleStatusChange(itemId: string, nextStatus: string) {
    setLocalItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, status: nextStatus, rawStatus: nextStatus } : item
      )
    );
    void patchItem(itemId, "status", { status: nextStatus });
  }

  return (
    <div className="space-y-4">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={[
          { label: "分组", value: group, options: groups, onChange: setGroup },
          { label: "状态", value: status, options: INVENTORY_STATUSES, onChange: setStatus }
        ]}
      />

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {replenishItems.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {replenishItems.map((item) => (
            <article key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-amber-700">{item.group || "未分组"}</p>
                  <h3 className="mt-1 font-semibold text-slate-900">{item.name || "未命名"}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.preferredBrandModel || "未填写常用品牌型号"}</p>
                </div>
                <span className="badge bg-amber-100 text-amber-800">需要补货</span>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                当前 {formatNumber(item.currentStock)}
                {item.unit}，最低库存 {formatNumber(item.minimumStock)}
                {item.unit}
              </p>
              {item.preferredUrl ? (
                <a className="btn mt-3 h-8 bg-white" href={item.preferredUrl} target="_blank" rel="noreferrer">
                  去复购
                </a>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-base font-semibold text-slate-900">库存管理</h2>
          <p className="text-sm text-slate-500">当前筛选 {filteredItems.length} 项，按分组独立展示</p>
        </div>

        {groupedItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">暂无符合条件的库存物品。</div>
        ) : (
          <div className="space-y-5 p-4">
            {groupedItems.map((section) => (
              <section key={section.group} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">{section.group || "未分组"}</h3>
                  <p className="mt-1 text-xs text-slate-500">{section.items.length} 项</p>
                </div>
                <div className="space-y-3 p-4 md:hidden">
                  {section.items.map((item) => (
                    <article
                      key={item.id}
                      className={cn(
                        "rounded-lg border border-slate-200 bg-white p-4",
                        item.status === "已停用" && "bg-slate-50 text-slate-400"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900">{item.name || "未命名"}</h4>
                          <p className="mt-1 text-sm text-slate-500">{item.preferredBrandModel || "未填写常用品牌型号"}</p>
                        </div>
                        <span className={cn("badge shrink-0", statusTone[item.status] ?? "bg-slate-100 text-slate-700")}>
                          {item.status}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">当前库存</dt>
                          <dd className="mt-1 font-medium text-slate-800">
                            {formatNumber(item.currentStock)}
                            {item.unit}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">最低库存</dt>
                          <dd className="mt-1 font-medium text-slate-800">
                            {formatNumber(item.minimumStock)}
                            {item.unit}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">月均消耗</dt>
                          <dd className="mt-1 font-medium text-slate-800">
                            {formatNumber(item.monthlyUsage)}
                            {item.unit}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">常用平台</dt>
                          <dd className="mt-1 font-medium text-slate-800">{item.preferredPlatform || "-"}</dd>
                        </div>
                      </dl>
                      <div className="mt-4 grid gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="shrink-0">库存</span>
                          <input
                            className="field h-10 min-w-0 flex-1"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={item.currentStock}
                            disabled={pendingId === item.id || isPending}
                            onBlur={(event) => {
                              if (event.currentTarget.value.trim() === "") {
                                event.currentTarget.value = String(item.currentStock);
                                return;
                              }
                              handleStockChange(item.id, event.currentTarget.value, item.currentStock);
                            }}
                          />
                          <span className="shrink-0">{item.unit}</span>
                        </label>
                        <select
                          className="field h-10 w-full"
                          value={item.rawStatus}
                          disabled={pendingId === item.id || isPending}
                          onChange={(event) => handleStatusChange(item.id, event.target.value)}
                        >
                          {INVENTORY_STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {item.preferredUrl ? (
                          <a className="btn h-10 w-full" href={item.preferredUrl} target="_blank" rel="noreferrer">
                            复购
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-[1080px] w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-white text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">消耗品名称</th>
                        <th className="px-4 py-3">当前库存</th>
                        <th className="px-4 py-3">最低库存</th>
                        <th className="px-4 py-3">月均消耗</th>
                        <th className="px-4 py-3">常用品牌型号</th>
                        <th className="px-4 py-3">常用平台</th>
                        <th className="px-4 py-3">状态</th>
                        <th className="px-4 py-3">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {section.items.map((item) => (
                        <tr
                          key={item.id}
                          className={cn("align-top", item.status === "已停用" && "bg-slate-50 text-slate-400")}
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">{item.name || "未命名"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                className="field h-9 w-24"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={item.currentStock}
                                disabled={pendingId === item.id || isPending}
                                onBlur={(event) => {
                                  if (event.currentTarget.value.trim() === "") {
                                    event.currentTarget.value = String(item.currentStock);
                                    return;
                                  }
                                  handleStockChange(item.id, event.currentTarget.value, item.currentStock);
                                }}
                              />
                              <span>{item.unit}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(item.minimumStock)}
                            {item.unit}
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(item.monthlyUsage)}
                            {item.unit}
                          </td>
                          <td className="px-4 py-3">{item.preferredBrandModel || "-"}</td>
                          <td className="px-4 py-3">{item.preferredPlatform || "-"}</td>
                          <td className="px-4 py-3">
                            <select
                              className="field h-9 min-w-24"
                              value={item.rawStatus}
                              disabled={pendingId === item.id || isPending}
                              onChange={(event) => handleStatusChange(item.id, event.target.value)}
                            >
                              {INVENTORY_STATUSES.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <span className={cn("badge", statusTone[item.status] ?? "bg-slate-100 text-slate-700")}>
                                {item.status}
                              </span>
                              {item.preferredUrl ? (
                                <a className="btn h-8" href={item.preferredUrl} target="_blank" rel="noreferrer">
                                  复购
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
