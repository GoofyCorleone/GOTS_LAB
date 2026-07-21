"use client";

import { useCallback } from "react";
import type { SearchMode } from "@/hooks/useInventory";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

interface InventorySearchProps {
  mode: SearchMode;
  selectedLocation: string | null;
  searchQuery: string;
  locations: Location[];
  onModeChange: (mode: SearchMode) => void;
  onLocationChange: (locationId: string | null) => void;
  onSearchChange: (query: string) => void;
}

export function InventorySearch({
  mode,
  selectedLocation,
  searchQuery,
  locations,
  onModeChange,
  onLocationChange,
  onSearchChange,
}: InventorySearchProps) {
  // Group locations by type
  const cajonesLocations = locations.filter((l) => l.type === "cajon");
  const armariosLocations = locations.filter((l) => l.type === "armario");

  const handleModeChange = useCallback(
    (newMode: SearchMode) => {
      onModeChange(newMode);
    },
    [onModeChange]
  );

  const handleLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onLocationChange(value || null);
    },
    [onLocationChange]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  return (
    <div className="w-full space-y-4">
      {/* Mode Selection */}
      <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-lg border bg-card">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="search-mode"
            value="location"
            checked={mode === "location"}
            onChange={() => handleModeChange("location")}
            className="w-4 h-4 text-blue-600 dark:text-blue-500"
          />
          <span className="text-sm font-medium">Por Ubicación</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="search-mode"
            value="search"
            checked={mode === "search"}
            onChange={() => handleModeChange("search")}
            className="w-4 h-4 text-blue-600 dark:text-blue-500"
          />
          <span className="text-sm font-medium">Por Nombre/Referencia</span>
        </label>
      </div>

      {/* Location Selection */}
      {mode === "location" && (
        <div className="space-y-2">
          <label htmlFor="location-select" className="block text-sm font-medium">
            Selecciona una ubicación
          </label>
          <select
            id="location-select"
            value={selectedLocation || ""}
            onChange={handleLocationChange}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Selecciona una ubicación --</option>

            {cajonesLocations.length > 0 && (
              <optgroup label="Cajones">
                {cajonesLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </optgroup>
            )}

            {armariosLocations.length > 0 && (
              <optgroup label="Armarios">
                {armariosLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {/* Search Input */}
      {mode === "search" && (
        <div className="space-y-2">
          <label htmlFor="search-input" className="block text-sm font-medium">
            Busca por nombre o referencia
          </label>
          <div className="relative">
            <input
              id="search-input"
              type="text"
              placeholder="Ej: lente, prisma, láser..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
              className="w-full px-4 py-2 pl-10 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground">
              Resultados para: <span className="font-semibold">"{searchQuery}"</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
