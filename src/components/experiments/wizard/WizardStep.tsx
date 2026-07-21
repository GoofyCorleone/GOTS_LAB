"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WizardStepProps {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  onNext?: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  nextDisabled?: boolean;
  prevDisabled?: boolean;
  showPrevButton?: boolean;
  showNextButton?: boolean;
  error?: string | null;
  isSubmitting?: boolean;
}

export function WizardStep({
  step,
  title,
  description,
  children,
  onNext,
  onPrev,
  nextLabel = "Siguiente",
  prevLabel = "Atrás",
  nextDisabled = false,
  prevDisabled = false,
  showPrevButton = true,
  showNextButton = true,
  error,
  isSubmitting = false,
}: WizardStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold">
            {step}
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="pt-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="mb-6">{children}</div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-4 pt-6 border-t">
          {showPrevButton ? (
            <Button
              onClick={onPrev}
              variant="outline"
              disabled={prevDisabled || isSubmitting}
              className="flex-1"
            >
              {prevLabel}
            </Button>
          ) : (
            <div className="flex-1" />
          )}
          {showNextButton && (
            <Button
              onClick={onNext}
              disabled={nextDisabled || isSubmitting}
              className="flex-1"
            >
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {nextLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
