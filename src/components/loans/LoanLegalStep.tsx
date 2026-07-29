"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const LEGAL_TEXT = `Quien solicita este préstamo es responsable legal de los equipos entregados durante todo el tiempo de uso acordado, incluyendo:
  • Robo de los equipos
  • Daño a los equipos
  • Pérdida de los equipos

Se compromete a devolver los equipos al vencer el plazo acordado, o a solicitar una extensión antes de esa fecha. Si el equipo no es devuelto ni se solicita una extensión dentro del plazo de gracia, el préstamo quedará registrado automáticamente como ROBO/PÉRDIDA, y el solicitante deberá responder legalmente ante las autoridades de la Universidad Industrial de Santander por los equipos perdidos o robados.`;

interface LoanLegalStepProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}

export function LoanLegalStep({ accepted, onChange }: LoanLegalStepProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950">
        <div className="space-y-4">
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
                Advertencia Legal del Préstamo
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                Lee con atención antes de continuar.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded p-4 border border-amber-200 dark:border-amber-700">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
              {LEGAL_TEXT}
            </p>
          </div>

          <div className="p-3 rounded bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-semibold">Nota importante:</span> Esta aceptación quedará
              registrada en la base de datos como un documento auditable e inmutable para
              propósitos legales y de trazabilidad.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <Checkbox
          id="loan-legal-accept"
          checked={accepted}
          onCheckedChange={(checked) => onChange(checked === true)}
          className="mt-1"
        />
        <Label htmlFor="loan-legal-accept" className="font-medium cursor-pointer flex-1 leading-relaxed">
          He leído y entiendo los términos de responsabilidad legal. Acepto que soy responsable
          del cuidado, uso y devolución de los equipos solicitados en este préstamo, y que puedo
          ser responsabilizado legalmente por daños, pérdidas o robos ante la Universidad
          Industrial de Santander.
        </Label>
      </div>
    </div>
  );
}
