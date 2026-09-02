import { NextResponse } from "next/server";
import { createWeightRecord } from "@/lib/mysql";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      measuredAt?: string;
      weightGrams?: number;
      place?: string;
      note?: string;
    };

    if (
      typeof body.weightGrams !== "number" ||
      !Number.isFinite(body.weightGrams) ||
      body.weightGrams < 300 ||
      body.weightGrams > 30000
    ) {
      return NextResponse.json(
        { error: "体重必须是合理的克数。" },
        { status: 400 }
      );
    }

    const id = await createWeightRecord({
      measuredAt: body.measuredAt,
      weightGrams: body.weightGrams,
      place: body.place,
      note: body.note?.trim()
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存体重失败。" },
      { status: 500 }
    );
  }
}
