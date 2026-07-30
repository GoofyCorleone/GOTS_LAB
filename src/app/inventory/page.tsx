"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { InventorySearch } from "@/components/inventory/InventorySearch";
import { useInventory } from "@/hooks/useInventory";
import { useExternalAccountGuard } from "@/hooks/useExternalAccountGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getKitChildren, type InventoryItemWithAvailability } from "@/lib/supabase/queries/inventory";
import { getGroupProfessors, type GroupProfessor } from "@/lib/supabase/queries/loans";

export default function InventoryPage() {
  useExternalAccountGuard();

  const [professors, setProfessors] = useState<GroupProfessor[]>([]);
  const [professorsLoading, setProfessorsLoading] = useState(true);
  const [selectedProfessor, setSelectedProfessor] = useState<GroupProfessor | null>(null);
  const [underConstruction, setUnderConstruction] = useState<GroupProfessor | null>(null);

  useEffect(() => {
    getGroupProfessors()
      .then(setProfessors)
      .catch((err) => console.error("Error fetching professors:", err))
      .finally(() => setProfessorsLoading(false));
  }, []);

  const handleProfessorClick = (professor: GroupProfessor) => {
    if (!professor.is_active) {
      setUnderConstruction(professor);
      return;
    }
    setSelectedProfessor(professor);
  };

  const {
    mode,
    items,
    locations,
    categories,
    selectedLocation,
    selectedCategory,
    boxLabels,
    unboxedCount,
    boxLabelsLoading,
    selectedBox,
    searchQuery,
    loading,
    error,
    setMode,
    setSelectedLocation,
    setSelectedCategory,
    setSelectedBox,
    setSearchQuery,
  } = useInventory();

  const [selectedItem, setSelectedItem] = useState<InventoryItemWithAvailability | null>(null);
  const [kitChildren, setKitChildren] = useState<InventoryItemWithAvailability[]>([]);
  const [kitChildrenLoading, setKitChildrenLoading] = useState(false);

  const handleViewDetails = (item: InventoryItemWithAvailability) => {
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedItem(null);
  };

  useEffect(() => {
    if (!selectedItem) {
      setKitChildren([]);
      return;
    }
    let cancelled = false;
    setKitChildrenLoading(true);
    getKitChildren(selectedItem.id)
      .then((children) => {
        if (!cancelled) setKitChildren(children);
      })
      .catch((err) => console.error("Error fetching kit children:", err))
      .finally(() => {
        if (!cancelled) setKitChildrenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

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
              {selectedProfessor
                ? `Inventario a cargo de ${selectedProfessor.full_name}`
                : "Elige el profesor cuyo inventario quieres explorar"}
            </p>
          </div>

          {!selectedProfessor ? (
            <div className="mt-8">
              {professorsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : underConstruction ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-lg font-medium">Inventario en construcción</p>
                  <p className="text-sm text-muted-foreground">
                    Todavía no está disponible el inventario de {underConstruction.full_name}.
                  </p>
                  <Button variant="outline" onClick={() => setUnderConstruction(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la lista de profesores
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {professors.map((professor) => (
                    <Card
                      key={professor.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow hover:border-gold text-center"
                      onClick={() => handleProfessorClick(professor)}
                    >
                      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center overflow-hidden">
                        {professor.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={professor.image_url}
                            alt={professor.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-medium text-sm">{professor.full_name}</p>
                      {!professor.is_active && (
                        <p className="text-xs text-muted-foreground mt-1">Próximamente</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mb-4"
                onClick={() => setSelectedProfessor(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Cambiar de profesor
              </Button>

              {/* Search Controls */}
              <div className="mt-2">
                <InventorySearch
                  mode={mode}
                  selectedLocation={selectedLocation}
                  selectedCategory={selectedCategory}
                  boxLabels={boxLabels}
                  unboxedCount={unboxedCount}
                  boxLabelsLoading={boxLabelsLoading}
                  selectedBox={selectedBox}
                  searchQuery={searchQuery}
                  locations={locations}
                  categories={categories}
                  onModeChange={setMode}
                  onLocationChange={setSelectedLocation}
                  onCategoryChange={setSelectedCategory}
                  onBoxChange={setSelectedBox}
                  onSearchChange={setSearchQuery}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Main Content */}
      {selectedProfessor && (
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
      )}

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

              {kitChildrenLoading && (
                <div className="text-sm text-muted-foreground">Cargando piezas del kit...</div>
              )}

              {kitChildren.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Piezas de este kit ({kitChildren.length})
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Este kit se reserva pieza por pieza, no como bloque. Para
                    reservar una, agrégala desde el experimento con "Agregar
                    Equipo".
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {kitChildren.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between text-sm px-2 py-1.5 rounded bg-muted/40"
                      >
                        <span>
                          {child.name}
                          {child.reference && (
                            <span className="text-muted-foreground"> · {child.reference}</span>
                          )}
                        </span>
                        <span
                          className={
                            child.quantity_available
                              ? "text-green-600 dark:text-green-400 text-xs font-medium"
                              : "text-red-600 dark:text-red-400 text-xs font-medium"
                          }
                        >
                          {child.quantity_available ? "Disponible" : "Reservada"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.location?.professor && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Inventario a cargo de
                  </p>
                  <p className="text-sm">{selectedItem.location.professor.full_name}</p>
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
                    {selectedItem.location.building && ` · ${selectedItem.location.building}`}
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
