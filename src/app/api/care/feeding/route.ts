import { NextResponse } from "next/server";
import {
  createFeedingRecord,
  finishBreastfeedingRecord,
  getOpenBreastfeedingRecord
} from "@/lib/mysql";

const feedingTypes = ["母乳", "瓶喂", "配方奶"] as const;

export async function GET() {
  try {
    return NextResponse.json({
      openBreastfeeding: await getOpenBreastfeedingRecord()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "读取母乳喂养状态失败。"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "start" | "finish" | "manual";
      id?: string;
      happenedAt?: string;
      endedAt?: string;
      feedingType?: string;
      side?: string;
      durationMinutes?: number;
      amountMl?: number;
      note?: string;
    };

    if (body.action === "finish") {
      if (!body.id) {
        return NextResponse.json(
          { error: "缺少正在进行的母乳喂养记录。" },
          { status: 400 }
        );
      }

      const result = await finishBreastfeedingRecord({
        id: body.id,
        endedAt: body.endedAt,
        note: body.note?.trim()
      });

      return NextResponse.json({ ok: true, ...result });
    }

    if (
      !body.feedingType ||
      !feedingTypes.includes(body.feedingType as never)
    ) {
      return NextResponse.json(
        { error: "请选择有效的喂养类型。" },
        { status: 400 }
      );
    }

    if (
      body.durationMinutes !== undefined &&
      (!Number.isFinite(body.durationMinutes) || body.durationMinutes < 0)
    ) {
      return NextResponse.json(
        { error: "喂养时长必须是非负数字。" },
        { status: 400 }
      );
    }

    if (
      body.amountMl !== undefined &&
      (!Number.isFinite(body.amountMl) || body.amountMl < 0)
    ) {
      return NextResponse.json(
        { error: "奶量必须是非负数字。" },
        { status: 400 }
      );
    }

    const id = await createFeedingRecord({
      happenedAt: body.happenedAt,
      endedAt: body.endedAt,
      feedingType: body.feedingType,
      side: body.side,
      durationMinutes: body.durationMinutes,
      amountMl: body.amountMl,
      note: body.note?.trim()
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存喂养记录失败。" },
      { status: 500 }
    );
  }
}
