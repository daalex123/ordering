import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

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
    <AdminShell
      restaurantName={settings?.name ?? "Restaurant"}
      logoUrl={settings?.logo_url}
    >
      {children}
    </AdminShell>
  );
}
