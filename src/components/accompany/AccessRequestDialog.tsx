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
import type { JoinableExperiment } from "@/lib/supabase/queries/participants";

interface AccessRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experiment: JoinableExperiment | null;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function AccessRequestDialog({
  open,
  onOpenChange,
  experiment,
  onConfirm,
  isSubmitting,
}: AccessRequestDialogProps) {
  const handleConfirm = () => {
    void onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Solicitar acceso a este experimento?</AlertDialogTitle>
          <AlertDialogDescription>
            {experiment ? (
              <>
                Se enviará una solicitud a quien dirige{" "}
                <span className="font-medium text-foreground">
                  "{experiment.title}"
                </span>
                . Recibirá una notificación y podrás acompañar el experimento
                una vez que apruebe tu acceso.
              </>
            ) : (
              "Se enviará una solicitud de acceso al responsable del experimento."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Solicitar Acceso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
