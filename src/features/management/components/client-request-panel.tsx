"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/ui/states";
import { StatusPill } from "@/components/ui/status-pill";
import {
  asApiError,
  useDecideClientRequest,
} from "@/features/management/hooks/use-management-actions";
import { formatMoment as formatDateTime } from "@/lib/format";
import type { ClientRequest } from "@/features/management/lib/types";
import { SectionTitle } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";

const requestLabel = (type: ClientRequest["type"]) =>
  type === "cancellation" ? "Cancellation request" : "Change request";

const approveLabel = (type: ClientRequest["type"]) =>
  type === "cancellation" ? "Approve cancellation" : "Accept change";

const consequence = (type: ClientRequest["type"]) =>
  type === "cancellation"
    ? "Approving cancels the contract, closes the campaign and releases the booked inventory. Declining leaves the contract untouched."
    : "Accepting records your agreement so you can reissue a revised version. Declining returns the contract to issued so the client can still accept the version they were sent.";

const RequestCard = ({
  request,
  contractId,
}: {
  request: ClientRequest;
  contractId: string;
}) => {
  const [note, setNote] = useState("");
  const decide = useDecideClientRequest(contractId);
  const decideError = asApiError(decide.error);

  const handleDecision = (action: "approve" | "decline") => {
    decide.mutate({ clientRequestId: request.id, action, note: note.trim() || null });
  };

  const noteFieldId = `client-request-note-${request.id}`;

  return (
    <Callout tone="warn" size="lg" subtle className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{requestLabel(request.type)}</p>
          <p className="text-muted-foreground text-xs">
            Raised {formatDateTime(request.createdAt)}
          </p>
        </div>
        <StatusPill status={request.status} tone="warn" />
      </div>

      {request.summary && (
        <blockquote className="border-warn/50 border-l-2 pl-3 text-sm">
          {request.summary}
        </blockquote>
      )}

      <p className="text-muted-foreground text-xs">{consequence(request.type)}</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={noteFieldId} className="text-xs">
          Decision note (optional, shared with the client)
        </Label>
        <Textarea
          id={noteFieldId}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Explain the outcome so the client understands it."
          className="bg-card"
        />
      </div>

      {decideError && (
        <Callout tone="stop" title={`Decision failed (${decideError.code})`}>
          {decideError.message}
        </Callout>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={decide.isPending}
          onClick={() => handleDecision("approve")}
        >
          {decide.isPending && decide.variables?.action === "approve" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {approveLabel(request.type)}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={decide.isPending}
          onClick={() => handleDecision("decline")}
        >
          {decide.isPending && decide.variables?.action === "decline" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          Decline
        </Button>
      </div>
    </Callout>
  );
};

export const ClientRequestPanel = ({
  requests,
  contractId,
}: {
  requests: ClientRequest[];
  contractId: string;
}) => {
  const pending = requests.filter((request) => request.status === "submitted");
  const decided = requests.filter((request) => request.status !== "submitted");

  if (requests.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <SectionTitle>
            Client requests
          </SectionTitle>
          <p className="text-muted-foreground text-sm">
            {pending.length === 0
              ? "Nothing from this client is waiting on you."
              : `${pending.length} request${pending.length === 1 ? "" : "s"} awaiting your decision.`}
          </p>
        </div>

        {pending.map((request) => (
          <RequestCard key={request.id} request={request} contractId={contractId} />
        ))}

        {decided.length > 0 && (
          <ul className="flex flex-col gap-2">
            {decided.map((request) => (
              <li
                key={request.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {requestLabel(request.type)}
                  {request.summary ? ` — ${request.summary}` : ""}
                </span>
                <StatusPill status={request.status} />
              </li>
            ))}
          </ul>
        )}
          </CardContent>
    </Card>
  );
};
