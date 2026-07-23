"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { InventorySearch } from "@/components/inventory/InventorySearch";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { useInventory } from "@/hooks/useInventory";
import type { InventoryItemWithAvailability } from "@/lib/supabase/queries/inventory";
import type { Profile } from "@/lib/supabase/queries/experiments";

export interface AddItemPayload {
  inventory_item_id: string;
  quantity: number;
  sharing_mode: "individual" | "compartido";
  shared_with_user_id?: string;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allProfiles: Profile[];
  currentUserId?: string;
  onAdd: (item: AddItemPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export function AddItemDialog({
  open,
  onOpenChange,
  allProfiles,
  currentUserId,
  onAdd,
  isSubmitting,
}: AddItemDialogProps) {
  const inventory = useInventory();
  const [selectedItem, setSelectedItem] =
    useState<InventoryItemWithAvailability | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sharingMode, setSharingMode] = useState<"individual" | "compartido">(
    "individual"
  );
  const [sharedWithUserId, setSharedWithUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const otherUsers = allProfiles.filter((p) => p.id !== currentUserId);

  const handleSelectItem = (item: InventoryItemWithAvailability) => {
    setSelectedItem(item);
    setQuantity(1);
    setSharingMode("individual");
    setSharedWithUserId("");
    setError(null);
  };

  const handleBackToSearch = () => {
    setSelectedItem(null);
    setError(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedItem(null);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleAdd = async () => {
    if (!selectedItem) return;
    setError(null);

    if (quantity < 1) {
      setError("La cantidad debe ser al menos 1");
      return;
    }

    if (quantity > (selectedItem.quantity_available || 0)) {
      setError(
        `No hay suficientes unidades disponibles. Disponible: ${selectedItem.quantity_available}`
      );
      return;
    }

    if (sharingMode === "compartido" && !sharedWithUserId) {
      setError("Debes seleccionar con quién compartir el equipo");
      return;
    }

    try {
      await onAdd({
        inventory_item_id: selectedItem.id,
        quantity,
        sharing_mode: sharingMode,
        shared_with_user_id:
          sharingMode === "compartido" ? sharedWithUserId : undefined,
      });
      handleClose(false);
    } catch (err: any) {
      setError(err.message || "No se pudo agregar el equipo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Equipo</DialogTitle>
          <DialogDescription>
            Busca un equipo del inventario y agrégalo al experimento en curso.
          </DialogDescription>
        </DialogHeader>

        {!selectedItem ? (
          <div className="space-y-6">
            <InventorySearch
              mode={inventory.mode}
              selectedLocation={inventory.selectedLocation}
              selectedCategory={inventory.selectedCategory}
              searchQuery={inventory.searchQuery}
              locations={inventory.locations}
              categories={inventory.categories}
              onModeChange={inventory.setMode}
              onLocationChange={inventory.setSelectedLocation}
              onCategoryChange={inventory.setSelectedCategory}
              onSearchChange={inventory.setSearchQuery}
            />
            <InventoryGrid
              items={inventory.items}
              loading={inventory.loading}
              onViewDetails={handleSelectItem}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">{selectedItem.name}</p>
              {selectedItem.reference && (
                <p className="text-sm text-muted-foreground">
                  Ref: {selectedItem.reference}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium">
                Disponibilidad en tiempo real:{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {selectedItem.quantity_available} / {selectedItem.quantity_total}
                </span>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="add-item-quantity">Cantidad *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  variant="outline"
                  size="sm"
                >
                  −
                </Button>
                <Input
                  id="add-item-quantity"
                  type="number"
                  min={1}
                  max={selectedItem.quantity_available}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-20 text-center"
                />
                <Button
                  type="button"
                  onClick={() =>
                    setQuantity((q) =>
                      Math.min(selectedItem.quantity_available || 1, q + 1)
                    )
                  }
                  variant="outline"
                  size="sm"
                >
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Modo de uso</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="add-item-sharing"
                    checked={sharingMode === "individual"}
                    onChange={() => setSharingMode("individual")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Solo yo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="add-item-sharing"
                    checked={sharingMode === "compartido"}
                    onChange={() => setSharingMode("compartido")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Compartido</span>
                </label>
              </div>
            </div>

            {sharingMode === "compartido" && (
              <div className="space-y-2">
                <Label htmlFor="add-item-shared-with">Compartir con *</Label>
                <select
                  id="add-item-shared-with"
                  value={sharedWithUserId}
                  onChange={(e) => setSharedWithUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Selecciona un usuario --</option>
                  {otherUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleBackToSearch}
                className="flex-1"
                disabled={isSubmitting}
              >
                Volver a buscar
              </Button>
              <Button onClick={handleAdd} className="flex-1" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agregar al Experimento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
