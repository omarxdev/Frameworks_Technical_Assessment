import { Collection, Document } from "mongodb";
import { getDb } from "./client";
import type {
  MediaOwner,
  Location,
  Product,
  Asset,
  CapacityPool,
  Booking,
  Hold,
  Outage,
  BookingRequest,
  User,
  Organisation,
  Contract,
  Campaign,
  WorkOrder,
  ServiceEvent,
  ProofRecord,
} from "@/lib/schemas";

export type WithStringId<T> = T & { _id: string };

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export const collections = {
  mediaOwners: () => getCollection<WithStringId<MediaOwner>>("mediaOwners"),
  locations: () => getCollection<WithStringId<Location>>("locations"),
  products: () => getCollection<WithStringId<Product>>("products"),
  assets: () => getCollection<WithStringId<Asset>>("assets"),
  capacityPools: () => getCollection<WithStringId<CapacityPool>>("capacityPools"),
  bookings: () => getCollection<WithStringId<Booking>>("bookings"),
  holds: () => getCollection<WithStringId<Hold>>("holds"),
  outages: () => getCollection<WithStringId<Outage>>("outages"),
  bookingRequests: () => getCollection<WithStringId<BookingRequest>>("bookingRequests"),
  users: () => getCollection<WithStringId<User>>("users"),
  organisations: () => getCollection<WithStringId<Organisation>>("organisations"),
  contracts: () => getCollection<WithStringId<Contract>>("contracts"),
  campaigns: () => getCollection<WithStringId<Campaign>>("campaigns"),
  workOrders: () => getCollection<WithStringId<WorkOrder>>("workOrders"),
  serviceEvents: () => getCollection<WithStringId<ServiceEvent>>("serviceEvents"),
  clientRequests: () => getCollection<WithStringId<any>>("clientRequests"),
  proofRecords: () => getCollection<WithStringId<ProofRecord>>("proofRecords"),
  idempotencyKeys: () => getCollection<{ _id: string; key: string; response: any; createdAt: string }>("idempotencyKeys"),
};
