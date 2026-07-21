"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryItemWithAvailability } from "@/lib/supabase/queries/inventory";
import Image from "next/image";

interface InventoryGridProps {
  items: InventoryItemWithAvailability[];
  loading?: boolean;
  onViewDetails?: (item: InventoryItemWithAvailability) => void;
}

export function InventoryGrid({
  items,
  loading = false,
  onViewDetails,
}: InventoryGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">No se encontraron elementos</p>
          <p className="text-muted-foreground text-sm mt-2">
            Intenta seleccionar otra ubicación o refina tu búsqueda
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card
          key={item.id}
          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onViewDetails?.(item)}
        >
          {/* Image */}
          <div className="relative w-full h-48 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto text-neutral-400 dark:text-neutral-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    No hay imagen
                  </p>
                </div>
              </div>
            )}
          </div>

          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base line-clamp-2">{item.name}</CardTitle>
                {item.reference && (
                  <CardDescription className="text-xs mt-1">
                    Ref: {item.reference}
                  </CardDescription>
                )}
              </div>
              {item.quantity_reserved ? (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                    {item.quantity_reserved} reservado
                  </span>
                </div>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Description */}
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Location */}
            {item.location && (
              <div className="flex items-center gap-2 text-sm">
                <svg
                  className="w-4 h-4 text-muted-foreground flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-muted-foreground">
                  {item.location.type === "cajon" ? "Cajón" : "Armario"} {item.location.number}
                </span>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Disponible:</span>
              <span className="text-sm font-semibold">
                {item.quantity_available}/{item.quantity_total}
              </span>
            </div>

            {/* View Details Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(item);
              }}
              className="w-full mt-3 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Ver Disponibilidad
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
