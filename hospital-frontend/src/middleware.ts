import { NextResponse, type NextRequest } from "next/server";

// Middleware can only read cookies, not localStorage (where the real JWTs live).
// On login/register we set a lightweight, readable `hms_role` cookie purely so
// this middleware can gate route prefixes by role and bounce unauthenticated
// visitors to /login. The JWT in localStorage remains the real source of truth
// for every actual API call; this cookie only decides redirects. See README.
const ROLE_COOKIE = "hms_role";

const PROTECTED_PREFIXES: Record<string, string> = {
  "/admin": "ADMIN",
  "/doctor": "DOCTOR",
  "/patient": "PATIENT",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const matchedPrefix = Object.keys(PROTECTED_PREFIXES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!matchedPrefix) return NextResponse.next();

  const role = request.cookies.get(ROLE_COOKIE)?.value;

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role !== PROTECTED_PREFIXES[matchedPrefix]) {
    const homeByRole: Record<string, string> = {
      ADMIN: "/admin",
      DOCTOR: "/doctor",
      PATIENT: "/patient",
    };
    return NextResponse.redirect(new URL(homeByRole[role] ?? "/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/patient/:path*"],
};
