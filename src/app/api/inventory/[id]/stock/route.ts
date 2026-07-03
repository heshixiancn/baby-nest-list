import { NextResponse } from "next/server";
import { updateInventoryStock } from "@/lib/notion";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = (await request.json()) as { currentStock?: number };

    if (typeof body.currentStock !== "number" || Number.isNaN(body.currentStock) || body.currentStock < 0) {
      return NextResponse.json({ error: "当前库存必须是非负数字。" }, { status: 400 });
    }

    await updateInventoryStock(id, body.currentStock);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新当前库存失败。" },
      { status: 500 }
    );
  }
}
