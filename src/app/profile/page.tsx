"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAccompanyExperiment } from "@/hooks/useAccompanyExperiment";
import { NotificationCard } from "@/components/accompany/NotificationCard";
import { ExperimentCard } from "@/components/experiments/ExperimentCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, LogOut, AlertCircle, FlaskConical, Loader2, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getExperimentsByOwner,
  getActiveItemCounts,
  getProfile,
  uploadAvatar,
  type Experiment,
  type ExperimentWithStats,
  type Profile,
} from "@/lib/supabase/queries/experiments";

function withCounts(
  experiments: Experiment[],
  counts: Map<string, number>
): ExperimentWithStats[] {
  return experiments.map((e) => ({ ...e, items_count: counts.get(e.id) || 0 }));
}

const MEMBER_STATUS_LABELS: Record<string, string> = {
  semillero: "Miembro semillero",
  grupo: "Miembro grupo",
  tesista: "Tesista",
  pasante: "Pasante",
  profesor: "Profesor",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, signOut } = useAuth();

  const {
    notifications,
    notificationsLoading,
    unreadCount,
    processingNotificationId,
    markNotificationRead,
    approveAccessRequest,
    rejectAccessRequest,
  } = useAccompanyExperiment();

  const [tab, setTab] = useState("experiments");

  const [activeExperiments, setActiveExperiments] = useState<ExperimentWithStats[]>([]);
  const [finishedExperiments, setFinishedExperiments] = useState<ExperimentWithStats[]>([]);
  const [experimentsLoading, setExperimentsLoading] = useState(true);
  const [experimentsError, setExperimentsError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
      toast.success("Foto de perfil actualizada");
    } catch (err: any) {
      toast.error(err.message || "No se pudo subir la foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab) setTab(requestedTab);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setExperimentsLoading(true);
        setExperimentsError(null);
        const { active, finished } = await getExperimentsByOwner(user.id);
        const counts = await getActiveItemCounts([
          ...active.map((e) => e.id),
          ...finished.map((e) => e.id),
        ]);
        setActiveExperiments(withCounts(active, counts));
        setFinishedExperiments(withCounts(finished, counts));
      } catch (err: any) {
        console.error("Error loading experiments:", err);
        setExperimentsError(err.message || "No se pudieron cargar los experimentos");
      } finally {
        setExperimentsLoading(false);
      }
    };

    load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id)
      .then(setProfile)
      .catch((err) => console.error("Error loading profile:", err));
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (err: any) {
      toast.error(err.message || "No se pudo marcar como leída");
    }
  };

  const handleApprove = async (participantId: string, notificationId: string) => {
    try {
      await approveAccessRequest(participantId, notificationId);
      toast.success("Solicitud aprobada");
    } catch (err: any) {
      toast.error(err.message || "No se pudo aprobar la solicitud");
    }
  };

  const handleReject = async (participantId: string, notificationId: string) => {
    try {
      await rejectAccessRequest(participantId, notificationId);
      toast.success("Solicitud rechazada");
    } catch (err: any) {
      toast.error(err.message || "No se pudo rechazar la solicitud");
    }
  };

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
        <div className="bg-card border border-border rounded-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-5">
              {/* Profile photo */}
              <div className="relative shrink-0">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-muted border border-border">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                      {(profile?.full_name || user?.email || "?")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarSelected}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Cambiar foto de perfil"
                  aria-label="Cambiar foto de perfil"
                  className="absolute bottom-0 right-0 rounded-full bg-background border border-border p-2 shadow hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mi Perfil</h1>
              <p className="text-muted-foreground">{profile?.full_name || user?.email}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {profile && (profile.member_status || profile.career) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.member_status && (
                    <Badge variant="outline" className="border-gold text-gold">
                      {MEMBER_STATUS_LABELS[profile.member_status] || profile.member_status}
                    </Badge>
                  )}
                  {profile.career && (
                    <Badge variant="outline">{profile.career}</Badge>
                  )}
                </div>
              )}
            </div>
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
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-8">
            <TabsTrigger value="experiments" className="text-sm sm:text-base">Mis Experimentos</TabsTrigger>
            <TabsTrigger value="notifications" className="text-sm sm:text-base">
              <span className="flex items-center gap-1 justify-center">
                Notificaciones
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 min-w-5 px-1 rounded-full text-[10px] leading-none"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm sm:text-base">Configuración</TabsTrigger>
          </TabsList>

          {/* Experiments Tab */}
          <TabsContent value="experiments">
            <Card className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold">Experimentos Activos</h2>
                <Link href="/experiments/new">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Crear nuevo experimento
                  </Button>
                </Link>
              </div>

              {experimentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : experimentsError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{experimentsError}</p>
              ) : activeExperiments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">No tienes experimentos activos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeExperiments.map((experiment) => (
                    <ExperimentCard key={experiment.id} experiment={experiment} variant="active" />
                  ))}
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="text-lg font-bold mb-4">Experimentos Finalizados</h3>
                {experimentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : finishedExperiments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FlaskConical className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No hay experimentos finalizados
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {finishedExperiments.map((experiment) => (
                      <ExperimentCard key={experiment.id} experiment={experiment} variant="finished" />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Notificaciones</h2>

              {notificationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">No hay notificaciones nuevas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      processing={processingNotificationId === n.id}
                      onMarkRead={handleMarkRead}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-border">
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
            <Card className="p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold mb-6">Configuración</h2>

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
                    <div>
                      <p className="text-muted-foreground">Estado en el grupo</p>
                      <p className="text-foreground">
                        {profile?.member_status
                          ? MEMBER_STATUS_LABELS[profile.member_status] || profile.member_status
                          : "Sin definir"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Programa académico</p>
                      <p className="text-foreground">{profile?.career || "Sin definir"}</p>
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
