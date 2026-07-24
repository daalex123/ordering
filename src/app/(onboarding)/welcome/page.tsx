"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/customer/brand-logo";

const STORAGE_KEY = "kb_onboarded";

function markOnboarded() {
  window.localStorage.setItem(STORAGE_KEY, "1");
}

export default function WelcomePage() {
  const router = useRouter();

  function continueAsGuest() {
    markOnboarded();
    router.replace("/");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#E95322] px-8 pt-16 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <BrandLogo priority size={170} />
        <p className="mt-5 text-[28px] font-bold tracking-wide">
          <span className="text-[#F5CB58]">Kings</span>{" "}
          <span className="text-[#F8F8F8]">Bakamuna</span>
        </p>
        <p className="mt-4 max-w-[280px] text-[14px] leading-relaxed text-white/90">
          Restaurant &amp; Billiards — order your favorites for pickup or
          delivery.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/auth"
          onClick={markOnboarded}
          className="flex h-12 items-center justify-center rounded-full bg-[#F5CB58] text-base font-semibold text-[#391713]"
        >
          Log In
        </Link>
        <Link
          href="/auth?mode=signup"
          onClick={markOnboarded}
          className="flex h-12 items-center justify-center rounded-full bg-[#F3E9B5] text-base font-semibold text-[#E95322]"
        >
          Sign Up
        </Link>
        <button
          type="button"
          onClick={continueAsGuest}
          className="mt-1 text-sm font-medium text-white/80 underline-offset-2 hover:underline"
        >
          Continue to menu
        </button>
      </div>
    </div>
  );
}
