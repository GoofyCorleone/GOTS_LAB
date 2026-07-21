"use client";

import { Badge } from "@/components/ui/badge";
import type { Experiment } from "@/lib/supabase/queries/experiments";

const STATUS_LABEL: Record<Experiment["status"], string> = {
  draft: "Borrador",
  in_progress: "En curso",
  finished: "Finalizado",
  cancelled: "Cancelado",
};

const STATUS_VARIANT: Record<
  Experiment["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  in_progress: "default",
  finished: "secondary",
  cancelled: "destructive",
};

export function ExperimentStatusBadge({
  status,
}: {
  status: Experiment["status"];
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
  );
}
