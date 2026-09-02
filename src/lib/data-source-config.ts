export type DatabaseProvider = "mysql" | "notion";

export function getDatabaseProvider(): DatabaseProvider {
  return process.env.APP_DATABASE_PROVIDER === "notion" ? "notion" : "mysql";
}

export function isNotionSyncEnabled() {
  return process.env.NOTION_SYNC_ENABLED === "true";
}
