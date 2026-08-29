import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";

export const GET = async (req: NextRequest) => {
  try {
    const auth = await resolveAuth(req);
    return NextResponse.json({
      user: auth.user,
      organisation: auth.organisation,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "SESSION_ERROR",
        message: error.message || "Failed to get current session",
      },
      { status: 500 }
    );
  }
};
