export const ITEM_GROUPS = [
  "妈妈待产包",
  "宝宝待产包",
  "宝宝生活耗材"
] as const;

export const SHOPPING_STATUSES = ["待购买", "已下单", "已到货", "暂缓", "已放弃"] as const;

export const PURCHASE_PLATFORMS = [
  "京东",
  "淘宝",
  "天猫",
  "山姆",
  "拼多多",
  "抖音",
  "线下",
  "劳保"
] as const;

export const PAYMENT_METHODS = ["现金", "劳保积分", "京东E卡"] as const;

export const INVENTORY_STATUSES = ["正常", "需要补货", "已下单", "已停用"] as const;

export type ItemGroup = (typeof ITEM_GROUPS)[number];
export type ShoppingStatus = (typeof SHOPPING_STATUSES)[number];
export type PurchasePlatform = (typeof PURCHASE_PLATFORMS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export interface ShoppingItem {
  id: string;
  name: string;
  group: string;
  brandModel: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  platform: string;
  paymentMethod: PaymentMethod | string;
  productUrl: string;
  status: ShoppingStatus | string;
  note: string;
  updatedAt: string;
}

export interface PurchaseRecord {
  id: string;
  recordDate: string;
  name: string;
  group: string;
  brandModel: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  platform: string;
  productUrl: string;
  sourceShoppingItemId: string;
  note: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  group: string;
  currentStock: number;
  unit: string;
  minimumStock: number;
  monthlyUsage: number;
  preferredBrandModel: string;
  preferredPlatform: string;
  preferredUrl: string;
  status: InventoryStatus | string;
  rawStatus: InventoryStatus | string;
  note: string;
  updatedAt: string;
}

export interface NotionFetchResult<T> {
  data: T[];
  error?: string;
  missingConfig?: boolean;
}

export interface DashboardStats {
  todoCount: number;
  orderedCount: number;
  arrivedCount: number;
  totalAmount: number;
  replenishCount: number;
}
