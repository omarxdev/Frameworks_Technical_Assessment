import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";

export const POST = async () => {
  try {
    await seedDatabase();
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "RESET_FAILED", message: error.message || "Failed to reset database" },
      { status: 500 }
    );
  }
};
