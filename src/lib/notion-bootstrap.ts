import { Client } from "@notionhq/client";
import { getNotionRuntimeConfig, hasCompleteNotionDatabaseConfig, normalizeNotionId, upsertNotionRuntimeConfig } from "@/lib/notion-config";
import { ITEM_GROUPS, PAYMENT_METHODS, PURCHASE_PLATFORMS, SHOPPING_STATUSES } from "@/types";

const selectColors = ["yellow", "green", "blue", "pink", "purple", "orange", "brown", "red", "gray"] as const;

type DatabaseCreateProperties = Parameters<Client["databases"]["create"]>[0]["properties"];
type DatabaseCreateIcon = NonNullable<Parameters<Client["databases"]["create"]>[0]["icon"]>;

const itemGroups = [...ITEM_GROUPS];
const shoppingDatabaseSchema = {
  物品名称: { title: {} },
  类别: selectProperty(itemGroups),
  品牌型号: { rich_text: {} },
  单价: numberProperty("yuan"),
  数量: numberProperty("number"),
  单位: { rich_text: {} },
  购买平台: selectProperty([...PURCHASE_PLATFORMS]),
  支付方式: selectProperty([...PAYMENT_METHODS]),
  商品链接: { url: {} },
  状态: selectProperty([...SHOPPING_STATUSES]),
  备注: { rich_text: {} }
} satisfies DatabaseCreateProperties;

const purchaseRecordsDatabaseSchema = {
  记录名称: { title: {} },
  采购日期: { date: {} },
  类别: selectProperty(itemGroups),
  物品名称: { rich_text: {} },
  品牌型号: { rich_text: {} },
  单价: numberProperty("yuan"),
  数量: numberProperty("number"),
  单位: { rich_text: {} },
  实付金额: numberProperty("yuan"),
  支付方式: selectProperty([...PAYMENT_METHODS]),
  购买平台: selectProperty([...PURCHASE_PLATFORMS]),
  商品链接: { url: {} },
  采购清单ID: { rich_text: {} },
  备注: { rich_text: {} }
} satisfies DatabaseCreateProperties;

export async function setupNotionDatabases(input: { token: string; parentPage: string }) {
  const token = input.token.trim();
  const parentPageId = normalizeNotionId(input.parentPage);
  if (!token) throw new Error("请填写 Notion Integration Token。");
  if (!parentPageId) throw new Error("请填写已授权给 Integration 的 Notion 父页面链接或 ID。");

  const currentConfig = getNotionRuntimeConfig();
  if (hasCompleteNotionDatabaseConfig(currentConfig)) {
    return {
      alreadyConfigured: true,
      config: currentConfig
    };
  }

  const notion = new Client({ auth: token });
  await notion.pages.retrieve({ page_id: parentPageId });

  const shoppingDatabaseId =
    currentConfig.shoppingDatabaseId ||
    (await createDatabase(notion, parentPageId, "开心の清单 - 宝宝用品采购清单", "🧺", shoppingDatabaseSchema));
  const purchaseRecordsDatabaseId =
    currentConfig.purchaseRecordsDatabaseId ||
    (await createDatabase(notion, parentPageId, "开心の清单 - 采购记录", "🧾", purchaseRecordsDatabaseSchema));

  const nextConfig = {
    token,
    parentPageId,
    shoppingDatabaseId,
    purchaseRecordsDatabaseId
  };
  upsertNotionRuntimeConfig(nextConfig);

  return {
    alreadyConfigured: false,
    config: nextConfig
  };
}

async function createDatabase(
  notion: Client,
  parentPageId: string,
  title: string,
  emoji: string,
  properties: DatabaseCreateProperties
) {
  const database = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: title } }],
    icon: { type: "emoji", emoji } as DatabaseCreateIcon,
    properties
  });

  return database.id;
}

function selectProperty(options: string[]) {
  return {
    select: {
      options: options.map((name, index) => ({
        name,
        color: selectColors[index % selectColors.length]
      }))
    }
  };
}

function numberProperty(format: "number" | "yuan") {
  return {
    number: {
      format
    }
  };
}
