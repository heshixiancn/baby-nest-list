-- 给睡眠记录增加“暂醒/继续”能力。
-- 可重复执行：已存在字段或索引时不会重复创建。

set @pause_column_exists := (
  select count(*)
  from information_schema.columns
  where table_schema = database()
    and table_name = 'sleep_records'
    and column_name = 'pause_started_at'
);

set @sql := if(
  @pause_column_exists = 0,
  'alter table sleep_records add column pause_started_at datetime(3) null after duration_minutes',
  'select ''sleep_records.pause_started_at already exists'' as message'
);
prepare stmt from @sql;
execute stmt;
deallocate prepare stmt;

set @awake_column_exists := (
  select count(*)
  from information_schema.columns
  where table_schema = database()
    and table_name = 'sleep_records'
    and column_name = 'awake_minutes'
);

set @sql := if(
  @awake_column_exists = 0,
  'alter table sleep_records add column awake_minutes int unsigned not null default 0 after pause_started_at',
  'select ''sleep_records.awake_minutes already exists'' as message'
);
prepare stmt from @sql;
execute stmt;
deallocate prepare stmt;

set @index_exists := (
  select count(*)
  from information_schema.statistics
  where table_schema = database()
    and table_name = 'sleep_records'
    and index_name = 'idx_sleep_records_open_pause'
);

set @sql := if(
  @index_exists = 0,
  'alter table sleep_records add key idx_sleep_records_open_pause (ended_at, pause_started_at)',
  'select ''idx_sleep_records_open_pause already exists'' as message'
);
prepare stmt from @sql;
execute stmt;
deallocate prepare stmt;
