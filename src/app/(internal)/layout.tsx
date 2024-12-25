import React from "react";
import {auth} from "@/app/_lib/auth/auth";
import {redirect} from "next/navigation";
import ToastProvider from "@/app/_components/toast";
import QueryClientProviderWrapper from "@/app/(internal)/(dashboard_layout)/_providers/queryClientProvider";

export default async function Layout({children}: { children?: React.ReactNode }) {
    const session = await auth();

    if (!session) redirect("/login");

    return (
        <QueryClientProviderWrapper>
            <ToastProvider>
                {
                    children
                }
            </ToastProvider>
        </QueryClientProviderWrapper>
    );
}
