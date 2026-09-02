export interface MysqlRuntimeConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

export function getMysqlRuntimeConfig(): MysqlRuntimeConfig {
  return {
    host: readConfigValue("MYSQL_HOST"),
    port: Number(readConfigValue("MYSQL_PORT") || 3306),
    user: readConfigValue("MYSQL_USER"),
    password: readConfigValue("MYSQL_PASSWORD"),
    database: readConfigValue("MYSQL_DATABASE"),
    connectionLimit: Number(readConfigValue("MYSQL_CONNECTION_LIMIT") || 20)
  };
}

export function hasCompleteMysqlConfig(config = getMysqlRuntimeConfig()) {
  return Boolean(config.host && config.port && config.user && config.database);
}

export function getMysqlConfigError(config = getMysqlRuntimeConfig()) {
  if (!config.host) return "缺少 MYSQL_HOST 环境变量。";
  if (!config.port || Number.isNaN(config.port))
    return "MYSQL_PORT 必须是有效端口。";
  if (!config.user) return "缺少 MYSQL_USER 环境变量。";
  if (!config.database) return "缺少 MYSQL_DATABASE 环境变量。";
  return "";
}

function readConfigValue(key: string) {
  return (process.env[key] || "").trim();
}
