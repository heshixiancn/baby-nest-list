import { Client } from "@notionhq/client";
import { getNotionRuntimeConfig } from "@/lib/notion-config";
import {
  ITEM_GROUPS,
  type NotionFetchResult,
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
  date?: { start?: string | null; end?: string | null } | null;
};

const selectColors = ["yellow", "green", "blue", "pink", "purple", "orange", "brown", "red", "gray"] as const;
type SelectColor = (typeof selectColors)[number] | "default";

type NotionDatabaseProperty = {
  type?: string;
  select?: {
    options?: Array<{ name?: string; color?: SelectColor }>;
  };
};
type NotionPageUpdateProperties = NonNullable<Parameters<Client["pages"]["update"]>[0]["properties"]>;

function getNotionContext() {
  const config = getNotionRuntimeConfig();
  return {
    ...config,
    notion: config.token ? new Client({ auth: config.token }) : null
  };
}

function textFromProperty(property: NotionProperty | undefined) {
  if (!property) return "";
  if (property.type === "title") {
    return (property.title ?? []).map((item) => item.plain_text ?? "").join("");
  }
  if (property.type === "rich_text") {
    return (property.rich_text ?? []).map((item) => item.plain_text ?? "").join("");
  }
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  if (property.type === "url") return property.url ?? "";
  return "";
}

function numberFromProperty(property: NotionProperty | undefined) {
  if (!property || property.type !== "number") return 0;
  return property.number ?? 0;
}

function urlFromProperty(property: NotionProperty | undefined) {
  if (!property || property.type !== "url") return "";
  return property.url ?? "";
}

function dateFromProperty(property: NotionProperty | undefined) {
  if (!property || property.type !== "date") return "";
  return property.date?.start ?? "";
}

function selectOrStatus(property: NotionProperty | undefined) {
  if (!property) return "";
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  return "";
}

function hasConfig(databaseId?: string) {
  const { notion, token } = getNotionContext();
  return Boolean(notion && token && databaseId);
}

function missingConfigResult<T>(): NotionFetchResult<T> {
  return {
    data: [],
    missingConfig: true,
    error: "尚未配置 Notion 环境变量。请在 .env.local 中填写 NOTION_TOKEN 和数据库 ID。"
  };
}

function selectOptionsFromDatabaseProperty(property: unknown) {
  const typedProperty = property as NotionDatabaseProperty | undefined;
  if (!typedProperty || typedProperty.type !== "select") return [];

  return Array.from(
    new Set((typedProperty.select?.options ?? []).map((option) => option.name ?? "").filter(Boolean))
  );
}

async function getDatabaseSelectOptions(databaseId: string | undefined, propertyName: string) {
  const { notion, token } = getNotionContext();
  if (!notion || !token || !databaseId) return [];

  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    if (!("properties" in database)) return [];
    return selectOptionsFromDatabaseProperty(database.properties[propertyName]);
  } catch {
    return [];
  }
}

function withDefaultGroups(options: string[]) {
  if (options.length > 0) return options;
  return [...ITEM_GROUPS];
}

export function mapShoppingPage(page: NotionPage): ShoppingItem {
  const properties = page.properties;
  return {
    id: page.id,
    name: textFromProperty(properties["物品名称"]),
    group: selectOrStatus(properties["类别"]),
    brandModel: textFromProperty(properties["品牌型号"]),
    unitPrice: numberFromProperty(properties["单价"]),
    quantity: numberFromProperty(properties["数量"]),
    unit: textFromProperty(properties["单位"]) || "件",
    platform: selectOrStatus(properties["购买平台"]),
    paymentMethod: selectOrStatus(properties["支付方式"]) || "现金",
    productUrl: urlFromProperty(properties["商品链接"]),
    status: selectOrStatus(properties["状态"]) || "待购买",
    note: textFromProperty(properties["备注"]),
    updatedAt: page.last_edited_time ?? ""
  };
}

