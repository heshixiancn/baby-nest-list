import { randomUUID } from "node:crypto";
import mysql, {
  type Pool,
  type ResultSetHeader,
  type RowDataPacket
} from "mysql2/promise";
import {
  getMysqlConfigError,
  getMysqlRuntimeConfig,
  hasCompleteMysqlConfig
} from "@/lib/mysql-config";
import {
  ITEM_GROUPS,
  type DatabaseFetchResult,
  type PurchaseRecord,
  type ShoppingItem,
  type ShoppingStatus
} from "@/types";

type MysqlPoolState = {
  key: string;
  pool: Pool;
};

declare global {
  // eslint-disable-next-line no-var
  var babyNestMysqlPool: MysqlPoolState | undefined;
}

type ShoppingItemRow = RowDataPacket & {
  id: string;
  notion_page_id: string | null;
  name: string;
  item_group: string;
  brand_model: string | null;
  unit_price: string | number | null;
  quantity: string | number | null;
  unit: string | null;
  platform: string | null;
  payment_method: string | null;
  product_url: string | null;
  status: string | null;
  note: string | null;
  updated_at: Date | string | null;
};

type PurchaseRecordRow = RowDataPacket & {
  id: string;
  record_date: Date | string | null;
  name: string;
  item_group: string | null;
  brand_model: string | null;
  unit_price: string | number | null;
  quantity: string | number | null;
  unit: string | null;
  amount: string | number | null;
  payment_method: string | null;
  platform: string | null;
  product_url: string | null;
  source_shopping_item_id: string | null;
  note: string | null;
  updated_at: Date | string | null;
};

type GroupRow = RowDataPacket & {
  name: string;
};

type LatestCareRecordRow = RowDataPacket & {
  id?: string;
  happened_at?: Date | string | null;
  measured_at?: Date | string | null;
  started_at?: Date | string | null;
  ended_at?: Date | string | null;
  duration_minutes?: number | null;
  pause_started_at?: Date | string | null;
  awake_minutes?: number | null;
};

type FeedingAmountRow = RowDataPacket & {
  happened_at: Date | string | null;
  amount_ml: string | number | null;
};

type FeedingHistoryRow = RowDataPacket & {
  happened_at: Date | string | null;
  ended_at: Date | string | null;
  feeding_type: string | null;
  amount_ml: string | number | null;
  duration_minutes: string | number | null;
};

type OpenFeedingRecordRow = RowDataPacket & {
  id: string;
  happened_at: Date | string | null;
  side: string | null;
};

type CareTrendRow = RowDataPacket & {
  happened_at?: Date | string | null;
  measured_at?: Date | string | null;
  started_at?: Date | string | null;
  amount_ml?: string | number | null;
  temperature_c?: string | number | null;
  weight_grams?: string | number | null;
  duration_minutes?: string | number | null;
};

type SleepTimelineRow = RowDataPacket & {
  id: string;
  started_at: Date | string | null;
  ended_at: Date | string | null;
  duration_minutes: number | null;
  awake_minutes: number | null;
  pause_started_at: Date | string | null;
};

type DiaperSummaryRow = RowDataPacket & {
  pee: number | string | null;
  poop: number | string | null;
};

type DiaperHistoryRow = RowDataPacket & {
  happened_at: Date | string | null;
  diaper_type: string | null;
};

type CareRecordListRow = RowDataPacket & {
  id: string;
  record_type: string;
  happened_at: Date | string | null;
  title: string;
  detail: string | null;
};

function missingConfigResult<T>(): DatabaseFetchResult<T> {
  return {
    data: [],
    missingConfig: true,
    error: getMysqlConfigError() || "尚未配置 MySQL 环境变量。"
  };
}

