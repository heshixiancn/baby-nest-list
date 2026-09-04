create table if not exists medication_plans (
  id char(36) not null,
  baby_id char(36) null,
  name varchar(120) not null,
  dosage varchar(60) not null,
  administration_method varchar(40) not null,
  start_date date not null,
  end_date date null,
  reminder_times json not null,
  instructions varchar(1000) not null default '',
  active tinyint(1) not null default 1,
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  key idx_medication_plans_active_dates (active, start_date, end_date)
) character set utf8mb4 collate utf8mb4_unicode_ci;

create table if not exists medication_records (
  id char(36) not null,
  plan_id char(36) not null,
  medication_name varchar(120) not null,
  dosage varchar(60) not null,
  administration_method varchar(40) not null,
  scheduled_at datetime(3) not null,
  taken_at datetime(3) null,
  status varchar(20) not null,
  note varchar(1000) not null default '',
  created_at timestamp(3) not null default current_timestamp(3),
  updated_at timestamp(3) not null default current_timestamp(3) on update current_timestamp(3),
  primary key (id),
  unique key uq_medication_record_schedule (plan_id, scheduled_at),
  key idx_medication_records_schedule (scheduled_at),
  key idx_medication_records_status (status, scheduled_at)
) character set utf8mb4 collate utf8mb4_unicode_ci;
