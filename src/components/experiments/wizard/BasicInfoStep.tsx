"use client";

import { useEffect, useState } from "react";
import { WizardStep } from "./WizardStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { FormData } from "@/hooks/useExperimentWizard";
import type { Profile } from "@/lib/supabase/queries/experiments";

interface BasicInfoStepProps {
  formData: FormData;
  currentUser: Profile | null;
  allProfiles: Profile[];
  onUpdate: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
  error?: string | null;
  validate: () => boolean;
  isSubmitting?: boolean;
}

export function BasicInfoStep({
  formData,
  currentUser,
  allProfiles,
  onUpdate,
  onNext,
  onPrev,
  error,
  validate,
  isSubmitting,
}: BasicInfoStepProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ owner_id: e.target.value });
    setLocalError(null);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ title: e.target.value });
    setLocalError(null);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ description: e.target.value });
  };

  const handleAddCompanion = (profileId: string) => {
    if (!formData.companion_ids.includes(profileId)) {
      onUpdate({
        companion_ids: [...formData.companion_ids, profileId],
      });
    }
  };

  const handleRemoveCompanion = (profileId: string) => {
    onUpdate({
      companion_ids: formData.companion_ids.filter((id) => id !== profileId),
    });
  };

  // Set default owner if not set
  useEffect(() => {
    if (!formData.owner_id && currentUser) {
      onUpdate({ owner_id: currentUser.id });
    }
  }, [currentUser, formData.owner_id, onUpdate]);

  const availableCompanions = allProfiles.filter(
    (profile) =>
      profile.id !== formData.owner_id &&
      !formData.companion_ids.includes(profile.id)
  );

  const selectedCompanions = allProfiles.filter((profile) =>
    formData.companion_ids.includes(profile.id)
  );

  return (
    <WizardStep
      step={1}
      title="Información Básica"
      description="Proporciona los detalles principales del experimento"
      onNext={handleNext}
      onPrev={onPrev}
      nextDisabled={!formData.title.trim() || !formData.owner_id}
      prevDisabled={true}
      showPrevButton={false}
      error={error || localError}
      isSubmitting={isSubmitting}
    >
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="experiment-title" className="text-base font-medium">
            Título del Experimento *
          </Label>
          <Input
            id="experiment-title"
            type="text"
            placeholder="Ej: Experimento de refracción de luz..."
            value={formData.title}
            onChange={handleTitleChange}
            minLength={3}
            className="h-10"
          />
          {formData.title && formData.title.length < 3 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Mínimo 3 caracteres ({formData.title.length}/3)
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="experiment-description" className="text-base font-medium">
            Descripción
          </Label>
          <Textarea
            id="experiment-description"
            placeholder="Describe qué se está haciendo en este experimento, con el detalle que quieras. Podrás editar esto en cualquier momento, incluso mientras el experimento está en curso."
            value={formData.description}
            onChange={handleDescriptionChange}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Puedes dejarla en blanco ahora y completarla más adelante.
          </p>
        </div>

        {/* Owner Selection */}
        <div className="space-y-2">
          <Label htmlFor="owner-select" className="text-base font-medium">
            Persona a Cargo *
          </Label>
          <select
            id="owner-select"
            value={formData.owner_id}
            onChange={handleOwnerChange}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Selecciona una persona --</option>
            {allProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name || profile.email}
              </option>
            ))}
          </select>
          {currentUser && formData.owner_id === currentUser.id && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Eres tú (usuario actual)
            </p>
          )}
        </div>

        {/* Companions */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Acompañantes</Label>

          {/* Selected Companions */}
          {selectedCompanions.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
                Acompañantes seleccionados ({selectedCompanions.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCompanions.map((companion) => (
                  <Badge
                    key={companion.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800"
                    onClick={() => handleRemoveCompanion(companion.id)}
                  >
                    {companion.full_name || companion.email}
                    <span className="ml-1 font-bold">×</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Companions */}
          {availableCompanions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Haz clic para agregar acompañantes:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableCompanions.map((companion) => (
                  <button
                    key={companion.id}
                    onClick={() => handleAddCompanion(companion.id)}
                    className="p-3 text-left rounded-lg border border-input hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                  >
                    <p className="font-medium text-sm">
                      {companion.full_name || companion.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{companion.email}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableCompanions.length === 0 && selectedCompanions.length > 0 && (
            <p className="text-xs text-muted-foreground italic">
              No hay más usuarios disponibles para agregar
            </p>
          )}
        </div>
      </div>
    </WizardStep>
  );
}