export function mapPurchaseRecordPage(page: NotionPage): PurchaseRecord {
  const properties = page.properties;
  return {
    id: page.id,
    recordDate: dateFromProperty(properties["采购日期"]),
    name: textFromProperty(properties["记录名称"]) || textFromProperty(properties["物品名称"]),
    group: selectOrStatus(properties["类别"]),
    brandModel: textFromProperty(properties["品牌型号"]),
    unitPrice: numberFromProperty(properties["单价"]),
    quantity: numberFromProperty(properties["数量"]),
    unit: textFromProperty(properties["单位"]) || "件",
    amount: numberFromProperty(properties["实付金额"]),
    paymentMethod: selectOrStatus(properties["支付方式"]) || "现金",
    platform: selectOrStatus(properties["购买平台"]),
    productUrl: urlFromProperty(properties["商品链接"]),
    sourceShoppingItemId: textFromProperty(properties["采购清单ID"]),
    note: textFromProperty(properties["备注"]),
    updatedAt: page.last_edited_time ?? ""
  };
}

export async function getShoppingItems(): Promise<NotionFetchResult<ShoppingItem>> {
  const { notion, shoppingDatabaseId } = getNotionContext();
  if (!hasConfig(shoppingDatabaseId)) return missingConfigResult();

  try {
    const response = await notion!.databases.query({
      database_id: shoppingDatabaseId,
      sorts: [
        { property: "类别", direction: "ascending" },
        { property: "状态", direction: "ascending" }
      ]
    });
    return {
      data: response.results
        .filter((page) => "properties" in page)
        .map((page) => mapShoppingPage(page as NotionPage))
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "读取采购清单失败，请检查 Notion 配置。"
    };
  }
}

export async function getPurchaseRecords(): Promise<NotionFetchResult<PurchaseRecord>> {
  const { notion, purchaseRecordsDatabaseId } = getNotionContext();
  if (!hasConfig(purchaseRecordsDatabaseId)) return missingConfigResult();

  try {
    const response = await notion!.databases.query({
      database_id: purchaseRecordsDatabaseId,
      sorts: [{ property: "采购日期", direction: "descending" }]
    });
    return {
      data: response.results
        .filter((page) => "properties" in page)
        .map((page) => mapPurchaseRecordPage(page as NotionPage))
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "读取采购记录失败，请检查 Notion 配置。"
    };
  }
}

export async function getShoppingGroupOptions() {
  const { shoppingDatabaseId } = getNotionContext();
  return withDefaultGroups(await getDatabaseSelectOptions(shoppingDatabaseId, "类别"));
}

export async function addItemGroupOption(groupName: string) {
  const { notion, token, shoppingDatabaseId } = getNotionContext();
  if (!token || !notion) throw new Error("尚未配置 NOTION_TOKEN。");

  const normalizedGroupName = groupName.trim();
  if (!normalizedGroupName) throw new Error("分组名称不能为空。");

  const databaseIds = [shoppingDatabaseId].filter((databaseId): databaseId is string => Boolean(databaseId));
  if (databaseIds.length === 0) throw new Error("尚未配置 Notion 数据库。");

  const updatedGroups = await Promise.all(
    databaseIds.map((databaseId) => addDatabaseSelectOption(databaseId, "类别", normalizedGroupName))
  );

  const mergedGroups = updatedGroups.flat().filter((group): group is string => Boolean(group));
  return withDefaultGroups(Array.from(new Set(mergedGroups)));
}

export async function updateItemGroupOrder(groupNames: string[]) {
  const { notion, token, shoppingDatabaseId } = getNotionContext();
  if (!token || !notion) throw new Error("尚未配置 NOTION_TOKEN。");

  const normalizedGroupNames = Array.from(
    new Set(groupNames.map((groupName) => groupName.trim()).filter(Boolean))
  );
  if (normalizedGroupNames.length === 0) throw new Error("分组顺序不能为空。");

  const databaseIds = [shoppingDatabaseId].filter((databaseId): databaseId is string => Boolean(databaseId));
  if (databaseIds.length === 0) throw new Error("尚未配置 Notion 数据库。");

  const updatedGroups = await Promise.all(
    databaseIds.map((databaseId) => updateDatabaseSelectOrder(databaseId, "类别", normalizedGroupNames))
  );
  const mergedGroups = Array.from(new Set([...normalizedGroupNames, ...updatedGroups.flat()]));

  return withDefaultGroups(mergedGroups);
}

