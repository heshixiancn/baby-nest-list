import { ShoppingListTable } from "@/components/ShoppingListTable";
import {
  getPrimaryDatabaseConfigError,
  getPrimaryDatabaseLabel,
  getShoppingGroupOptions,
  getShoppingItems,
  hasCompletePrimaryDatabaseConfig
} from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function ShoppingListPage() {
  if (!hasCompletePrimaryDatabaseConfig()) {
    return (
      <main className="page-shell">
        <section className="panel p-5 text-sm text-slate-600">
          当前主数据源是 {getPrimaryDatabaseLabel()}。
          {getPrimaryDatabaseConfigError()}
        </section>
      </main>
    );
  }

  const [result, groupOptions] = await Promise.all([
    getShoppingItems(),
    getShoppingGroupOptions()
  ]);

  return (
    <main className="page-shell space-y-4">
      {result.error ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">采购清单暂时无法读取</p>
          <p className="mt-1">{result.error}</p>
        </section>
      ) : null}

      <ShoppingListTable items={result.data} groupOptions={groupOptions} />
    </main>
  );
}
