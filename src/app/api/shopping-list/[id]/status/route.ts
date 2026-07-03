import { NextResponse } from "next/server";
import { updateShoppingStatus } from "@/lib/notion";
import { SHOPPING_STATUSES, type ShoppingStatus } from "@/types";

function isShoppingStatus(status: string): status is ShoppingStatus {
  return (SHOPPING_STATUSES as readonly string[]).includes(status);
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = (await request.json()) as { status?: string };

    if (!body.status || !isShoppingStatus(body.status)) {
      return NextResponse.json({ error: "无效的采购状态。" }, { status: 400 });
    }

    await updateShoppingStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新采购状态失败。" },
      { status: 500 }
    );
  }
}
