"use client";

import { WizardStep } from "./WizardStep";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { FormData } from "@/hooks/useExperimentWizard";

interface LegalAcceptanceStepProps {
  formData: FormData;
  onUpdate: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
  error?: string | null;
  validate: () => boolean;
  isSubmitting?: boolean;
}

const LEGAL_TEXT = `El estudiante a cargo de este experimento es responsable legal de:
  • Robo de equipos
  • Daño a equipos
  • Pérdida de equipos

Se compromete a responder ante el director del grupo de investigación y los respectivos organismos de la Universidad Industrial de Santander.`;

export function LegalAcceptanceStep({
  formData,
  onUpdate,
  onNext,
  onPrev,
  error,
  validate,
  isSubmitting,
}: LegalAcceptanceStepProps) {
  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    onUpdate({ legalAccepted: checked });
  };

  return (
    <WizardStep
      step={2}
      title="Aceptación Legal"
      description="Revisa y acepta los términos de responsabilidad"
      onNext={handleNext}
      onPrev={onPrev}
      nextLabel="Aceptar y Continuar"
      nextDisabled={!formData.legalAccepted}
      showNextButton={true}
      error={error}
      isSubmitting={isSubmitting}
    >
      <div className="space-y-6">
        {/* Legal Text Box */}
        <div className="p-6 rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950">
          <div className="space-y-4">
            {/* Warning Icon */}
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                  Acuerdo de Responsabilidad Legal
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Este documento establece tu responsabilidad legal.
                </p>
              </div>
            </div>

            {/* Legal Text */}
            <div className="bg-white dark:bg-slate-900 rounded p-4 border border-amber-200 dark:border-amber-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                {LEGAL_TEXT}
              </p>
            </div>

            {/* Info Box */}
            <div className="p-3 rounded bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700">
              <p className="text-xs text-blue-900 dark:text-blue-200">
                <span className="font-semibold">Nota importante:</span> Esta aceptación quedará registrada en la
                base de datos como un documento auditable e inmutable para propósitos legales y de
                trazabilidad.
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <Checkbox
            id="legal-accept"
            checked={formData.legalAccepted}
            onCheckedChange={handleCheckboxChange}
            className="mt-1"
          />
          <Label
            htmlFor="legal-accept"
            className="font-medium cursor-pointer flex-1 leading-relaxed"
          >
            He leído y entiendo los términos de responsabilidad legal. Acepto
            que soy responsable del cuidado, uso y devolución de los equipos
            utilizados en este experimento y que puedo ser responsabilizado
            legalmente por daños, pérdidas o robos.
          </Label>
        </div>

        {/* Next Step Info */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">
            Una vez aceptes, podrás continuar al siguiente paso para seleccionar
            el inventario que utilizarás en el experimento.
          </p>
        </div>
      </div>
    </WizardStep>
  );
}
