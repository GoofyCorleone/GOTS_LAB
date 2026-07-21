"use client";

import { Card } from "@/components/ui/card";

export default function InventoryPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Inventario de Equipos</h1>

        <Card className="p-8">
          <p className="text-muted-foreground mb-4">
            Esta página se completará en Fase 2 con:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Navegación por cajones y armarios</li>
            <li>Buscador por nombre/referencia (full-text)</li>
            <li>Tarjetas de elementos con imágenes</li>
            <li>Disponibilidad en tiempo real</li>
            <li>Panel de subida de fotos</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
