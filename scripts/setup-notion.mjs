#!/usr/bin/env node

import { Client } from "@notionhq/client";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");

loadLocalEnv(envPath);

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const parentPageArg = args.find((arg) => !arg.startsWith("--")) || "";
const notionToken = process.env.NOTION_TOKEN;
const parentPageId = normalizeNotionId(process.env.NOTION_PARENT_PAGE_ID || parentPageArg || "");
const forceNewDatabases = flags.has("--force-new");
const seedExistingDatabases = flags.has("--seed-existing");
const resetCategoryOptions = flags.has("--reset-category-options");

if (!notionToken || !parentPageId) {
  console.error(
    [
      "缺少必要配置。",
      "",
      "请先在 .env.local 中填写：",
      "NOTION_TOKEN=secret_xxx",
      "NOTION_PARENT_PAGE_ID=父页面ID",
      "",
      "也可以临时这样运行：",
      "NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=页面ID pnpm notion:setup"
    ].join("\n")
  );
  process.exit(1);
}

const notion = new Client({ auth: notionToken });

const selectColors = [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
  "orange",
  "brown",
  "red",
  "gray"
];

const itemGroups = [
  "妈妈待产包",
  "宝宝待产包",
  "宝宝生活耗材"
];
const shoppingStatuses = ["待购买", "已下单", "已到货", "暂缓", "已放弃"];
const platforms = ["京东", "淘宝", "天猫", "山姆", "拼多多", "抖音", "线下", "劳保"];
const paymentMethods = ["现金", "劳保积分", "京东E卡"];
const categoryFallbacks = {
  宝宝大件: "宝宝待产包",
  食品营养: "妈妈待产包",
  产后恢复: "妈妈待产包",
  家庭常备: "宝宝生活耗材",
  出生后再买: "宝宝待产包",
  尿裤清洁: "宝宝生活耗材",
  喂养: "宝宝待产包",
  衣物包被: "宝宝待产包",
  洗护护理: "宝宝生活耗材",
  睡眠: "宝宝待产包",
  出行安全: "宝宝待产包",
  妈妈用品: "妈妈待产包",
  日常耗材: "宝宝生活耗材"
};
const seedShoppingItems = [
  {
    name: "NB 纸尿裤",
    group: "宝宝生活耗材",
    brandModel: "新生儿试用装",
    unitPrice: 89,
    quantity: 2,
    unit: "包",
    platform: "京东",
    paymentMethod: "现金",
    status: "待购买",
    note: "先备少量，观察尺码"
  },
  {
    name: "奶瓶",
    group: "宝宝待产包",
    brandModel: "宽口径玻璃奶瓶",
    unitPrice: 58,
    quantity: 2,
    unit: "个",
    platform: "天猫",
    paymentMethod: "现金",
    status: "已下单",
    note: "搭配奶瓶刷"
  },
  {
    name: "安全座椅",
    group: "宝宝待产包",
    brandModel: "0-4 岁款",
    unitPrice: 1680,
    quantity: 1,
    unit: "台",
    platform: "京东",
    paymentMethod: "现金",
    status: "待购买",
    note: ""
  },
  {
    name: "包被",
    group: "宝宝待产包",
    brandModel: "四季通用款",
    unitPrice: 79,
    quantity: 2,
    unit: "条",
    platform: "淘宝",
    paymentMethod: "现金",
    status: "待购买",
    note: ""
  },
  {
    name: "婴儿洗发沐浴二合一",
    group: "宝宝生活耗材",
    brandModel: "低敏配方",
    unitPrice: 66,
    quantity: 1,
    unit: "瓶",
    platform: "山姆",
    paymentMethod: "现金",
    status: "暂缓",
    note: "出生后按实际情况补"
  }
];
const shoppingDatabaseSchema = {
  物品名称: { title: {} },
  类别: selectProperty(itemGroups),
  品牌型号: { rich_text: {} },
  单价: { number: { format: "yuan" } },
  数量: { number: { format: "number" } },
  单位: { rich_text: {} },
  购买平台: selectProperty(platforms),
  支付方式: selectProperty(paymentMethods),
  商品链接: { url: {} },
  状态: selectProperty(shoppingStatuses),
  备注: { rich_text: {} }
};

