import { NextResponse } from "next/server";
import { createShoppingItem, getShoppingGroupOptions } from "@/lib/notion";
import { PAYMENT_METHODS, PURCHASE_PLATFORMS, SHOPPING_STATUSES } from "@/types";

function isAllowed<T extends readonly string[]>(value: string, list: T): value is T[number] {
  return list.includes(value as T[number]);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      group?: string;
      brandModel?: string;
      unitPrice?: number;
      quantity?: number;
      unit?: string;
      platform?: string;
      paymentMethod?: string;
      productUrl?: string;
      status?: string;
      note?: string;
    };

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "物品名称不能为空。" }, { status: 400 });
    }

    const groupOptions = await getShoppingGroupOptions();
    if (!body.group || !groupOptions.includes(body.group)) {
      return NextResponse.json({ error: "请选择有效的分组。" }, { status: 400 });
    }

    if (body.platform && !isAllowed(body.platform, PURCHASE_PLATFORMS)) {
      return NextResponse.json({ error: "请选择有效的购买平台。" }, { status: 400 });
    }

    if (body.paymentMethod && !isAllowed(body.paymentMethod, PAYMENT_METHODS)) {
      return NextResponse.json({ error: "请选择有效的支付方式。" }, { status: 400 });
    }

    if (body.status && !isAllowed(body.status, SHOPPING_STATUSES)) {
      return NextResponse.json({ error: "请选择有效的采购状态。" }, { status: 400 });
    }

    if (typeof body.unitPrice !== "number" || Number.isNaN(body.unitPrice) || body.unitPrice < 0) {
      return NextResponse.json({ error: "单价必须是非负数字。" }, { status: 400 });
    }

    if (typeof body.quantity !== "number" || Number.isNaN(body.quantity) || body.quantity < 1) {
      return NextResponse.json({ error: "数量必须大于等于 1。" }, { status: 400 });
    }

    const unit = body.unit?.trim() || "件";
    if (unit.length > 10) {
      return NextResponse.json({ error: "单位不能超过 10 个字符。" }, { status: 400 });
    }

    await createShoppingItem({
      name,
      group: body.group,
      brandModel: body.brandModel,
      unitPrice: body.unitPrice,
      quantity: body.quantity,
      unit,
      platform: body.platform,
      paymentMethod: body.paymentMethod ?? "现金",
      productUrl: body.productUrl,
      status: body.status ?? "待购买",
      note: body.note
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建采购物品失败。" },
      { status: 500 }
    );
  }
}
