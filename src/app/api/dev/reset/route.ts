import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";

export const POST = async (req: NextRequest) => {
  try {
    const configuredToken = process.env.DEV_RESET_TOKEN?.trim();
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !configuredToken) {
      return NextResponse.json(
        {
          code: "RESET_DISABLED",
          message:
            "Fixture reset is disabled. Set DEV_RESET_TOKEN to enable it on this deployment.",
        },
        { status: 403 }
      );
    }

    if (configuredToken) {
      const suppliedToken = req.headers.get("x-reset-token")?.trim();
      if (suppliedToken !== configuredToken) {
        return NextResponse.json(
          {
            code: "RESET_FORBIDDEN",
            message: "A valid X-Reset-Token header is required to reseed fixture data.",
          },
          { status: 403 }
        );
      }
    }

    await seedDatabase();
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "RESET_FAILED", message: error.message || "Failed to reset database" },
      { status: 500 }
    );
  }
};
