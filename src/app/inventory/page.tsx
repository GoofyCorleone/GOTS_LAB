"use client";

import { useState } from "react";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { InventorySearch } from "@/components/inventory/InventorySearch";
import { useInventory } from "@/hooks/useInventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryItemWithAvailability } from "@/lib/supabase/queries/inventory";

export default function InventoryPage() {
  const {
    mode,
    items,
    locations,
    categories,
    selectedLocation,
    selectedCategory,
    searchQuery,
    loading,
    error,
    setMode,
    setSelectedLocation,
    setSelectedCategory,
    setSearchQuery,
  } = useInventory();

  const [selectedItem, setSelectedItem] = useState<InventoryItemWithAvailability | null>(null);

  const handleViewDetails = (item: InventoryItemWithAvailability) => {
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 dark:from-blue-950 to-transparent py-10 sm:py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-2 mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Inventario de Equipos Ópticos
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Explora nuestro catálogo completo de equipos disponibles para tus experimentos
            </p>
          </div>

          {/* Search Controls */}
          <div className="mt-8">
            <InventorySearch
              mode={mode}
              selectedLocation={selectedLocation}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              locations={locations}
              categories={categories}
              onModeChange={setMode}
              onLocationChange={setSelectedLocation}
              onCategoryChange={setSelectedCategory}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto max-w-6xl px-4 py-12">
        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700">
            <p className="font-semibold">Error al cargar los datos</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Results Summary */}
        {!loading && items.length > 0 && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Se encontraron {items.length} elemento{items.length !== 1 ? "s" : ""}</span>
            {mode === "location" && selectedLocation && (
              <span>
                en{" "}
                {
                  locations.find((l) => l.id === selectedLocation)?.label
                }
              </span>
            )}
            {mode === "category" && selectedCategory && (
              <span>en la categoría "{selectedCategory}"</span>
            )}
            {mode === "search" && searchQuery && (
              <span>para "{searchQuery}"</span>
            )}
          </div>
        )}

        {/* Inventory Grid */}
        <InventoryGrid
          items={items}
          loading={loading}
          onViewDetails={handleViewDetails}
        />
      </section>

      {/* Details Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <Card
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle>{selectedItem.name}</CardTitle>
                  {selectedItem.reference && (
                    <CardDescription className="mt-1">
                      Referencia: {selectedItem.reference}
                    </CardDescription>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedItem.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="w-full h-48 object-contain rounded-lg bg-white border border-border"
                />
              ) : (
                <div className="w-full h-48 flex items-center justify-center rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
                  Sin imagen disponible
                </div>
              )}

              {selectedItem.category && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Categoría
                  </p>
                  <p className="text-sm">{selectedItem.category}</p>
                </div>
              )}

              {selectedItem.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Descripción
                  </p>
                  <p className="text-sm">{selectedItem.description}</p>
                </div>
              )}

              {selectedItem.location && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Ubicación
                  </p>
                  <p className="text-sm">
                    {selectedItem.location.type === "cajon" ? "Cajón" : "Armario"}{" "}
                    {selectedItem.location.number} - {selectedItem.location.label}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Cantidad Total
                  </p>
                  <p className="text-2xl font-bold">{selectedItem.quantity_total}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Disponible
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedItem.quantity_available}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Reservado
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {selectedItem.quantity_reserved}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Porcentaje Disponible
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      (selectedItem.quantity_available / selectedItem.quantity_total) * 100
                    )}
                    %
                  </p>
                </div>
              </div>

              {selectedItem.quantity_available === 0 && (
                <div className="mt-4 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
                  No hay inventario disponible en este momento
                </div>
              )}

              {selectedItem.quantity_reserved > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-sm">
                  {selectedItem.quantity_reserved} unidad{selectedItem.quantity_reserved !== 1 ? "es" : ""} reservada{selectedItem.quantity_reserved !== 1 ? "s" : ""} para experimentos activos
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
