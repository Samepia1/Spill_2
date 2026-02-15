import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicRoutes = ["/login", "/verify"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabase, user, supabaseResponse } = await updateSession(request);

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  // No session → redirect to /login (unless already on public route)
  if (!user) {
    if (isPublicRoute) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Has session — check for profile
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  // Has session but no profile → redirect to /onboarding
  if (!profile) {
    if (isOnboardingRoute || isPublicRoute) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // Has session + profile, on auth page or onboarding → redirect to /
  if (isPublicRoute || isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
