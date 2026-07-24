import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
  searchParams?: Record<string, string>,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      redirectUrl.searchParams.set(key, value);
    }
  }
  const response = NextResponse.redirect(redirectUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return response;
}

function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "staff";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isCustomerAuthRoute = pathname.startsWith("/auth");
  const needsCustomerAuth =
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/profile");

  // Unauthenticated users hitting customer-protected pages
  if (!user && needsCustomerAuth) {
    return redirectWithCookies(request, "/auth", supabaseResponse, {
      next: pathname,
    });
  }

  // Unauthenticated users hitting admin (except login)
  if (!user && isAdminRoute && !isAdminLogin) {
    return redirectWithCookies(request, "/admin/login", supabaseResponse, {
      next: pathname,
    });
  }

  // Signed-in users on customer auth — honor ?next= or go home
  if (user && isCustomerAuthRoute) {
    const rawNext = request.nextUrl.searchParams.get("next");
    let nextPath = "/";
    if (
      rawNext &&
      rawNext.startsWith("/") &&
      !rawNext.startsWith("//") &&
      !rawNext.startsWith("/auth") &&
      rawNext !== "/profile" &&
      !rawNext.startsWith("/profile/")
    ) {
      nextPath = rawNext.split("?")[0] || "/";
    }

    // Staff who opened customer auth with an admin next path
    if (nextPath.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!isStaffRole(profile?.role)) {
        nextPath = "/";
      }
    }

    return redirectWithCookies(request, nextPath, supabaseResponse);
  }

  // Staff already signed in on admin login → dashboard
  if (user && isAdminLogin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (isStaffRole(profile?.role)) {
      const rawNext = request.nextUrl.searchParams.get("next");
      let nextPath = "/admin";
      if (
        rawNext &&
        rawNext.startsWith("/admin") &&
        !rawNext.startsWith("//") &&
        rawNext !== "/admin/login"
      ) {
        nextPath = rawNext.split("?")[0] || "/admin";
      }
      return redirectWithCookies(request, nextPath, supabaseResponse);
    }
    // Non-staff can stay on login page to switch accounts (form will reject)
  }

  // Protect admin app: must be staff/admin
  if (user && isAdminRoute && !isAdminLogin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!isStaffRole(profile?.role)) {
      return redirectWithCookies(request, "/admin/login", supabaseResponse, {
        next: pathname,
      });
    }
  }

  return supabaseResponse;
}
