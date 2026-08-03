"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const DEFAULT_LOGO = "/logo-kings-bakamuna.png";
const DEFAULT_NAME = "Kings Bakamuna";

export function BrandLogo({
  src,
  name = DEFAULT_NAME,
  size = 160,
  className,
  priority = false,
  showName = false,
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  priority?: boolean;
  /** Extra text under the mark when the asset is icon-only */
  showName?: boolean;
}) {
  const logo = src || DEFAULT_LOGO;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Image
        src={logo}
        alt={name}
        width={size}
        height={size}
        priority={priority}
        className="rounded-[20px] object-cover shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        unoptimized
      />
      {showName ? (
        <p className="text-center text-[22px] font-bold tracking-wide text-[#F8F8F8]">
          <span className="text-[#E95322]">Kings</span>{" "}
          <span className="text-[#F8F8F8]">Bakamuna</span>
        </p>
      ) : null}
    </div>
  );
}
