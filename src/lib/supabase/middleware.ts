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
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/auth");
  const needsAuth =
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/profile") ||
    isAdminRoute;

  if (!user && needsAuth && !isAuthRoute) {
    return redirectWithCookies(request, "/auth", supabaseResponse, {
      next: pathname,
    });
  }

  // Already signed in — leave the auth screen (honor safe ?next= or go home).
  if (user && isAuthRoute) {
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
    return redirectWithCookies(request, nextPath, supabaseResponse);
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return redirectWithCookies(request, "/", supabaseResponse);
    }
  }

  return supabaseResponse;
}
