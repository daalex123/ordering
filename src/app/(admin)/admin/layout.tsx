import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("restaurant_settings")
    .select("name, logo_url")
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminNav
        restaurantName={settings?.name ?? "Restaurant"}
        logoUrl={settings?.logo_url}
      />
      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
