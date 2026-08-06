"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";

export default function RootPage() {
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    // We delay slightly to ensure hydration is complete and we don't get mismatch errors
    if (user?.isOnboarded) {
      router.replace("/dashboard");
    } else {
      router.replace("/welcome");
    }
  }, [user, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse w-32 h-32 rounded-full bg-primary/10" />
    </main>
  );
}
