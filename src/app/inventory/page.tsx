import { InventoryTable } from "@/components/InventoryTable";
import { getInventoryGroupOptions, getInventoryItems } from "@/lib/notion";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [result, groupOptions] = await Promise.all([getInventoryItems(), getInventoryGroupOptions()]);

  return (
    <main className="page-shell space-y-5">
      <section>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">消耗品库存管理</h1>
        <p className="mt-2 text-sm text-slate-600">
          按分组管理纸尿裤、棉柔巾、湿巾、奶粉、洗护用品等持续消耗品，库存低于最低库存时自动提示补货。
        </p>
      </section>

      {result.error ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">库存清单暂时无法读取</p>
          <p className="mt-1">{result.error}</p>
        </section>
      ) : null}

      <InventoryTable items={result.data} groupOptions={groupOptions} />
    </main>
  );
}
