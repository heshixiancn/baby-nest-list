-- Run this migration if your database was created before sleep tracking support.
-- Example:
-- mysql -h <host> -P 3306 -u <app-user> -p <database> < schema/mysql-add-sleep-records.sql

create table if not exists sleep_records (
  id char(36) not null,
  baby_id char(36) null,
  started_at datetime(3) not null,
  ended_at datetime(3) null,
  duration_minutes int unsigned null,
  recorder varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_sleep_records_baby_time (baby_id, started_at),
  key idx_sleep_records_time (started_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;
