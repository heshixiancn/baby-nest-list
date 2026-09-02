# 开心の清单 / baby-nest-list

开心の清单是一个给家人共同使用的宝宝照护与采购管理应用。应用支持 MySQL 和 Notion 两种数据源，Web 页面负责更适合手机和家庭协作的喂养、尿布、健康指标、复诊待办和采购清单管理。

## 功能

- 照护首页：把喂养尿布、成长健康、提醒待办和采购清单作为独立入口。
- 喂养与尿布：规划记录母乳、瓶喂、奶量/时长、尿布和便便状态。
- 成长健康：规划记录体重、黄疸、体温和复查建议。
- 复诊待办：规划管理出院复查、儿保、疫苗、证件办理和家庭事项。
- 采购清单：独立入口，按分组 tab 展示物品，支持新增、编辑、删除、数量调整和状态切换。
- 分组管理：可新增分组、调整分组顺序、隐藏不常用分组。
- 支出统计：按分组、状态、支付方式和单品金额展示统计。
- 导出打印：按当前分组导出简洁打印页，只包含物品名称、数量、用途。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- MySQL
- Notion API
- pnpm
- Docker / Docker Compose
- GitHub Actions / GHCR

## MySQL 数据库

SQL 脚本：

- [schema/mysql-admin-init.sql](/Users/heshixian/tools/baby-nest-list/schema/mysql-admin-init.sql:1)：管理员执行的一体化脚本，包含建库、建用户、授权和建表。
- [schema/mysql.sql](/Users/heshixian/tools/baby-nest-list/schema/mysql.sql:1)：只建业务表，适合你已经提前建好库和用户的场景。

业务表包含：

- `item_groups`：采购分组和排序。
- `shopping_items`：采购清单主表，删除使用 `deleted_at` 软删除。
- `purchase_records`：采购记录表，预留给后续账单和真实支出记录。
- `baby_profiles`：宝宝基础资料，包含生日、出生体重、出生身长。
- `feeding_records`：喂养记录，支持母乳、瓶喂、配方奶等类型。
- `diaper_records`：尿布和便便记录。
- `weight_records`：体重记录。
- `jaundice_records`：黄疸检测和复查记录。
- `temperature_records`：体温记录。
- `care_tasks`：复诊、疫苗、证件和家庭待办。

## 环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

填写：

```env
APP_IMAGE=ghcr.io/your-name/baby-nest-list:latest
APP_DATABASE_PROVIDER=mysql
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=your-mysql-database
MYSQL_CONNECTION_LIMIT=20
BABY_BIRTH_DATETIME=2026-08-28T13:44:00+08:00
BABY_BIRTH_DATE=2026-08-28
NOTION_SYNC_ENABLED=false
NOTION_TOKEN=
NOTION_SHOPPING_DATABASE_ID=
NOTION_PURCHASE_RECORDS_DATABASE_ID=
```

应用只通过环境变量读取数据库配置，不会在运行时写入 `.env.local`。

`BABY_BIRTH_DATETIME` 用于首页按宝宝日龄显示喂养和睡眠参考范围，格式为 `YYYY-MM-DDTHH:mm:ss+08:00`。如果只想填日期，也可以用 `BABY_BIRTH_DATE=YYYY-MM-DD`。这些范围只用于家庭记录提醒，不替代医生建议。

`APP_DATABASE_PROVIDER` 支持：

- `mysql`：默认模式，采购清单和照护记录写入 MySQL。
- `notion`：采购清单直接读写 Notion，适合临时切换到备库。

MySQL 主库模式下，如需把采购清单同步到 Notion 作为备库，配置：

```env
APP_DATABASE_PROVIDER=mysql
NOTION_SYNC_ENABLED=true
NOTION_TOKEN=secret_xxx
NOTION_SHOPPING_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PURCHASE_RECORDS_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

当前 Notion 备库同步覆盖采购清单；喂养、尿布、体重、黄疸、体温和待办仍以 MySQL 表为准。

## 本地开发

如果你有 MySQL 管理员账号，先编辑 [schema/mysql-admin-init.sql](/Users/heshixian/tools/baby-nest-list/schema/mysql-admin-init.sql:1)，把库名、用户名、允许访问的 host 和密码改成你的实际值，然后执行：

```bash
mysql -h <MYSQL_HOST> -P <MYSQL_PORT> -u root -p < schema/mysql-admin-init.sql
```

如果数据库和用户已经存在，只执行建表脚本：

```bash
mysql -h <MYSQL_HOST> -P <MYSQL_PORT> -u <MYSQL_USER> -p <MYSQL_DATABASE> < schema/mysql.sql
```

启动应用：

```bash
corepack enable
pnpm install
pnpm dev
```

默认访问：

```text
http://localhost:3000
```

常用校验：

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## GitHub Actions 构建 Docker 镜像

工作流位于 [.github/workflows/docker-image.yml](/Users/heshixian/tools/baby-nest-list/.github/workflows/docker-image.yml:1)。推送到 `main` 或推送 `v*` tag 时，会构建 Docker 镜像并发布到 GitHub Container Registry：

```text
ghcr.io/<owner>/<repo>:latest
ghcr.io/<owner>/<repo>:sha-<commit>
ghcr.io/<owner>/<repo>:<tag>
```

私有仓库使用时，部署机器需要先登录 GHCR：

```bash
docker login ghcr.io
```

## Docker Compose 部署

[compose.yml](/Users/heshixian/tools/baby-nest-list/compose.yml:1) 只启动应用容器，数据库使用你自建的统一 MySQL。部署前需要先在统一数据库执行 [schema/mysql-admin-init.sql](/Users/heshixian/tools/baby-nest-list/schema/mysql-admin-init.sql:1) 或 [schema/mysql.sql](/Users/heshixian/tools/baby-nest-list/schema/mysql.sql:1)。

在 Mac mini 上准备 `.env.local`：

```env
APP_IMAGE=ghcr.io/<owner>/<repo>:latest
APP_DATABASE_PROVIDER=mysql
MYSQL_HOST=<your-mysql-host>
MYSQL_PORT=3306
MYSQL_USER=<your-mysql-user>
MYSQL_PASSWORD=<your-mysql-password>
MYSQL_DATABASE=<your-mysql-database>
MYSQL_CONNECTION_LIMIT=20
NOTION_SYNC_ENABLED=true
NOTION_TOKEN=<notion-token>
NOTION_SHOPPING_DATABASE_ID=<notion-shopping-database-id>
NOTION_PURCHASE_RECORDS_DATABASE_ID=<notion-purchase-records-database-id>
```

启动：

```bash
docker compose --env-file .env.local pull
docker compose --env-file .env.local up -d
```

查看状态：

```bash
docker compose ps
docker compose logs -f app
```

访问：

```text
http://<mac-mini-ip>:3000
```

## 更新版本

GitHub Actions 构建完成后，在部署机器执行：

```bash
docker compose --env-file .env.local pull app
docker compose --env-file .env.local up -d
```

## 停止服务

```bash
docker compose down
```
