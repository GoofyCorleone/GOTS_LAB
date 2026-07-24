"use client";

import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExperimentStatusBadge } from "@/components/experiments/ExperimentStatusBadge";
import { Calendar, FlaskConical, Loader2, Package, User } from "lucide-react";
import type { JoinableExperimentWithCount } from "@/hooks/useAccompanyExperiment";

function formatDate(value: string | null) {
  if (!value) return "Sin definir";
  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

interface ExperimentSearchListProps {
  experiments: JoinableExperimentWithCount[];
  loading?: boolean;
  processingId?: string | null;
  onRequestAccess: (experiment: JoinableExperimentWithCount) => void;
}

/**
 * Vertical list (one row per experiment) for the "search by experiment name"
 * mode: photo on the left, then name + owner + status, and the request action
 * on the right. Deliberately a list and not the card grid used elsewhere —
 * search results are scanned top-to-bottom.
 */
export function ExperimentSearchList({
  experiments,
  loading,
  processingId,
  onRequestAccess,
}: ExperimentSearchListProps) {
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
          No se encontraron experimentos en curso con ese nombre.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {experiments.map((experiment) => (
        <Card key={experiment.id} className="overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {/* Photo */}
            <div className="w-full sm:w-44 h-40 sm:h-auto shrink-0 bg-muted">
              {experiment.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={experiment.photo_url}
                  alt={experiment.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-32 flex items-center justify-center text-xs text-muted-foreground">
                  Sin fotografía
                </div>
              )}
            </div>

            {/* Info + action */}
            <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{experiment.title}</h3>
                  <ExperimentStatusBadge
                    status={experiment.status}
                    stage={experiment.stage}
                  />
                </div>

                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />A cargo:{" "}
                  {experiment.owner?.full_name || experiment.owner?.email || "—"}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(experiment.fecha_inicio)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    {experiment.items_count}{" "}
                    {experiment.items_count === 1 ? "equipo" : "equipos"}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                {experiment.participation_status === "approved" ? (
                  <Badge className="py-1.5 px-3">Ya tienes acceso</Badge>
                ) : experiment.participation_status === "pending" ? (
                  <Badge variant="secondary" className="py-1.5 px-3">
                    Pendiente de aprobación
                  </Badge>
                ) : experiment.participation_status === "rejected" ? (
                  <Badge variant="destructive" className="py-1.5 px-3">
                    Acceso rechazado
                  </Badge>
                ) : (
                  <Button
                    onClick={() => onRequestAccess(experiment)}
                    disabled={processingId === experiment.id}
                  >
                    {processingId === experiment.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Solicitar acceso
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
