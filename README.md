# 开心の清单 / baby-nest-list

开心の清单是一个给家人共同使用的宝宝用品采购清单应用。应用使用 Notion 数据库保存数据，Web 页面负责更适合手机和家庭协作的录入、分组、状态维护、支出统计和分组打印。

## 功能

- 首页看板：汇总待购买、已下单、已到货和采购金额。
- 采购清单：按分组 tab 展示物品，支持新增、编辑、删除、数量调整和状态切换。
- 分组管理：可新增分组、调整分组顺序、隐藏不常用分组。
- 支出统计：按分组、状态、支付方式和单品金额展示统计。
- 导出打印：按当前分组导出简洁打印页，只包含物品名称、数量、用途。
- Notion 首次配置：没有配置时显示引导，输入 token、父页面和可选的已有数据库 ID 后自动补全配置。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Notion API
- pnpm
- Docker / Docker Compose

## Notion 数据库

当前应用使用两个 Notion 数据库。

### 采购清单数据库

| 字段名 | Notion 类型 | 说明 |
| --- | --- | --- |
| 物品名称 | Title | 必填 |
| 类别 | Select | 页面按分组 tab 展示 |
| 品牌型号 | Rich text | 可为空 |
| 单价 | Number | 为空按 0 处理 |
| 数量 | Number | 为空按 1 处理 |
| 单位 | Rich text | 例如 件、包、瓶、台 |
| 购买平台 | Select | 京东、淘宝、天猫、山姆、拼多多、抖音、线下、劳保 |
| 支付方式 | Select | 现金、劳保积分、京东E卡 |
| 商品链接 | URL | 可为空 |
| 状态 | Select | 待购买、已下单、已到货、暂缓、已放弃 |
| 备注 | Rich text | 页面上作为“用途”展示和打印 |

### 采购记录数据库

| 字段名 | Notion 类型 | 说明 |
| --- | --- | --- |
| 记录名称 | Title | 建议使用物品名称 |
| 采购日期 | Date | 只记录日期，用于后续月账单和年账单 |
| 类别 | Select | 建议与采购清单使用相同分组 |
| 物品名称 | Rich text | 原始物品名 |
| 品牌型号 | Rich text | 可为空 |
| 单价 | Number | 单件价格 |
| 数量 | Number | 本次采购数量 |
| 单位 | Rich text | 例如 件、包、瓶、台 |
| 实付金额 | Number | 实际支出金额 |
| 支付方式 | Select | 现金、劳保积分、京东E卡 |
| 购买平台 | Select | 京东、淘宝、天猫、山姆、拼多多、抖音、线下、劳保 |
| 商品链接 | URL | 可为空 |
| 采购清单ID | Rich text | 来源采购物品 ID |
| 备注 | Rich text | 可为空 |

## 环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

填写：

```env
NOTION_TOKEN=secret_xxx
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_SHOPPING_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PURCHASE_RECORDS_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`NOTION_TOKEN` 和数据库 ID 属于敏感配置，不能提交到 GitHub。

## Notion 初始化

Notion token 不能由程序自动创建，需要先在 Notion 手动创建 Internal Integration。

1. 打开 https://www.notion.so/my-integrations
2. 创建 Internal Integration，复制 token。
3. 在 Notion 创建或选择一个父页面，例如“开心の清单”。
4. 将父页面分享给这个 Integration。
5. 在 `.env.local` 填写 `NOTION_TOKEN` 和 `NOTION_PARENT_PAGE_ID`。
6. 运行：

```bash
pnpm notion:setup
```

脚本会优先复用 `.env.local` 里已有的数据库 ID；缺少数据库 ID 时才会创建数据库并写回 `.env.local`。不要随便使用 `--force-new`，否则会创建一套新数据库。

如果已经有旧数据库，务必把 `NOTION_SHOPPING_DATABASE_ID` 和 `NOTION_PURCHASE_RECORDS_DATABASE_ID` 填入 `.env.local`，或在首次配置页面的“已有数据库 ID”输入框里粘贴对应数据库链接/ID。应用会先校验这些数据库是否可访问，然后只写入本地配置；不会删除、清空或重建已有数据。

## 本地开发

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

## OrbStack 部署到 Mac mini

推荐方式：代码放 GitHub 私有仓库，Mac mini 上用 OrbStack 跑 Docker Compose。

### 1. 在 Mac mini 安装 OrbStack

安装并启动 OrbStack 后，终端里确认 Docker 可用：

```bash
docker version
docker compose version
```

### 2. 准备代码

如果使用 GitHub：

```bash
git clone git@github.com:<your-name>/baby-nest-list.git
cd baby-nest-list
```

如果先不使用 GitHub，也可以把整个项目目录复制到 Mac mini。

### 3. 准备 `.env.local`

在 Mac mini 的项目目录创建 `.env.local`。如果你已经有数据库 ID，直接填完整：

```env
NOTION_TOKEN=secret_xxx
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_SHOPPING_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PURCHASE_RECORDS_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

如果是第一次部署，也可以先只填：

```env
NOTION_TOKEN=secret_xxx
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

然后启动容器，打开页面按引导创建数据库。`compose.yml` 会把 `.env.local` 单文件挂载到容器内，页面初始化成功后会把生成的数据库 ID 写回 Mac mini 上这个文件。

如果部署前已经有 Notion 数据库，建议直接填完整四项配置；也可以在首次配置页面里额外粘贴已有采购清单数据库和采购记录数据库的链接/ID。已有数据库只会被访问校验，不会被清理；没有填写的数据库才会在父页面下新建。

### 4. 启动容器

```bash
docker compose up -d --build
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

家里手机、电脑需要和 Mac mini 在同一个局域网。

### 5. 更新版本

如果代码在 GitHub：

```bash
git pull
docker compose up -d --build
```

如果只是本地复制代码，复制新代码后同样运行：

```bash
docker compose up -d --build
```

### 6. 停止服务

```bash
docker compose down
```

## GitHub 建议

- 建议创建私有仓库。
- `.env.local` 已在 `.gitignore` 中，确认不要提交 Notion token。
- 第一次推送前先提交当前代码：

```bash
git add .
git commit -m "Prepare Mac mini OrbStack deployment"
git branch -M main
git remote add origin git@github.com:<your-name>/baby-nest-list.git
git push -u origin main
```
