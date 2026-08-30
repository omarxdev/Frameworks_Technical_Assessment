import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { notFound } from "@/lib/api/responses";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ organisationId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const { organisationId } = await params;

    const organisationsCol = await collections.organisations();
    const organisation = await organisationsCol.findOne({ id: organisationId });

    if (!organisation) {
      return notFound(`Organisation '${organisationId}' not found`);
    }

    const [usersDocs, contractsDocs, requestsDocs] = await Promise.all([
      (await collections.users())
        .find({ organisationId, role: "client" })
        .toArray(),
      (await collections.contracts()).find({ organisationId }).toArray(),
      (await collections.bookingRequests()).find({ organisationId }).toArray(),
    ]);

    const { _id, ...organisationData } = organisation;

    return NextResponse.json({
      ...organisationData,
      contacts: usersDocs.map(({ _id: uid, ...u }) => u),
      contracts: contractsDocs
        .map(({ _id: cid, ...c }) => c)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
      bookingRequests: requestsDocs
        .map(({ _id: rid, ...r }) => r)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "ORGANISATION_FETCH_FAILED",
        message: error.message || "Failed to load the client organisation",
      },
      { status: 500 }
    );
  }
};
