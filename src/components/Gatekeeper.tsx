"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { PocketFlowLogo } from "./PocketFlowLogo";
import { PocketFlowLoader } from "./PocketFlowLoader";

export function Gatekeeper({ children }: { children: React.ReactNode }) {
  const user = useUserStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    // Check if store has rehydrated from localStorage
    if (useUserStore.persist?.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsub = useUserStore.persist?.onFinishHydration(() => {
        setIsHydrated(true);
      });
      return () => unsub?.();
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user?.isOnboarded && !pathname.startsWith('/welcome')) {
      router.replace('/welcome');
    }
  }, [isHydrated, user, router, pathname]);

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

  if (!isHydrated || !animDone) {
    return <PocketFlowLoader onComplete={() => setAnimDone(true)} />;
  }

  return <>{children}</>;
}

export function MobileHeader() {
  return (
    <header className="md:hidden flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.03] bg-background/80 backdrop-blur-2xl sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <PocketFlowLogo className="w-7 h-7" />
        <span className="text-lg font-medium tracking-tight text-foreground/90">PocketFlow</span>
      </div>
    </header>
  );
}


