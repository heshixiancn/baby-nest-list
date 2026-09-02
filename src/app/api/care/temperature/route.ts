import { NextResponse } from "next/server";
import { createTemperatureRecord } from "@/lib/mysql";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      measuredAt?: string;
      temperatureC?: number;
      measureMethod?: string;
      note?: string;
    };

    if (
      typeof body.temperatureC !== "number" ||
      !Number.isFinite(body.temperatureC) ||
      body.temperatureC < 30 ||
      body.temperatureC > 45
    ) {
      return NextResponse.json(
        { error: "体温必须是 30-45 之间的数字。" },
        { status: 400 }
      );
    }

    const id = await createTemperatureRecord({
      measuredAt: body.measuredAt,
      temperatureC: body.temperatureC,
      measureMethod: body.measureMethod,
      note: body.note?.trim()
    });

    return NextResponse.json({
      ok: true,
      id,
      warning: getTemperatureWarning(body.temperatureC)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存体温失败。" },
      { status: 500 }
    );
  }
}

function getTemperatureWarning(value: number) {
  if (value >= 38) return "3个月内宝宝体温 ≥38.0℃，建议及时联系医生。";
  if (value >= 37.5)
    return "体温偏高，建议 15–30 分钟后复测，并观察精神和吃奶。";
  if (value < 36) return "体温偏低，注意保暖并复测；仍偏低建议联系医生。";
  return "";
}
