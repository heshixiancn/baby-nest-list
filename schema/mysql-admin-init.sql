-- Run this file with a MySQL administrator account.
-- Example:
-- mysql -h <host> -P 3306 -u root -p < schema/mysql-admin-init.sql
--
-- Change the database name, user, host, and password before running in production.

create database if not exists baby_nest_list
  character set utf8mb4
  collate utf8mb4_unicode_ci;

create user if not exists 'baby_nest_app'@'%' identified by 'change_me_before_use';

grant select, insert, update, delete, create, alter, index
  on baby_nest_list.*
  to 'baby_nest_app'@'%';

flush privileges;

use baby_nest_list;

create table if not exists item_groups (
  id bigint unsigned not null auto_increment,
  name varchar(30) not null,
  sort_order int not null default 0,
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  unique key uq_item_groups_name (name)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists shopping_items (
  id char(36) not null,
  notion_page_id varchar(64) null,
  name varchar(200) not null,
  item_group varchar(30) not null,
  group_sort int not null default 0,
  brand_model varchar(200) not null default '',
  unit_price decimal(10, 2) not null default 0,
  quantity decimal(10, 2) not null default 1,
  unit varchar(10) not null default '件',
  platform varchar(20) not null default '',
  payment_method varchar(20) not null default '现金',
  product_url varchar(1000) null,
  status varchar(20) not null default '待购买',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  deleted_at timestamp(3) null,
  primary key (id),
  unique key uq_shopping_items_notion_page_id (notion_page_id),
  key idx_shopping_items_group_status (deleted_at, group_sort, item_group, status),
  key idx_shopping_items_updated_at (updated_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists purchase_records (
  id char(36) not null,
  record_date date not null,
  name varchar(200) not null,
  item_group varchar(30) not null default '',
  brand_model varchar(200) not null default '',
  unit_price decimal(10, 2) not null default 0,
  quantity decimal(10, 2) not null default 1,
  unit varchar(10) not null default '件',
  amount decimal(10, 2) not null default 0,
  payment_method varchar(20) not null default '现金',
  platform varchar(20) not null default '',
  product_url varchar(1000) null,
  source_shopping_item_id char(36) null,
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_purchase_records_date (record_date),
  key idx_purchase_records_source (source_shopping_item_id)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists baby_profiles (
  id char(36) not null,
  name varchar(80) not null,
  birthday datetime(3) not null,
  gender varchar(20) not null default '',
  birth_weight_grams int unsigned null,
  birth_length_cm decimal(5, 2) null,
  hospital varchar(120) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_baby_profiles_birthday (birthday)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists feeding_records (
  id char(36) not null,
  baby_id char(36) null,
  happened_at datetime(3) not null,
  ended_at datetime(3) null,
  feeding_type varchar(20) not null,
  side varchar(10) not null default '',
  duration_minutes int unsigned null,
  amount_ml decimal(6, 2) null,
  recorder varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_feeding_records_baby_time (baby_id, happened_at),
  key idx_feeding_records_time (happened_at),
  key idx_feeding_records_open (feeding_type, ended_at, duration_minutes)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists diaper_records (
  id char(36) not null,
  baby_id char(36) null,
  happened_at datetime(3) not null,
  diaper_type varchar(20) not null,
  stool_color varchar(40) not null default '',
  stool_texture varchar(40) not null default '',
  recorder varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_diaper_records_baby_time (baby_id, happened_at),
  key idx_diaper_records_time (happened_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists weight_records (
  id char(36) not null,
  baby_id char(36) null,
  measured_at datetime(3) not null,
  weight_grams int unsigned not null,
  place varchar(80) not null default '',
  recorder varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_weight_records_baby_time (baby_id, measured_at),
  key idx_weight_records_time (measured_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists jaundice_records (
  id char(36) not null,
  baby_id char(36) null,
  measured_at datetime(3) not null,
  value decimal(6, 2) not null,
  unit varchar(20) not null default 'mg/dL',
  measure_method varchar(20) not null default '',
  body_part varchar(40) not null default '',
  follow_up_at datetime(3) null,
  recorder varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_jaundice_records_baby_time (baby_id, measured_at),
  key idx_jaundice_records_follow_up (follow_up_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists temperature_records (
  id char(36) not null,
  baby_id char(36) null,
  measured_at datetime(3) not null,
  temperature_c decimal(4, 1) not null,
  measure_method varchar(20) not null default '',
  recorder varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_temperature_records_baby_time (baby_id, measured_at),
  key idx_temperature_records_time (measured_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists care_tasks (
  id char(36) not null,
  baby_id char(36) null,
  title varchar(160) not null,
  task_type varchar(30) not null,
  due_at datetime(3) null,
  assignee varchar(40) not null default '',
  priority varchar(20) not null default '普通',
  status varchar(20) not null default '待处理',
  source varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_care_tasks_due_status (due_at, status),
  key idx_care_tasks_baby_due (baby_id, due_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists sleep_records (
  id char(36) not null,
  baby_id char(36) null,
  started_at datetime(3) not null,
  ended_at datetime(3) null,
  duration_minutes int unsigned null,
  pause_started_at datetime(3) null,
  awake_minutes int unsigned not null default 0,
  recorder varchar(40) not null default '',
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_sleep_records_baby_time (baby_id, started_at),
  key idx_sleep_records_time (started_at),
  key idx_sleep_records_open_pause (ended_at, pause_started_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;

insert into item_groups (name, sort_order)
values
  ('妈妈待产包', 0),
  ('宝宝待产包', 1),
  ('宝宝生活耗材', 2)
on duplicate key update sort_order = values(sort_order);
