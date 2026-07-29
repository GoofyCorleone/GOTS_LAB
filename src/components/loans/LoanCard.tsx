"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoanStatusBadge } from "@/components/loans/LoanStatusBadge";
import { Calendar, Package, ArrowRight, User, GraduationCap } from "lucide-react";
import type { LoanRequestSummary } from "@/lib/supabase/queries/loans";

function formatDate(value: string | null) {
  if (!value) return "Sin definir";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

export function LoanCard({ loan }: { loan: LoanRequestSummary }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2">
            {loan.requester?.full_name || loan.requester?.email || "Solicitante"}
          </CardTitle>
          <LoanStatusBadge status={loan.status as any} />
        </div>
        <CardDescription className="flex items-center gap-1.5 mt-1">
          <User className="h-3.5 w-3.5" />
          Profesor: {loan.professor?.full_name || "—"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>
            {loan.items_count} {loan.items_count === 1 ? "equipo" : "equipos"} solicitados
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {formatDate(loan.usage_start)} — {formatDate(loan.usage_end)}
          </span>
        </div>
        {loan.requester?.access_scope === "external" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            Solicitante externo{loan.requester?.institution ? ` · ${loan.requester.institution}` : ""}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/prestamos/detalle?id=${loan.id}`} className="w-full">
          <Button className="w-full" variant="default">
            Ver Detalle
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
