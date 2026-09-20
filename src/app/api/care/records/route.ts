import { NextResponse } from "next/server";
import {
  deleteCareRecord,
  getCareRecord,
  getRecentCareRecords,
  updateCareRecord,
  type CareRecordEdit
} from "@/lib/mysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (type && id) {
    try {
      const record = await getCareRecord(type, id);
      return record
        ? NextResponse.json({ record })
        : NextResponse.json({ error: "记录不存在。" }, { status: 404 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "读取记录失败。" },
        { status: 400 }
      );
    }
  }
  return NextResponse.json({ records: await getRecentCareRecords() });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<CareRecordEdit>;
    if (
      !body.id ||
      !body.type ||
      !["feeding", "diaper", "temperature", "weight", "sleep"].includes(
        body.type
      )
    ) {
      return NextResponse.json(
        { error: "缺少有效的记录类型或 ID。" },
        { status: 400 }
      );
    }
    const started =
      typeof body.happenedAt === "string"
        ? new Date(body.happenedAt).getTime()
        : NaN;
    const ended = body.endedAt ? new Date(body.endedAt).getTime() : null;
    if (
      !Number.isFinite(started) ||
      (ended !== null && (!Number.isFinite(ended) || ended <= started))
    ) {
      return NextResponse.json(
        { error: "请输入有效时间，结束时间必须晚于开始时间。" },
        { status: 400 }
      );
    }
    if (body.type === "feeding") {
      if (!["母乳", "瓶喂", "配方奶"].includes(body.feedingType ?? ""))
        return NextResponse.json(
          { error: "请选择有效的喂养类型。" },
          { status: 400 }
        );
      if (typeof body.side === "string" && body.side.length > 10)
        return NextResponse.json(
          { error: "侧别不能超过 10 字。" },
          { status: 400 }
        );
      if (
        body.feedingType !== "母乳" &&
        (typeof body.amountMl !== "number" ||
          !Number.isFinite(body.amountMl) ||
          body.amountMl <= 0 ||
          body.amountMl > 1000)
      )
        return NextResponse.json(
          { error: "奶量必须是 0-1000 ml 之间的数字。" },
          { status: 400 }
        );
      if (
        body.feedingType === "母乳" &&
        body.durationMinutes != null &&
        (!Number.isFinite(body.durationMinutes) ||
          body.durationMinutes < 0 ||
          body.durationMinutes > 1440)
      )
        return NextResponse.json(
          { error: "喂养时长必须是 0-1440 分钟。" },
          { status: 400 }
        );
    }
    if (
      body.type === "diaper" &&
      !["尿", "便", "尿+便"].includes(body.diaperType ?? "")
    )
      return NextResponse.json(
        { error: "请选择有效的尿布类型。" },
        { status: 400 }
      );
    if (typeof body.stoolColor === "string" && body.stoolColor.length > 40)
      return NextResponse.json(
        { error: "便便颜色不能超过 40 字。" },
        { status: 400 }
      );
    if (
      body.type === "temperature" &&
      (typeof body.temperatureC !== "number" ||
        !Number.isFinite(body.temperatureC) ||
        body.temperatureC < 30 ||
        body.temperatureC > 45)
    )
      return NextResponse.json(
        { error: "体温必须在 30-45℃ 之间。" },
        { status: 400 }
      );
    if (
      body.type === "weight" &&
      (typeof body.weightGrams !== "number" ||
        !Number.isFinite(body.weightGrams) ||
        body.weightGrams < 300 ||
        body.weightGrams > 30000)
    )
      return NextResponse.json(
        { error: "体重必须在 300-30000g 之间。" },
        { status: 400 }
      );
    if (
      typeof body.measureMethod === "string" &&
      body.measureMethod.length > 20
    )
      return NextResponse.json(
        { error: "测量方式不能超过 20 字。" },
        { status: 400 }
      );
    if (typeof body.place === "string" && body.place.length > 80)
      return NextResponse.json(
        { error: "测量地点不能超过 80 字。" },
        { status: 400 }
      );
    if (body.note && body.note.length > 1000)
      return NextResponse.json(
        { error: "备注不能超过 1000 字。" },
        { status: 400 }
      );
    const record = await updateCareRecord(body as CareRecordEdit);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "修改记录失败。";
    return NextResponse.json(
      { error: message },
      { status: message.includes("不存在") ? 404 : 500 }
    );
  }
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
