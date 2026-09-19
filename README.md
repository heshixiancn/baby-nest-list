# 开心の成长记录（baby-nest-list）

供家人共同使用的宝宝照护记录与采购清单应用。手机端侧重快速记录，电脑端侧重查看预测、趋势和历史数据。项目基于 Next.js、TypeScript 和 MySQL；采购清单可选用 Notion 作为数据源或备份。

> 喂养、睡眠等预测是按宝宝月龄/日龄、理论参考范围与历史记录动态计算的家庭辅助信息，不是医疗诊断或用药建议。异常症状或用药问题请咨询医生。

## 现有功能

- 照护首页：展示宝宝年龄、喂养/睡眠/尿布预测、最近测量结果；电脑端首页会在页面可见时每 30 秒刷新一次。
- 喂养：记录瓶喂、配方奶和母乳喂养；母乳支持开始/结束计时、补录与结束时间调整。记录页提供按日、周、月、年查看的图表。
- 尿布：分别记录排尿、排便或两者同时发生；“尿+便”在统计中各记一次。
- 睡眠：记录入睡、睡醒及短暂清醒，支持补录和调整结束时间；图表按北京时间将跨午夜睡眠拆分到对应日期，周视图可选择某天查看 24 小时时间轴。
- 体温与体重：快速记录、查看当日是否已测及历史趋势；体温图表用醒目颜色标记异常值。
- 用药：设置药名、剂量、给药方式、计划日期和每日时间；在用药页面查看待服计划、标记已服用或跳过，并可查看/修改/停用计划。当前是**页面内用药提醒**，不提供手机系统推送通知。
- 采购清单：按分组管理物品，支持新增、编辑、删除、数量与状态调整、统计和打印。

复诊/疫苗/家庭待办页面目前主要是展示入口和说明，尚未提供完整的待办增删改流程。

## 技术栈与目录

- Next.js 14 App Router、React 18、TypeScript、Tailwind CSS
- MySQL（`mysql2` 连接池）；采购清单可选 Notion API
- pnpm 9、Docker Compose、GitHub Actions / GHCR

主要目录：`src/app` 为页面与 API，`src/components` 为界面组件，`src/lib` 为数据访问和预测逻辑，`schema` 为数据库建表/增量脚本。

## 本地运行

需要 Node.js 20、pnpm 9 和可访问的 MySQL。首次运行：

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

编辑 `.env.local`，填写数据库连接和宝宝出生时间。已有数据库与用户时，先建表：

```bash
mysql -h <MYSQL_HOST> -P 3306 -u <MYSQL_USER> -p <MYSQL_DATABASE> < schema/mysql.sql
```

如果需要由管理员同时创建数据库、用户和表，**先修改** [schema/mysql-admin-init.sql](schema/mysql-admin-init.sql) 中的库名、用户名、访问主机与默认密码，再执行：

```bash
mysql -h <MYSQL_HOST> -P 3306 -u root -p < schema/mysql-admin-init.sql
```

启动开发服务：

```bash
pnpm dev
```

默认地址为 `http://localhost:3000`。若要与部署在 3000 端口的容器并行运行：

```bash
pnpm exec next dev -p 3100
```

修改代码后可运行：

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## 环境变量

完整模板见 [.env.example](.env.example)。常用设置：

| 变量 | 用途 |
| --- | --- |
| `APP_DATABASE_PROVIDER` | `mysql`（默认）或 `notion`。Notion 模式只适用于采购清单；照护记录仍使用 MySQL。 |
| `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE` | MySQL 连接信息。容器内的 `localhost` 指容器自身，连接宿主机数据库时请填写可从容器访问的主机名/IP。 |
| `MYSQL_CONNECTION_LIMIT` | 每个应用进程的连接池上限；未设置时默认 20。按 MySQL 容量与应用实例数调整，不要只盲目调高。 |
| `BABY_BIRTH_DATETIME` | 完整出生时间，例如 `2026-08-28T13:44:00+08:00`；推荐使用带时区偏移的格式。 |
| `BABY_BIRTH_DATE` | 仅有出生日期时的备用值，格式 `YYYY-MM-DD`。 |
| `APP_IMAGE` | Compose 使用的镜像，默认 `ghcr.io/heshixiancn/baby-nest-list:latest`。 |
| `NOTION_SYNC_ENABLED`、`NOTION_TOKEN`、`NOTION_SHOPPING_DATABASE_ID`、`NOTION_PURCHASE_RECORDS_DATABASE_ID` | 可选的采购清单 Notion 备份同步配置。 |

