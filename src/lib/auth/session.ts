import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./jwt";
import { collections } from "@/lib/db/collections";
import type { Organisation, User, UserRole } from "@/lib/schemas";

export const SESSION_COOKIE = "island_session";

export interface ResolvedAuthContext {
  user: User | null;
  organisation: Organisation | null;
}

export const resolveAuth = async (
  req: NextRequest
): Promise<ResolvedAuthContext> => {
  let userId: string | null = null;

  const headerUserId = req.headers.get("x-prototype-user-id");
  if (headerUserId) userId = headerUserId.trim();

  if (!userId) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.userId) userId = payload.userId;
    }
  }

  if (!userId) return { user: null, organisation: null };

  const usersCol = await collections.users();
  const userDoc = await usersCol.findOne({ id: userId });
  if (!userDoc) return { user: null, organisation: null };

  const { _id, ...userData } = userDoc;
  const user = userData as User;

  if (!user.organisationId) return { user, organisation: null };

  const orgsCol = await collections.organisations();
  const orgDoc = await orgsCol.findOne({ id: user.organisationId });
  if (!orgDoc) return { user, organisation: null };

  const { _id: orgObjectId, ...orgData } = orgDoc;
  return { user, organisation: orgData as Organisation };
};

export const forbidden = (message: string) =>
  NextResponse.json({ code: "FORBIDDEN", message }, { status: 403 });

export const unauthenticated = () =>
  NextResponse.json(
    {
      code: "UNAUTHENTICATED",
      message:
        "No prototype session. Send X-Prototype-User-Id or sign in through the role switcher.",
    },
    { status: 401 }
  );

interface RoleGuardSuccess {
  ok: true;
  user: User;
  organisation: Organisation | null;
}

interface RoleGuardFailure {
  ok: false;
  response: NextResponse;
}

export const requireRole = async (
  req: NextRequest,
  roles: UserRole[]
): Promise<RoleGuardSuccess | RoleGuardFailure> => {
  const { user, organisation } = await resolveAuth(req);

  if (!user) return { ok: false, response: unauthenticated() };

  if (!roles.includes(user.role)) {
    return {
      ok: false,
      response: forbidden(
        `This endpoint requires the ${roles.join(" or ")} role.`
      ),
    };
  }

  return { ok: true, user, organisation };
};

export const requireClientOrganisation = async (
  req: NextRequest
): Promise<
  | { ok: true; user: User; organisation: Organisation }
  | RoleGuardFailure
> => {
  const guard = await requireRole(req, ["client"]);
  if (!guard.ok) return guard;

  if (!guard.organisation) {
    return {
      ok: false,
      response: forbidden("This client account has no organisation attached."),
    };
  }

  return { ok: true, user: guard.user, organisation: guard.organisation };
};
