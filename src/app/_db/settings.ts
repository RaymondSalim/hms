import prisma from "@/app/_lib/primsa";
import {SettingsKey} from "@/app/_enum/setting";

export async function getCompanyName() {
  const res = await prisma.setting.findFirst({
    where: {
      setting_key: SettingsKey.COMPANY_NAME,
    },
    select: {
      setting_value: true
    }
  });

  if (res) return res.setting_value;

  return "Perusahaan Anda";
}

export async function getCompanyInfo() {
  const res = await prisma.setting.findMany({
    where: {
      setting_key: {
        in: [SettingsKey.COMPANY_NAME, SettingsKey.COMPANY_IMAGE]
      }
    }
  });

  return {
    companyName: res.find(s => s.setting_key == SettingsKey.COMPANY_NAME)?.setting_value,
    companyImage: res.find(s => s.setting_key == SettingsKey.COMPANY_IMAGE)?.setting_value,
  };
}

export async function getRegistrationEnabled(): Promise<boolean> {
  const enabled = await prisma.setting.findFirst({
    where: {
      setting_key: SettingsKey.REGISTRATION_ENABLED,
    }
  });

  if (enabled != null) {
    return enabled.setting_value.toLowerCase() === "true";
  }
  
  return false;
}