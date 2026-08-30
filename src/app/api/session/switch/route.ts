import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { signSessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";
import type { User, Organisation } from "@/lib/schemas";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "userId string is required" },
        { status: 422 }
      );
    }

    const usersCol = await collections.users();
    const userDoc = await usersCol.findOne({ id: userId });

    if (!userDoc) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `User '${userId}' not found` },
        { status: 404 }
      );
    }

    const { _id, ...userData } = userDoc;
    const user = userData as User;

    let organisation: Organisation | null = null;
    if (user.organisationId) {
      const orgsCol = await collections.organisations();
      const orgDoc = await orgsCol.findOne({ id: user.organisationId });
      if (orgDoc) {
        const { _id: _oId, ...orgData } = orgDoc;
        organisation = orgData as Organisation;
      }
    }

    const sessionPayload = {
      user,
      organisation,
    };

    const token = await signSessionToken({
      userId: user.id,
      role: user.role,
      organisationId: user.organisationId || null,
    });

    const response = NextResponse.json(sessionPayload, { status: 200 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "SESSION_SWITCH_FAILED",
        message: error.message || "Failed to switch session",
      },
      { status: 500 }
    );
  }
};
