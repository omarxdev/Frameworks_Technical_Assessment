import { NextResponse } from "next/server";

export const validationError = (message: string, details?: unknown) =>
  NextResponse.json(
    details === undefined
      ? { code: "VALIDATION_ERROR", message }
      : { code: "VALIDATION_ERROR", message, details },
    { status: 422 }
  );

export const notFound = (message: string) =>
  NextResponse.json({ code: "NOT_FOUND", message }, { status: 404 });

export const conflict = (message: string) =>
  NextResponse.json({ code: "CONFLICT", message }, { status: 409 });
