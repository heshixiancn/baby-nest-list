import { Client } from "@notionhq/client";
import {
  getNotionConfigError,
  getNotionRuntimeConfig
} from "@/lib/notion-config";
import {
  ITEM_GROUPS,
  type DatabaseFetchResult,
  type PurchaseRecord,
  type ShoppingItem,
  type ShoppingStatus
} from "@/types";

type NotionPage = {
  id: string;
  last_edited_time?: string;
  properties: Record<string, NotionProperty>;
};

type NotionProperty = {
  type?: string;
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  select?: { name?: string } | null;
  number?: number | null;
  url?: string | null;
  status?: { name?: string } | null;
  date?: { start?: string | null } | null;
};

type NotionPageUpdateProperties = NonNullable<
  Parameters<Client["pages"]["update"]>[0]["properties"]
>;
type NotionPageCreateProperties = NonNullable<
  Parameters<Client["pages"]["create"]>[0]["properties"]
>;

function getNotionContext() {
  const config = getNotionRuntimeConfig();
  return {
    ...config,
    notion: config.token ? new Client({ auth: config.token }) : null
  };
}

function missingConfigResult<T>(): DatabaseFetchResult<T> {
  return {
    data: [],
    missingConfig: true,
    error: getNotionConfigError() || "尚未配置 Notion 环境变量。"
  };
}

function hasConfig(databaseId?: string) {
  const { notion, token } = getNotionContext();
  return Boolean(notion && token && databaseId);
}

function textFromProperty(property: NotionProperty | undefined) {
  if (!property) return "";
  if (property.type === "title")
    return (property.title ?? []).map((item) => item.plain_text ?? "").join("");
  if (property.type === "rich_text") {
    return (property.rich_text ?? [])
      .map((item) => item.plain_text ?? "")
      .join("");
  }
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  if (property.type === "url") return property.url ?? "";
  return "";
}

function numberFromProperty(
  property: NotionProperty | undefined,
  fallback = 0
) {
  if (!property || property.type !== "number") return fallback;
  return property.number ?? fallback;
}

function selectOrStatus(property: NotionProperty | undefined) {
  if (!property) return "";
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  return "";
}

function dateFromProperty(property: NotionProperty | undefined) {
  if (!property || property.type !== "date") return "";
  return property.date?.start ?? "";
}

function mapShoppingPage(page: NotionPage): ShoppingItem {
  const properties = page.properties;
  return {
    id: page.id,
    name: textFromProperty(properties["物品名称"]),
    group: selectOrStatus(properties["类别"]),
    brandModel: textFromProperty(properties["品牌型号"]),
    unitPrice: numberFromProperty(properties["单价"]),
    quantity: numberFromProperty(properties["数量"], 1),
    unit: textFromProperty(properties["单位"]) || "件",
    platform: selectOrStatus(properties["购买平台"]),
    paymentMethod: selectOrStatus(properties["支付方式"]) || "现金",
    productUrl: textFromProperty(properties["商品链接"]),
    status: selectOrStatus(properties["状态"]) || "待购买",
    note: textFromProperty(properties["备注"]),
    updatedAt: page.last_edited_time ?? ""
  };
}

function mapPurchaseRecordPage(page: NotionPage): PurchaseRecord {
  const properties = page.properties;
  const unitPrice = numberFromProperty(properties["单价"]);
  const quantity = numberFromProperty(properties["数量"], 1);
  return {
    id: page.id,
    recordDate: dateFromProperty(properties["采购日期"]),
    name:
      textFromProperty(properties["记录名称"]) ||
      textFromProperty(properties["物品名称"]),
    group: selectOrStatus(properties["类别"]),
    brandModel: textFromProperty(properties["品牌型号"]),
    unitPrice,
    quantity,
    unit: textFromProperty(properties["单位"]) || "件",
    amount: numberFromProperty(properties["实付金额"], unitPrice * quantity),
    paymentMethod: selectOrStatus(properties["支付方式"]) || "现金",
    platform: selectOrStatus(properties["购买平台"]),
    productUrl: textFromProperty(properties["商品链接"]),
    sourceShoppingItemId: textFromProperty(properties["采购清单ID"]),
    note: textFromProperty(properties["备注"]),
    updatedAt: page.last_edited_time ?? ""
  };
}

async function queryAllDatabasePages(
  notion: Client,
  databaseId: string,
  options: Record<string, unknown>
) {
  const pages: NotionPage[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      ...options,
      start_cursor: startCursor
    });
    pages.push(
      ...response.results
        .filter((page) => "properties" in page)
        .map((page) => page as NotionPage)
    );
    startCursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (startCursor);

  return pages;
}

export async function getShoppingItems(): Promise<
  DatabaseFetchResult<ShoppingItem>
> {
  const { notion, shoppingDatabaseId } = getNotionContext();
  if (!hasConfig(shoppingDatabaseId)) return missingConfigResult();

  try {
    const pages = await queryAllDatabasePages(notion!, shoppingDatabaseId, {
      sorts: [
        { property: "类别", direction: "ascending" },
        { property: "状态", direction: "ascending" }
      ]
    });
    return { data: pages.map(mapShoppingPage) };
  } catch (error) {
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "读取采购清单失败，请检查 Notion 配置。"
    };
  }
}

