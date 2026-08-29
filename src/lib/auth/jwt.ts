import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/schemas";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "island_media_co_super_secret_prototype_jwt_key_2027"
);

export interface TokenPayload {
  userId: string;
  role: UserRole;
  organisationId: string | null;
}

export async function signSessionToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      role: payload.role as UserRole,
      organisationId: (payload.organisationId as string) || null,
    };
  } catch (error) {
    return null;
  }
}
