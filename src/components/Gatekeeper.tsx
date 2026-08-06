"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";

export function Gatekeeper({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only run on client
    if (!user?.isOnboarded && !pathname.startsWith('/welcome')) {
      router.replace('/welcome');
    } else {
      setIsReady(true);
    }
  }, [user, router, pathname]);

  // Handle Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (user?.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else if (user?.theme) {
      root.classList.add(user.theme);
    } else {
      // Default to dark
      root.classList.add('dark');
    }
  }, [user?.theme]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse w-32 h-32 rounded-full bg-primary/10" />
      </div>
    );
  }

  return <>{children}</>;
}
