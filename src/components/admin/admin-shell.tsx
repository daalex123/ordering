"use client";

import { AdminNav } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AdminOrderAlerts } from "@/components/admin/admin-order-alerts";
import { usePathname } from "next/navigation";

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
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f5f6fa]">
        <AdminTopbar restaurantName={restaurantName} />
        <div className="mx-auto w-full max-w-[90rem] px-4 pb-8 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
