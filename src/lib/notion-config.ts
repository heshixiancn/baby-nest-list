export interface NotionRuntimeConfig {
  token: string;
  shoppingDatabaseId: string;
  purchaseRecordsDatabaseId: string;
}

export function getNotionRuntimeConfig(): NotionRuntimeConfig {
  return {
    token: readConfigValue("NOTION_TOKEN"),
    shoppingDatabaseId: normalizeNotionId(
      readConfigValue("NOTION_SHOPPING_DATABASE_ID")
    ),
    purchaseRecordsDatabaseId: normalizeNotionId(
      readConfigValue("NOTION_PURCHASE_RECORDS_DATABASE_ID")
    )
  };
}

export function hasCompleteNotionDatabaseConfig(
  config = getNotionRuntimeConfig()
) {
  return Boolean(
    config.token &&
    config.shoppingDatabaseId &&
    config.purchaseRecordsDatabaseId
  );
}

export function getNotionConfigError(config = getNotionRuntimeConfig()) {
  if (!config.token) return "缺少 NOTION_TOKEN 环境变量。";
  if (!config.shoppingDatabaseId)
    return "缺少 NOTION_SHOPPING_DATABASE_ID 环境变量。";
  if (!config.purchaseRecordsDatabaseId)
    return "缺少 NOTION_PURCHASE_RECORDS_DATABASE_ID 环境变量。";
  return "";
}

export function normalizeNotionId(value: string) {
  return (
    value
      .trim()
      .replace(/^https:\/\/www\.notion\.so\//, "")
      .replace(/^https:\/\/notion\.so\//, "")
      .replace(/[?#].*$/, "")
      .split("/")
      .pop()
      ?.replace(/-/g, "")
      .slice(-32) ?? ""
  );
}

function readConfigValue(key: string) {
  return (process.env[key] || "").trim();
}