const purchaseRecordsDatabaseSchema = {
  记录名称: { title: {} },
  采购日期: { date: {} },
  类别: selectProperty(itemGroups),
  物品名称: { rich_text: {} },
  品牌型号: { rich_text: {} },
  单价: { number: { format: "yuan" } },
  数量: { number: { format: "number" } },
  单位: { rich_text: {} },
  实付金额: { number: { format: "yuan" } },
  支付方式: selectProperty(paymentMethods),
  购买平台: selectProperty(platforms),
  商品链接: { url: {} },
  采购清单ID: { rich_text: {} },
  备注: { rich_text: {} }
};

try {
  console.log("正在准备 Notion 数据库...");

  const existingShoppingDatabaseId = forceNewDatabases
    ? ""
    : normalizeNotionId(process.env.NOTION_SHOPPING_DATABASE_ID || "");
  const existingPurchaseRecordsDatabaseId = forceNewDatabases
    ? ""
    : normalizeNotionId(process.env.NOTION_PURCHASE_RECORDS_DATABASE_ID || "");

  if (resetCategoryOptions && existingShoppingDatabaseId) {
    await normalizeCategoryValues(existingShoppingDatabaseId, "采购清单", "宝宝待产包");
  }

  const shoppingResult = existingShoppingDatabaseId
    ? await updateExistingDatabase(existingShoppingDatabaseId, shoppingDatabaseSchema, "采购清单")
    : await createShoppingDatabase();
  const purchaseRecordsResult = existingPurchaseRecordsDatabaseId
    ? await updateExistingDatabase(existingPurchaseRecordsDatabaseId, purchaseRecordsDatabaseSchema, "采购记录")
    : await createPurchaseRecordsDatabase();

  if (shoppingResult.created || seedExistingDatabases) {
    console.log("正在写入采购清单默认数据...");
    await createShoppingSeedPages(shoppingResult.id);
  }

  const values = {
    NOTION_TOKEN: notionToken,
    NOTION_PARENT_PAGE_ID: parentPageId,
    NOTION_SHOPPING_DATABASE_ID: shoppingResult.id,
    NOTION_PURCHASE_RECORDS_DATABASE_ID: purchaseRecordsResult.id
  };

  upsertEnvFile(envPath, values);

  console.log("");
  console.log("Notion 数据库准备完成。已写入 .env.local：");
  console.log(`NOTION_SHOPPING_DATABASE_ID=${shoppingResult.id}`);
  console.log(`NOTION_PURCHASE_RECORDS_DATABASE_ID=${purchaseRecordsResult.id}`);
  console.log(`采购清单：${shoppingResult.created ? "新建并初始化默认数据" : "已同步字段结构"}`);
  console.log(`采购记录：${purchaseRecordsResult.created ? "已新建空表" : "已同步字段结构"}`);
  if (resetCategoryOptions) {
    console.log(`类别选项已按参数 --reset-category-options 重置为：${itemGroups.join("、")}`);
  }
  if (seedExistingDatabases && !shoppingResult.created) {
    console.log("已按 --seed-existing 写入现有数据库默认数据。");
  }
  console.log("");
  console.log("下一步运行 pnpm dev，然后打开 http://localhost:3000。");
} catch (error) {
  console.error("");
  console.error("准备 Notion 数据库失败。");
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  console.error("请确认父页面和已有数据库都已经分享给你的 Notion Integration，并且 ID 正确。");
  process.exit(1);
}

function selectProperty(options) {
  return {
    select: {
      options: options.map((name, index) => ({
        name,
        color: selectColors[index % selectColors.length]
      }))
    }
  };
}

