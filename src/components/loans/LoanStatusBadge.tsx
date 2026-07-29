"use client";

import { Badge } from "@/components/ui/badge";
import type { LoanStatus } from "@/lib/supabase/queries/loans";

export function getLoanStatusLabel(status: LoanStatus): string {
  switch (status) {
    case "pending":
      return "Pendiente de aprobación";
    case "approved":
      return "Aprobado";
    case "rejected":
      return "Rechazado";
    case "overdue":
      return "Vencido";
    case "returned":
      return "Devuelto";
    case "lost_stolen":
      return "Robado / perdido";
    default:
      return status;
  }
}

function getVariant(status: LoanStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "pending":
      return "outline";
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "overdue":
      return "destructive";
    case "returned":
      return "secondary";
    case "lost_stolen":
      return "destructive";
    default:
      return "outline";
  }
}

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return <Badge variant={getVariant(status)}>{getLoanStatusLabel(status)}</Badge>;
}
