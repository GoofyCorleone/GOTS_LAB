"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExperimentWizard } from "@/hooks/useExperimentWizard";
import { BasicInfoStep } from "./BasicInfoStep";
import { LegalAcceptanceStep } from "./LegalAcceptanceStep";
import { InventorySelectionStep } from "./InventorySelectionStep";
import { DatesStep } from "./DatesStep";
import { SummaryStep } from "./SummaryStep";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import {
  getAllProfiles,
  getCurrentProfile,
  createExperiment,
  createLegalAcceptance,
  addExperimentParticipants,
  createExperimentItems,
  createExperimentItemShares,
  createExperimentSession,
  startExperiment,
  type Profile,
} from "@/lib/supabase/queries/experiments";
import { searchItems, type InventoryItemWithAvailability } from "@/lib/supabase/queries/inventory";

export function ExperimentWizard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const wizard = useExperimentWizard();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemWithAvailability[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // Load profiles and inventory items
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return;

        setPageLoading(true);

        // Load profiles
        const profiles = await getAllProfiles();
        setAllProfiles(profiles);

        // Load current user
        const profile = await getCurrentProfile();
        setCurrentUser(profile);

        // Pre-load inventory items for display
        const items = await searchItems("");
        setInventoryItems(items);
      } catch (err: any) {
        console.error("Error loading data:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios",
          variant: "destructive",
        });
      } finally {
        setPageLoading(false);
      }
    };

    loadData();
  }, [user, toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (sessionStartTime: string, sessionEndTime: string) => {
    try {
      wizard.setSubmitting(true);
      wizard.setError(null);

      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      // 1. Create experiment in draft status
      const experiment = await createExperiment({
        title: wizard.formData.title,
        owner_id: wizard.formData.owner_id,
        fecha_inicio: wizard.formData.fecha_inicio,
        fecha_fin_tentativa: wizard.formData.fecha_fin_tentativa,
      });

      // 2. Create legal acceptance record (IMMUTABLE)
      await createLegalAcceptance({
        experiment_id: experiment.id,
        accepted_by: currentUser.id,
      });

      // 3. Add participants (companions)
      if (wizard.formData.companion_ids.length > 0) {
        await addExperimentParticipants({
          experiment_id: experiment.id,
          user_ids: wizard.formData.companion_ids,
        });
      }

      // 4. Create experiment items
      const createdItems = await createExperimentItems({
        experiment_id: experiment.id,
        items: wizard.cartItems,
        added_by: currentUser.id,
      });

      // 5. Create item shares if needed
      const sharesToCreate = new Map<string, string>();
      createdItems.forEach((createdItem) => {
        const cartItem = wizard.cartItems.find(
          (ci) => ci.inventory_item_id === createdItem.inventory_item_id
        );
        if (cartItem?.shared_with_user_id) {
          sharesToCreate.set(createdItem.id, cartItem.shared_with_user_id);
        }
      });

      if (sharesToCreate.size > 0) {
        await createExperimentItemShares({
          experiment_items: createdItems,
          shares: sharesToCreate,
        });
      }

      // 6. Create experiment session
      await createExperimentSession({
        experiment_id: experiment.id,
        started_at: sessionStartTime,
        ended_at_planned: sessionEndTime,
        created_by: currentUser.id,
      });

      // 7. Update experiment status to in_progress
      await startExperiment(experiment.id);

      // Success toast
      toast({
        title: "¡Experimento iniciado!",
        description: "El experimento ha sido creado y está en progreso",
      });

      // Redirect to experiment details
      router.push(`/experiments/detail?id=${experiment.id}`);
    } catch (err: any) {
      console.error("Error submitting experiment:", err);
      wizard.setError(
        err.message || "Error al crear el experimento. Por favor, intenta de nuevo."
      );
      toast({
        title: "Error",
        description: err.message || "No se pudo crear el experimento",
        variant: "destructive",
      });
    } finally {
      wizard.setSubmitting(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-lg text-muted-foreground">Cargando...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nuevo Experimento</h1>
          <p className="text-muted-foreground">
            Paso {wizard.step} de 5
          </p>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={(wizard.step / 5) * 100} className="h-2" />
          </div>
        </div>

        {/* Wizard Steps */}
        {wizard.step === 1 && (
          <BasicInfoStep
            formData={wizard.formData}
            currentUser={currentUser}
            allProfiles={allProfiles}
            onUpdate={wizard.updateFormData}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
            error={wizard.error}
            validate={wizard.validateStep1}
            isSubmitting={wizard.submitting}
          />
        )}

        {wizard.step === 2 && (
          <LegalAcceptanceStep
            formData={wizard.formData}
            onUpdate={wizard.updateFormData}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
            error={wizard.error}
            validate={wizard.validateStep2}
            isSubmitting={wizard.submitting}
          />
        )}

        {wizard.step === 3 && (
          <InventorySelectionStep
            cartItems={wizard.cartItems}
            allProfiles={allProfiles}
            currentUser={currentUser}
            onAddCartItem={wizard.addCartItem}
            onRemoveCartItem={wizard.removeCartItem}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
            error={wizard.error}
            validate={wizard.validateStep3}
            isSubmitting={wizard.submitting}
          />
        )}

        {wizard.step === 4 && (
          <DatesStep
            formData={wizard.formData}
            onUpdate={wizard.updateFormData}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
            error={wizard.error}
            validate={wizard.validateStep4}
            isSubmitting={wizard.submitting}
          />
        )}

        {wizard.step === 5 && (
          <SummaryStep
            formData={wizard.formData}
            cartItems={wizard.cartItems}
            allProfiles={allProfiles}
            inventoryItems={inventoryItems}
            onPrev={wizard.prevStep}
            onSubmit={handleSubmit}
            error={wizard.error}
            isSubmitting={wizard.submitting}
          />
        )}
      </div>
    </div>
  );
}
