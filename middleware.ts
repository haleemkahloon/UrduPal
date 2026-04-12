import { NextResponse, type NextRequest } from "next/server";

/** Auth is handled via HTTP-only session cookies in Route Handlers (no Supabase Auth middleware). */
export function middleware(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
