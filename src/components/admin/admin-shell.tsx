"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AdminOrderAlerts } from "@/components/admin/admin-order-alerts";

export function AdminShell({
  restaurantName,
  logoUrl,
  children,
}: {
  restaurantName: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="admin-shell flex min-h-screen flex-col overflow-x-hidden md:flex-row">
      <AdminOrderAlerts />
      <AdminNav restaurantName={restaurantName} logoUrl={logoUrl} />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-[90rem] p-4 md:p-6 lg:p-8">
          <AdminTopbar restaurantName={restaurantName} />
          {children}
        </div>
      </main>
    </div>
  );
}
