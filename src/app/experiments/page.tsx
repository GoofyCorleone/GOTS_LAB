"use client";

import { Card } from "@/components/ui/card";

export default function ExperimentsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mis Experimentos</h1>

        <Card className="p-8">
          <p className="text-muted-foreground mb-4">
            Vista de experimentos en curso. Se completará en Fase 4 con:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Lista de experimentos activos</li>
            <li>Opción para continuar experimento</li>
            <li>Agregar/quitar equipos</li>
            <li>Nueva sesión de trabajo</li>
            <li>Finalizar experimento</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
