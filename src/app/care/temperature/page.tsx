import { SimpleRecordForm } from "@/components/SimpleRecordForm";

export default function TemperaturePage() {
  return (
    <><SimpleRecordForm
      title="体温"
      apiPath="/api/care/temperature"
      timeField="measuredAt"
      valueField="temperatureC"
      valueLabel="体温"
      unit="℃"
      defaultValue={36.8}
      step={0.1}
      min={30}
      quickValues={[36.5, 36.8, 37, 37.3, 37.5, 38]}
      referenceHint="参考：约 36.0–37.4℃；建议每天 20:00 记录一次，有异常随时加测。"
      warningKind="temperature"
      recordType="temperature"
      extraField={{
        name: "measureMethod",
        label: "测量方式",
        options: ["腋温", "耳温", "额温"]
      }}
    /></>
  );
}
