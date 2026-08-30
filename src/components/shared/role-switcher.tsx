"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/lib/schemas";

interface SessionResponse {
  user: { id: string; name: string; role: UserRole } | null;
  organisation: { id: string; name: string } | null;
}

export interface PrototypeAccount {
  id: string;
  name: string;
  role: UserRole;
  organisationId: string | null;
  organisationName: string | null;
  label: string;
  badge: string;
  seeded: boolean;
}

interface AccountsResponse {
  items: PrototypeAccount[];
}

export const homeForRole = (role: string) => {
  if (role === "manager") return "/management";
  if (role === "fitter") return "/fitter";
  return "/portal";
};

export const useSession = () =>
  useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<SessionResponse>("/session/current"),
    staleTime: 30_000,
  });

export const usePrototypeAccounts = () =>
  useQuery({
    queryKey: ["session", "accounts"],
    queryFn: () => apiFetch<AccountsResponse>("/session/accounts"),
    staleTime: 30_000,
  });

export const useSwitchAccount = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<SessionResponse>("/session/switch", {
        method: "POST",
        body: { userId },
      }),
    onSuccess: (session) => {
      queryClient.clear();
      router.push(homeForRole(session.user?.role ?? "client"));
      router.refresh();
    },
  });
};

export const RoleSwitcher = () => {
  const router = useRouter();
  const { data } = useSession();
  const { data: accounts } = usePrototypeAccounts();
  const switchAccount = useSwitchAccount();

  const current = data?.user;
  const items = accounts?.items ?? [];

  const staff = items.filter((account) => account.role !== "client");
  const clients = items.filter((account) => account.role === "client");

  const renderItem = (account: PrototypeAccount) => (
    <DropdownMenuItem
      key={account.id}
      disabled={switchAccount.isPending}
      onSelect={() => switchAccount.mutate(account.id)}
      className="flex flex-col items-start gap-0.5"
    >
      <span className="text-sm font-medium">{account.label}</span>
      <span className="text-muted-foreground text-xs">{account.badge}</span>
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <UserRound className="size-4" />
          <span className="max-w-40 truncate">
            {current ? current.name : "Choose a role"}
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-menu w-menu-width overflow-y-auto">
        <DropdownMenuLabel>Agency staff</DropdownMenuLabel>
        {staff.map(renderItem)}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Client accounts</DropdownMenuLabel>
        {clients.map(renderItem)}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/register")}>
          Register a new client account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
