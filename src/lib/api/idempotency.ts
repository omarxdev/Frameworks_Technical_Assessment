import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { FIXTURE_CLOCK } from "@/lib/constants";

export const MIN_KEY_LENGTH = 8;

export const validateIdempotencyKey = (key?: string | null): boolean => {
  if (!key) return false;
  return typeof key === "string" && key.trim().length >= MIN_KEY_LENGTH;
};

export const readIdempotencyKey = (req: NextRequest) =>
  req.headers.get("idempotency-key")?.trim() || null;

const fingerprint = (body: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(body ?? null))
    .digest("hex");

const scopeId = (scope: string, actorId: string, key: string) =>
  `${scope}:${actorId}:${key}`;

export type IdempotencyOutcome<T> =
  | { kind: "replay"; response: NextResponse }
  | { kind: "conflict"; response: NextResponse }
  | { kind: "proceed"; commit: (payload: T, status?: number) => Promise<void> };

export const withIdempotency = async <T>(params: {
  scope: string;
  actorId: string;
  key: string;
  body: unknown;
}): Promise<IdempotencyOutcome<T>> => {
  const { scope, actorId, key, body } = params;
  const id = scopeId(scope, actorId, key);
  const requestHash = fingerprint(body);

  const store = await collections.idempotencyKeys();
  const existing = await store.findOne({ _id: id });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return {
        kind: "conflict",
        response: NextResponse.json(
          {
            code: "IDEMPOTENCY_KEY_REUSED",
            message:
              "This Idempotency-Key was already used with a different request body.",
          },
          { status: 409 }
        ),
      };
    }

    return {
      kind: "replay",
      response: NextResponse.json(existing.response, {
        status: existing.status ?? 200,
        headers: { "Idempotent-Replay": "true" },
      }),
    };
  }

  const commit = async (payload: T, status = 201) => {
    await store.insertOne({
      _id: id,
      key,
      scope,
      actorId,
      requestHash,
      response: payload,
      status,
      createdAt: FIXTURE_CLOCK,
    });
  };

  return { kind: "proceed", commit };
};

export const missingKeyResponse = () =>
  NextResponse.json(
    {
      code: "VALIDATION_ERROR",
      message: `An Idempotency-Key header of at least ${MIN_KEY_LENGTH} characters is required for this action.`,
    },
    { status: 422 }
  );
