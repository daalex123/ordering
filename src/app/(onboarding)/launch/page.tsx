"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy splash URL — send everyone to the single welcome screen. */
export default function LaunchSplashPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/welcome");
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0E0A08]" />
  );
}
