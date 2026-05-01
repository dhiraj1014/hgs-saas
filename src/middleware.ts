import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const STAFF_PREFIXES = ["/dashboard", "/students", "/classes", "/subjects", "/academic-years", "/users"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isStaffRoute = STAFF_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isStaffRoute) return NextResponse.next();

  const session = getSessionCookie(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|logos|login).*)"],
};
