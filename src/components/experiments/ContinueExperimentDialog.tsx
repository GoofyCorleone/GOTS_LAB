"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { ExperimentSession } from "@/lib/supabase/queries/experiments";
import { format } from "date-fns";

interface ContinueExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Most recent session, if any, shown as reference for the user. */
  previousSession?: ExperimentSession | null;
  onSubmit: (startedAt: string, endedAtPlanned: string) => Promise<void>;
  isSubmitting?: boolean;
}

function todayISODate() {
  return format(new Date(), "yyyy-MM-dd");
}

export function ContinueExperimentDialog({
  open,
  onOpenChange,
  previousSession,
  onSubmit,
  isSubmitting,
}: ContinueExperimentDialogProps) {
  const [date, setDate] = useState(todayISODate());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [error, setError] = useState<string | null>(null);

  // Reset the form every time the dialog is (re)opened
  useEffect(() => {
    if (open) {
      setDate(todayISODate());
      setStartTime("09:00");
      setEndTime("10:00");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);

    if (!date || !startTime || !endTime) {
      setError("La hora de inicio y la hora de fin tentativa son obligatorias");
      return;
    }

    const startedAt = `${date}T${startTime}:00`;
    const endedAtPlanned = `${date}T${endTime}:00`;

    if (new Date(endedAtPlanned) < new Date(startedAt)) {
      setError("La hora de fin debe ser posterior (o igual) a la hora de inicio");
      return;
    }

    try {
      await onSubmit(startedAt, endedAtPlanned);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "No se pudo crear la sesión");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Continuar Experimento</DialogTitle>
          <DialogDescription>
            Abre una nueva sesión de trabajo para este experimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previousSession && (
            <div className="p-3 rounded-lg border bg-muted/50 text-sm space-y-1">
              <p className="font-medium">Sesión anterior</p>
              <p className="text-muted-foreground">
                {format(new Date(previousSession.started_at), "dd/MM/yyyy HH:mm")}
                {" → "}
                {previousSession.ended_at_actual
                  ? format(new Date(previousSession.ended_at_actual), "dd/MM/yyyy HH:mm")
                  : "en curso"}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-date">Fecha</Label>
            <Input
              id="session-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="session-start">Hora de inicio *</Label>
              <Input
                id="session-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-end">Hora de fin tentativa *</Label>
              <Input
                id="session-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear Nueva Sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
