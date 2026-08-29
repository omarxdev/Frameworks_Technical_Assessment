import { NextRequest, NextResponse } from "next/server";
import { requireClientOrganisation } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireClientOrganisation(req);
    if (!guard.ok) return guard.response;

    const auth = { user: guard.user, organisation: guard.organisation };

    const orgId = auth.organisation.id;
    const contractsCol = await collections.contracts();
    const orgContracts = await contractsCol.find({ organisationId: orgId }).toArray();

    const items = orgContracts.map((c) => {
      let actionRequired: string | null = null;
      if (c.status === "issued") {
        actionRequired = "Review and accept issued contract";
      } else if (c.status === "change_requested") {
        actionRequired = "Changes requested (Under management review)";
      }

      return {
        id: c.id,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        total: c.total,
        actionRequired,
      };
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { code: "CONTRACTS_FETCH_FAILED", message: error.message || "Failed to list contracts" },
      { status: 500 }
    );
  }
}
