"use client";

import React, {ReactNode, useState} from "react";
import {DashboardContext} from "@/app/_context/DashboardContext";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

export default function Layout({children}: { children: ReactNode }) {
  const [locationID, setLocationID] = useState(1);
  const [queryClient] = React.useState(
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

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContext.Provider
        value={{locationID, setLocationID}}>
        {children}
      </DashboardContext.Provider>
    </QueryClientProvider>
  );
}