export async function getPurchaseRecords(): Promise<
  DatabaseFetchResult<PurchaseRecord>
> {
  const { notion, purchaseRecordsDatabaseId } = getNotionContext();
  if (!hasConfig(purchaseRecordsDatabaseId)) return missingConfigResult();

  try {
    const pages = await queryAllDatabasePages(
      notion!,
      purchaseRecordsDatabaseId,
      {
        sorts: [{ property: "采购日期", direction: "descending" }]
      }
    );
    return { data: pages.map(mapPurchaseRecordPage) };
  } catch (error) {
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "读取采购记录失败，请检查 Notion 配置。"
    };
  }
}

export async function getShoppingGroupOptions() {
  const items = await getShoppingItems();
  const groups = items.data.map((item) => item.group).filter(Boolean);
  return groups.length > 0
    ? Array.from(new Set([...ITEM_GROUPS, ...groups]))
    : [...ITEM_GROUPS];
}

export async function addItemGroupOption(groupName: string) {
  const groups = await getShoppingGroupOptions();
  return Array.from(new Set([...groups, groupName.trim()].filter(Boolean)));
}

export async function updateItemGroupOrder(groupNames: string[]) {
  return Array.from(
    new Set(groupNames.map((groupName) => groupName.trim()).filter(Boolean))
  );
}

export async function createShoppingItem(input: {
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
}) {
  const { notion, shoppingDatabaseId } = getNotionContext();
  if (!notion || !shoppingDatabaseId)
    throw new Error(
      getNotionConfigError() || "尚未配置 Notion 采购清单数据库。"
    );

  const page = await notion.pages.create({
    parent: { database_id: shoppingDatabaseId },
    properties: shoppingItemProperties({
      id: "",
      name: input.name,
      group: input.group,
      brandModel: input.brandModel ?? "",
      unitPrice: input.unitPrice ?? 0,
      quantity: input.quantity ?? 1,
      unit: input.unit?.trim() || "件",
      platform: input.platform ?? "",
      paymentMethod: input.paymentMethod ?? "现金",
      productUrl: input.productUrl?.trim() || "",
      status: input.status ?? "待购买",
      note: input.note ?? "",
      updatedAt: ""
    })
  });

  return mapShoppingPage(page as NotionPage);
}

export async function updateShoppingItem(
  pageId: string,
  input: Partial<ShoppingItem>
) {
  const { notion } = getNotionContext();
  if (!notion)
    throw new Error(getNotionConfigError() || "尚未配置 NOTION_TOKEN。");

  const current = await notion.pages.retrieve({ page_id: pageId });
  const currentItem = mapShoppingPage(current as NotionPage);
  const nextItem = { ...currentItem, ...input };
  const page = await notion.pages.update({
    page_id: pageId,
    properties: shoppingItemProperties(nextItem) as NotionPageUpdateProperties
  });

  return mapShoppingPage(page as NotionPage);
}

export async function updateShoppingStatus(
  pageId: string,
  status: ShoppingStatus | string
) {
  const { notion } = getNotionContext();
  if (!notion)
    throw new Error(getNotionConfigError() || "尚未配置 NOTION_TOKEN。");

  await notion.pages.update({
    page_id: pageId,
    properties: { 状态: selectPropertyValue(status) }
  });
}

export async function archiveShoppingItem(pageId: string) {
  const { notion } = getNotionContext();
  if (!notion)
    throw new Error(getNotionConfigError() || "尚未配置 NOTION_TOKEN。");

  await notion.pages.update({ page_id: pageId, archived: true });
}

export async function createOrUpdateShoppingItemBackup(
  item: ShoppingItem,
  notionPageId?: string
) {
  const { notion, shoppingDatabaseId } = getNotionContext();
  if (!notion || !shoppingDatabaseId)
    throw new Error(
      getNotionConfigError() || "尚未配置 Notion 采购清单数据库。"
    );

  if (notionPageId) {
    const page = await notion.pages.update({
      page_id: notionPageId,
      properties: shoppingItemProperties(item) as NotionPageUpdateProperties
    });
    return page.id;
  }

  const page = await notion.pages.create({
    parent: { database_id: shoppingDatabaseId },
    properties: shoppingItemProperties(item)
  });
  return page.id;
}

function shoppingItemProperties(
  item: ShoppingItem
): NotionPageCreateProperties {
  return {
    物品名称: titleProperty(item.name),
    类别: selectPropertyValue(item.group),
    品牌型号: richTextProperty(item.brandModel),
    单价: { number: item.unitPrice },
    数量: { number: item.quantity },
    单位: richTextProperty(item.unit || "件"),
    购买平台: selectPropertyValue(item.platform),
    支付方式: selectPropertyValue(item.paymentMethod || "现金"),
    商品链接: { url: item.productUrl.trim() || null },
    状态: selectPropertyValue(item.status || "待购买"),
    备注: richTextProperty(item.note)
  };
}

function titleProperty(content: string) {
  return {
    title: content.trim()
      ? [{ type: "text" as const, text: { content: content.trim() } }]
      : []
  };
}

function richTextProperty(content: string) {
  return {
    rich_text: content.trim()
      ? [{ type: "text" as const, text: { content: content.trim() } }]
      : []
  };
}

function selectPropertyValue(value: string) {
  return {
    select: value.trim() ? { name: value.trim() } : null
  };
}