数据库中的本地时间按北京时间（`Asia/Shanghai` / `+08:00`）解释并在页面显示。保存 `.env.local` 后请重启本地服务或重建容器；不要把含密码或 Notion Token 的文件提交到 Git。

## 数据库与升级

新数据库使用 [schema/mysql.sql](schema/mysql.sql) 建表；它包含采购、喂养、尿布、体温、体重、黄疸、睡眠、用药计划及用药记录等表。

旧数据库升级时，先备份，再按实际缺失的功能执行对应增量脚本；**不要将这些脚本不加判断地重复执行**：

| 脚本 | 用途 |
| --- | --- |
| [mysql-add-feeding-ended-at.sql](schema/mysql-add-feeding-ended-at.sql) | 为旧喂养记录增加结束时间。 |
| [mysql-add-sleep-records.sql](schema/mysql-add-sleep-records.sql) | 为旧数据库建立睡眠记录表。 |
| [mysql-add-sleep-pause.sql](schema/mysql-add-sleep-pause.sql) | 为睡眠记录增加短暂清醒/暂停字段。 |
| [mysql-add-medications.sql](schema/mysql-add-medications.sql) | 为旧数据库建立用药计划和记录表。 |
| [mysql-add-notion-sync.sql](schema/mysql-add-notion-sync.sql) | 为旧采购清单表增加 Notion 同步字段；此脚本不是幂等的，字段已存在时不要再执行。 |

执行示例：

```bash
mysql -h <MYSQL_HOST> -P 3306 -u <MYSQL_USER> -p <MYSQL_DATABASE> < schema/mysql-add-medications.sql
```

页面出现“用药数据表尚未建立”时，通常需要执行 `schema/mysql-add-medications.sql`。`schema/mysql.sql` 的 `CREATE TABLE IF NOT EXISTS` 只负责创建缺失表，不会补齐旧表缺少的字段。

## Docker Compose 部署

[compose.yml](compose.yml) 只启动应用，**不启动 MySQL**。请先确认数据库可访问并已建表；将生产配置写入同目录的 `.env.local`，至少包含 `APP_IMAGE`、MySQL 连接信息和 `BABY_BIRTH_DATETIME`。

```bash
docker compose --env-file .env.local pull app
docker compose --env-file .env.local up -d app
docker compose ps
docker compose logs -f app
```

默认映射宿主机 `3000` 端口，访问 `http://<部署主机 IP>:3000`。Compose 已配置容器时区 `Asia/Shanghai`。如果本地开发用 3100、容器用 3000，请注意两个地址对应不同进程，且可能使用不同环境变量或镜像版本。

更新 `latest` 镜像时先拉取再重建应用容器：

```bash
docker compose --env-file .env.local pull app
docker compose --env-file .env.local up -d --force-recreate app
```

停止应用：`docker compose down`。该 Compose 文件不管理 MySQL，因此不会停止或删除外部数据库。

## GitHub Actions 与镜像

[docker-image.yml](.github/workflows/docker-image.yml) 在推送 `main`、推送 `v*` 标签或手动触发时构建并推送 GHCR 镜像。默认分支会发布 `latest`，同时生成 `sha-<提交哈希前缀>` 标签；也会生成分支/版本标签。`latest` 是可变标签，需要固定版本时请在 `APP_IMAGE` 中使用具体 SHA 标签。

如果镜像为私有包，部署机需要先登录 GHCR（使用有 `read:packages` 权限的令牌）：

```bash
docker login ghcr.io
```

推送代码到 GitHub 需要仓库写入权限；GitHub 不接受账户密码作为 HTTPS Git 的密码，需使用具有相应权限的个人访问令牌或 SSH 密钥。
