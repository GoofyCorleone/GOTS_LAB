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

interface FinishExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
  hasOpenSession?: boolean;
}

export function FinishExperimentDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  hasOpenSession,
}: FinishExperimentDialogProps) {
  const handleConfirm = () => {
    void onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Finalizar este experimento?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasOpenSession
              ? "Hay una sesión abierta. Debes cerrarla antes de poder finalizar el experimento."
              : "Todos los equipos activos serán devueltos automáticamente al inventario y el experimento pasará a estado \"Finalizado\". Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting || hasOpenSession}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Finalizar Experimento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
