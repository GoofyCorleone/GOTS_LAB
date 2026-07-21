"use client";

import { useState } from "react";
import { WizardStep } from "./WizardStep";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormData } from "@/hooks/useExperimentWizard";
import type { CartItem } from "@/lib/supabase/queries/experiments";
import type { Profile } from "@/lib/supabase/queries/experiments";
import type { InventoryItemWithAvailability } from "@/lib/supabase/queries/inventory";

interface SummaryStepProps {
  formData: FormData;
  cartItems: CartItem[];
  allProfiles: Profile[];
  inventoryItems: InventoryItemWithAvailability[];
  onPrev: () => void;
  onSubmit: (sessionStartTime: string, sessionEndTime: string) => Promise<void>;
  error?: string | null;
  isSubmitting?: boolean;
}

export function SummaryStep({
  formData,
  cartItems,
  allProfiles,
  inventoryItems,
  onPrev,
  onSubmit,
  error,
  isSubmitting,
}: SummaryStepProps) {
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [sessionError, setSessionError] = useState<string | null>(null);

  const owner = allProfiles.find((p) => p.id === formData.owner_id);
  const companions = allProfiles.filter((p) =>
    formData.companion_ids.includes(p.id)
  );

  const cartItemsWithDetails = cartItems.map((cartItem) => {
    const invItem = inventoryItems.find(
      (i) => i.id === cartItem.inventory_item_id
    );
    const sharedUser = allProfiles.find(
      (p) => p.id === cartItem.shared_with_user_id
    );
    return { ...cartItem, invItem, sharedUser };
  });

  const handleStartExperiment = () => {
    setShowSessionDialog(true);
    setSessionError(null);
  };

  const handleConfirmSession = async () => {
    // Validate times
    if (!startTime || !endTime) {
      setSessionError("Ambas horas son obligatorias");
      return;
    }

    // Build full datetime strings
    const startDateTime = `${formData.fecha_inicio}T${startTime}:00`;
    const endDateTime = formData.fecha_fin_tentativa
      ? `${formData.fecha_fin_tentativa}T${endTime}:00`
      : `${formData.fecha_inicio}T${endTime}:00`;

    // Validate that end >= start
    if (new Date(endDateTime) < new Date(startDateTime)) {
      setSessionError("La hora de fin debe ser posterior a la de inicio");
      return;
    }

    try {
      await onSubmit(startDateTime, endDateTime);
      setShowSessionDialog(false);
    } catch (err: any) {
      setSessionError(err.message || "Error al iniciar el experimento");
    }
  };

  return (
    <WizardStep
      step={5}
      title="Resumen Final"
      description="Revisa toda la información antes de confirmar"
      onPrev={onPrev}
      nextLabel="Empezar Experimento"
      showNextButton={true}
      prevDisabled={isSubmitting}
      error={error}
      isSubmitting={isSubmitting}
      onNext={handleStartExperiment}
    >
      <div className="space-y-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información del Experimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Título</p>
              <p className="font-semibold">{formData.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Persona a Cargo</p>
              <p className="font-semibold">
                {owner?.full_name || owner?.email}
              </p>
            </div>
            {companions.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Acompañantes</p>
                <div className="flex flex-wrap gap-2">
                  {companions.map((companion) => (
                    <Badge key={companion.id} variant="secondary">
                      {companion.full_name || companion.email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Items Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Inventario ({cartItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cartItemsWithDetails.map((item) => (
                <div
                  key={item.inventory_item_id}
                  className="flex items-start justify-between p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.invItem?.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Qty: {item.quantity}
                      </Badge>
                      <Badge
                        variant={item.sharing_mode === "compartido" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {item.sharing_mode === "compartido"
                          ? `Compartido con ${item.sharedUser?.full_name || "?"}`
                          : "Solo"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dates Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fechas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
              <p className="font-semibold">{formData.fecha_inicio}</p>
            </div>
            {formData.fecha_fin_tentativa && (
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Fin Tentativa</p>
                <p className="font-semibold">{formData.fecha_fin_tentativa}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Box */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-700">
          <p className="text-sm text-green-900 dark:text-green-100 font-medium">
            ✓ Toda la información ha sido revisada y validada
          </p>
        </div>

        {/* Info about what happens next */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">Próximo paso:</span> Al confirmar, se te pedirá que
            ingreses las horas exactas de inicio y fin de la sesión. El experimento entrará en
            estado &quot;en progreso&quot; y los equipos quedarán reservados.
          </p>
        </div>
      </div>

      {/* Session Time Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Horas de Sesión</DialogTitle>
            <DialogDescription>
              Especifica las horas exactas de inicio y fin de la sesión
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {sessionError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-200">{sessionError}</p>
              </div>
            )}

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="start-time">Hora de Inicio *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Fecha: {formData.fecha_inicio}
              </p>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="end-time">Hora de Fin *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Fecha:{" "}
                {formData.fecha_fin_tentativa || formData.fecha_inicio}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowSessionDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSession}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                Confirmar y Empezar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </WizardStep>
  );
}
