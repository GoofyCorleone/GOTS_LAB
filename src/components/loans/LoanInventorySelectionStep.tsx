"use client";

import { useEffect, useState } from "react";
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
import {
  getKitChildren,
  type InventoryItemWithAvailability,
} from "@/lib/supabase/queries/inventory";
import type { LoanCartItem } from "@/lib/supabase/queries/loans";

interface LoanInventorySelectionStepProps {
  cartItems: LoanCartItem[];
  onAddCartItem: (item: LoanCartItem) => void;
  onRemoveCartItem: (inventoryItemId: string) => void;
}

/**
 * Equipment picker for a loan request. Reuses the same search+grid+modal+cart
 * pattern as the experiment wizard's InventorySelectionStep, minus the
 * "individual vs. compartido" sharing mode — loans don't have that concept,
 * the whole request belongs to one requester.
 *
 * Kits (LSC01-A, LSB04-A…) are reserved piece by piece, never as a block:
 * selecting one shows its children with their individual availability, same
 * as AddItemDialog does for experiments. Without this a kit looked like a
 * single indivisible item here.
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

  const [kitChildren, setKitChildren] = useState<InventoryItemWithAvailability[]>([]);
  const [kitChildrenLoading, setKitChildrenLoading] = useState(false);
  const [kitPiece, setKitPiece] = useState<InventoryItemWithAvailability | null>(null);

  // What actually gets reserved: the chosen kit piece, or the item itself.
  const itemToReserve = kitPiece || selectedItem;

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

  const handleItemClick = (item: InventoryItemWithAvailability) => {
    setSelectedItem(item);
    setKitPiece(null);
    setShowModal(true);
    setQuantity(1);

    const existing = cartItems.find((ci) => ci.inventory_item_id === item.id);
    if (existing) {
      setQuantity(existing.quantity);
    }
  };

  const handleSelectKitPiece = (child: InventoryItemWithAvailability) => {
    setKitPiece(child);
    const existing = cartItems.find((ci) => ci.inventory_item_id === child.id);
    setQuantity(existing?.quantity ?? 1);
  };

  const handleAddToCart = () => {
    if (!itemToReserve) return;

    if (quantity > (itemToReserve.quantity_available || 0)) {
      alert(`No hay suficientes items disponibles. Máximo: ${itemToReserve.quantity_available}`);
      return;
    }

    onAddCartItem({
      inventory_item_id: itemToReserve.id,
      quantity,
      name: itemToReserve.name,
      reference: itemToReserve.reference,
    });
    setShowModal(false);
    setSelectedItem(null);
    setKitPiece(null);
  };

  const cartItemsWithDetails = cartItems.map((cartItem) => {
    const invItem = inventory.items.find((i) => i.id === cartItem.inventory_item_id);
    return { ...cartItem, invItem };
  });

  // A kit is being browsed but no specific piece picked yet.
  const showingKitPieces = kitChildren.length > 0 && !kitPiece;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Buscar Equipos</h3>
        <InventorySearch
          mode={inventory.mode}
          selectedLocation={inventory.selectedLocation}
          selectedCategory={inventory.selectedCategory}
          boxLabels={inventory.boxLabels}
          unboxedCount={inventory.unboxedCount}
          boxLabelsLoading={inventory.boxLabelsLoading}
          selectedBox={inventory.selectedBox}
          searchQuery={inventory.searchQuery}
          locations={inventory.locations}
          categories={inventory.categories}
          onModeChange={inventory.setMode}
          onLocationChange={inventory.setSelectedLocation}
          onCategoryChange={inventory.setSelectedCategory}
          onBoxChange={inventory.setSelectedBox}
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
                  <p className="font-medium text-sm">
                    {cartItem.name || cartItem.invItem?.name || "Equipo seleccionado"}
                  </p>
                  {(cartItem.reference || cartItem.invItem?.reference) && (
                    <p className="text-xs text-muted-foreground">
                      Ref: {cartItem.reference || cartItem.invItem?.reference}
                    </p>
                  )}
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
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{itemToReserve?.name}</DialogTitle>
            <DialogDescription>
              {itemToReserve?.reference && `Ref: ${itemToReserve.reference}`}
            </DialogDescription>
          </DialogHeader>

          {kitChildrenLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Cargando piezas del kit...
            </div>
          ) : showingKitPieces ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este kit se solicita pieza por pieza. Elige la que necesitas.
              </p>

              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {kitChildren.map((child) => {
                  const available = (child.quantity_available || 0) > 0;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      disabled={!available}
                      onClick={() => handleSelectKitPiece(child)}
                      className={`w-full flex items-center justify-between text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                        available
                          ? "border-input hover:border-gold hover:bg-muted/50 cursor-pointer"
                          : "border-input opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span>
                        {child.name}
                        {child.reference && (
                          <span className="text-muted-foreground"> · {child.reference}</span>
                        )}
                      </span>
                      <span
                        className={
                          available
                            ? "text-green-600 dark:text-green-400 text-xs font-medium flex-shrink-0"
                            : "text-red-600 dark:text-red-400 text-xs font-medium flex-shrink-0"
                        }
                      >
                        {available ? "Disponible" : "Reservada"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button variant="outline" className="w-full" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            itemToReserve && (
              <div className="space-y-4">
                {itemToReserve.description && (
                  <p className="text-sm text-muted-foreground">{itemToReserve.description}</p>
                )}

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium">
                    Disponibilidad:{" "}
                    <span className="text-blue-600 dark:text-blue-400">
                      {itemToReserve.quantity_available} / {itemToReserve.quantity_total}
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
                      max={itemToReserve.quantity_available}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                    />
                    <Button
                      onClick={() =>
                        setQuantity(Math.min(itemToReserve.quantity_available || 1, quantity + 1))
                      }
                      variant="outline"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => (kitPiece ? setKitPiece(null) : setShowModal(false))}
                    variant="outline"
                    className="flex-1"
                  >
                    {kitPiece ? "Volver a las piezas" : "Cancelar"}
                  </Button>
                  <Button onClick={handleAddToCart} className="flex-1">
                    Agregar a la solicitud
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
