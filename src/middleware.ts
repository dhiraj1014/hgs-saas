import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const STAFF_PREFIXES = ["/dashboard", "/students", "/classes", "/subjects", "/academic-years", "/users", "/attendance", "/announcements", "/notifications"];
const PARENT_PREFIX = "/parent";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isStaff = STAFF_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isParent = pathname === PARENT_PREFIX || pathname.startsWith(PARENT_PREFIX + "/");
  if (!isStaff && !isParent) return NextResponse.next();

  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = isParent ? "/parent-login" : "/login";
    if (!isParent) url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|logos|login|parent-login).*)"],
};
