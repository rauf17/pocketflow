"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { PocketFlowLoader } from "@/components/PocketFlowLoader";

export default function RootPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    if (animDone) {
      if (user?.isOnboarded) {
        router.replace("/dashboard");
      } else {
        router.replace("/welcome");
      }
    }
  }, [user, router, animDone]);

  return <PocketFlowLoader onComplete={() => setAnimDone(true)} />;
}

