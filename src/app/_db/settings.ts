import prisma from "@/app/_lib/primsa";

export async function getCompanyName() {
  const res = await prisma.setting.findFirst({
    where: {
      setting_key: "company_name",
    },
    select: {
      setting_value: true
    }
  });

  if (res) return res.setting_value;

  return "Your Company.";
}
