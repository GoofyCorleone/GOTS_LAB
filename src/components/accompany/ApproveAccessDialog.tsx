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

interface ApproveAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approve" | "reject";
  requesterLabel?: string;
  experimentTitle?: string;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function ApproveAccessDialog({
  open,
  onOpenChange,
  action,
  requesterLabel,
  experimentTitle,
  onConfirm,
  isSubmitting,
}: ApproveAccessDialogProps) {
  const isApprove = action === "approve";

  const handleConfirm = () => {
    void onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isApprove ? "¿Aprobar solicitud de acceso?" : "¿Rechazar solicitud de acceso?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isApprove ? (
              <>
                <span className="font-medium text-foreground">
                  {requesterLabel || "Este usuario"}
                </span>{" "}
                podrá ver y acompañar
                {experimentTitle ? (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">
                      "{experimentTitle}"
                    </span>
                  </>
                ) : (
                  " el experimento"
                )}
                .
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {requesterLabel || "Este usuario"}
                </span>{" "}
                no tendrá acceso
                {experimentTitle ? (
                  <>
                    {" "}
                    a{" "}
                    <span className="font-medium text-foreground">
                      "{experimentTitle}"
                    </span>
                  </>
                ) : (
                  " al experimento"
                )}
                . Podrá volver a solicitarlo más adelante.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={
              isApprove
                ? ""
                : "bg-destructive text-white hover:bg-destructive/90"
            }
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isApprove ? "Aprobar" : "Rechazar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
