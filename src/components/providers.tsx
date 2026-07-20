"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
        {children}
      </div>
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
