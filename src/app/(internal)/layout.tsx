"use client";

import Sidebar from "@/app/_components/sidebar/Sidebar";
import styles from "@/app/(internal)/styles/layout.module.css";
import React, {useEffect, useState} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {HeaderContext} from "@/app/_context/HeaderContext";
import {signIn, useSession} from "next-auth/react";

export default function Layout({children}: {children?: React.ReactNode}) {
  const [locationID, setLocationID] = useState(1);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  const {data: session, status} = useSession();

  useEffect(() => {
    if (status == "unauthenticated" || !session?.user) {
      signIn(undefined, {redirectTo: "/"});
    }

  }, [status]);

  return (
    <QueryClientProvider client={queryClient}>
      <HeaderContext.Provider
        value={{locationID, setLocationID}}>
        <>
          <nav>
            <Sidebar session={session}/>
          </nav>
          <main className={styles.content}>
            {children}
          </main>
        </>
      </HeaderContext.Provider>
    </QueryClientProvider>
  );
}
