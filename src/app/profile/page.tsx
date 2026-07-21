"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, LogOut, AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="experiments" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="experiments">Mis Experimentos</TabsTrigger>
            <TabsTrigger value="notifications">
              Notificaciones
              <Bell className="w-4 h-4 ml-2" />
            </TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Experiments Tab */}
          <TabsContent value="experiments">
            <Card className="p-8">
              <h2 className="text-xl font-bold mb-4">Experimentos Activos</h2>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No tienes experimentos activos</p>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Crear nuevo experimento
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="text-lg font-bold mb-4">Experimentos Finalizados</h3>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay experimentos finalizados
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="p-8">
              <h2 className="text-xl font-bold mb-4">Notificaciones</h2>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No hay notificaciones nuevas</p>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                  Tipos de notificaciones que recibirás:
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Solicitudes de acceso a tus experimentos</li>
                  <li>✓ Aprobación/rechazo de tus solicitudes</li>
                  <li>✓ Recordatorios cuando experimentos finalizan</li>
                  <li>✓ Resumen de equipos utilizados (por correo)</li>
                </ul>
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-8">
              <h2 className="text-xl font-bold mb-6">Configuración</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Información de Cuenta</h3>
                  <div className="bg-muted/30 p-4 rounded-lg space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Correo</p>
                      <p className="font-mono text-foreground">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ID de Usuario</p>
                      <p className="font-mono text-foreground text-xs">{user?.id}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Preferencias</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Las opciones de notificación estarán disponibles en futuras actualizaciones.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Zona de Peligro</h3>
                  <Button variant="destructive" className="w-full">
                    Eliminar Cuenta
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Esta acción es irreversible. Se eliminarán todos tus datos.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
