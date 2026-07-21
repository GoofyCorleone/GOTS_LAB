export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Mi Perfil</h1>

        <div className="space-y-8">
          <section className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-2xl font-semibold mb-4">Experimentos Activos</h2>
            <p className="text-sm text-muted-foreground">
              Página en desarrollo - Fase 1
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-2xl font-semibold mb-4">Historial</h2>
            <p className="text-sm text-muted-foreground">
              Página en desarrollo - Fase 1
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-2xl font-semibold mb-4">Notificaciones</h2>
            <p className="text-sm text-muted-foreground">
              Página en desarrollo - Fase 1
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
