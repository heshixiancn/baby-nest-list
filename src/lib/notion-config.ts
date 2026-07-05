import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface NotionRuntimeConfig {
  token: string;
  parentPageId: string;
  shoppingDatabaseId: string;
  purchaseRecordsDatabaseId: string;
}

const envPath = resolve(process.cwd(), ".env.local");

export function getNotionRuntimeConfig(): NotionRuntimeConfig {
  const localEnv = readLocalEnvFile();

  return {
    token: readConfigValue("NOTION_TOKEN", localEnv),
    parentPageId: normalizeNotionId(readConfigValue("NOTION_PARENT_PAGE_ID", localEnv)),
    shoppingDatabaseId: normalizeNotionId(readConfigValue("NOTION_SHOPPING_DATABASE_ID", localEnv)),
    purchaseRecordsDatabaseId: normalizeNotionId(readConfigValue("NOTION_PURCHASE_RECORDS_DATABASE_ID", localEnv))
  };
}

export function hasCompleteNotionDatabaseConfig(config = getNotionRuntimeConfig()) {
  return Boolean(
    config.token &&
      config.shoppingDatabaseId &&
      config.purchaseRecordsDatabaseId
  );
}

export function hasExistingNotionDatabaseConfig(config = getNotionRuntimeConfig()) {
  return Boolean(
    config.token &&
      (config.shoppingDatabaseId || config.purchaseRecordsDatabaseId)
  );
}

export function upsertNotionRuntimeConfig(values: Partial<NotionRuntimeConfig>) {
  const normalizedValues: Record<string, string> = {};

  if (values.token !== undefined) normalizedValues.NOTION_TOKEN = values.token.trim();
  if (values.parentPageId !== undefined) normalizedValues.NOTION_PARENT_PAGE_ID = normalizeNotionId(values.parentPageId);
  if (values.shoppingDatabaseId !== undefined) {
    normalizedValues.NOTION_SHOPPING_DATABASE_ID = normalizeNotionId(values.shoppingDatabaseId);
  }
  if (values.purchaseRecordsDatabaseId !== undefined) {
    normalizedValues.NOTION_PURCHASE_RECORDS_DATABASE_ID = normalizeNotionId(values.purchaseRecordsDatabaseId);
  }

  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const seen = new Set<string>();
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !(match[1] in normalizedValues)) return line;

    seen.add(match[1]);
    return `${match[1]}=${normalizedValues[match[1]]}`;
  });

  for (const [key, value] of Object.entries(normalizedValues)) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
    process.env[key] = value;
  }

  writeFileSync(envPath, `${nextLines.filter(Boolean).join("\n")}\n`);
}

export function normalizeNotionId(value: string) {
  return value
    .trim()
    .replace(/^https:\/\/www\.notion\.so\//, "")
    .replace(/^https:\/\/notion\.so\//, "")
    .replace(/[?#].*$/, "")
    .split("/")
    .pop()
    ?.replace(/-/g, "")
    .slice(-32) ?? "";
}

function readConfigValue(key: string, localEnv: Record<string, string>) {
  return (process.env[key] || localEnv[key] || "").trim();
}

function readLocalEnvFile() {
  if (!existsSync(envPath)) return {};

  const values: Record<string, string> = {};
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    values[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
  }

  return values;
}
