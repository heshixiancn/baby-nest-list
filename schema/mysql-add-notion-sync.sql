-- Run this migration if your database was created before Notion backup sync support.
-- Example:
-- mysql -h <host> -P 3306 -u <app-user> -p <database> < schema/mysql-add-notion-sync.sql

alter table shopping_items
  add column notion_page_id varchar(64) null after id,
  add unique key uq_shopping_items_notion_page_id (notion_page_id);
