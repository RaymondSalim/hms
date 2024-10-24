import React from "react";
import prisma from "@/app/_lib/primsa";
import {SettingsKey} from "@/app/_enum/setting";
import {redirect} from "next/navigation";

export default async function Layout({children}: { children?: React.ReactNode }) {
    let appSetup = await prisma.setting.findFirst({
        where: {
            setting_key: SettingsKey.APP_SETUP
        }
    });

    if (appSetup != null && appSetup.setting_value == "true") {
        redirect("/dashboard");
    }

    return (
        <>
            {children}
        </>
    );
}