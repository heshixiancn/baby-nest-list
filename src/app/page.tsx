import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { getInventoryItems, getItemGroupOptions, getShoppingItems } from "@/lib/notion";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [shoppingResult, inventoryResult, groupOptions] = await Promise.all([
    getShoppingItems(),
    getInventoryItems(),
    getItemGroupOptions()
  ]);
  const shoppingItems = shoppingResult.data;
  const inventoryItems = inventoryResult.data;

  const todoItems = shoppingItems.filter((item) => item.status === "待购买");
  const orderedItems = shoppingItems.filter((item) => item.status === "已下单");
  const arrivedItems = shoppingItems.filter((item) => item.status === "已到货");
  const replenishItems = inventoryItems.filter((item) => item.status === "需要补货");
  const totalAmount = shoppingItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const errors = [shoppingResult.error, inventoryResult.error].filter(Boolean);
  const groupSummaries = groupOptions.map((group) => {
    const shoppingInGroup = shoppingItems.filter((item) => item.group === group);
    const inventoryInGroup = inventoryItems.filter((item) => item.group === group);
    const pending = shoppingInGroup.filter((item) => item.status === "待购买").length;
    const replenish = inventoryInGroup.filter((item) => item.status === "需要补货").length;
    const total = shoppingInGroup.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return { group, pending, replenish, total };
  }).filter((item) => item.pending > 0 || item.replenish > 0 || item.total > 0);

  return (
    <main className="page-shell space-y-6">
      <section>
        <p className="text-sm font-medium text-amber-700">开心の清单</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
          待产包与宝宝 0-1 个月用品管理
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          采购清单、购买状态、消耗品库存和补货提醒集中管理，数据源来自 Notion。
        </p>
      </section>

      {errors.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">当前无法完整读取 Notion 数据</p>
          <p className="mt-1">{errors[0]}</p>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="待购买数量" value={todoItems.length} tone="amber" />
        <StatCard title="已下单数量" value={orderedItems.length} tone="blue" />
        <StatCard title="已到货数量" value={arrivedItems.length} tone="green" />
        <StatCard title="采购清单总金额" value={formatCurrency(totalAmount)} tone="slate" />
        <StatCard title="需要补货" value={replenishItems.length} tone="rose" />
      </section>

      <section>
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">分组看板</h2>
            <p className="mt-1 text-sm text-slate-500">按分组汇总待购买数量、需要补货数量和采购金额。</p>
          </div>
          {groupSummaries.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">暂无分组数据。</p>
          ) : (
            <div>
              <div className="divide-y divide-slate-100 md:hidden">
                {groupSummaries.map((item) => (
                  <article key={item.group} className="px-4 py-3">
                    <h3 className="font-medium text-slate-900">{item.group}</h3>
                    <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">待购买</dt>
                        <dd className="mt-1 font-semibold text-slate-900">{item.pending}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">补货</dt>
                        <dd className="mt-1 font-semibold text-slate-900">{item.replenish}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">金额</dt>
                        <dd className="mt-1 font-semibold text-slate-900">{formatCurrency(item.total)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">分组</th>
                      <th className="px-4 py-3">待购买</th>
                      <th className="px-4 py-3">需要补货</th>
                      <th className="px-4 py-3">采购金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupSummaries.map((item) => (
                      <tr key={item.group}>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.group}</td>
                        <td className="px-4 py-3 text-slate-600">{item.pending}</td>
                        <td className="px-4 py-3 text-slate-600">{item.replenish}</td>
                        <td className="px-4 py-3 text-slate-600">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DashboardList
          title="待购买清单"
          emptyText="暂无待购买物品。"
          items={todoItems.slice(0, 8).map((item) => ({
            id: item.id,
            title: item.name || "未命名",
            meta: item.group || "未分组"
          }))}
          href="/shopping-list"
        />
        <DashboardList
          title="需要补货清单"
          emptyText="暂无需要补货的消耗品。"
          items={replenishItems.slice(0, 8).map((item) => ({
            id: item.id,
            title: item.name || "未命名",
            meta: `当前 ${item.currentStock}${item.unit} · 最低 ${item.minimumStock}${item.unit}`
          }))}
          href="/inventory"
        />
        <DashboardList
          title="最近已下单清单"
          emptyText="暂无已下单物品。"
          items={orderedItems.slice(0, 8).map((item) => ({
            id: item.id,
            title: item.name || "未命名",
            meta: `${item.group || "未分组"} · ${item.platform || "未填写平台"}`
          }))}
          href="/shopping-list"
        />
      </section>
    </main>
  );
}

function DashboardList({
  title,
  emptyText,
  items,
  href
}: {
  title: string;
  emptyText: string;
  items: Array<{ id: string; title: string; meta: string }>;
  href: string;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <Link href={href} className="text-sm font-medium text-amber-700 hover:underline">
          查看
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
