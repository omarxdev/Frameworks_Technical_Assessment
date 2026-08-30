import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/schemas";

const DEV_FALLBACK_SECRET = "island-media-prototype-development-secret-do-not-ship";

const isStrictlyLocalDevelopment = () =>
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL_ENV &&
  !process.env.CI;

const resolveSecret = () => {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 32) return configured;

  if (!isStrictlyLocalDevelopment()) {
    throw new Error(
      "JWT_SECRET must be set to at least 32 characters outside strictly local development."
    );
  }

  return DEV_FALLBACK_SECRET;
};

const secretKey = () => new TextEncoder().encode(resolveSecret());

export interface TokenPayload {
  userId: string;
  role: UserRole;
  organisationId: string | null;
}

export const signSessionToken = async (payload: TokenPayload) =>
  new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

export const verifySessionToken = async (
  token: string
): Promise<TokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: payload.userId as string,
      role: payload.role as UserRole,
      organisationId: (payload.organisationId as string) || null,
    };
  } catch {
    return null;
  }
};
