"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getExperimentById,
  addExperimentItems,
  removeExperimentItem as removeExperimentItemQuery,
  createNewSession,
  updateSessionEndTime,
  finishExperiment as finishExperimentQuery,
  createExperimentItemShares,
  getExperimentItemShares,
  type ExperimentWithDetails,
  type NewExperimentItem,
  type ExperimentItemShareWithProfile,
} from "@/lib/supabase/queries/experiments";

export interface UseExperimentDetailState {
  experiment: ExperimentWithDetails | null;
  /** experiment_item_id -> users it's shared with (only populated for 'compartido' items) */
  itemShares: Map<string, ExperimentItemShareWithProfile[]>;
  loading: boolean;
  error: string | null;
  /** True while any mutating action (add/remove item, session, finish) is in flight */
  actionLoading: boolean;
  isOwner: boolean;
}

export function useExperimentDetail(experimentId: string | undefined) {
  const { user } = useAuth();

  const [state, setState] = useState<UseExperimentDetailState>({
    experiment: null,
    itemShares: new Map(),
    loading: true,
    error: null,
    actionLoading: false,
    isOwner: false,
  });

  const load = useCallback(async () => {
    if (!experimentId) return;
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const experiment = await getExperimentById(experimentId);
      const sharedItemIds = experiment.items
        .filter((it) => it.sharing_mode === "compartido")
        .map((it) => it.id);
      const itemShares = await getExperimentItemShares(sharedItemIds);
      setState((prev) => ({
        ...prev,
        experiment,
        itemShares,
        isOwner: !!user && experiment.owner_id === user.id,
        loading: false,
      }));
    } catch (err: any) {
      console.error("Error loading experiment:", err);
      setState((prev) => ({
        ...prev,
        error: err.message || "No se pudo cargar el experimento",
        loading: false,
      }));
    }
  }, [experimentId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const withAction = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setState((prev) => ({ ...prev, actionLoading: true, error: null }));
      try {
        const result = await fn();
        await load();
        return result;
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.message || "Ocurrió un error inesperado",
        }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, actionLoading: false }));
      }
    },
    [load]
  );

  const addItem = useCallback(
    (
      item: NewExperimentItem & { shared_with_user_id?: string }
    ) =>
      withAction(async () => {
        if (!experimentId) throw new Error("Experimento no definido");
        const [created] = await addExperimentItems(experimentId, [
          {
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
            sharing_mode: item.sharing_mode,
          },
        ]);
        if (
          created &&
          item.sharing_mode === "compartido" &&
          item.shared_with_user_id
        ) {
          const shares = new Map<string, string>();
          shares.set(created.id, item.shared_with_user_id);
          await createExperimentItemShares({
            experiment_items: [created],
            shares,
          });
        }
        return created;
      }),
    [experimentId, withAction]
  );

  const removeItem = useCallback(
    (experimentItemId: string) =>
      withAction(() => removeExperimentItemQuery(experimentItemId)),
    [withAction]
  );

  const createSession = useCallback(
    (startedAt: string, endedAtPlanned: string) =>
      withAction(() => {
        if (!experimentId) throw new Error("Experimento no definido");
        return createNewSession(experimentId, startedAt, endedAtPlanned);
      }),
    [experimentId, withAction]
  );

  const closeSession = useCallback(
    (sessionId: string, endedAt?: string) =>
      withAction(() => updateSessionEndTime(sessionId, endedAt)),
    [withAction]
  );

  const finishExperiment = useCallback(
    () =>
      withAction(() => {
        if (!experimentId) throw new Error("Experimento no definido");
        return finishExperimentQuery(experimentId);
      }),
    [experimentId, withAction]
  );

  return {
    ...state,
    refresh: load,
    addItem,
    removeItem,
    createSession,
    closeSession,
    finishExperiment,
  };
}
