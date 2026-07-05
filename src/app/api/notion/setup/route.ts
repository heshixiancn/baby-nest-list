import { NextResponse } from "next/server";
import { setupNotionDatabases } from "@/lib/notion-bootstrap";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      parentPage?: string;
      shoppingDatabaseId?: string;
      purchaseRecordsDatabaseId?: string;
    };
    const result = await setupNotionDatabases({
      token: body.token ?? "",
      parentPage: body.parentPage ?? "",
      shoppingDatabaseId: body.shoppingDatabaseId ?? "",
      purchaseRecordsDatabaseId: body.purchaseRecordsDatabaseId ?? ""
    });

    return NextResponse.json({
      ok: true,
      alreadyConfigured: result.alreadyConfigured,
      databaseIds: {
        shopping: result.config.shoppingDatabaseId,
        purchaseRecords: result.config.purchaseRecordsDatabaseId
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notion 初始化失败。" },
      { status: 500 }
    );
  }
}
