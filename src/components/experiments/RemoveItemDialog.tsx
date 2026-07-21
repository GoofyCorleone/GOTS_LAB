"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import type { ExperimentItemWithDetails } from "@/lib/supabase/queries/experiments";

interface RemoveItemDialogProps {
  item: ExperimentItemWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function RemoveItemDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: RemoveItemDialogProps) {
  const handleConfirm = () => {
    void onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Remover este equipo?</AlertDialogTitle>
          <AlertDialogDescription>
            {item?.inventory_item?.name
              ? `"${item.inventory_item.name}" (cantidad: ${item.quantity}) será liberado del experimento y quedará disponible en el inventario nuevamente. Esta acción no se puede deshacer.`
              : "El equipo será liberado del experimento y quedará disponible en el inventario nuevamente. Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
