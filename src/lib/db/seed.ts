import fs from "fs";
import path from "path";
import { getDb } from "./client";

const SEEDED_COLLECTIONS = [
  "mediaOwners",
  "locations",
  "products",
  "assets",
  "capacityPools",
  "bookings",
  "holds",
  "outages",
  "bookingRequests",
  "users",
  "organisations",
  "contracts",
  "campaigns",
  "workOrders",
  "serviceEvents",
  "clientRequests",
  "proofRecords",
] as const;

const DERIVED_COLLECTIONS = ["idempotencyKeys"] as const;

export const seedDatabase = async () => {
  const fixturesPath = path.resolve(
    process.cwd(),
    "fixtures/island-media-fixtures.json"
  );
  const data = JSON.parse(fs.readFileSync(fixturesPath, "utf-8")) as Record<
    string,
    { id: string }[] | undefined
  >;

  const db = await getDb();

  for (const name of [...SEEDED_COLLECTIONS, ...DERIVED_COLLECTIONS]) {
    await db.collection(name).deleteMany({});
  }

  for (const name of SEEDED_COLLECTIONS) {
    const records = data[name];
    if (!records?.length) continue;

    await db
      .collection(name)
      .insertMany(records.map((record) => ({ ...record, _id: record.id })) as never);
  }

  if (process.env.NODE_ENV !== "test") {
    console.log(
      `Seeded ${SEEDED_COLLECTIONS.length} collections from fixtures/island-media-fixtures.json`
    );
  }
};
