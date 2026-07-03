import { NextResponse } from "next/server";
import { updateInventoryStatus } from "@/lib/notion";
import { INVENTORY_STATUSES, type InventoryStatus } from "@/types";

function isInventoryStatus(status: string): status is InventoryStatus {
  return (INVENTORY_STATUSES as readonly string[]).includes(status);
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = (await request.json()) as { status?: string };

    if (!body.status || !isInventoryStatus(body.status)) {
      return NextResponse.json({ error: "无效的库存状态。" }, { status: 400 });
    }

    await updateInventoryStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新库存状态失败。" },
      { status: 500 }
    );
  }
}
