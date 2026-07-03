import { NextResponse } from "next/server";
import { addItemGroupOption, updateItemGroupOrder } from "@/lib/notion";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "分组名称不能为空。" }, { status: 400 });
    }

    if (name.length > 30) {
      return NextResponse.json({ error: "分组名称不能超过 30 个字。" }, { status: 400 });
    }

    const groups = await addItemGroupOption(name);
    return NextResponse.json({ group: name, groups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "新增分组失败。" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { groups?: unknown };

    if (!Array.isArray(body.groups)) {
      return NextResponse.json({ error: "分组顺序格式不正确。" }, { status: 400 });
    }

    const groups = body.groups
      .filter((group): group is string => typeof group === "string")
      .map((group) => group.trim())
      .filter(Boolean);

    if (groups.length === 0) {
      return NextResponse.json({ error: "分组顺序不能为空。" }, { status: 400 });
    }

    if (groups.some((group) => group.length > 30)) {
      return NextResponse.json({ error: "分组名称不能超过 30 个字。" }, { status: 400 });
    }

    const updatedGroups = await updateItemGroupOrder(groups);
    return NextResponse.json({ groups: updatedGroups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存分组顺序失败。" },
      { status: 500 }
    );
  }
}
