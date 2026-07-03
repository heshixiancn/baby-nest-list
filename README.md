# 开心の清单 / baby-nest-list

开心の清单是一个用于管理待产包、宝宝出生后 0-1 个月用品采购，以及长期消耗品复购提醒的 Web 应用。应用使用 Notion 数据库作为数据源，前端提供更适合家庭采购和库存查看的看板、筛选、统计和快捷更新能力。

## 功能说明

- 首页看板：展示待购买、已下单、已到货、采购总金额、需要补货数量。
- 宝宝用品采购清单：支持类别、状态、购买平台筛选，支持搜索物品名称和品牌型号，展示单价、数量、小计、总金额，并可更新购买状态。
- 消耗品库存管理：管理纸尿裤、棉柔巾、湿巾、奶粉、洗护用品等持续消耗品，当前库存小于等于最低库存时自动显示为需要补货。
- README 提供 Notion 数据库字段、枚举和环境变量配置说明。
- 友好状态：未配置 Notion、Notion 请求失败、字段为空、URL 为空、数字为空、数据为空时均可正常展示。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Notion API
- pnpm
- ESLint
- Prettier

## 项目结构

```text
baby-nest-list
├── README.md
├── .env.example
├── package.json
├── next.config.js
├── tailwind.config.ts
├── src
│   ├── app
│   │   ├── page.tsx
│   │   ├── shopping-list/page.tsx
│   │   ├── inventory/page.tsx
│   │   └── api
│   ├── components
│   ├── lib
│   │   ├── notion.ts
│   │   └── utils.ts
│   └── types
│       └── index.ts
├── scripts
│   └── setup-notion.mjs
```

## Notion 数据库字段配置

### 采购清单数据库

| 字段名 | Notion 类型 | 说明 |
| --- | --- | --- |
| 物品名称 | Title | 必填建议 |
| 类别 | Select | 前端按“分组”展示。新建数据库时默认：妈妈待产包、宝宝待产包、宝宝生活耗材；后续可直接在 Notion Select 选项中维护 |
| 品牌型号 | Rich text | 可为空 |
| 单价 | Number | 为空时前端按 0 处理 |
| 数量 | Number | 为空时前端按 0 处理 |
| 单位 | Rich text | 例如 件、包、瓶、台 |
| 购买平台 | Select | 京东、淘宝、天猫、山姆、拼多多、抖音、线下、劳保 |
| 支付方式 | Select | 现金、劳保积分、京东E卡 |
| 商品链接 | URL | 为空时不显示跳转按钮 |
| 状态 | Select | 待购买、已下单、已到货、暂缓、已放弃 |
| 备注 | Rich text | 可为空 |

### 消耗品库存数据库

| 字段名 | Notion 类型 | 说明 |
| --- | --- | --- |
| 消耗品名称 | Title | 必填建议 |
| 类别 | Select | 前端按“分组”展示，建议与采购清单使用相同分组；后续可直接在 Notion Select 选项中维护 |
| 当前库存 | Number | 为空时前端按 0 处理 |
| 单位 | Rich text | 例如 包、罐、瓶、片 |
| 最低库存 | Number | 为空时前端按 0 处理 |
| 月均消耗 | Number | 为空时前端按 0 处理 |
| 常用品牌型号 | Rich text | 可为空 |
| 常用平台 | Select | 建议使用采购平台枚举 |
| 常用链接 | URL | 为空时不显示复购按钮 |
| 状态 | Select | 正常、需要补货、已下单、已停用 |
| 备注 | Rich text | 可为空 |

### 采购记录数据库

| 字段名 | Notion 类型 | 说明 |
| --- | --- | --- |
| 记录名称 | Title | 建议使用物品名称 |
| 采购日期 | Date | 只记录日期，格式为 YYYY-MM-DD，用于月账单和年账单聚合 |
| 类别 | Select | 建议与采购清单使用相同分组 |
| 物品名称 | Rich text | 可用于保留原始物品名 |
| 品牌型号 | Rich text | 可为空 |
| 单价 | Number | 单件价格 |
| 数量 | Number | 本次采购数量 |
| 单位 | Rich text | 例如 件、包、瓶、台 |
| 实付金额 | Number | 本次实际支出金额，账单统计优先聚合该字段 |
| 支付方式 | Select | 现金、劳保积分、京东E卡 |
| 购买平台 | Select | 京东、淘宝、天猫、山姆、拼多多、抖音、线下、劳保 |
| 商品链接 | URL | 可为空 |
| 采购清单ID | Rich text | 可用于关联来源采购物品 |
| 备注 | Rich text | 可为空 |

> 注意：当前写入接口按 Notion `Select` 字段更新状态。如果你把“状态”配置成 Notion `Status` 类型，需要把 `src/lib/notion.ts` 中对应 update 方法里的 `select` 改为 `status`。

## 环境变量配置

复制示例文件：

```bash
cp .env.example .env.local
```

填写：