export async function updateShoppingStatus(pageId: string, status: ShoppingStatus | string) {
  const { notion, token } = getNotionContext();
  if (!token || !notion) throw new Error("尚未配置 NOTION_TOKEN。");

  return notion.pages.update({
    page_id: pageId,
    properties: {
      状态: {
        select: {
          name: status
        }
      }
    }
  });
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
  const { notion, token, shoppingDatabaseId } = getNotionContext();
  if (!token || !notion || !shoppingDatabaseId) {
    throw new Error("尚未配置采购清单数据库。");
  }

  const [hasUnitProperty, hasPaymentMethodProperty] = await Promise.all([
    databaseHasProperty(shoppingDatabaseId, "单位"),
    databaseHasProperty(shoppingDatabaseId, "支付方式")
  ]);
  const properties = {
    物品名称: titleProperty(input.name),
    类别: selectPropertyValue(input.group),
    品牌型号: richTextProperty(input.brandModel ?? ""),
    单价: { number: input.unitPrice ?? 0 },
    数量: { number: input.quantity ?? 1 },
    购买平台: selectPropertyValue(input.platform ?? ""),
    商品链接: { url: input.productUrl?.trim() || null },
    状态: selectPropertyValue(input.status ?? "待购买"),
    备注: richTextProperty(input.note ?? ""),
    ...(hasUnitProperty ? { 单位: richTextProperty(input.unit?.trim() || "件") } : {}),
    ...(hasPaymentMethodProperty ? { 支付方式: selectPropertyValue(input.paymentMethod ?? "现金") } : {})
  };

  const page = await notion.pages.create({
    parent: { database_id: shoppingDatabaseId },
    properties
  });

  return mapShoppingPage(page as NotionPage);
}

export async function updateShoppingItem(pageId: string, input: {
  name?: string;
  group?: string;
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
  const { notion, token, shoppingDatabaseId } = getNotionContext();
  if (!token || !notion || !shoppingDatabaseId) {
    throw new Error("尚未配置采购清单数据库。");
  }

  const [hasUnitProperty, hasPaymentMethodProperty] = await Promise.all([
    databaseHasProperty(shoppingDatabaseId, "单位"),
    databaseHasProperty(shoppingDatabaseId, "支付方式")
  ]);
  const properties: Record<string, unknown> = {};

  if (input.name !== undefined) properties["物品名称"] = titleProperty(input.name);
  if (input.group !== undefined) properties["类别"] = selectPropertyValue(input.group);
  if (input.brandModel !== undefined) properties["品牌型号"] = richTextProperty(input.brandModel);
  if (input.unitPrice !== undefined) properties["单价"] = { number: input.unitPrice };
  if (input.quantity !== undefined) properties["数量"] = { number: input.quantity };
  if (input.platform !== undefined) properties["购买平台"] = selectPropertyValue(input.platform);
  if (input.productUrl !== undefined) properties["商品链接"] = { url: input.productUrl.trim() || null };
  if (input.status !== undefined) properties["状态"] = selectPropertyValue(input.status);
  if (input.note !== undefined) properties["备注"] = richTextProperty(input.note);
  if (hasUnitProperty && input.unit !== undefined) properties["单位"] = richTextProperty(input.unit.trim() || "件");
  if (hasPaymentMethodProperty && input.paymentMethod !== undefined) {
    properties["支付方式"] = selectPropertyValue(input.paymentMethod || "现金");
  }

  const page = await notion.pages.update({
    page_id: pageId,
    properties: properties as NotionPageUpdateProperties
  });

  return mapShoppingPage(page as NotionPage);
}

export async function archiveShoppingItem(pageId: string) {
  const { notion, token } = getNotionContext();
  if (!token || !notion) throw new Error("尚未配置 NOTION_TOKEN。");

  return notion.pages.update({
    page_id: pageId,
    archived: true
  });
}

export async function createPurchaseRecord(input: {
  recordDate: string;
  name: string;
  group?: string;
  brandModel?: string;
  unitPrice?: number;
  quantity?: number;
  unit?: string;
  amount?: number;
  paymentMethod?: string;
  platform?: string;
  productUrl?: string;
  sourceShoppingItemId?: string;
  note?: string;
}) {
  const { notion, token, purchaseRecordsDatabaseId } = getNotionContext();
  if (!token || !notion || !purchaseRecordsDatabaseId) {
    throw new Error("尚未配置采购记录数据库。");
  }

  const quantity = input.quantity ?? 1;
  const unitPrice = input.unitPrice ?? 0;
  const amount = input.amount ?? unitPrice * quantity;
  const recordDate = input.recordDate.trim();
  if (!recordDate) throw new Error("采购日期不能为空。");

  return notion.pages.create({
    parent: { database_id: purchaseRecordsDatabaseId },
    properties: {
      记录名称: titleProperty(input.name),
      采购日期: dateProperty(recordDate),
      类别: selectPropertyValue(input.group ?? ""),
      物品名称: richTextProperty(input.name),
      品牌型号: richTextProperty(input.brandModel ?? ""),
      单价: { number: unitPrice },
      数量: { number: quantity },
      单位: richTextProperty(input.unit?.trim() || "件"),
      实付金额: { number: amount },
      支付方式: selectPropertyValue(input.paymentMethod ?? "现金"),
      购买平台: selectPropertyValue(input.platform ?? ""),
      商品链接: { url: input.productUrl?.trim() || null },
      采购清单ID: richTextProperty(input.sourceShoppingItemId ?? ""),
      备注: richTextProperty(input.note ?? "")
    }
  });
}

async function databaseHasProperty(databaseId: string, propertyName: string) {
  const { notion } = getNotionContext();
  if (!notion) return false;

  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    return "properties" in database && Boolean(database.properties[propertyName]);
  } catch {
    return false;
  }
}