function getPool() {
  const config = getMysqlRuntimeConfig();
  if (!hasCompleteMysqlConfig(config))
    throw new Error(getMysqlConfigError(config) || "尚未配置 MySQL 环境变量。");

  const poolKey = [
    config.host,
    config.port,
    config.user,
    config.database,
    config.connectionLimit
  ].join("|");

  if (globalThis.babyNestMysqlPool?.key !== poolKey) {
    const previousPool = globalThis.babyNestMysqlPool?.pool;
    void previousPool?.end().catch(() => undefined);

    globalThis.babyNestMysqlPool = {
      key: poolKey,
      pool: mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionLimit: config.connectionLimit,
        waitForConnections: true,
        queueLimit: 0,
        idleTimeout: 60_000,
        enableKeepAlive: true,
        namedPlaceholders: true,
        timezone: "+08:00",
        dateStrings: true
      })
    };
  }

  return globalThis.babyNestMysqlPool.pool;
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const mysqlLocal = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?/);
  const date = mysqlLocal
    ? new Date(`${mysqlLocal[1]}-${mysqlLocal[2]}-${mysqlLocal[3]}T${mysqlLocal[4]}:${mysqlLocal[5]}:${mysqlLocal[6] ?? "00"}.${(mysqlLocal[7] ?? "0").padEnd(3, "0")}+08:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function toDateString(value: Date | string | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapShoppingRow(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    group: row.item_group,
    brandModel: row.brand_model ?? "",
    unitPrice: toNumber(row.unit_price),
    quantity: toNumber(row.quantity, 1),
    unit: row.unit || "件",
    platform: row.platform ?? "",
    paymentMethod: row.payment_method || "现金",
    productUrl: row.product_url ?? "",
    status: row.status || "待购买",
    note: row.note ?? "",
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapPurchaseRecordRow(row: PurchaseRecordRow): PurchaseRecord {
  const unitPrice = toNumber(row.unit_price);
  const quantity = toNumber(row.quantity, 1);
  return {
    id: row.id,
    recordDate: toDateString(row.record_date),
    name: row.name,
    group: row.item_group ?? "",
    brandModel: row.brand_model ?? "",
    unitPrice,
    quantity,
    unit: row.unit || "件",
    amount: toNumber(row.amount, unitPrice * quantity),
    paymentMethod: row.payment_method || "现金",
    platform: row.platform ?? "",
    productUrl: row.product_url ?? "",
    sourceShoppingItemId: row.source_shopping_item_id ?? "",
    note: row.note ?? "",
    updatedAt: toIsoString(row.updated_at)
  };
}

export async function getShoppingItems(): Promise<
  DatabaseFetchResult<ShoppingItem>
> {
  if (!hasCompleteMysqlConfig()) return missingConfigResult();

  try {
    const [rows] = await getPool().query<ShoppingItemRow[]>(
      `select id, notion_page_id, name, item_group, brand_model, unit_price, quantity, unit, platform,
        payment_method, product_url, status, note, updated_at
       from shopping_items
       where deleted_at is null
       order by group_sort asc, item_group asc, field(status, '待购买', '已下单', '已到货', '暂缓', '已放弃') asc, updated_at desc`
    );
    return { data: rows.map(mapShoppingRow) };
  } catch (error) {
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "读取采购清单失败，请检查 MySQL 配置。"
    };
  }
}

export async function getPurchaseRecords(): Promise<
  DatabaseFetchResult<PurchaseRecord>
> {
  if (!hasCompleteMysqlConfig()) return missingConfigResult();

  try {
    const [rows] = await getPool().query<PurchaseRecordRow[]>(
      `select id, record_date, name, item_group, brand_model, unit_price, quantity, unit,
        amount, payment_method, platform, product_url, source_shopping_item_id, note, updated_at
       from purchase_records
       order by record_date desc, updated_at desc`
    );
    return { data: rows.map(mapPurchaseRecordRow) };
  } catch (error) {
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "读取采购记录失败，请检查 MySQL 配置。"
    };
  }
}

export async function getShoppingGroupOptions() {
  if (!hasCompleteMysqlConfig()) return [...ITEM_GROUPS];

  try {
    const [rows] = await getPool().query<GroupRow[]>(
      "select name from item_groups order by sort_order asc, name asc"
    );
    const groups = rows.map((row) => row.name).filter(Boolean);
    return groups.length > 0 ? groups : [...ITEM_GROUPS];
  } catch {
    return [...ITEM_GROUPS];
  }
}

export async function addItemGroupOption(groupName: string) {
  const normalizedGroupName = groupName.trim();
  if (!normalizedGroupName) throw new Error("分组名称不能为空。");

  const groups = await getShoppingGroupOptions();
  const nextSortOrder = groups.includes(normalizedGroupName)
    ? groups.indexOf(normalizedGroupName)
    : groups.length;

  await getPool().execute(
    `insert into item_groups (name, sort_order)
     values (:name, :sortOrder)
     on duplicate key update name = values(name)`,
    { name: normalizedGroupName, sortOrder: nextSortOrder }
  );

  return getShoppingGroupOptions();
}

export async function updateItemGroupOrder(groupNames: string[]) {
  const normalizedGroupNames = Array.from(
    new Set(groupNames.map((groupName) => groupName.trim()).filter(Boolean))
  );
  if (normalizedGroupNames.length === 0) throw new Error("分组顺序不能为空。");

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    for (const [sortOrder, name] of normalizedGroupNames.entries()) {
      await connection.execute(
        `insert into item_groups (name, sort_order)
         values (:name, :sortOrder)
         on duplicate key update sort_order = values(sort_order)`,
        { name, sortOrder }
      );
      await connection.execute(
        "update shopping_items set group_sort = :sortOrder where item_group = :name",
        {
          name,
          sortOrder
        }
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getShoppingGroupOptions();
}

export async function updateShoppingStatus(
  id: string,
  status: ShoppingStatus | string
) {
  const [result] = await getPool().execute<ResultSetHeader>(
    "update shopping_items set status = :status where id = :id and deleted_at is null",
    { id, status }
  );
  if (result.affectedRows === 0) throw new Error("未找到要更新的采购物品。");
}

export async function getShoppingItemById(id: string) {
  const [rows] = await getPool().query<ShoppingItemRow[]>(
    `select id, notion_page_id, name, item_group, brand_model, unit_price, quantity, unit, platform,
      payment_method, product_url, status, note, updated_at
     from shopping_items
     where id = :id and deleted_at is null
     limit 1`,
    { id }
  );

  const item = rows[0];
  if (!item) throw new Error("未找到采购物品。");
  return mapShoppingRow(item);
}

export async function getShoppingItemNotionPageId(id: string) {
  const [rows] = await getPool().query<
    Array<RowDataPacket & { notion_page_id: string | null }>
  >("select notion_page_id from shopping_items where id = :id limit 1", { id });
  return rows[0]?.notion_page_id ?? "";
}

export async function setShoppingItemNotionPageId(
  id: string,
  notionPageId: string
) {
  await getPool().execute(
    "update shopping_items set notion_page_id = :notionPageId where id = :id",
    {
      id,
      notionPageId
    }
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
  const id = randomUUID();
  const groupOptions = await getShoppingGroupOptions();
  const groupSort = Math.max(groupOptions.indexOf(input.group), 0);

  await getPool().execute(
    `insert into shopping_items
      (id, name, item_group, group_sort, brand_model, unit_price, quantity, unit, platform,
       payment_method, product_url, status, note)
     values
      (:id, :name, :itemGroup, :groupSort, :brandModel, :unitPrice, :quantity, :unit, :platform,
       :paymentMethod, :productUrl, :status, :note)`,
    {
      id,
      name: input.name.trim(),
      itemGroup: input.group,
      groupSort,
      brandModel: input.brandModel ?? "",
      unitPrice: input.unitPrice ?? 0,
      quantity: input.quantity ?? 1,
      unit: input.unit?.trim() || "件",
      platform: input.platform ?? "",
      paymentMethod: input.paymentMethod ?? "现金",
      productUrl: input.productUrl?.trim() || null,
      status: input.status ?? "待购买",
      note: input.note ?? ""
    }
  );

  return getShoppingItemById(id);
}

export async function updateShoppingItem(
  id: string,
  input: {
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
  }
) {
  const updates: string[] = [];
  const values: Record<string, string | number | null> = { id };

  if (input.name !== undefined) {
    updates.push("name = :name");
    values.name = input.name.trim();
  }
  if (input.group !== undefined) {
    const groupOptions = await getShoppingGroupOptions();
    updates.push("item_group = :itemGroup", "group_sort = :groupSort");
    values.itemGroup = input.group;
    values.groupSort = Math.max(groupOptions.indexOf(input.group), 0);
  }
  if (input.brandModel !== undefined) {
    updates.push("brand_model = :brandModel");
    values.brandModel = input.brandModel;
  }
  if (input.unitPrice !== undefined) {
    updates.push("unit_price = :unitPrice");
    values.unitPrice = input.unitPrice;
  }
  if (input.quantity !== undefined) {
    updates.push("quantity = :quantity");
    values.quantity = input.quantity;
  }
  if (input.unit !== undefined) {
    updates.push("unit = :unit");
    values.unit = input.unit.trim() || "件";
  }
  if (input.platform !== undefined) {
    updates.push("platform = :platform");
    values.platform = input.platform;
  }
  if (input.paymentMethod !== undefined) {
    updates.push("payment_method = :paymentMethod");
    values.paymentMethod = input.paymentMethod || "现金";
  }
  if (input.productUrl !== undefined) {
    updates.push("product_url = :productUrl");
    values.productUrl = input.productUrl.trim() || null;
  }
  if (input.status !== undefined) {
    updates.push("status = :status");
    values.status = input.status;
  }
  if (input.note !== undefined) {
    updates.push("note = :note");
    values.note = input.note;
  }

  if (updates.length === 0) return getShoppingItemById(id);

  const [result] = await getPool().execute<ResultSetHeader>(
    `update shopping_items set ${updates.join(", ")} where id = :id and deleted_at is null`,
    values
  );
  if (result.affectedRows === 0) throw new Error("未找到要更新的采购物品。");

  return getShoppingItemById(id);
}

export async function archiveShoppingItem(id: string) {
  const [result] = await getPool().execute<ResultSetHeader>(
    "update shopping_items set deleted_at = current_timestamp(3) where id = :id and deleted_at is null",
    { id }
  );
  if (result.affectedRows === 0) throw new Error("未找到要删除的采购物品。");
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
  const quantity = input.quantity ?? 1;
  const unitPrice = input.unitPrice ?? 0;
  const amount = input.amount ?? unitPrice * quantity;
  const recordDate = input.recordDate.trim();
  if (!recordDate) throw new Error("采购日期不能为空。");

  const id = randomUUID();
  await getPool().execute(
    `insert into purchase_records
      (id, record_date, name, item_group, brand_model, unit_price, quantity, unit, amount,
       payment_method, platform, product_url, source_shopping_item_id, note)
     values
      (:id, :recordDate, :name, :itemGroup, :brandModel, :unitPrice, :quantity, :unit, :amount,
       :paymentMethod, :platform, :productUrl, :sourceShoppingItemId, :note)`,
    {
      id,
      recordDate,
      name: input.name.trim(),
      itemGroup: input.group ?? "",
      brandModel: input.brandModel ?? "",
      unitPrice,
      quantity,
      unit: input.unit?.trim() || "件",
      amount,
      paymentMethod: input.paymentMethod ?? "现金",
      platform: input.platform ?? "",
      productUrl: input.productUrl?.trim() || null,
      sourceShoppingItemId: input.sourceShoppingItemId ?? null,
      note: input.note ?? ""
    }
  );

  return id;
}

export async function createFeedingRecord(input: {
  happenedAt?: string;
  endedAt?: string;
  feedingType: string;
  side?: string;
  durationMinutes?: number;
  amountMl?: number;
  recorder?: string;
  note?: string;
}) {
  const id = randomUUID();
  await getPool().execute(
    `insert into feeding_records
      (id, happened_at, ended_at, feeding_type, side, duration_minutes, amount_ml, recorder, note)
     values
      (:id, :happenedAt, :endedAt, :feedingType, :side, :durationMinutes, :amountMl, :recorder, :note)`,
    {
      id,
      happenedAt: input.happenedAt ? new Date(input.happenedAt) : new Date(),
      endedAt: input.endedAt ? new Date(input.endedAt) : null,
      feedingType: input.feedingType,
      side: input.side ?? "",
      durationMinutes: input.durationMinutes ?? null,
      amountMl: input.amountMl ?? null,
      recorder: input.recorder ?? "",
      note: input.note ?? ""
    }
  );

  return id;
}

export async function getOpenBreastfeedingRecord() {
  if (!hasCompleteMysqlConfig()) return null;
  const [rows] = await getPool().query<OpenFeedingRecordRow[]>(
    `select id, happened_at, side
     from feeding_records
     where feeding_type = '母乳'
       and ended_at is null
       and duration_minutes is null
     order by happened_at desc
     limit 1`
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    startedAt: toIsoString(row.happened_at),
    side: row.side ?? ""
  };
}

export async function finishBreastfeedingRecord(input: {
  id: string;
  endedAt?: string;
  note?: string;
}) {
  const endedAt = input.endedAt ? new Date(input.endedAt) : new Date();
  const openRecord = await getOpenBreastfeedingRecord();
  if (!openRecord || openRecord.id !== input.id) {
    throw new Error("没有找到正在进行的母乳喂养记录。");
  }

  const startedAt = new Date(openRecord.startedAt);
  const durationMinutes = Math.max(
    1,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
  );

  await getPool().execute(
    `update feeding_records
     set ended_at = :endedAt, duration_minutes = :durationMinutes, note = :note
     where id = :id and ended_at is null`,
    {
      id: input.id,
      endedAt,
      durationMinutes,
      note:
        durationMinutes > 45
          ? appendSystemNote(input.note, "母乳时长偏长，预测已自动降权")
          : (input.note ?? "")
    }
  );

  return {
    id: input.id,
    durationMinutes
  };
}

export async function getLatestFeedingRecordTime() {
  if (!hasCompleteMysqlConfig()) return null;
  const [rows] = await getPool().query<LatestCareRecordRow[]>(
    "select happened_at from feeding_records order by happened_at desc limit 1"
  );
  return toIsoString(rows[0]?.happened_at) || null;
}

export async function getRecentBottleFeedingAmounts(limit = 6) {
  if (!hasCompleteMysqlConfig()) return [];
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 12);
  const [rows] = await getPool().query<FeedingAmountRow[]>(
    `select happened_at, amount_ml
     from feeding_records
     where amount_ml is not null and amount_ml > 0
     order by happened_at desc
     limit ${safeLimit}`
  );
  return rows
    .map((row) => ({
      happenedAt: toIsoString(row.happened_at),
      amountMl: toNumber(row.amount_ml)
    }))
    .filter((row) => row.happenedAt && row.amountMl > 0);
}

export async function getRecentFeedingHistory(limit = 24) {
  if (!hasCompleteMysqlConfig()) return [];
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 1000);
  const [rows] = await getPool().query<FeedingHistoryRow[]>(
    `select happened_at, ended_at, feeding_type, amount_ml, duration_minutes
     from feeding_records
     order by happened_at desc
     limit ${safeLimit}`
  );
  return rows
    .map((row) => ({
      happenedAt: toIsoString(row.happened_at),
      endedAt: toIsoString(row.ended_at) || null,
      feedingType: row.feeding_type ?? "",
      amountMl: row.amount_ml == null ? null : toNumber(row.amount_ml),
      durationMinutes:
        row.duration_minutes == null ? null : toNumber(row.duration_minutes)
    }))
    .filter((row) => row.happenedAt);
}

export async function getCareTrends(limit = 20) {
  if (!hasCompleteMysqlConfig()) {
    return emptyCareTrends();
  }

  try {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 1000);
    const [feedingRows] = await getPool().query<CareTrendRow[]>(
      `select happened_at, amount_ml
         from feeding_records
         where amount_ml is not null and amount_ml > 0
         order by happened_at desc
         limit ${safeLimit}`
    );
    const [temperatureRows] = await getPool().query<CareTrendRow[]>(
      `select measured_at, temperature_c
         from temperature_records
         order by measured_at desc
         limit ${safeLimit}`
    );
    const [weightRows] = await getPool().query<CareTrendRow[]>(
      `select measured_at, weight_grams
         from weight_records
         order by measured_at desc
         limit ${safeLimit}`
    );
    const [sleepRows] = await getPool().query<CareTrendRow[]>(
      `select started_at, duration_minutes
         from sleep_records
         where duration_minutes is not null and duration_minutes > 0
         order by started_at desc
         limit ${safeLimit}`
    );

    return {
      feeding: feedingRows
        .map((row) => ({
          time: toIsoString(row.happened_at),
          value: toNumber(row.amount_ml)
        }))
        .filter((item) => item.time && item.value > 0)
        .reverse(),
      temperature: temperatureRows
        .map((row) => ({
          time: toIsoString(row.measured_at),
          value: toNumber(row.temperature_c)
        }))
        .filter((item) => item.time && item.value > 0)
        .reverse(),
      weight: weightRows
        .map((row) => ({
          time: toIsoString(row.measured_at),
          value: toNumber(row.weight_grams)
        }))
        .filter((item) => item.time && item.value > 0)
        .reverse(),
      sleep: sleepRows
        .map((row) => ({
          time: toIsoString(row.started_at),
          value: Math.round((toNumber(row.duration_minutes) / 60) * 10) / 10
        }))
        .filter((item) => item.time && item.value > 0)
        .reverse()
    };
  } catch {
    return emptyCareTrends();
  }
}

function emptyCareTrends() {
  return {
    feeding: [],
    temperature: [],
    weight: [],
    sleep: []
  };
}

export async function getSleepTimeline(limit = 20) {
  if (!hasCompleteMysqlConfig()) return [];
  try {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 60);
    const [rows] = await getPool().query<SleepTimelineRow[]>(
      `select id, started_at, ended_at, duration_minutes, awake_minutes, pause_started_at
       from sleep_records
       order by started_at desc
       limit ${safeLimit}`
    );

    return rows
      .map((row) => ({
        id: row.id,
        startedAt: toIsoString(row.started_at),
        endedAt: toIsoString(row.ended_at) || null,
        durationMinutes: row.duration_minutes ?? null,
        awakeMinutes: row.awake_minutes ?? 0,
        pauseStartedAt: toIsoString(row.pause_started_at) || null
      }))
      .filter((row) => row.startedAt)
      .reverse();
  } catch {
    return [];
  }
}

export async function getRecentCareRecords(limit = 40) {
  if (!hasCompleteMysqlConfig()) return [];
  try {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
    const [rows] = await getPool().query<CareRecordListRow[]>(
      `(select id, 'feeding' as record_type, happened_at,
          feeding_type as title,
          concat(
            case when side <> '' then concat(side, '侧 ') else '' end,
            case when amount_ml is not null then concat(cast(amount_ml as char), 'ml') else '' end,
            case when duration_minutes is not null then concat(duration_minutes, '分钟') else '' end
          ) as detail
        from feeding_records)
       union all
       (select id, 'diaper' as record_type, happened_at,
          diaper_type as title,
          stool_color as detail
        from diaper_records)
       union all
       (select id, 'temperature' as record_type, measured_at as happened_at,
          concat(cast(temperature_c as char), '℃') as title,
          measure_method as detail
        from temperature_records)
       union all
       (select id, 'weight' as record_type, measured_at as happened_at,
          concat(weight_grams, 'g') as title,
          place as detail
        from weight_records)
       union all
       (select id, 'sleep' as record_type, started_at as happened_at,
          case when ended_at is null then '睡眠中' else concat(duration_minutes, '分钟') end as title,
          case when awake_minutes > 0 then concat('暂醒', awake_minutes, '分钟') else '' end as detail
        from sleep_records)
       order by happened_at desc
       limit ${safeLimit}`
    );

    return rows.map((row) => ({
      id: row.id,
      type: row.record_type,
      happenedAt: toIsoString(row.happened_at),
      title: row.title,
      detail: row.detail ?? ""
    }));
  } catch {
    return [];
  }
}

export async function deleteCareRecord(type: string, id: string) {
  const tableByType: Record<string, string> = {
    feeding: "feeding_records",
    diaper: "diaper_records",
    temperature: "temperature_records",
    weight: "weight_records",
    sleep: "sleep_records"
  };
  const table = tableByType[type];
  if (!table) throw new Error("未知记录类型。");
  await getPool().execute(`delete from ${table} where id = :id`, { id });
}

export async function createDiaperRecord(input: {
  happenedAt?: string;
  diaperType: string;
  stoolColor?: string;
  stoolTexture?: string;
  recorder?: string;
  note?: string;
}) {
  const id = randomUUID();
  await getPool().execute(
    `insert into diaper_records
      (id, happened_at, diaper_type, stool_color, stool_texture, recorder, note)
     values
      (:id, :happenedAt, :diaperType, :stoolColor, :stoolTexture, :recorder, :note)`,
    {
      id,
      happenedAt: input.happenedAt ? new Date(input.happenedAt) : new Date(),
      diaperType: input.diaperType,
      stoolColor: input.stoolColor ?? "",
      stoolTexture: input.stoolTexture ?? "",
      recorder: input.recorder ?? "",
      note: input.note ?? ""
    }
  );

  return id;
}

export async function getTodayDiaperSummary() {
  if (!hasCompleteMysqlConfig()) return { pee: 0, poop: 0 };
  try {
    // Use application-local day boundaries instead of MySQL CURRENT_DATE().
    // The database server may run in UTC while the app runs in Asia/Shanghai.
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const [rows] = await getPool().query<DiaperSummaryRow[]>(
      `select
         sum(case when diaper_type in ('尿', '尿+便') then 1 else 0 end) as pee,
         sum(case when diaper_type in ('便', '尿+便') then 1 else 0 end) as poop
       from diaper_records
       where happened_at >= :dayStart
         and happened_at < :dayEnd`,
      { dayStart, dayEnd }
    );
    return {
      pee: toNumber(rows[0]?.pee),
      poop: toNumber(rows[0]?.poop)
    };
  } catch {
    return { pee: 0, poop: 0 };
  }
}

export async function getRecentDiaperHistory(limit = 40) {
  if (!hasCompleteMysqlConfig()) return [];
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 1000);
  const [rows] = await getPool().query<DiaperHistoryRow[]>(
    `select happened_at, diaper_type
     from diaper_records
     order by happened_at desc
     limit ${safeLimit}`
  );
  return rows
    .map((row) => ({
      happenedAt: toIsoString(row.happened_at),
      diaperType: row.diaper_type ?? ""
    }))
    .filter((row) => row.happenedAt);
}

export async function createTemperatureRecord(input: {
  measuredAt?: string;
  temperatureC: number;
  measureMethod?: string;
  recorder?: string;
  note?: string;
}) {
  const id = randomUUID();
  await getPool().execute(
    `insert into temperature_records
      (id, measured_at, temperature_c, measure_method, recorder, note)
     values
      (:id, :measuredAt, :temperatureC, :measureMethod, :recorder, :note)`,
    {
      id,
      measuredAt: input.measuredAt ? new Date(input.measuredAt) : new Date(),
      temperatureC: input.temperatureC,
      measureMethod: input.measureMethod ?? "",
      recorder: input.recorder ?? "",
      note: input.note ?? ""
    }
  );

  return id;
}

export async function getLatestTemperatureRecordTime() {
  if (!hasCompleteMysqlConfig()) return null;
  const [rows] = await getPool().query<LatestCareRecordRow[]>(
    "select measured_at from temperature_records order by measured_at desc limit 1"
  );
  return toIsoString(rows[0]?.measured_at) || null;
}

export async function createWeightRecord(input: {
  measuredAt?: string;
  weightGrams: number;
  place?: string;
  recorder?: string;
  note?: string;
}) {
  const id = randomUUID();
  await getPool().execute(
    `insert into weight_records
      (id, measured_at, weight_grams, place, recorder, note)
     values
      (:id, :measuredAt, :weightGrams, :place, :recorder, :note)`,
    {
      id,
      measuredAt: input.measuredAt ? new Date(input.measuredAt) : new Date(),
      weightGrams: input.weightGrams,
      place: input.place ?? "",
      recorder: input.recorder ?? "",
      note: input.note ?? ""
    }
  );

  return id;
}

export async function getLatestWeightRecordTime() {
  if (!hasCompleteMysqlConfig()) return null;
  const [rows] = await getPool().query<LatestCareRecordRow[]>(
    "select measured_at from weight_records order by measured_at desc limit 1"
  );
  return toIsoString(rows[0]?.measured_at) || null;
}

export async function createSleepRecord(input: {
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  recorder?: string;
  note?: string;
}) {
  const id = randomUUID();
  const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();
  const endedAt = input.endedAt ? new Date(input.endedAt) : null;
  await getPool().execute(
    `insert into sleep_records
      (id, started_at, ended_at, duration_minutes, recorder, note)
     values
      (:id, :startedAt, :endedAt, :durationMinutes, :recorder, :note)`,
    {
      id,
      startedAt,
      endedAt,
      durationMinutes: input.durationMinutes ?? null,
      recorder: input.recorder ?? "",
      note: input.note ?? ""
    }
  );

  return id;
}

export async function getOpenSleepRecord() {
  if (!hasCompleteMysqlConfig()) return null;
  const [rows] = await getPool().query<LatestCareRecordRow[]>(
    `select id, started_at, pause_started_at, awake_minutes
     from sleep_records
     where ended_at is null
     order by started_at desc
     limit 1`
  );
  const row = rows[0];
  if (!row?.id) return null;
  return {
    id: row.id,
    startedAt: toIsoString(row.started_at),
    pauseStartedAt: toIsoString(row.pause_started_at) || null,
    awakeMinutes: row.awake_minutes ?? 0
  };
}

export async function pauseSleepRecord(input: {
  id: string;
  pauseStartedAt?: string;
}) {
  const pauseStartedAt = input.pauseStartedAt
    ? new Date(input.pauseStartedAt)
    : new Date();

  await getPool().execute(
    `update sleep_records
     set pause_started_at = :pauseStartedAt
     where id = :id and ended_at is null and pause_started_at is null`,
    {
      id: input.id,
      pauseStartedAt
    }
  );

  return { id: input.id, pauseStartedAt: pauseStartedAt.toISOString() };
}

export async function resumeSleepRecord(input: {
  id: string;
  resumedAt?: string;
}) {
  const resumedAt = input.resumedAt ? new Date(input.resumedAt) : new Date();
  const [rows] = await getPool().query<LatestCareRecordRow[]>(
    `select pause_started_at, awake_minutes
     from sleep_records
     where id = :id and ended_at is null
     limit 1`,
    { id: input.id }
  );
  const row = rows[0];
  if (!row?.pause_started_at) throw new Error("当前没有暂醒中的睡眠记录。");

  const pauseStartedAt = new Date(row.pause_started_at);
  const awakeMinutes = Math.max(
    1,
    Math.round((resumedAt.getTime() - pauseStartedAt.getTime()) / 60000)
  );
  const totalAwakeMinutes = (row.awake_minutes ?? 0) + awakeMinutes;

  await getPool().execute(
    `update sleep_records
     set pause_started_at = null, awake_minutes = :awakeMinutes
     where id = :id and ended_at is null`,
    {
      id: input.id,
      awakeMinutes: totalAwakeMinutes
    }
  );

  return { id: input.id, awakeMinutes };
}

export async function finishSleepRecord(input: {
  id: string;
  endedAt?: string;
  note?: string;
}) {
  const endedAt = input.endedAt ? new Date(input.endedAt) : new Date();
  const [rows] = await getPool().query<LatestCareRecordRow[]>(
    "select started_at, pause_started_at, awake_minutes from sleep_records where id = :id limit 1",
    { id: input.id }
  );
  const startedAt = rows[0]?.started_at
    ? new Date(rows[0].started_at)
    : undefined;
  if (!startedAt || endedAt <= startedAt) {
    throw new Error("结束时间要晚于开始时间。");
  }
  const extraAwakeMinutes = rows[0]?.pause_started_at
    ? Math.max(
        0,
        Math.round(
          (endedAt.getTime() - new Date(rows[0].pause_started_at).getTime()) /
            60000
        )
      )
    : 0;
  const awakeMinutes = (rows[0]?.awake_minutes ?? 0) + extraAwakeMinutes;
  const rawDurationMinutes = Math.max(
    1,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 60000) - awakeMinutes
  );
  const durationMinutes = Math.min(rawDurationMinutes, 8 * 60);

  await getPool().execute(
    `update sleep_records
     set ended_at = :endedAt, duration_minutes = :durationMinutes, awake_minutes = :awakeMinutes, pause_started_at = null, note = :note
     where id = :id and ended_at is null`,
    {
      id: input.id,
      endedAt,
      durationMinutes,
      awakeMinutes,
      note:
        rawDurationMinutes > durationMinutes
          ? appendSystemNote(input.note, "睡眠时长偏长，已按 8 小时参与统计")
          : (input.note ?? "")
    }
  );

  return { id: input.id, durationMinutes };
}

function appendSystemNote(note: string | undefined, systemNote: string) {
  return [note?.trim(), systemNote].filter(Boolean).join("；");
}

export async function getLatestSleepRecord() {
  if (!hasCompleteMysqlConfig()) return null;
  const [rows] = await getPool().query<LatestCareRecordRow[]>(
    "select started_at, ended_at, duration_minutes from sleep_records order by started_at desc limit 1"
  );
  const row = rows[0];
  if (!row) return null;
  return {
    startedAt: toIsoString(row.started_at),
    endedAt: toIsoString(row.ended_at) || null,
    durationMinutes: row.duration_minutes ?? null
  };
}
