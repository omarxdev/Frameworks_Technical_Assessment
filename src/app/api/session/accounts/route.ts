import { NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { PROTOTYPE_USER_PROFILES } from "@/lib/constants";

const seededBadges = new Map<string, string>(
  PROTOTYPE_USER_PROFILES.map((profile) => [profile.id, profile.badge])
);

export const GET = async () => {
  try {
    const [usersDocs, orgsDocs, contractsDocs] = await Promise.all([
      (await collections.users()).find({}).toArray(),
      (await collections.organisations()).find({}).toArray(),
      (await collections.contracts()).find({}).toArray(),
    ]);

    const orgNames = new Map(orgsDocs.map((org) => [org.id, org.name]));

    const contractCounts = contractsDocs.reduce<Record<string, number>>(
      (counts, contract) => {
        counts[contract.organisationId] = (counts[contract.organisationId] ?? 0) + 1;
        return counts;
      },
      {}
    );

    const items = usersDocs.map((user) => {
      const organisationName = user.organisationId
        ? (orgNames.get(user.organisationId) ?? user.organisationId)
        : null;

      const contractCount = user.organisationId
        ? (contractCounts[user.organisationId] ?? 0)
        : 0;

      const seededBadge = seededBadges.get(user.id);
      const badge =
        seededBadge ??
        (user.role === "client"
          ? contractCount === 0
            ? "0 contracts (new)"
            : `${contractCount} contract${contractCount === 1 ? "" : "s"}`
          : user.role);

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        organisationId: user.organisationId ?? null,
        organisationName,
        label: organisationName ? `${organisationName} (${user.name})` : user.name,
        badge,
        seeded: seededBadges.has(user.id),
      };
    });

    const roleOrder: Record<string, number> = { manager: 0, fitter: 1, client: 2 };

    items.sort((a, b) => {
      const byRole = (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
      if (byRole !== 0) return byRole;
      if (a.seeded !== b.seeded) return a.seeded ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "ACCOUNTS_FETCH_FAILED",
        message: error.message || "Failed to list prototype accounts",
      },
      { status: 500 }
    );
  }
};
