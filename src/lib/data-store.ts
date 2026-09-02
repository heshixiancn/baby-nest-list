import {
  getDatabaseProvider,
  isNotionSyncEnabled
} from "@/lib/data-source-config";
import {
  getMysqlConfigError,
  hasCompleteMysqlConfig
} from "@/lib/mysql-config";
import {
  getNotionConfigError,
  hasCompleteNotionDatabaseConfig
} from "@/lib/notion-config";
import * as mysqlStore from "@/lib/mysql";
import * as notionStore from "@/lib/notion";
import {
  type DatabaseFetchResult,
  type ShoppingItem,
  type ShoppingStatus
} from "@/types";

type ShoppingItemInput = {
  name: string;
  group: string;
  brandModel?: string;
  unitPrice?: number;
  quantity?: number;
  unit?: string;
  platform?: string;
  paymentMethod?: string;
  productUrl?: string;
  status?: ShoppingStatus | string;
  note?: string;
};

type ShoppingItemPatch = Partial<ShoppingItemInput>;

export function hasCompletePrimaryDatabaseConfig() {
  return getDatabaseProvider() === "notion"
    ? hasCompleteNotionDatabaseConfig()
    : hasCompleteMysqlConfig();
}

export function getPrimaryDatabaseConfigError() {
  return getDatabaseProvider() === "notion"
    ? getNotionConfigError()
    : getMysqlConfigError();
}

export function getPrimaryDatabaseLabel() {
  return getDatabaseProvider() === "notion" ? "Notion" : "MySQL";
}

export async function getShoppingItems(): Promise<
  DatabaseFetchResult<ShoppingItem>
> {
  if (getDatabaseProvider() === "notion") return notionStore.getShoppingItems();

  const result = await mysqlStore.getShoppingItems();
  if (!result.error) return result;

  if (hasCompleteNotionDatabaseConfig()) {
    const fallbackResult = await notionStore.getShoppingItems();
    if (!fallbackResult.error) {
      return {
        ...fallbackResult,
        error: `MySQL 暂时不可用，当前显示 Notion 备库数据。原始错误：${result.error}`
      };
    }
  }

  return result;
}

export async function getShoppingGroupOptions() {
  if (getDatabaseProvider() === "notion")
    return notionStore.getShoppingGroupOptions();

  const groups = await mysqlStore.getShoppingGroupOptions();
  return groups.length > 0 ? groups : notionStore.getShoppingGroupOptions();
}

export async function addItemGroupOption(groupName: string) {
  if (getDatabaseProvider() === "notion")
    return notionStore.addItemGroupOption(groupName);

  const groups = await mysqlStore.addItemGroupOption(groupName);
  await syncBestEffort(() => notionStore.addItemGroupOption(groupName));
  return groups;
}

export async function updateItemGroupOrder(groupNames: string[]) {
  if (getDatabaseProvider() === "notion")
    return notionStore.updateItemGroupOrder(groupNames);

  const groups = await mysqlStore.updateItemGroupOrder(groupNames);
  await syncBestEffort(() => notionStore.updateItemGroupOrder(groupNames));
  return groups;
}

export async function createShoppingItem(input: ShoppingItemInput) {
  if (getDatabaseProvider() === "notion")
    return notionStore.createShoppingItem(input);

  const item = await mysqlStore.createShoppingItem(input);
  await syncShoppingItemToNotion(item);
  return item;
}

export async function updateShoppingItem(id: string, input: ShoppingItemPatch) {
  if (getDatabaseProvider() === "notion")
    return notionStore.updateShoppingItem(id, input);

  const item = await mysqlStore.updateShoppingItem(id, input);
  await syncShoppingItemToNotion(item);
  return item;
}

export async function updateShoppingStatus(
  id: string,
  status: ShoppingStatus | string
) {
  if (getDatabaseProvider() === "notion")
    return notionStore.updateShoppingStatus(id, status);

  await mysqlStore.updateShoppingStatus(id, status);
  const item = await mysqlStore.getShoppingItemById(id);
  await syncShoppingItemToNotion(item);
}

export async function archiveShoppingItem(id: string) {
  if (getDatabaseProvider() === "notion")
    return notionStore.archiveShoppingItem(id);

  const notionPageId = await mysqlStore.getShoppingItemNotionPageId(id);
  await mysqlStore.archiveShoppingItem(id);
  await syncBestEffort(() =>
    notionPageId
      ? notionStore.archiveShoppingItem(notionPageId)
      : Promise.resolve()
  );
}

async function syncShoppingItemToNotion(item: ShoppingItem) {
  await syncBestEffort(async () => {
    const notionPageId = await mysqlStore.getShoppingItemNotionPageId(item.id);
    const nextPageId = await notionStore.createOrUpdateShoppingItemBackup(
      item,
      notionPageId
    );
    if (nextPageId && nextPageId !== notionPageId) {
      await mysqlStore.setShoppingItemNotionPageId(item.id, nextPageId);
    }
  });
}

async function syncBestEffort(action: () => Promise<unknown>) {
  if (!isNotionSyncEnabled() || !hasCompleteNotionDatabaseConfig()) return;

  try {
    await action();
  } catch (error) {
    console.warn("Notion backup sync failed", error);
  }
}
