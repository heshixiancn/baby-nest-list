export interface BabyReference {
  birthDate?: string;
  birthDateTime?: string;
  ageDays?: number;
  ageHours?: number;
  ageLabel: string;
  feeding: {
    amount: string;
    interval: string;
    daily: string;
  };
  sleep: {
    daily: string;
    note: string;
  };
  caution: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export function getBabyReference(now = new Date()): BabyReference {
  const birthDateTime = process.env.BABY_BIRTH_DATETIME;
  const birthDate = process.env.BABY_BIRTH_DATE;
  const age = getAge(birthDateTime, birthDate, now);

  if (!age) {
    return {
      birthDate,
      birthDateTime,
      ageLabel: "未设置生日",
      feeding: {
        amount: "配置生日后显示",
        interval: "配置生日后显示",
        daily: "配置生日后显示"
      },
      sleep: {
        daily: "配置生日后显示",
        note: "在 .env.local 里加入 BABY_BIRTH_DATETIME=YYYY-MM-DDTHH:mm:ss+08:00"
      },
      caution: "参考范围只用于家庭记录，不替代医生建议。"
    };
  }

  const reference = getReferenceByAge(age.ageDays);

  return {
    birthDate,
    birthDateTime,
    ageDays: age.ageDays,
    ageHours: age.ageHours,
    ageLabel: formatAgeLabel(age.ageDays, age.ageHours),
    caution: "如果宝宝精神差、吃奶明显减少、发热或体重增长异常，优先联系医生。",
    ...reference
  };
}

function getAge(
  birthDateTime: string | undefined,
  birthDate: string | undefined,
  now: Date
) {
  const parsed = birthDateTime
    ? new Date(birthDateTime)
    : birthDate
      ? new Date(`${birthDate}T00:00:00`)
      : undefined;
  if (!parsed) return undefined;
  if (Number.isNaN(parsed.getTime())) return undefined;
  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 0) return undefined;
  return {
    ageDays: Math.floor(diffMs / MS_PER_DAY),
    ageHours: Math.floor(diffMs / MS_PER_HOUR)
  };
}

function formatAgeLabel(ageDays: number, ageHours: number) {
  if (ageDays < 30) {
    const hours = ageHours % 24;
    return `出生 ${ageDays} 天 ${hours} 小时`;
  }
  if (ageDays < 365) {
    const months = Math.floor(ageDays / 30);
    const days = ageDays % 30;
    return days === 0 ? `${months} 个月` : `${months} 个月 ${days} 天`;
  }
  const years = Math.floor(ageDays / 365);
  const remainingDays = ageDays - years * 365;
  const months = Math.floor(remainingDays / 30);
  return months === 0 ? `${years} 岁` : `${years} 岁 ${months} 个月`;
}

function getReferenceByAge(ageDays: number) {
  if (ageDays <= 1) {
    return {
      feeding: {
        amount: "每次 5–15 ml",
        interval: "约 2–3 小时一次",
        daily: "8–12 次/天"
      },
      sleep: {
        daily: "约 14–17 小时/天",
        note: "新生儿睡眠很碎，醒来吃奶很正常。"
      }
    };
  }

  if (ageDays <= 6) {
    return {
      feeding: {
        amount: "每次 15–60 ml",
        interval: "约 2–3 小时一次",
        daily: "8–12 次/天"
      },
      sleep: {
        daily: "约 14–17 小时/天",
        note: "重点看尿量、精神状态和体重趋势。"
      }
    };
  }

  if (ageDays <= 30) {
    return {
      feeding: {
        amount: "每次 60–90 ml",
        interval: "约 2–4 小时一次",
        daily: "7–10 次/天"
      },
      sleep: {
        daily: "约 14–17 小时/天",
        note: "夜间连续睡眠短是常见情况。"
      }
    };
  }

  if (ageDays <= 90) {
    return {
      feeding: {
        amount: "每次 90–150 ml",
        interval: "约 3–4 小时一次",
        daily: "6–8 次/天"
      },
      sleep: {
        daily: "约 14–16 小时/天",
        note: "可以开始观察白天小睡和夜间长睡眠。"
      }
    };
  }

  if (ageDays <= 180) {
    return {
      feeding: {
        amount: "每次 120–210 ml",
        interval: "约 3–5 小时一次",
        daily: "5–6 次/天"
      },
      sleep: {
        daily: "约 12–16 小时/天",
        note: "睡眠逐渐规律，但个体差异很大。"
      }
    };
  }

  return {
    feeding: {
      amount: "按辅食和奶量综合观察",
      interval: "通常 4–6 小时一次",
      daily: "奶量因辅食进展而变化"
    },
    sleep: {
      daily: "约 12–15 小时/天",
      note: "可结合白天小睡、夜醒和总睡眠看趋势。"
    }
  };
}
