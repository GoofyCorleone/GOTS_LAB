"use client";

import { Card } from "@/components/ui/card";

export default function AccompanyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Acompañar Experimento</h1>

        <Card className="p-8">
          <p className="text-muted-foreground mb-4">
            Solicita acceso a un experimento en curso. Se completará en Fase 5 con:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Búsqueda de persona a cargo</li>
            <li>Visualizar experimentos en curso</li>
            <li>Botón para solicitar acceso</li>
            <li>Notificación al propietario</li>
            <li>Correo de solicitud</li>
            <li>Aprobación/rechazo</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
