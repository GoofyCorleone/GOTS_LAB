"use client";

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
import { Calendar, FlaskConical, Loader2, Package } from "lucide-react";
import type { JoinableExperimentWithCount } from "@/hooks/useAccompanyExperiment";

function formatDate(value: string | null) {
  if (!value) return "Sin definir";
  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

interface ExperimentsInProgressListProps {
  experiments: JoinableExperimentWithCount[];
  loading?: boolean;
  processingId?: string | null;
  onRequestAccess: (experiment: JoinableExperimentWithCount) => void;
}

export function ExperimentsInProgressList({
  experiments,
  loading,
  processingId,
  onRequestAccess,
}: ExperimentsInProgressListProps) {
  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (experiments.length === 0) {
    return (
      <Card className="p-10 text-center">
        <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Esta persona no tiene experimentos en curso en este momento.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {experiments.map((experiment) => (
        <Card key={experiment.id} className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg line-clamp-2">
              {experiment.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              Inicio: {formatDate(experiment.fecha_inicio)}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>
                {experiment.items_count}{" "}
                {experiment.items_count === 1 ? "equipo en uso" : "equipos en uso"}
              </span>
            </div>
          </CardContent>

          <CardFooter>
            {experiment.participation_status === "approved" ? (
              <Badge className="w-full justify-center py-1.5" variant="default">
                Ya tienes acceso
              </Badge>
            ) : experiment.participation_status === "pending" ? (
              <Badge
                className="w-full justify-center py-1.5"
                variant="secondary"
              >
                Pendiente de aprobación
              </Badge>
            ) : experiment.participation_status === "rejected" ? (
              <Badge
                className="w-full justify-center py-1.5"
                variant="destructive"
              >
                Acceso rechazado
              </Badge>
            ) : (
              <Button
                className="w-full"
                onClick={() => onRequestAccess(experiment)}
                disabled={processingId === experiment.id}
              >
                {processingId === experiment.id && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Solicitar Acceso
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