async function normalizeCategoryValues(databaseId, label, defaultGroup) {
  console.log(`正在归并${label}中的旧类别值...`);

  let cursor;
  let updatedCount = 0;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor
    });

    for (const page of response.results) {
      if (!("properties" in page)) continue;

      const currentGroup = selectNameFromPageProperty(page.properties.类别);
      if (!currentGroup || itemGroups.includes(currentGroup)) continue;

      const nextGroup = categoryFallbacks[currentGroup] || defaultGroup;
      await notion.pages.update({
        page_id: page.id,
        properties: {
          类别: selectValue(nextGroup)
        }
      });
      updatedCount += 1;
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`${label}旧类别归并完成：${updatedCount} 条。`);
}

function selectNameFromPageProperty(property) {
  if (!property || property.type !== "select") return "";
  return property.select?.name || "";
}

async function createShoppingDatabase() {
  console.log("未检测到采购清单数据库 ID，正在创建...");
  const database = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: "开心の清单 - 宝宝用品采购清单" } }],
    icon: { type: "emoji", emoji: "🧺" },
    properties: shoppingDatabaseSchema
  });

  return { id: database.id, created: true };
}

async function createPurchaseRecordsDatabase() {
  console.log("未检测到采购记录数据库 ID，正在创建...");
  const database = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: "开心の清单 - 采购记录" } }],
    icon: { type: "emoji", emoji: "🧾" },
    properties: purchaseRecordsDatabaseSchema
  });

  return { id: database.id, created: true };
}

async function updateExistingDatabase(databaseId, properties, label) {
  console.log(`检测到现有${label}数据库，正在同步字段结构...`);
  const existingDatabase = await notion.databases.retrieve({ database_id: databaseId });
  const nextProperties = preserveExistingCategoryOptions(existingDatabase, properties);
  const database = await notion.databases.update({
    database_id: databaseId,
    properties: nextProperties
  });

  return { id: database.id, created: false };
}

function preserveExistingCategoryOptions(database, properties) {
  const nextProperties = { ...properties };
  if (resetCategoryOptions && database.properties?.类别?.type === "select") {
    nextProperties.类别 = selectPropertyWithExistingColors(itemGroups, database.properties.类别);
    return nextProperties;
  }

  if (database.properties?.类别?.type !== "select") return properties;

  delete nextProperties.类别;
  return nextProperties;
}

function selectPropertyWithExistingColors(options, property) {
  const colorByName = new Map(
    (property.select?.options || []).map((option) => [option.name, option.color])
  );

  return {
    select: {
      options: options.map((name, index) => ({
        name,
        color: colorByName.get(name) || selectColors[index % selectColors.length]
      }))
    }
  };
}

async function createShoppingSeedPages(databaseId) {
  await Promise.all(
    seedShoppingItems.map((item) =>
      notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          物品名称: titleProperty(item.name),
          类别: selectValue(item.group),
          品牌型号: richTextProperty(item.brandModel),
          单价: { number: item.unitPrice },
          数量: { number: item.quantity },
          单位: richTextProperty(item.unit),
          购买平台: selectValue(item.platform),
          支付方式: selectValue(item.paymentMethod),
          商品链接: { url: null },
          状态: selectValue(item.status),
          备注: richTextProperty(item.note)
        }
      })
    )
  );
}

function titleProperty(content) {
  return {
    title: content
      ? [{ type: "text", text: { content } }]
      : []
  };
}

function richTextProperty(content) {
  return {
    rich_text: content
      ? [{ type: "text", text: { content } }]
      : []
  };
}

function selectValue(name) {
  return {
    select: name ? { name } : null
  };
}

function normalizeNotionId(value) {
  return value
    .trim()
    .replace(/^https:\/\/www\.notion\.so\//, "")
    .replace(/[?#].*$/, "")
    .split("/")
    .pop()
    ?.replace(/-/g, "")
    .slice(-32);
}

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
    }
  }
}

function upsertEnvFile(filePath, values) {
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const seen = new Set();
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !(match[1] in values)) return line;

    seen.add(match[1]);
    return `${match[1]}=${values[match[1]]}`;
  });

  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  }

  writeFileSync(filePath, `${nextLines.filter(Boolean).join("\n")}\n`);
}
