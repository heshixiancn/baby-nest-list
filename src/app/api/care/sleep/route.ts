import { NextResponse } from "next/server";
import {
  createSleepRecord,
  finishSleepRecord,
  getOpenSleepRecord,
  pauseSleepRecord,
  resumeSleepRecord
} from "@/lib/mysql";

export async function GET() {
  try {
    return NextResponse.json({ openSleep: await getOpenSleepRecord() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取睡眠状态失败。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "start" | "pause" | "resume" | "finish" | "manual";
      id?: string;
      startedAt?: string;
      endedAt?: string;
      pauseStartedAt?: string;
      resumedAt?: string;
      durationMinutes?: number;
      note?: string;
    };

    if (body.action === "start") {
      const id = await createSleepRecord({
        startedAt: body.startedAt,
        note: body.note?.trim()
      });
      return NextResponse.json({ ok: true, id });
    }

    if (body.action === "pause") {
      if (!body.id) {
        return NextResponse.json(
          { error: "缺少睡眠记录 ID。" },
          { status: 400 }
        );
      }
      const result = await pauseSleepRecord({
        id: body.id,
        pauseStartedAt: body.pauseStartedAt
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "resume") {
      if (!body.id) {
        return NextResponse.json(
          { error: "缺少睡眠记录 ID。" },
          { status: 400 }
        );
      }
      const result = await resumeSleepRecord({
        id: body.id,
        resumedAt: body.resumedAt
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "finish") {
      if (!body.id) {
        return NextResponse.json(
          { error: "缺少睡眠记录 ID。" },
          { status: 400 }
        );
      }
      const result = await finishSleepRecord({
        id: body.id,
        endedAt: body.endedAt,
        note: body.note?.trim()
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (
      typeof body.durationMinutes !== "number" ||
      !Number.isFinite(body.durationMinutes) ||
      body.durationMinutes < 1 ||
      body.durationMinutes > 1440
    ) {
      return NextResponse.json(
        { error: "睡眠时长必须是 1-1440 分钟。" },
        { status: 400 }
      );
    }

    if (body.startedAt && body.endedAt) {
      const startedAt = new Date(body.startedAt).getTime();
      const endedAt = new Date(body.endedAt).getTime();
      if (
        !Number.isFinite(startedAt) ||
        !Number.isFinite(endedAt) ||
        endedAt <= startedAt
      ) {
        return NextResponse.json(
          { error: "结束时间要晚于开始时间。" },
          { status: 400 }
        );
      }
    }

    const id = await createSleepRecord({
      startedAt: body.startedAt,
      endedAt: body.endedAt,
      durationMinutes: body.durationMinutes,
      note: body.note?.trim()
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存睡眠失败。" },
      { status: 500 }
    );
  }
}
