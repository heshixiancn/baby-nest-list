import { NextResponse } from "next/server";
import {
  createMedicationPlan,
  createMedicationRecord,
  setMedicationPlanActive,
  updateMedicationPlan
} from "@/lib/mysql";

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "createPlan" || body.action === "updatePlan") {
      const name = String(body.name ?? "").trim();
      const dosage = String(body.dosage ?? "").trim();
      const administrationMethod = String(body.administrationMethod ?? "").trim();
      const startDate = String(body.startDate ?? "");
      const endDate = String(body.endDate ?? "");
      const reminderTimes = Array.isArray(body.reminderTimes)
        ? body.reminderTimes.map(String).filter((time) => timePattern.test(time))
        : [];
      if (!name || !dosage || !administrationMethod || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return NextResponse.json({ error: "请完整填写药品、剂量、用法和开始日期。" }, { status: 400 });
      }
      if (!reminderTimes.length) {
        return NextResponse.json({ error: "请至少设置一个提醒时间。" }, { status: 400 });
      }
      if (endDate && endDate < startDate) {
        return NextResponse.json({ error: "结束日期不能早于开始日期。" }, { status: 400 });
      }
      const planInput = {
        name,
        dosage,
        administrationMethod,
        startDate,
        endDate: endDate || null,
        reminderTimes,
        instructions: String(body.instructions ?? "").trim()
      };
      let id = body.action === "updatePlan" ? String(body.id ?? "") : "";
      if (body.action === "updatePlan") {
        if (!id) return NextResponse.json({ error: "缺少计划编号。" }, { status: 400 });
        await updateMedicationPlan({ id, ...planInput });
      } else {
        id = await createMedicationPlan(planInput);
      }
      return NextResponse.json({ ok: true, id });
    }

    if (body.action === "recordDose") {
      const status = body.status === "skipped" ? "skipped" : "taken";
      const required = ["planId", "medicationName", "dosage", "administrationMethod", "scheduledAt"];
      if (required.some((key) => !String(body[key] ?? "").trim())) {
        return NextResponse.json({ error: "用药计划信息不完整。" }, { status: 400 });
      }
      const id = await createMedicationRecord({
        planId: String(body.planId),
        medicationName: String(body.medicationName),
        dosage: String(body.dosage),
        administrationMethod: String(body.administrationMethod),
        scheduledAt: String(body.scheduledAt),
        status,
        note: String(body.note ?? "").trim()
      });
      return NextResponse.json({ ok: true, id });
    }

    if (body.action === "togglePlan") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "缺少计划编号。" }, { status: 400 });
      await setMedicationPlanActive(id, Boolean(body.active));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "不支持的操作。" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存用药信息失败。";
    const migrationHint = /medication_(plans|records)/i.test(message)
      ? "用药数据表尚未建立，请先执行 schema/mysql-add-medications.sql。"
      : message;
    return NextResponse.json({ error: migrationHint }, { status: 500 });
  }
}
