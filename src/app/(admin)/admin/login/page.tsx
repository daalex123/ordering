import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && ["admin", "staff"].includes(profile.role)) {
      const next = params.next;
      const safe =
        next &&
        next.startsWith("/admin") &&
        !next.startsWith("//") &&
        next !== "/admin/login"
          ? next.split("?")[0]
          : "/admin";
      redirect(safe || "/admin");
    }
  }

  const { data: settings } = await supabase
    .from("restaurant_settings")
    .select("name")
    .limit(1)
    .maybeSingle();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#2a120f] text-white">
          Loading…
        </div>
      }
    >
      <AdminLoginForm restaurantName={settings?.name ?? "Restaurant Admin"} />
    </Suspense>
  );
}
