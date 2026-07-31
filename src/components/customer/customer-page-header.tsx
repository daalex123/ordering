import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function CustomerPageHeader({
  title,
  backHref,
  className,
  children,
}: {
  title: string;
  backHref?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("relative px-5 pt-4 pb-4", className)}>
      <div className="flex items-center gap-3">
        {backHref ? (
          <Link href={backHref} className="glass-icon-btn" aria-label="Go back">
            <ChevronLeft className="size-5" strokeWidth={2} />
          </Link>
        ) : (
          <span className="size-11" aria-hidden />
        )}
        <h1 className="flex-1 text-center text-[22px] font-bold tracking-tight text-white">
          {title}
        </h1>
        <span className="size-11" aria-hidden />
      </div>
      {children}
    </header>
  );
}
