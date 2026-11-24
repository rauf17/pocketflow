"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { seedDemoData } from "@/lib/demo";

// Only same-site app pages are valid targets.
const ALLOWED = ["/dashboard", "/expenses", "/planner", "/budgets", "/goals", "/review", "/analytics", "/advisor", "/settings"];

function DemoSeeder() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    // ?clean=1 loads the data without the "sample data" banner (used for README screenshots).
    seedDemoData({ banner: params.get("clean") !== "1" });
    const next = params.get("next") ?? "/dashboard";
    router.replace(ALLOWED.includes(next) ? next : "/dashboard");
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Loading sample data…
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoSeeder />
    </Suspense>
  );
}
