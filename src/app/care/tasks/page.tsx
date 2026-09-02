import { CareModulePage } from "@/components/CareModulePage";

export default function TasksPage() {
  return (
    <CareModulePage
      eyebrow="家庭协作"
      title="复诊、疫苗与待办"
      description="把出生后分散在医院单子、聊天记录和家人脑子里的事情放到同一个待办池。"
      records={[
        {
          title: "医疗提醒",
          description:
            "管理出院复查、黄疸复查、儿保体检、疫苗预约和医生交代事项。",
          fields: ["日期", "类型", "地点", "状态"]
        },
        {
          title: "家庭待办",
          description:
            "记录证件办理、报销、月嫂/家人交接、用品补货等非医疗事项。",
          fields: ["截止日", "负责人", "优先级", "备注"]
        }
      ]}
      reminders={[
        "临近日期的复诊和疫苗在首页优先展示。",
        "待办可分配负责人，减少重复沟通。",
        "采购清单里的耗材后续可以联动生成补货提醒。"
      ]}
    />
  );
}
