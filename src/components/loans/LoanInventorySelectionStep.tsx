"use client";

import { useState } from "react";
import { InventorySearch } from "@/components/inventory/InventorySearch";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInventory } from "@/hooks/useInventory";
import type { InventoryItemWithAvailability } from "@/lib/supabase/queries/inventory";
import type { LoanCartItem } from "@/lib/supabase/queries/loans";

interface LoanInventorySelectionStepProps {
  cartItems: LoanCartItem[];
  onAddCartItem: (item: LoanCartItem) => void;
  onRemoveCartItem: (inventoryItemId: string) => void;
}

/**
 * Equipment picker for a loan request. Deliberately reuses the same
 * search+grid+modal+cart pattern as the experiment wizard's
 * InventorySelectionStep, minus the "individual vs. compartido" sharing mode
 * — loans don't have that concept, the whole request belongs to one
 * requester.
 */
export function LoanInventorySelectionStep({
  cartItems,
  onAddCartItem,
  onRemoveCartItem,
}: LoanInventorySelectionStepProps) {
  const inventory = useInventory();
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithAvailability | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleItemClick = (item: InventoryItemWithAvailability) => {
    setSelectedItem(item);
    setShowModal(true);
    setQuantity(1);

    const existing = cartItems.find((ci) => ci.inventory_item_id === item.id);
    if (existing) {
      setQuantity(existing.quantity);
    }
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    if (quantity > (selectedItem.quantity_available || 0)) {
      alert(`No hay suficientes items disponibles. Máximo: ${selectedItem.quantity_available}`);
      return;
    }

    onAddCartItem({ inventory_item_id: selectedItem.id, quantity });
    setShowModal(false);
    setSelectedItem(null);
  };

  const cartItemsWithDetails = cartItems.map((cartItem) => {
    const invItem = inventory.items.find((i) => i.id === cartItem.inventory_item_id);
    return { ...cartItem, invItem };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Buscar Equipos</h3>
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
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Equipos Disponibles</h3>
        <InventoryGrid items={inventory.items} loading={inventory.loading} onViewDetails={handleItemClick} />
      </div>

      <div className="space-y-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Equipos a solicitar</h3>
          <Badge variant="secondary">{cartItems.length} items</Badge>
        </div>

        {cartItems.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No hay equipos seleccionados. Agrega algunos para continuar.
          </p>
        ) : (
          <div className="space-y-2">
            {cartItemsWithDetails.map((cartItem) => (
              <div
                key={cartItem.inventory_item_id}
                className="flex items-start justify-between p-3 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{cartItem.invItem?.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Cantidad: {cartItem.quantity}
                  </Badge>
                </div>
                <Button
                  onClick={() => onRemoveCartItem(cartItem.inventory_item_id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>
              {selectedItem?.reference && `Ref: ${selectedItem.reference}`}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.description && (
                <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
              )}

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium">
                  Disponibilidad:{" "}
                  <span className="text-blue-600 dark:text-blue-400">
                    {selectedItem.quantity_available} / {selectedItem.quantity_total}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan-quantity">Cantidad *</Label>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setQuantity(Math.max(1, quantity - 1))} variant="outline" size="sm">
                    −
                  </Button>
                  <Input
                    id="loan-quantity"
                    type="number"
                    min="1"
                    max={selectedItem.quantity_available}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button
                    onClick={() => setQuantity(Math.min(selectedItem.quantity_available || 1, quantity + 1))}
                    variant="outline"
                    size="sm"
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowModal(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleAddToCart} className="flex-1">
                  Agregar a la solicitud
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
