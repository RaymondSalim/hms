"use server";

import {z} from "zod";
import {finalValidationSetupSchema, stepValidationSetupSchema} from "@/app/_lib/zod/setup/zod";
import prisma from "@/app/_lib/primsa";
import {SettingsKey} from "@/app/_enum/setting";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";

export async function validateStepData(data: Partial<z.infer<typeof stepValidationSetupSchema>>) {
    try {
        const {success, data: parsedData, error} = stepValidationSetupSchema.safeParse(data);
        if (!success) {
            return {
                errors: error?.flatten()
            };
        }
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error.errors };
        }
    }
}

// Example function to validate final form data
export async function validateFinalData(data: z.infer<typeof finalValidationSetupSchema>) {
    after(() => {
        serverLogger.flush();
    });
    try {
        const {success, data: parsedData, error} = finalValidationSetupSchema.safeParse(data);
        if (!success) {
            return {
                errors: error?.flatten()
            };
        }

        await prisma.$transaction([
            prisma.setting.upsert({
                where: {
                    setting_key: SettingsKey.APP_SETUP
                },
                update: {
                    setting_value: String(true)
                },
                create: {
                    setting_key: SettingsKey.APP_SETUP,
                    setting_value: String(true)
                }
            }),
            prisma.setting.upsert({
                where: {
                    setting_key: SettingsKey.COMPANY_NAME
                },
                update: {
                    setting_value: parsedData.companyName
                },
                create: {
                    setting_key: SettingsKey.COMPANY_NAME,
                    setting_value: parsedData.companyName
                }
            }),
            prisma.setting.upsert({
                where: {
                    setting_key: SettingsKey.COMPANY_IMAGE
                },
                update: {
                    setting_value: parsedData.companyImage
                },
                create: {
                    setting_key: SettingsKey.COMPANY_IMAGE,
                    setting_value: parsedData.companyImage
                }
            }),
            prisma.location.create({
                data: {
                    name: parsedData.locationName,
                    address: parsedData.locationAddress
                }
            })
        ]);

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error.errors };
        }
        serverLogger.error("[validateFinalData]", {error});
        return { failure: true };
    }
}
