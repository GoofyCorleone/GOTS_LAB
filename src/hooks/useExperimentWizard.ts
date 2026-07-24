"use client";

import { useState, useCallback, useRef } from "react";
import type { CartItem } from "@/lib/supabase/queries/experiments";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface FormData {
  title: string;
  owner_id: string;
  description: string;
  companion_ids: string[];
  legalAccepted: boolean;
  fecha_inicio?: string;
  fecha_fin_tentativa?: string;
}

export interface UseExperimentWizardState {
  step: WizardStep;
  formData: FormData;
  cartItems: CartItem[];
  loading: boolean;
  error: string | null;
  submitting: boolean;
}

export function useExperimentWizard() {
  const [state, setState] = useState<UseExperimentWizardState>({
    step: 1,
    formData: {
      title: "",
      owner_id: "",
      description: "",
      companion_ids: [],
      legalAccepted: false,
    },
    cartItems: [],
    loading: false,
    error: null,
    submitting: false,
  });

  const submitAttemptedRef = useRef(false);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.min(5, (prev.step + 1) as WizardStep) as WizardStep,
      error: null,
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.max(1, (prev.step - 1) as WizardStep) as WizardStep,
      error: null,
    }));
  }, []);

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...updates,
      },
      error: null,
    }));
  }, []);

  const addCartItem = useCallback((item: CartItem) => {
    setState((prev) => {
      // Check if item already exists
      const existingIndex = prev.cartItems.findIndex(
        (ci) => ci.inventory_item_id === item.inventory_item_id
      );

      if (existingIndex >= 0) {
        // Update existing item
        const newItems = [...prev.cartItems];
        newItems[existingIndex] = item;
        return {
          ...prev,
          cartItems: newItems,
        };
      }

      // Add new item
      return {
        ...prev,
        cartItems: [...prev.cartItems, item],
      };
    });
  }, []);

  const removeCartItem = useCallback((inventory_item_id: string) => {
    setState((prev) => ({
      ...prev,
      cartItems: prev.cartItems.filter(
        (item) => item.inventory_item_id !== inventory_item_id
      ),
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setState((prev) => ({
      ...prev,
      submitting,
    }));
  }, []);

  const setSubmitAttempted = useCallback((attempted: boolean) => {
    submitAttemptedRef.current = attempted;
  }, []);

  const getSubmitAttempted = useCallback(() => {
    return submitAttemptedRef.current;
  }, []);

  // Validation helpers
  const validateStep1 = useCallback(() => {
    if (!state.formData.title || state.formData.title.trim().length < 3) {
      setError("El título debe tener al menos 3 caracteres");
      return false;
    }
    if (!state.formData.owner_id) {
      setError("Debes seleccionar una persona a cargo");
      return false;
    }
    return true;
  }, [state.formData, setError]);

  const validateStep2 = useCallback(() => {
    if (!state.formData.legalAccepted) {
      setError("Debes aceptar los términos legales para continuar");
      return false;
    }
    return true;
  }, [state.formData, setError]);

  const validateStep3 = useCallback(() => {
    if (state.cartItems.length === 0) {
      setError("Debes agregar al menos un item al carrito");
      return false;
    }
    return true;
  }, [state.cartItems, setError]);

  const validateStep4 = useCallback(() => {
    if (!state.formData.fecha_inicio) {
      setError("La fecha de inicio es obligatoria");
      return false;
    }

    if (state.formData.fecha_fin_tentativa) {
      const inicio = new Date(state.formData.fecha_inicio);
      const fin = new Date(state.formData.fecha_fin_tentativa);

      if (fin < inicio) {
        setError("La fecha de fin no puede ser anterior a la de inicio");
        return false;
      }
    }

    return true;
  }, [state.formData, setError]);

  return {
    ...state,
    nextStep,
    prevStep,
    updateFormData,
    addCartItem,
    removeCartItem,
    setLoading,
    setError,
    setSubmitting,
    setSubmitAttempted,
    getSubmitAttempted,
    validateStep1,
    validateStep2,
    validateStep3,
    validateStep4,
  };
}
