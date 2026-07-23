"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getLocationsByType,
  getItemsByLocation,
  getCategories,
  getItemsByCategory,
  searchItems,
  type InventoryItemWithAvailability,
} from "@/lib/supabase/queries/inventory";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export type SearchMode = "location" | "category" | "search";

export interface InventoryState {
  mode: SearchMode;
  items: InventoryItemWithAvailability[];
  locations: Location[];
  categories: string[];
  selectedLocation: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

export function useInventory() {
  const [state, setState] = useState<InventoryState>({
    mode: "location",
    items: [],
    locations: [],
    categories: [],
    selectedLocation: null,
    selectedCategory: null,
    searchQuery: "",
    loading: true,
    error: null,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load locations and categories on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const [locations, categories] = await Promise.all([
          getLocationsByType(),
          getCategories(),
        ]);
        setState((prev) => ({
          ...prev,
          locations,
          categories,
          loading: false,
        }));
      } catch (error: any) {
        console.error("Error loading filters:", error);
        setState((prev) => ({
          ...prev,
          error: error.message || "Error loading filters",
          loading: false,
        }));
      }
    };

    loadFilters();
  }, []);

  // Load items based on mode and selection
  useEffect(() => {
    if (state.mode === "location" && state.selectedLocation) {
      const loadItemsByLocation = async () => {
        try {
          setState((prev) => ({ ...prev, loading: true, error: null }));
          const items = await getItemsByLocation(state.selectedLocation!);
          setState((prev) => ({
            ...prev,
            items,
            loading: false,
          }));
        } catch (error: any) {
          console.error("Error loading items:", error);
          setState((prev) => ({
            ...prev,
            error: error.message || "Error loading items",
            items: [],
            loading: false,
          }));
        }
      };

      loadItemsByLocation();
    } else if (state.mode === "category" && state.selectedCategory) {
      const loadItemsByCategory = async () => {
        try {
          setState((prev) => ({ ...prev, loading: true, error: null }));
          const items = await getItemsByCategory(state.selectedCategory!);
          setState((prev) => ({
            ...prev,
            items,
            loading: false,
          }));
        } catch (error: any) {
          console.error("Error loading items:", error);
          setState((prev) => ({
            ...prev,
            error: error.message || "Error loading items",
            items: [],
            loading: false,
          }));
        }
      };

      loadItemsByCategory();
    } else if (state.mode === "search" && state.searchQuery.trim()) {
      // Debounce search
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        try {
          setState((prev) => ({ ...prev, loading: true, error: null }));
          const items = await searchItems(state.searchQuery);
          setState((prev) => ({
            ...prev,
            items,
            loading: false,
          }));
        } catch (error: any) {
          console.error("Error searching items:", error);
          setState((prev) => ({
            ...prev,
            error: error.message || "Error searching items",
            items: [],
            loading: false,
          }));
        }
      }, 300); // 300ms debounce
    } else if (state.mode === "search" && !state.searchQuery.trim()) {
      // Clear results if search query is empty
      setState((prev) => ({
        ...prev,
        items: [],
      }));
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.mode, state.selectedLocation, state.selectedCategory, state.searchQuery]);

  const setMode = useCallback((mode: SearchMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      items: [],
      selectedLocation: null,
      selectedCategory: null,
      searchQuery: "",
      error: null,
    }));
  }, []);

  const setSelectedLocation = useCallback((locationId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedLocation: locationId,
    }));
  }, []);

  const setSelectedCategory = useCallback((category: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedCategory: category,
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  return {
    ...state,
    setMode,
    setSelectedLocation,
    setSelectedCategory,
    setSearchQuery,
  };
}
