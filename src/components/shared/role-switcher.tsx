"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PROTOTYPE_USER_PROFILES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionResponse {
  user: { id: string; name: string; role: string } | null;
  organisation: { id: string; name: string } | null;
}

const homeForRole = (role: string) => {
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

export const RoleSwitcher = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useSession();

  const switchUser = useMutation({
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

  const current = data?.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserRound className="size-3.5" />
          <span className="max-w-40 truncate">
            {current ? current.name : "Choose a role"}
          </span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Prototype role switcher</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PROTOTYPE_USER_PROFILES.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            disabled={switchUser.isPending}
            onSelect={() => switchUser.mutate(profile.id)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="text-sm font-medium">{profile.label}</span>
            <span className="text-xs text-muted-foreground">{profile.badge}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/register")}>
          Register a new client account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
