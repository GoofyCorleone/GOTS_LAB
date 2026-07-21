"use client";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Loader2, Search, UserRound } from "lucide-react";
import type { SearchResult } from "@/lib/supabase/queries/participants";

function initials(name: string | null, email: string) {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface UserSearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: SearchResult[];
  loading: boolean;
  error?: string | null;
  onSelect: (user: SearchResult) => void;
}

export function UserSearchInput({
  query,
  onQueryChange,
  results,
  loading,
  error,
  onSelect,
}: UserSearchInputProps) {
  const showDropdown = query.trim().length >= 2;

  return (
    <div className="w-full relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Busca por correo o nombre de usuario..."
          className="pl-10 h-11"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <Card className="absolute z-20 mt-2 w-full max-h-80 overflow-y-auto p-2 shadow-lg">
          {error ? (
            <p className="text-sm text-destructive px-2 py-3">{error}</p>
          ) : loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center px-2">
              <UserRound className="h-8 w-8 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                No se encontró ningún usuario con ese correo o nombre.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/60 transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {initials(r.full_name, r.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.full_name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

export { initials };
