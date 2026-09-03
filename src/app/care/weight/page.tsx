import { SimpleRecordForm } from "@/components/SimpleRecordForm";
import { getCareTrends } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const trends = await getCareTrends(1);
  const latestWeight = trends.weight.at(-1)?.value ?? 3500;
  return (
    <><SimpleRecordForm
      title="体重"
      apiPath="/api/care/weight"
      timeField="measuredAt"
      valueField="weightGrams"
      valueLabel="体重"
      unit="g"
      defaultValue={Math.round(latestWeight / 10) * 10}
      step={10}
      min={300}
      quickValues={[3000, 3200, 3500, 3800, 4000, 4500]}
      referenceHint="建议：有条件可每天固定时段测一次；没有家用婴儿秤时，按儿保/医院称重为主。重点看趋势，不看单次波动。"
      recordType="weight"
      extraField={{
        name: "place",
        label: "测量地点",
        options: ["家里", "医院", "社区"]
      }}
    /></>
  );
}
