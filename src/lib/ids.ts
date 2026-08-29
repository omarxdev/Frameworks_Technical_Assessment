import { randomUUID } from "crypto";

const suffix = () => randomUUID().replace(/-/g, "").slice(0, 8);

export const newId = (prefix: string) => `${prefix}-${suffix()}`;

export const newRequestId = () => newId("request");
export const newContractId = () => newId("contract");
export const newCampaignId = () => newId("campaign");
export const newBookingId = () => newId("booking");
export const newWorkOrderId = () => newId("work-order");
export const newServiceEventId = () => newId("event");
export const newClientRequestId = () => newId("client-request");
export const newProofRecordId = () => newId("proof");
export const newOrganisationId = () => newId("org");
export const newUserId = () => newId("user");
