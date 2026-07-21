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
import { ExperimentStatusBadge } from "@/components/experiments/ExperimentStatusBadge";
import { Calendar, Package, ArrowRight } from "lucide-react";
import type { ExperimentWithStats } from "@/lib/supabase/queries/experiments";

function formatDate(value: string | null) {
  if (!value) return "Sin definir";
  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

interface ExperimentCardProps {
  experiment: ExperimentWithStats;
  variant: "active" | "finished";
}

export function ExperimentCard({ experiment, variant }: ExperimentCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{experiment.title}</CardTitle>
          <ExperimentStatusBadge status={experiment.status} />
        </div>
        <CardDescription className="flex items-center gap-1.5 mt-1">
          <Calendar className="h-3.5 w-3.5" />
          Inicio: {formatDate(experiment.fecha_inicio)}
          {variant === "finished" && experiment.fecha_fin_real && (
            <>
              {" · "}Fin: {formatDate(experiment.fecha_fin_real)}
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>
            {experiment.items_count}{" "}
            {experiment.items_count === 1
              ? variant === "active"
                ? "equipo en uso"
                : "equipo utilizado"
              : variant === "active"
                ? "equipos en uso"
                : "equipos utilizados"}
          </span>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/experiments/${experiment.id}`} className="w-full">
          <Button className="w-full" variant={variant === "active" ? "default" : "outline"}>
            {variant === "active" ? "Continuar" : "Ver Detalle"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
