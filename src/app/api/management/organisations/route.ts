import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export const GET = async (req: NextRequest) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const [organisationsDocs, usersDocs, requestsDocs] = await Promise.all([
      (await collections.organisations()).find({}).toArray(),
      (await collections.users()).find({ role: "client" }).toArray(),
      (await collections.bookingRequests()).find({}).toArray(),
    ]);

    const primaryContact = new Map(
      usersDocs.map((u) => [u.organisationId, { name: u.name, email: u.email }])
    );
    const pendingRequestCounts = new Map<string, number>();
    for (const request of requestsDocs) {
      if (request.status !== "submitted") continue;
      pendingRequestCounts.set(
        request.organisationId,
        (pendingRequestCounts.get(request.organisationId) ?? 0) + 1
      );
    }

    const items = organisationsDocs
      .map(({ _id, ...organisation }) => ({
        ...organisation,
        contact: primaryContact.get(organisation.id) ?? null,
        pendingRequestCount: pendingRequestCounts.get(organisation.id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "ORGANISATIONS_FETCH_FAILED",
        message: error.message || "Failed to load client organisations",
      },
      { status: 500 }
    );
  }
};
