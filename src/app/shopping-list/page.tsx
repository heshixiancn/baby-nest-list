import { ShoppingListTable } from "@/components/ShoppingListTable";
import { NotionSetupGuide } from "@/components/NotionSetupGuide";
import { hasExistingNotionDatabaseConfig } from "@/lib/notion-config";
import { getShoppingGroupOptions, getShoppingItems } from "@/lib/notion";

export const dynamic = "force-dynamic";

export default async function ShoppingListPage() {
  if (!hasExistingNotionDatabaseConfig()) {
    return (
      <main className="page-shell">
        <NotionSetupGuide />
      </main>
    );
  }

  const [result, groupOptions] = await Promise.all([getShoppingItems(), getShoppingGroupOptions()]);

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
