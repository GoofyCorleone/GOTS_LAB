"use client";

import { Badge } from "@/components/ui/badge";
import type { Experiment } from "@/lib/supabase/queries/experiments";

/**
 * User-facing experiment phase: draft/in_progress/finished/cancelled is the
 * technical state machine (drives the legal gate, inventory triggers, etc.
 * — see CLAUDE.md). "stage" is a finer-grained, purely descriptive label the
 * owner sets while in_progress (montaje vs. toma de datos); it has no effect
 * on any DB trigger or RLS policy.
 */
export function getExperimentPhaseLabel(
  status: Experiment["status"],
  stage: string | null
): string {
  if (status === "draft") return "Planeación";
  if (status === "cancelled") return "Cancelado";
  if (status === "finished") return "Finalizado";
  // in_progress
  if (stage === "toma_datos") return "En toma de datos";
  return "En montaje";
}

function getVariant(
  status: Experiment["status"]
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "draft") return "outline";
  if (status === "cancelled") return "destructive";
  if (status === "finished") return "secondary";
  return "default";
}

export function ExperimentStatusBadge({
  status,
  stage,
}: {
  status: Experiment["status"];
  stage?: string | null;
}) {
  return (
    <Badge variant={getVariant(status)}>
      {getExperimentPhaseLabel(status, stage ?? null)}
    </Badge>
  );
}
