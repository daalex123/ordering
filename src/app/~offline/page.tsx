import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Menu browsing may be limited. Reconnect to place or track orders.
      </p>
      <Link href="/" className={cn(buttonVariants())}>
        Try again
      </Link>
    </div>
  );
}
