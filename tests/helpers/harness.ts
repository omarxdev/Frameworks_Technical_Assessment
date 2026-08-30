import { NextRequest } from "next/server";
import { seedDatabase } from "@/lib/db/seed";
import { collections } from "@/lib/db/collections";

export const USERS = {
  manager: "user-manager-01",
  fitter: "user-fitter-01",
  silverline: "user-client-silverline",
  lighthouse: "user-client-lighthouse",
  oakLegal: "user-client-oaklegal",
} as const;

export const reseed = () => seedDatabase();

interface RequestInit {
  method?: string;
  as?: string;
  body?: unknown;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  formData?: FormData;
}

export const makeRequest = (path: string, init: RequestInit = {}) => {
  const { method = "GET", as, body, idempotencyKey, headers = {}, formData } = init;

  const finalHeaders: Record<string, string> = { ...headers };
  if (as) finalHeaders["x-prototype-user-id"] = as;
  if (idempotencyKey) finalHeaders["idempotency-key"] = idempotencyKey;
  if (body !== undefined) finalHeaders["content-type"] = "application/json";

  return new NextRequest(`http://localhost:3000/api${path}`, {
    method,
    headers: finalHeaders,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
};

export const readJson = async (response: Response) => ({
  status: response.status,
  body: response.status === 204 ? null : await response.json(),
});

export const getContract = async (id: string) => {
  const contracts = await collections.contracts();
  return contracts.findOne({ id });
};

export const getWorkOrder = async (id: string) => {
  const workOrders = await collections.workOrders();
  return workOrders.findOne({ id });
};

export const insertServiceEvent = async (event: Record<string, unknown>) => {
  const events = await collections.serviceEvents();
  await events.insertOne({ _id: event.id, ...event } as never);
};

export const serviceEventsFor = async (contractId: string) => {
  const events = await collections.serviceEvents();
  return events.find({ contractId }).toArray();
};

export const clientRequestsFor = async (contractId: string) => {
  const requests = await collections.clientRequests();
  return requests.find({ contractId }).toArray();
};

export const getCampaign = async (contractId: string) => {
  const campaigns = await collections.campaigns();
  return campaigns.findOne({ contractId });
};

export const bookingsByIds = async (ids: string[]) => {
  const bookings = await collections.bookings();
  return bookings.find({ id: { $in: ids } }).toArray();
};

export const proofsFor = async (workOrderId: string) => {
  const proofs = await collections.proofRecords();
  return proofs.find({ workOrderId }).toArray();
};

export const makeProofForm = (
  completionNote: string,
  fileName = "install.jpg",
  type = "image/jpeg"
) => {
  const form = new FormData();
  form.set("completionNote", completionNote);
  form.set(
    "file",
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], fileName, {
      type,
    })
  );
  return form;
};
