export const careModules = [
  {
    href: "/care/feeding",
    title: "喂养与尿布",
    description: "记录母乳、瓶喂、尿布和便便，快速看今天摄入和排出是否跟得上。",
    accent: "emerald",
    stats: ["喂养次数", "总奶量", "尿布数量"]
  },
  {
    href: "/care/health",
    title: "体重、黄疸与体温",
    description: "跟踪出生体重变化、黄疸复查和体温，保留每次测量记录。",
    accent: "sky",
    stats: ["体重趋势", "黄疸复查", "体温记录"]
  },
  {
    href: "/care/tasks",
    title: "复诊、疫苗与待办",
    description: "管理出院复查、儿保、疫苗、证件办理和用品补货提醒。",
    accent: "violet",
    stats: ["复诊提醒", "疫苗计划", "家庭待办"]
  },
  {
    href: "/shopping-list",
    title: "采购清单",
    description: "待产包、宝宝用品、耗材补货和购买状态仍然集中在这里维护。",
    accent: "amber",
    stats: ["待购买", "已下单", "采购金额"]
  }
] as const;

export type CareModule = (typeof careModules)[number];
