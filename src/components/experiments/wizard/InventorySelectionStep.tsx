"use client";

import { useState } from "react";
import { WizardStep } from "./WizardStep";
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
import type { CartItem } from "@/lib/supabase/queries/experiments";
import type { Profile } from "@/lib/supabase/queries/experiments";

interface InventorySelectionStepProps {
  cartItems: CartItem[];
  allProfiles: Profile[];
  currentUser: Profile | null;
  onAddCartItem: (item: CartItem) => void;
  onRemoveCartItem: (inventoryItemId: string) => void;
  onNext: () => void;
  onPrev: () => void;
  error?: string | null;
  validate: () => boolean;
  isSubmitting?: boolean;
}

export function InventorySelectionStep({
  cartItems,
  allProfiles,
  currentUser,
  onAddCartItem,
  onRemoveCartItem,
  onNext,
  onPrev,
  error,
  validate,
  isSubmitting,
}: InventorySelectionStepProps) {
  const inventory = useInventory();
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithAvailability | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sharingMode, setSharingMode] = useState<"individual" | "compartido">("individual");
  const [quantity, setQuantity] = useState(1);
  const [sharedWithUserId, setSharedWithUserId] = useState<string>("");

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const handleItemClick = (item: InventoryItemWithAvailability) => {
    setSelectedItem(item);
    setShowModal(true);

    // Reset form
    setSharingMode("individual");
    setQuantity(1);
    setSharedWithUserId("");

    // Check if item already in cart
    const existingCartItem = cartItems.find(
      (ci) => ci.inventory_item_id === item.id
    );
    if (existingCartItem) {
      setSharingMode(existingCartItem.sharing_mode);
      setQuantity(existingCartItem.quantity);
      setSharedWithUserId(existingCartItem.shared_with_user_id || "");
    }
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    if (quantity > (selectedItem.quantity_available || 0)) {
      alert(
        `No hay suficientes items disponibles. Máximo: ${selectedItem.quantity_available}`
      );
      return;
    }

    if (sharingMode === "compartido" && !sharedWithUserId) {
      alert("Debes seleccionar con quién compartir el item");
      return;
    }

    const cartItem: CartItem = {
      inventory_item_id: selectedItem.id,
      quantity,
      sharing_mode: sharingMode,
      shared_with_user_id: sharingMode === "compartido" ? sharedWithUserId : undefined,
    };

    onAddCartItem(cartItem);
    setShowModal(false);
    setSelectedItem(null);
  };

  const otherUsers = allProfiles.filter(
    (p) => p.id !== currentUser?.id
  );

  const cartItemsWithDetails = cartItems.map((cartItem) => {
    const invItem = inventory.items.find(
      (i) => i.id === cartItem.inventory_item_id
    );
    const sharedUser = allProfiles.find(
      (p) => p.id === cartItem.shared_with_user_id
    );
    return { ...cartItem, invItem, sharedUser };
  });

  return (
    <WizardStep
      step={3}
      title="Seleccionar Inventario"
      description="Busca y agrega los items que necesitas para el experimento"
      onNext={handleNext}
      onPrev={onPrev}
      nextLabel="Continuar con Resumen"
      nextDisabled={cartItems.length === 0}
      error={error}
      isSubmitting={isSubmitting}
    >
      <div className="space-y-6">
        {/* Search Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Buscar Equipos</h3>
          <InventorySearch
            mode={inventory.mode}
            selectedLocation={inventory.selectedLocation}
            searchQuery={inventory.searchQuery}
            locations={inventory.locations}
            onModeChange={inventory.setMode}
            onLocationChange={inventory.setSelectedLocation}
            onSearchChange={inventory.setSearchQuery}
          />
        </div>

        {/* Items Grid */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Equipos Disponibles</h3>
          <InventoryGrid
            items={inventory.items}
            loading={inventory.loading}
            onViewDetails={handleItemClick}
          />
        </div>

        {/* Cart Summary */}
        <div className="space-y-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Carrito</h3>
            <Badge variant="secondary">{cartItems.length} items</Badge>
          </div>

          {cartItems.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No hay items en el carrito. Agrega algunos para continuar.
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
                      {cartItem.invItem?.name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Qty: {cartItem.quantity}
                      </Badge>
                      <Badge
                        variant={cartItem.sharing_mode === "compartido" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {cartItem.sharing_mode === "compartido"
                          ? `Compartido con ${cartItem.sharedUser?.full_name || "?"}`
                          : "Solo yo"}
                      </Badge>
                    </div>
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
      </div>

      {/* Item Detail Modal */}
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
              {/* Description */}
              {selectedItem.description && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Availability */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium">
                  Disponibilidad:{" "}
                  <span className="text-blue-600 dark:text-blue-400">
                    {selectedItem.quantity_available} / {selectedItem.quantity_total}
                  </span>
                </p>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad *</Label>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    variant="outline"
                    size="sm"
                  >
                    −
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedItem.quantity_available}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button
                    onClick={() =>
                      setQuantity(
                        Math.min(selectedItem.quantity_available || 1, quantity + 1)
                      )
                    }
                    variant="outline"
                    size="sm"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Sharing Mode */}
              <div className="space-y-3">
                <Label>Modo de uso</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sharing"
                      value="individual"
                      checked={sharingMode === "individual"}
                      onChange={(e) => setSharingMode(e.target.value as "individual")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Solo yo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sharing"
                      value="compartido"
                      checked={sharingMode === "compartido"}
                      onChange={(e) => setSharingMode(e.target.value as "compartido")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Compartido</span>
                  </label>
                </div>
              </div>

              {/* Shared With User */}
              {sharingMode === "compartido" && (
                <div className="space-y-2">
                  <Label htmlFor="shared-with">Compartir con *</Label>
                  <select
                    id="shared-with"
                    value={sharedWithUserId}
                    onChange={(e) => setSharedWithUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Selecciona un usuario --</option>
                    {otherUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddToCart} className="flex-1">
                  Agregar al Carrito
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </WizardStep>
  );
}
