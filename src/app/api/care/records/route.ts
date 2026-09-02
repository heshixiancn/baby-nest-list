import { NextResponse } from "next/server";
import { deleteCareRecord, getRecentCareRecords } from "@/lib/mysql";

export async function GET() {
  return NextResponse.json({ records: await getRecentCareRecords() });
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: string;
      id?: string;
    };

    if (!body.type || !body.id) {
      return NextResponse.json(
        { error: "缺少记录类型或记录 ID。" },
        { status: 400 }
      );
    }

    await deleteCareRecord(body.type, body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除记录失败。" },
      { status: 500 }
    );
  }
}
