// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("sb-access-token")?.value;
  const url = req.nextUrl.clone();

  const protectedPaths = ["/agent", "/manager"];

  if (protectedPaths.some((p) => url.pathname.startsWith(p))) {
    if (!token) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