async function addDatabaseSelectOption(databaseId: string, propertyName: string, optionName: string): Promise<string[]> {
  const { notion } = getNotionContext();
  if (!notion) throw new Error("尚未配置 NOTION_TOKEN。");

  const database = await notion.databases.retrieve({ database_id: databaseId });
  if (!("properties" in database)) throw new Error("无法读取 Notion 数据库字段。");

  const property = database.properties[propertyName] as NotionDatabaseProperty | undefined;
  if (!property || property.type !== "select") {
    throw new Error(`Notion 数据库缺少 ${propertyName} Select 字段。`);
  }

  const existingOptions = property.select?.options ?? [];
  const existingNames = existingOptions.map((option) => option.name ?? "").filter(Boolean);
  if (existingNames.includes(optionName)) return existingNames;

  const nextOptions = [
    ...existingOptions
      .filter((option): option is { name: string; color?: SelectColor } => Boolean(option.name))
      .map((option) => ({
        name: option.name,
        color: option.color ?? selectColors[0]
      })),
    {
      name: optionName,
      color: selectColors[existingOptions.length % selectColors.length]
    }
  ];

  await notion.databases.update({
    database_id: databaseId,
    properties: {
      [propertyName]: {
        select: {
          options: nextOptions
        }
      }
    }
  });

  return nextOptions.map((option) => option.name).filter((name): name is string => Boolean(name));
}

async function updateDatabaseSelectOrder(
  databaseId: string,
  propertyName: string,
  orderedNames: string[]
): Promise<string[]> {
  const { notion } = getNotionContext();
  if (!notion) throw new Error("尚未配置 NOTION_TOKEN。");

  const database = await notion.databases.retrieve({ database_id: databaseId });
  if (!("properties" in database)) throw new Error("无法读取 Notion 数据库字段。");

  const property = database.properties[propertyName] as NotionDatabaseProperty | undefined;
  if (!property || property.type !== "select") {
    throw new Error(`Notion 数据库缺少 ${propertyName} Select 字段。`);
  }

  const existingOptions: Array<{ name: string; color: SelectColor }> = (property.select?.options ?? [])
    .filter((option): option is { name: string; color?: SelectColor } => Boolean(option.name))
    .map((option) => ({
      name: option.name,
      color: option.color ?? selectColors[0]
    }));
  const optionByName = new Map(existingOptions.map((option) => [option.name, option]));
  const orderedExistingOptions: Array<{ name: string; color: SelectColor }> = [];
  orderedNames.forEach((name) => {
    const option = optionByName.get(name);
    if (option) orderedExistingOptions.push(option);
  });
  const remainingOptions = existingOptions.filter((option) => !orderedNames.includes(option.name));
  const nextOptions = [...orderedExistingOptions, ...remainingOptions];

  await notion.databases.update({
    database_id: databaseId,
    properties: {
      [propertyName]: {
        select: {
          options: nextOptions
        }
      }
    }
  });

  return nextOptions.map((option) => option.name);
}

function titleProperty(content: string) {
  return {
    title: content.trim() ? [{ type: "text" as const, text: { content: content.trim() } }] : []
  };
}

function richTextProperty(content: string) {
  return {
    rich_text: content.trim() ? [{ type: "text" as const, text: { content: content.trim() } }] : []
  };
}

function dateProperty(date: string) {
  return {
    date: {
      start: date
    }
  };
}

function selectPropertyValue(value: string) {
  return {
    select: value.trim() ? { name: value.trim() } : null
  };
}