```env
NOTION_TOKEN=secret_xxx
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_SHOPPING_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_INVENTORY_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PURCHASE_RECORDS_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 自动创建数据库

Notion Token 不能由程序自动生成，你仍需要先创建一个 Internal Integration，并准备一个父页面。脚本会优先复用 `.env.local` 中已有的数据库 ID 来同步字段结构；缺少数据库 ID 时，才会在父页面下面创建对应数据库、写入一批默认示例数据，并把 database id 写回 `.env.local`。

已有数据库执行 `pnpm notion:setup` 时只同步字段结构，不会删除已有页面数据；不要使用 `--force-new`，否则会创建新的数据库。

步骤：

1. 在 Notion 创建 Internal Integration，并复制 Integration Token。
2. 在 Notion 创建或选择一个父页面，例如“开心の清单”。
3. 打开父页面右上角菜单，将页面授权给这个 Integration。
4. 复制父页面 ID 或页面链接。
5. 写入 `.env.local`：

```env
NOTION_TOKEN=secret_xxx
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

运行：

```bash
pnpm notion:setup
```

如果 `.env.local` 里还没有数据库 ID，成功后脚本会自动补充：

```env
NOTION_SHOPPING_DATABASE_ID=生成的采购清单数据库ID
NOTION_INVENTORY_DATABASE_ID=生成的库存数据库ID
NOTION_PURCHASE_RECORDS_DATABASE_ID=生成的采购记录数据库ID
```

### Docker 部署

构建镜像：

```bash
docker build -t baby-nest-list .
```

在 Mac mini 上运行：

```bash
docker run -d \
  --name baby-nest-list \
  --restart unless-stopped \
  --env-file .env.local \
  -p 3000:3000 \
  baby-nest-list
```

更新版本时重新构建镜像，然后重启容器：

```bash
docker rm -f baby-nest-list
docker build -t baby-nest-list .
docker run -d --name baby-nest-list --restart unless-stopped --env-file .env.local -p 3000:3000 baby-nest-list
```

新建数据库时会自动写入：

- 采购清单默认数据 5 条
- 库存清单默认数据 3 条
- 采购记录为空表，不写默认账单数据

这些默认数据可以直接用于界面预览，后续在 Notion 中按需修改或删除即可。

如果 `.env.local` 已经有 `NOTION_SHOPPING_DATABASE_ID`、`NOTION_INVENTORY_DATABASE_ID` 和 `NOTION_PURCHASE_RECORDS_DATABASE_ID`，再次运行：

```bash
pnpm notion:setup
```

脚本只会同步字段结构，不会新建数据库，也不会重复写入默认数据。已有数据库中的 `类别` 选项会被保留，不会覆盖你在 Notion 里维护的分类。

如果确实要强制创建一套新数据库：

```bash
pnpm notion:setup --force-new
```

如果确实要向已有数据库追加默认数据：

```bash
pnpm notion:setup --seed-existing
```

### 手动创建数据库

如果你不使用自动脚本，也可以手动配置：

1. 在 Notion 创建 Internal Integration，并复制 Integration Token。
2. 创建两个数据库：采购清单数据库、消耗品库存数据库。
3. 打开数据库右上角菜单，将数据库授权给该 Integration。
4. 从 Notion 数据库 URL 中复制 Database ID。
5. 写入 `.env.local` 后重启 `pnpm dev`。

## 本地启动

如果本机尚未安装 pnpm，可先启用 Corepack：

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

```bash
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
pnpm format:check
```

## 部署说明

推荐部署到 Vercel：

1. 将项目推送到 GitHub。
2. 在 Vercel 新建项目并选择该仓库。
3. 在 Vercel Project Settings 中配置环境变量：
   - `NOTION_TOKEN`
   - `NOTION_SHOPPING_DATABASE_ID`
   - `NOTION_INVENTORY_DATABASE_ID`
   - `NOTION_PURCHASE_RECORDS_DATABASE_ID`
4. 部署后访问生产地址。

如果部署到其他 Node.js 平台，确保 Node.js 版本兼容 Next.js 14，并在平台环境变量中配置 Notion 相关值。

## 常见问题

### 未配置环境变量时页面会怎样？

页面会显示友好提示，不会抛出白屏错误。

### Notion 字段为空会报错吗？

不会。文本字段为空显示为空或 `-`，数字字段为空按 `0` 处理，URL 为空时不显示跳转按钮。

### 为什么库存会自动显示“需要补货”？

前端读取库存时会判断 `当前库存 <= 最低库存`。如果原始状态不是“已下单”或“已停用”，展示状态会自动变为“需要补货”。

### 修改状态失败怎么办？

请检查：

- Notion Integration 是否已被授权访问对应数据库。
- 数据库字段名是否完全一致。
- “状态”字段是否为 Select 类型。
- 环境变量是否已配置并重启开发服务器。

### 可以扩展更多字段吗？

可以。建议先在 `src/types/index.ts` 中扩展类型，再在 `src/lib/notion.ts` 中补充 Notion 属性转换，最后更新页面组件展示。
