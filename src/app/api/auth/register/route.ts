import { NextRequest, NextResponse } from "next/server";
import { RegisterInputSchema } from "@/lib/schemas";
import { collections } from "@/lib/db/collections";
import { signSessionToken } from "@/lib/auth/jwt";
import { FIXTURE_CLOCK } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");
    
    // Check idempotency cache if key provided
    if (idempotencyKey) {
      const idempCol = await collections.idempotencyKeys();
      const existing = await idempCol.findOne({ key: idempotencyKey });
      if (existing) {
        const response = NextResponse.json(existing.response, { status: 200 });
        const token = await signSessionToken({
          userId: existing.response.user.id,
          role: "client",
          organisationId: existing.response.organisation.id,
        });
        response.cookies.set("island_session", token, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
        return response;
      }
    }

    const body = await req.json();
    const parseResult = RegisterInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Registration validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const { organisationName, contactName, email } = parseResult.data;

    const orgId = `org-${organisationName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`;
    const userId = `user-${contactName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`;

    const newOrg = {
      _id: orgId,
      id: orgId,
      name: organisationName,
      createdAt: FIXTURE_CLOCK,
      contractCount: 0,
    };

    const newUser = {
      _id: userId,
      id: userId,
      name: contactName,
      email,
      role: "client" as const,
      organisationId: orgId,
      status: "active",
    };

    const orgsCol = await collections.organisations();
    const usersCol = await collections.users();

    await orgsCol.insertOne(newOrg);
    await usersCol.insertOne(newUser);

    const { _id: _oId, ...orgData } = newOrg;
    const { _id: _uId, ...userData } = newUser;

    const sessionPayload = {
      user: userData,
      organisation: orgData,
    };

    if (idempotencyKey) {
      const idempCol = await collections.idempotencyKeys();
      await idempCol.insertOne({
        _id: `idemp-${idempotencyKey}`,
        key: idempotencyKey,
        response: sessionPayload,
        createdAt: FIXTURE_CLOCK,
      });
    }

    const token = await signSessionToken({
      userId,
      role: "client",
      organisationId: orgId,
    });

    const response = NextResponse.json(sessionPayload, { status: 201 });
    response.cookies.set("island_session", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { code: "REGISTRATION_FAILED", message: error.message || "Failed to register" },
      { status: 500 }
    );
  }
}
