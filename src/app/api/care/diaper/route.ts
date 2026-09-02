import { NextResponse } from "next/server";
import { createDiaperRecord } from "@/lib/mysql";

const diaperTypes = ["尿", "便", "尿+便"] as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      happenedAt?: string;
      diaperType?: string;
      stoolColor?: string;
      stoolTexture?: string;
      note?: string;
    };

    if (!body.diaperType || !diaperTypes.includes(body.diaperType as never)) {
      return NextResponse.json(
        { error: "请选择有效的尿布类型。" },
        { status: 400 }
      );
    }

    const id = await createDiaperRecord({
      happenedAt: body.happenedAt,
      diaperType: body.diaperType,
      stoolColor: body.stoolColor?.trim(),
      stoolTexture: body.stoolTexture?.trim(),
      note: body.note?.trim()
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存尿布记录失败。" },
      { status: 500 }
    );
  }
}
