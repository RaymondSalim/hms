"use client";

import {PropsWithChildren, useState} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

export default function QueryClientProviderWrapper({children}: PropsWithChildren) {
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
