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
    <header
      className={cn(
        "relative bg-[var(--yum-yellow)] px-5 pt-4 pb-8 text-center",
        className,
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="absolute top-5 left-5 text-primary"
          aria-label="Go back"
        >
          <ChevronLeft className="size-6" strokeWidth={2.5} />
        </Link>
      ) : null}
      <h1 className="text-[28px] font-bold tracking-tight text-white">{title}</h1>
      {children}
    </header>
  );
}
