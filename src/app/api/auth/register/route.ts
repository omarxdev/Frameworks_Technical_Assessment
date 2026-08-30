import { NextRequest, NextResponse } from "next/server";
import { RegisterInputSchema } from "@/lib/schemas";
import { collections } from "@/lib/db/collections";
import { signSessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { readIdempotencyKey, withIdempotency } from "@/lib/api/idempotency";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newOrganisationId, newUserId } from "@/lib/db/ids";
import { validationError } from "@/lib/api/responses";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const attachSession = async (
  response: NextResponse,
  payload: { userId: string; organisationId: string }
) => {
  const token = await signSessionToken({
    userId: payload.userId,
    role: "client",
    organisationId: payload.organisationId,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
};

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = RegisterInputSchema.safeParse(body);
    if (!parsed.success) {
      return validationError("Registration validation failed", parsed.error.flatten());
    }

    const { organisationName, contactName, email } = parsed.data;

    const usersCol = await collections.users();
    const existing = await usersCol.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        {
          code: "EMAIL_IN_USE",
          message:
            "An account already exists for this email. Use the role switcher to sign back in.",
        },
        { status: 409 }
      );
    }

    const key = readIdempotencyKey(req);

    if (key) {
      const idempotency = await withIdempotency({
        scope: "auth-register",
        actorId: "anonymous",
        key,
        body: parsed.data,
      });

      if (idempotency.kind === "conflict") return idempotency.response;

      if (idempotency.kind === "replay") {
        const replayed = await idempotency.response.clone().json();
        return attachSession(idempotency.response, {
          userId: replayed.user.id,
          organisationId: replayed.organisation.id,
        });
      }

      const created = await createClientAccount({
        organisationName,
        contactName,
        email,
      });
      await idempotency.commit(created, 201);

      return attachSession(NextResponse.json(created, { status: 201 }), {
        userId: created.user.id,
        organisationId: created.organisation.id,
      });
    }

    const created = await createClientAccount({
      organisationName,
      contactName,
      email,
    });

    return attachSession(NextResponse.json(created, { status: 201 }), {
      userId: created.user.id,
      organisationId: created.organisation.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "REGISTRATION_FAILED",
        message: error.message || "Failed to register",
      },
      { status: 500 }
    );
  }
};

const createClientAccount = async (input: {
  organisationName: string;
  contactName: string;
  email: string;
}) => {
  const orgId = newOrganisationId();
  const userId = newUserId();

  const organisation = {
    id: orgId,
    name: input.organisationName,
    createdAt: FIXTURE_CLOCK,
    contractCount: 0,
  };

  const user = {
    id: userId,
    name: input.contactName,
    email: input.email.toLowerCase(),
    role: "client" as const,
    organisationId: orgId,
    status: "active",
  };

  const orgsCol = await collections.organisations();
  const usersCol = await collections.users();

  await orgsCol.insertOne({ _id: orgId, ...organisation });
  await usersCol.insertOne({ _id: userId, ...user });

  return { user, organisation };
};
