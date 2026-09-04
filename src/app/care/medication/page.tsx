import { MedicationDashboard } from "@/components/MedicationDashboard";
import {
  getMedicationPlans,
  getMedicationRecords,
  type MedicationPlan,
  type MedicationRecord
} from "@/lib/mysql";

export const dynamic = "force-dynamic";

export default async function MedicationPage() {
  let plans: MedicationPlan[] = [];
  let records: MedicationRecord[] = [];
  let error = "";
  try {
    [plans, records] = await Promise.all([
      getMedicationPlans(true),
      getMedicationRecords(80)
    ]);
  } catch (cause) {
    error = /medication_(plans|records)/i.test(String(cause))
      ? "用药数据表尚未建立，请执行 schema/mysql-add-medications.sql 后刷新。"
      : cause instanceof Error ? cause.message : "读取用药数据失败。";
  }
  return <MedicationDashboard plans={plans} records={records} initialError={error} />;
}
