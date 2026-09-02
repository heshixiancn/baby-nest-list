-- 给母乳喂养增加结束时间，支持“开始喂奶 / 结束喂奶”自动计算时长。
-- 可重复执行：已经存在 ended_at 或索引时不会重复创建。

set @column_exists := (
  select count(*)
  from information_schema.columns
  where table_schema = database()
    and table_name = 'feeding_records'
    and column_name = 'ended_at'
);

set @sql := if(
  @column_exists = 0,
  'alter table feeding_records add column ended_at datetime(3) null after happened_at',
  'select ''feeding_records.ended_at already exists'' as message'
);
prepare stmt from @sql;
execute stmt;
deallocate prepare stmt;

update feeding_records
set ended_at = date_add(happened_at, interval duration_minutes minute)
where feeding_type = '母乳'
  and ended_at is null
  and duration_minutes is not null
  and duration_minutes > 0;

set @index_exists := (
  select count(*)
  from information_schema.statistics
  where table_schema = database()
    and table_name = 'feeding_records'
    and index_name = 'idx_feeding_records_open'
);

set @sql := if(
  @index_exists = 0,
  'alter table feeding_records add key idx_feeding_records_open (feeding_type, ended_at, duration_minutes)',
  'select ''idx_feeding_records_open already exists'' as message'
);
prepare stmt from @sql;
execute stmt;
deallocate prepare stmt;
