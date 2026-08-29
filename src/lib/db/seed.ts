import fs from "fs";
import path from "path";
import { collections } from "./collections";
import { getDb } from "./client";

export async function seedDatabase() {
  const fixturesPath = path.resolve(process.cwd(), "fixtures/island-media-fixtures.json");
  const rawData = fs.readFileSync(fixturesPath, "utf-8");
  const data = JSON.parse(rawData);

  const db = await getDb();

  // Clear existing collections
  const collectionNames = [
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
    "idempotencyKeys",
  ];

  for (const name of collectionNames) {
    try {
      await db.collection(name).deleteMany({});
    } catch (e) {
      // Ignore if collection does not exist yet
    }
  }

  // Insert seed data with _id: item.id
  if (data.mediaOwners?.length) {
    await (await collections.mediaOwners()).insertMany(
      data.mediaOwners.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.locations?.length) {
    await (await collections.locations()).insertMany(
      data.locations.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.products?.length) {
    await (await collections.products()).insertMany(
      data.products.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.assets?.length) {
    await (await collections.assets()).insertMany(
      data.assets.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.capacityPools?.length) {
    await (await collections.capacityPools()).insertMany(
      data.capacityPools.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.bookings?.length) {
    await (await collections.bookings()).insertMany(
      data.bookings.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.holds?.length) {
    await (await collections.holds()).insertMany(
      data.holds.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.outages?.length) {
    await (await collections.outages()).insertMany(
      data.outages.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.bookingRequests?.length) {
    await (await collections.bookingRequests()).insertMany(
      data.bookingRequests.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.users?.length) {
    await (await collections.users()).insertMany(
      data.users.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.organisations?.length) {
    await (await collections.organisations()).insertMany(
      data.organisations.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.contracts?.length) {
    await (await collections.contracts()).insertMany(
      data.contracts.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.campaigns?.length) {
    await (await collections.campaigns()).insertMany(
      data.campaigns.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.workOrders?.length) {
    await (await collections.workOrders()).insertMany(
      data.workOrders.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.serviceEvents?.length) {
    await (await collections.serviceEvents()).insertMany(
      data.serviceEvents.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.clientRequests?.length) {
    await (await collections.clientRequests()).insertMany(
      data.clientRequests.map((item: any) => ({ ...item, _id: item.id }))
    );
  }
  if (data.proofRecords?.length) {
    await (await collections.proofRecords()).insertMany(
      data.proofRecords.map((item: any) => ({ ...item, _id: item.id }))
    );
  }

  console.log("✅ Seed database completed successfully with fixture data.");
}
