import { NextRequest } from "next/server";
import { verifySessionToken } from "./jwt";
import { collections } from "@/lib/db/collections";
import type { User, Organisation } from "@/lib/schemas";

export interface ResolvedAuthContext {
  user: User | null;
  organisation: Organisation | null;
}

export async function resolveAuth(req: NextRequest): Promise<ResolvedAuthContext> {
  let userId: string | null = null;

  // 1. Check spec header X-Prototype-User-Id (case-insensitive)
  const headerUserId =
    req.headers.get("x-prototype-user-id") || req.headers.get("X-Prototype-User-Id");
  if (headerUserId) {
    userId = headerUserId.trim();
  }

  // 2. Fall back to JWT cookie
  if (!userId) {
    const token = req.cookies.get("island_session")?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.userId) {
        userId = payload.userId;
      }
    }
  }

  if (!userId) {
    return { user: null, organisation: null };
  }

  // Fetch user from DB
  const usersCol = await collections.users();
  const userDoc = await usersCol.findOne({ id: userId });

  if (!userDoc) {
    return { user: null, organisation: null };
  }

  const { _id, ...userData } = userDoc;
  const user: User = userData as User;

  let organisation: Organisation | null = null;
  if (user.organisationId) {
    const orgsCol = await collections.organisations();
    const orgDoc = await orgsCol.findOne({ id: user.organisationId });
    if (orgDoc) {
      const { _id: oId, ...orgData } = orgDoc;
      organisation = orgData as Organisation;
    }
  }

  return { user, organisation };
}
