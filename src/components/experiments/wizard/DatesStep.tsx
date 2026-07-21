"use client";

import { WizardStep } from "./WizardStep";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FormData } from "@/hooks/useExperimentWizard";

interface DatesStepProps {
  formData: FormData;
  onUpdate: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
  error?: string | null;
  validate: () => boolean;
  isSubmitting?: boolean;
}

export function DatesStep({
  formData,
  onUpdate,
  onNext,
  onPrev,
  error,
  validate,
  isSubmitting,
}: DatesStepProps) {
  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ fecha_inicio: e.target.value });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ fecha_fin_tentativa: e.target.value });
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Check if end date is before start date
  const isEndBeforeStart =
    formData.fecha_inicio &&
    formData.fecha_fin_tentativa &&
    new Date(formData.fecha_fin_tentativa) < new Date(formData.fecha_inicio);

  return (
    <WizardStep
      step={4}
      title="Fechas del Experimento"
      description="Define cuándo se llevará a cabo el experimento"
      onNext={handleNext}
      onPrev={onPrev}
      nextLabel="Ir a Resumen Final"
      nextDisabled={!formData.fecha_inicio || (isEndBeforeStart ? true : false)}
      error={error}
      isSubmitting={isSubmitting}
    >
      <div className="space-y-6">
        {/* Info Box */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Define las fechas tentativas del experimento. La fecha de inicio es obligatoria,
            pero la fecha de fin es opcional.
          </p>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="fecha-inicio" className="text-base font-medium">
            Fecha de Inicio *
          </Label>
          <Input
            id="fecha-inicio"
            type="date"
            value={formData.fecha_inicio || ""}
            onChange={handleStartDateChange}
            min={today}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Selecciona desde hoy en adelante
          </p>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="fecha-fin" className="text-base font-medium">
            Fecha de Fin Tentativa
          </Label>
          <Input
            id="fecha-fin"
            type="date"
            value={formData.fecha_fin_tentativa || ""}
            onChange={handleEndDateChange}
            min={formData.fecha_inicio || today}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Si no la especificas, será indefinida.
          </p>
        </div>

        {/* Validation Messages */}
        {isEndBeforeStart && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              ⚠️ La fecha de fin no puede ser anterior a la de inicio
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-100">
            En el siguiente paso confirmarás las horas exactas de inicio y fin de la sesión.
          </p>
        </div>
      </div>
    </WizardStep>
  );
}
