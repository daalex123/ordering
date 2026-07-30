"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/customer/brand-logo";

const ONBOARDED_KEY = "kb_onboarded";
const PENDING_INSTALL_KEY = "kb_pending_install";

/** Single welcome: logo + name, then continue into the app. */
export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(ONBOARDED_KEY, "1");
        window.localStorage.setItem(PENDING_INSTALL_KEY, "1");
      } catch {
        /* private mode */
      }
      router.replace("/");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F5CB58] px-8">
      <BrandLogo priority size={180} />
      <p className="mt-5 text-center text-[28px] font-bold tracking-wide">
        <span className="text-[#E95322]">Kings</span>{" "}
        <span className="text-[#F8F8F8]">Bakamuna</span>
      </p>
    </div>
  );
}
