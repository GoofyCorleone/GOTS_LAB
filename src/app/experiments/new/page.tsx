"use client";

import { Card } from "@/components/ui/card";

export default function NewExperimentPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Nuevo Experimento</h1>

        <Card className="p-8">
          <p className="text-muted-foreground mb-4">
            Wizard de creación de experimentos. Se completará en Fase 3 con:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Formulario: título, persona a cargo, acompañantes</li>
            <li>Modal de aceptación legal (inmutable)</li>
            <li>Selector de inventario (individual/compartido)</li>
            <li>Validación de disponibilidad en tiempo real</li>
            <li>Pantalla resumen</li>
            <li>Confirmación de horas de sesión</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
