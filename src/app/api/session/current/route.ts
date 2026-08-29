import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "No active prototype session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: auth.user,
      organisation: auth.organisation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "SESSION_ERROR", message: error.message || "Failed to get current session" },
      { status: 500 }
    );
  }
}
