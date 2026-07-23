"use client";

import { useCallback } from "react";
import type { SearchMode } from "@/hooks/useInventory";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

interface InventorySearchProps {
  mode: SearchMode;
  selectedLocation: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  locations: Location[];
  categories: string[];
  onModeChange: (mode: SearchMode) => void;
  onLocationChange: (locationId: string | null) => void;
  onCategoryChange: (category: string | null) => void;
  onSearchChange: (query: string) => void;
}

export function InventorySearch({
  mode,
  selectedLocation,
  selectedCategory,
  searchQuery,
  locations,
  categories,
  onModeChange,
  onLocationChange,
  onCategoryChange,
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

  const handleLocationClick = useCallback(
    (locationId: string) => {
      onLocationChange(selectedLocation === locationId ? null : locationId);
    },
    [onLocationChange, selectedLocation]
  );

  const handleCategoryClick = useCallback(
    (category: string) => {
      onCategoryChange(selectedCategory === category ? null : category);
    },
    [onCategoryChange, selectedCategory]
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
            value="category"
            checked={mode === "category"}
            onChange={() => handleModeChange("category")}
            className="w-4 h-4 text-blue-600 dark:text-blue-500"
          />
          <span className="text-sm font-medium">Por Categoría</span>
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

      {/* Category Selection */}
      {mode === "category" && (
        <div className="space-y-2">
          <p className="block text-sm font-medium">Selecciona una categoría</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`min-h-20 px-4 py-3 rounded-lg border-2 text-sm font-semibold text-center transition-colors flex items-center justify-center ${
                    isSelected
                      ? "border-gold bg-gold-subtle text-gold"
                      : "border-input bg-card hover:border-gold hover:bg-muted/50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Location Selection */}
      {mode === "location" && (
        <div className="space-y-6">
          {cajonesLocations.length > 0 && (
            <div className="space-y-2">
              <p className="block text-sm font-medium">Cajones</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {cajonesLocations.map((loc) => {
                  const isSelected = selectedLocation === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleLocationClick(loc.id)}
                      className={`min-h-20 px-4 py-3 rounded-lg border-2 text-sm font-semibold text-center transition-colors flex items-center justify-center ${
                        isSelected
                          ? "border-gold bg-gold-subtle text-gold"
                          : "border-input bg-card hover:border-gold hover:bg-muted/50"
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {armariosLocations.length > 0 && (
            <div className="space-y-2">
              <p className="block text-sm font-medium">Armarios</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {armariosLocations.map((loc) => {
                  const isSelected = selectedLocation === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleLocationClick(loc.id)}
                      className={`min-h-20 px-4 py-3 rounded-lg border-2 text-sm font-semibold text-center transition-colors flex items-center justify-center ${
                        isSelected
                          ? "border-gold bg-gold-subtle text-gold"
                          : "border-input bg-card hover:border-gold hover:bg-muted/50"
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
