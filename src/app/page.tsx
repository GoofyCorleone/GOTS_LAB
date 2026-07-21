export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">GOTS Lab - Inventario</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Bienvenido al sistema de gestión de inventario y trazabilidad de experimentos.
        </p>
        <div className="space-y-4">
          <p>Fase 0 en progreso...</p>
          <p className="text-sm text-muted-foreground">
            Próximamente: Autenticación, navegación de inventario, creación de experimentos.
          </p>
        </div>
      </div>
    </main>
  )
}
