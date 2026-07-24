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
import { Badge } from "@/components/ui/badge";
import { ExperimentStatusBadge } from "@/components/experiments/ExperimentStatusBadge";
import { Calendar, Package, ArrowRight, User } from "lucide-react";
import type {
  ExperimentWithStats,
  PublicExperimentSummary,
  Profile,
} from "@/lib/supabase/queries/experiments";

function formatDate(value: string | null) {
  if (!value) return "Sin definir";
  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

interface ExperimentCardProps {
  experiment: ExperimentWithStats | PublicExperimentSummary;
  variant: "active" | "finished" | "public";
  owner?: Profile;
  collaborators?: Profile[];
}

export function ExperimentCard({
  experiment,
  variant,
  owner,
  collaborators,
}: ExperimentCardProps) {
  const photoUrl = experiment.photo_url;

  return (
    <Card className="flex flex-col overflow-hidden">
      {variant === "public" && (
        <div className="relative w-full h-36 bg-muted">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={experiment.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Sin fotografía
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{experiment.title}</CardTitle>
          <ExperimentStatusBadge status={experiment.status} stage={experiment.stage} />
        </div>
        {variant === "public" ? (
          owner && (
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <User className="h-3.5 w-3.5" />A cargo: {owner.full_name || owner.email}
            </CardDescription>
          )
        ) : (
          <CardDescription className="flex items-center gap-1.5 mt-1">
            <Calendar className="h-3.5 w-3.5" />
            Inicio: {formatDate(experiment.fecha_inicio)}
            {variant === "finished" && experiment.fecha_fin_real && (
              <>
                {" · "}Fin: {formatDate(experiment.fecha_fin_real)}
              </>
            )}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>
            {experiment.items_count}{" "}
            {experiment.items_count === 1
              ? variant === "finished"
                ? "equipo utilizado"
                : "equipo en uso"
              : variant === "finished"
                ? "equipos utilizados"
                : "equipos en uso"}
          </span>
        </div>

        {variant === "public" && collaborators && collaborators.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {collaborators.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs">
                {c.full_name || c.email}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/experiments/detail?id=${experiment.id}`} className="w-full">
          <Button className="w-full" variant={variant === "finished" ? "outline" : "default"}>
            {variant === "active" ? "Continuar" : "Ver Detalle"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
