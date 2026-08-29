import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Let API requests and pages pass through; individual endpoints and pages resolve auth via resolveAuth
  const response = NextResponse.next();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
